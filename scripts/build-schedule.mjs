#!/usr/bin/env node
// Builds/extends data/schedule.js — the precomputed, append-only daily
// answer order.
//
// Design: the schedule is a concatenation of "generations" — each
// generation is one full shuffled pass through every currently-eligible
// mic id (needsVerification !== true), covering every eligible mic exactly
// once before any repeat. Critically, each generation gets its OWN
// independent shuffle seed (derived from its generation index), so
// generation 2's order has no relationship to generation 1's — a player
// who plays long enough to see the pool cycle will NOT see the same
// sequence repeat. (The old single-shuffle-then-modulo-forever design had
// exactly that flaw: cycle N was always identical to cycle 1.)
//
// Re-running this script is idempotent and safe on a schedule (cron, or
// just "whenever you remember"): it tops up the buffer to comfortably
// cover the future without ever touching already-written days, so past
// answers never change no matter when new mics get added or verified.
//
// Usage: node scripts/build-schedule.mjs [--launch-date=YYYY-MM-DD] [--buffer-days=N]

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const micsPath = join(root, "data", "mics.js");
const schedulePath = join(root, "data", "schedule.js");

const DEFAULT_BUFFER_DAYS = 730; // keep ~2 years of runway ahead of "today"
const BASE_SEED_STR = "MICGUESSR";

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
// numeric seed per generation (and, in js/schedule.js, per calendar date
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

// One full shuffled pass through `eligibleIds`, seeded independently per
// generation index. Retries with a salted seed on the rare chance its
// first id would match the previous generation's last id (avoids the same
// mic appearing on two consecutive days across a generation boundary).
function buildGeneration(eligibleIds, genIndex, previousLastId) {
  for (let attempt = 0; attempt < 10; attempt++) {
    const seed = hashStringToSeed(`${BASE_SEED_STR}:${genIndex}:${attempt}`);
    const shuffled = seededShuffle(eligibleIds, seed);
    if (shuffled[0] !== previousLastId || eligibleIds.length <= 1) {
      return shuffled;
    }
  }
  throw new Error(`Could not avoid boundary repeat for generation ${genIndex} after 10 attempts`);
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

  let launchDate, order, generation;

  if (!existing) {
    launchDate = args["launch-date"] || new Date().toISOString().slice(0, 10);
    order = [];
    generation = 0;
    console.log(`Initializing schedule: launch date ${launchDate}, ${eligibleIds.length} eligible mics.`);
  } else {
    launchDate = existing.launchDate;
    order = [...existing.order];
    generation = existing.generation || 0;
  }

  // Top up until we've got `bufferDays` of runway past today.
  const todayIndex = Math.floor((Date.now() - Date.parse(launchDate + "T00:00:00Z")) / 86400000);
  const targetLength = Math.max(order.length, todayIndex + bufferDays);

  const startingGeneration = generation;
  while (order.length < targetLength) {
    const previousLastId = order.length > 0 ? order[order.length - 1] : null;
    const gen = buildGeneration(eligibleIds, generation, previousLastId);
    order = order.concat(gen);
    generation += 1;
  }

  if (generation === startingGeneration) {
    console.log("Schedule already has enough runway — nothing to do.");
    return;
  }

  console.log(
    `Appended ${generation - startingGeneration} generation(s) (${eligibleIds.length} mics each) — ` +
      `schedule now covers ${order.length} days (was ${existing ? existing.order.length : 0}).`
  );

  const body = `// GENERATED by scripts/build-schedule.mjs — do not hand-edit \`order\`.
// One mic id per calendar day, starting at launchDate. The array is a
// concatenation of independently-shuffled "generations" (one full pass
// through the eligible pool each) — see the comment at the top of
// build-schedule.mjs for why that matters. Append-only: re-running the
// script only ever adds new generations to the END, so past days' answers
// never change.
const SCHEDULE = {
  launchDate: ${JSON.stringify(launchDate)},
  generation: ${generation},
  order: ${JSON.stringify(order, null, 2)}
};
if (typeof module !== "undefined") module.exports = { SCHEDULE };
`;
  writeFileSync(schedulePath, body);
  console.log(`Wrote ${schedulePath}`);
}

main();
