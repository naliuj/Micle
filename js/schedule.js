// Resolves "today's" target mic by seeding a deterministic PRNG with
// today's calendar date and picking a random mic from the eligible pool
// (needsVerification !== true) — no precomputed schedule file.
//
// Trade-off, accepted deliberately for simplicity: the pick for a given
// date depends on the CURRENT contents of the eligible pool, not a frozen
// snapshot. Adding a new mic to data/mics.js (or flipping a mic's
// needsVerification flag) can therefore change which mic a given date
// resolves to — including, in principle, a date that already happened, if
// revisited after the pool changes. There's also no anti-repeat logic:
// independent per-date sampling can land on the same mic on two different
// dates by chance. See README.md.

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

// FNV-1a — small deterministic string hash, used to turn a date string into
// a PRNG seed.
function hashStringToSeed(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function localDateString(now = new Date()) {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function debugDateOverride() {
  const params = new URLSearchParams(location.search);
  if (params.get("debug") !== "1") return null;
  return params.get("date") || null;
}

function todayDateString(now = new Date()) {
  return debugDateOverride() || localDateString(now);
}

function eligibleMics() {
  return MIC_DB.filter((m) => m.needsVerification !== true);
}

function targetForDate(dateStr) {
  const pool = eligibleMics();
  const rng = mulberry32(hashStringToSeed(dateStr));
  const index = Math.floor(rng() * pool.length);
  return pool[index];
}

function todayTargetMic(now = new Date()) {
  const dateStr = todayDateString(now);
  return { dateStr, mic: targetForDate(dateStr) };
}
