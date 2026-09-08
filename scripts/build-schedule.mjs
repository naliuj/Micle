#!/usr/bin/env node
// Builds/extends data/schedule.js — the precomputed, append-only daily
// answer order.
//
// Design: days are picked one at a time from the eligible pool
// (needsVerification !== true), under two rules — a mic cannot return within
// COOLDOWN_DAYS, and a mic nearing the end of COVERAGE_WINDOW is forced ahead
// of the random picks. Together those give a provable floor and ceiling on
// how often any mic comes round: never sooner than 30 days, never longer than
// a year. pickDay()'s comment carries the arithmetic.
//
// This replaced a strict "generation" scheme — one full shuffled pass through
// the whole pool before any repeat — which guaranteed coverage but made the
// rhythm rigid: you saw all 118 mics before any of them came back. Repeats
// inside a cycle keep it feeling less like a checklist. The property that
// scheme existed to protect is still protected, just by the deadline rule
// instead of by construction.
//
// What must NOT come back is the original single-shuffle-then-modulo-forever
// design, where cycle N was always identical to cycle 1 — a pattern an
// attentive player can spot. Seeding per day index rather than per run is
// what keeps the sequence from repeating itself.
//
// Re-running this script is idempotent and safe on a schedule (cron, or
// just "whenever you remember"): it tops up the buffer to comfortably
// cover the future without ever touching already-written days, so past
// answers never change no matter when new mics get added or verified.
//
// A newly-added or newly-verified mic only ever enters days written by the
// *next* top-up, which — with the default 2-year buffer — could be years
// away. --rebase-from-today exists for when a mic needs to enter rotation
// soon rather than at the tail: it keeps days [0, today] exactly as
// committed (today included, since that's the live answer), discards
// everything after today, and rebuilds from there with the current
// eligible pool. This is safe under the same rule as top-up mode — nothing
// a real player has already been shown ever changes — because a day only
// becomes an actual shown answer once its calendar date arrives; nothing
// past today has been surfaced to anyone yet, peeking via MicleDebug
// notwithstanding.
//
// Usage: node scripts/build-schedule.mjs [--launch-date=YYYY-MM-DD] [--buffer-days=N] [--rebase-from-today]

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const micsPath = join(root, "data", "mics.js");
const schedulePath = join(root, "data", "schedule.js");

const DEFAULT_BUFFER_DAYS = 730; // keep ~2 years of runway ahead of "today"
const BASE_SEED_STR = "MICGUESSR";

// A mic can come back this many days after its last outing. Short enough that
// familiar mics recur instead of the sequence being a predictable
// once-through cycle; long enough that a repeat never feels immediate.
const COOLDOWN_DAYS = 30;

// Every mic must appear at least once in any window this long.
const COVERAGE_WINDOW = 365;

function loadMicIds() {
  const src = readFileSync(micsPath, "utf8");
  const sandbox = { module: { exports: {} } };
  const fn = new Function("module", "exports", src + "\n;module.exports = { MIC_DB };");
  fn(sandbox.module, sandbox.module.exports);
  const { MIC_DB } = sandbox.module.exports;
  return MIC_DB.filter((m) => m.needsVerification !== true).map((m) => m.id);
}

function loadExistingSchedule() {
  if (!existsSync(schedulePath)) return null;
  const src = readFileSync(schedulePath, "utf8");
  const sandbox = { module: { exports: {} } };
  const fn = new Function("module", "exports", src + "\n;module.exports = { SCHEDULE };");
  fn(sandbox.module, sandbox.module.exports);
  return sandbox.module.exports.SCHEDULE;
}

// mulberry32 — small deterministic PRNG.
function mulberry32(seed) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// FNV-1a — small deterministic string hash, used to derive a distinct
// numeric seed per day (and, in js/schedule.js, per calendar date
// for the debug-only date<->day-index conversion — unrelated use).
function hashStringToSeed(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function seededShuffle(arr, seed) {
  const rng = mulberry32(seed);
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// Picks one mic for a single day: random among everything off cooldown,
// except that anything nearing its coverage deadline jumps the queue.
//
// The two rules are what make the guarantees provable rather than merely
// likely, given a pool of P mics:
//
//   cooldown   a mic played on day d cannot reappear before day d + 30, so
//              the minimum gap is exactly 30. At most 30 mics sit on cooldown
//              at once, so with P = 118 there are always ~88 candidates and
//              the picker can never stall.
//
//   deadline   once a mic has gone (COVERAGE_WINDOW - P) days unseen it is
//              forced ahead of the random picks, oldest first. Worst case,
//              every other mic is overdue too and ours is last in that queue,
//              costing a further P - 1 days:
//                  (365 - 118) + (118 - 1) = 364 < 365
//              so no mic can slip a 365-day window. Being overdue implies
//              being off cooldown, so the two rules never conflict.
//
// A never-played mic counts its staleness from day -1, not from negative
// infinity. Treating unseen mics as infinitely overdue would force every one
// of them to the front and reproduce the strict once-through cycle this
// replaces — the whole point is that a mic may return before the pool is
// exhausted.
function deadlineFor(poolSize) {
  return Math.max(COOLDOWN_DAYS + 1, COVERAGE_WINDOW - poolSize);
}

function pickDay(dayIndex, eligibleIds, lastPlayed, deadline) {
  const staleness = (id) => dayIndex - (lastPlayed.has(id) ? lastPlayed.get(id) : -1);

  // A mic that has never been played has no cooldown to serve. Deriving that
  // from staleness alone left every mic ineligible for the first 29 days of a
  // from-scratch build, which only the init path ever hits — the repo always
  // rebuilds behind an existing prefix, so it would have sat here unnoticed.
  const candidates = eligibleIds.filter(
    (id) => !lastPlayed.has(id) || dayIndex - lastPlayed.get(id) >= COOLDOWN_DAYS
  );
  if (candidates.length === 0) {
    throw new Error(
      `No candidate for day ${dayIndex}: every mic is inside the ${COOLDOWN_DAYS}-day cooldown. ` +
        `The pool (${eligibleIds.length}) must be larger than the cooldown.`
    );
  }
  const overdue = candidates.filter((id) => staleness(id) >= deadline);
  const pool = overdue.length > 0 ? overdue : candidates;

  // Seeded per day rather than per run, so regenerating from the same prefix
  // reproduces the same schedule and a top-up matches what a full rebuild
  // would have produced for those days.
  const rng = mulberry32(hashStringToSeed(`${BASE_SEED_STR}:day:${dayIndex}`));
  const shuffled = [...pool];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  // Sort is stable, so when forcing the queue drains oldest-first with the
  // shuffle breaking ties; in the ordinary case the shuffle alone decides.
  if (overdue.length > 0) shuffled.sort((a, b) => staleness(b) - staleness(a));
  return shuffled[0];
}

// Extends `order` in place up to targetLength. Days already written are read
// only to seed the cooldown state, so a rebuild picks up mid-stream without
// a mic reappearing too soon across the boundary.
function extendTo(order, targetLength, eligibleIds) {
  const deadline = deadlineFor(eligibleIds.length);
  const lastPlayed = new Map();
  order.forEach((id, i) => lastPlayed.set(id, i));
  for (let i = order.length; i < targetLength; i++) {
    const id = pickDay(i, eligibleIds, lastPlayed, deadline);
    order.push(id);
    lastPlayed.set(id, i);
  }
  return order;
}

function main() {
  const args = Object.fromEntries(
    process.argv.slice(2).map((a) => {
      const [k, v] = a.replace(/^--/, "").split("=");
      return [k, v ?? true];
    })
  );

  const eligibleIds = loadMicIds();
  if (eligibleIds.length === 0) {
    console.error("No eligible mics (all flagged needsVerification) — nothing to schedule.");
    process.exit(1);
  }

  const existing = loadExistingSchedule();
  const bufferDays = args["buffer-days"] ? parseInt(args["buffer-days"], 10) : DEFAULT_BUFFER_DAYS;

  let launchDate, order;

  if (!existing) {
    launchDate = args["launch-date"] || new Date().toISOString().slice(0, 10);
    order = [];
    console.log(`Initializing schedule: launch date ${launchDate}, ${eligibleIds.length} eligible mics.`);
  } else {
    launchDate = existing.launchDate;
    order = [...existing.order];
  }

  // Top up until we've got `bufferDays` of runway past today.
  const todayIndex = Math.floor((Date.now() - Date.parse(launchDate + "T00:00:00Z")) / 86400000);

  if (args["rebase-from-today"]) {
    if (!existing) {
      console.error("--rebase-from-today has nothing to rebase — no existing schedule found.");
      process.exit(1);
    }
    if (todayIndex >= order.length) {
      console.error(
        `--rebase-from-today: today (day ${todayIndex}) is past the end of the current schedule ` +
          `(${order.length} days) — nothing to discard. Run without the flag to top up instead.`
      );
      process.exit(1);
    }
    const kept = todayIndex + 1;
    const discarded = order.length - kept;
    order = order.slice(0, kept);
    console.log(
      `Rebasing: kept days 0-${todayIndex} (${kept} days, through today), discarded ${discarded} ` +
        `not-yet-live day(s). Rebuilding from day ${kept} with the current ${eligibleIds.length}-mic pool.`
    );
    // Re-seeded per day from the day index, so a rebuild is only different
    // from what it replaced where the *history* differs — the discarded tail
    // is genuinely regenerated rather than reshuffled by luck.
  }

  const targetLength = Math.max(order.length, todayIndex + bufferDays);
  const startingLength = order.length;

  if (eligibleIds.length <= COOLDOWN_DAYS) {
    console.error(
      `Pool of ${eligibleIds.length} is not larger than the ${COOLDOWN_DAYS}-day cooldown — ` +
        `there would be days with no legal pick.`
    );
    process.exit(1);
  }

  extendTo(order, targetLength, eligibleIds);

  if (order.length === startingLength) {
    console.log("Schedule already has enough runway — nothing to do.");
    return;
  }

  console.log(
    `Built ${order.length - startingLength} day(s) — schedule now covers ${order.length} days ` +
      `(was ${existing ? existing.order.length : 0}). Cooldown ${COOLDOWN_DAYS}d, ` +
      `coverage window ${COVERAGE_WINDOW}d, deadline ${deadlineFor(eligibleIds.length)}d.`
  );

  const body = `// GENERATED by scripts/build-schedule.mjs — do not hand-edit \`order\`.
// One mic id per calendar day, starting at launchDate. Days are picked one at
// a time: a mic cannot return within cooldownDays, and any mic nearing the end
// of coverageWindow is forced ahead of the random picks so it can't slip a
// year. See the comment above pickDay() in build-schedule.mjs for why those
// two rules are sufficient. Append-only: re-running the script only ever adds
// days to the END, so past answers never change.
const SCHEDULE = {
  launchDate: ${JSON.stringify(launchDate)},
  cooldownDays: ${COOLDOWN_DAYS},
  coverageWindow: ${COVERAGE_WINDOW},
  order: ${JSON.stringify(order, null, 2)}
};
if (typeof module !== "undefined") module.exports = { SCHEDULE };
`;
  writeFileSync(schedulePath, body);
  console.log(`Wrote ${schedulePath}`);
}

main();
