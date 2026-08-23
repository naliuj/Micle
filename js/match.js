// Pure round-builders for Match mode — no DOM. Mirrors js/quiz.js's and
// js/order.js's shape (and reuses their randomInt/shuffle/sample, loaded
// first).

const MATCH_DIMENSIONS = [
  {
    key: "pattern",
    label: "Polar Pattern",
    // Derived from the pool rather than hardcoded, so it stays correct if a
    // new pattern type is ever added — same philosophy as buildMcOptions'
    // distinct-value approach in js/quiz.js.
    values: (pool) => [...new Set(pool.flatMap((m) => m.polarPatterns))],
    // polarPatterns is an array (a switchable mic can have several) —
    // "has a given pattern" means the target appears anywhere in it, the
    // same set-membership semantics comparePatterns() uses in js/compare.js.
    matches: (mic, target) => mic.polarPatterns.includes(target),
    // What the results screen tells you about this mic afterwards. A mic with
    // one pattern just names it; a switchable one that matched leads with the
    // target so you can see it matched *via* that pattern rather than being
    // one — the AKG C414's six patterns would otherwise fill the row and bury
    // the point.
    describe: (mic, target) => {
      if (mic.polarPatterns.length === 1) return mic.polarPatterns[0];
      if (mic.polarPatterns.includes(target)) return `${target} + ${mic.polarPatterns.length - 1} more`;
      return mic.polarPatterns.join(" / ");
    },
  },
  {
    key: "principle",
    label: "Operating Principle",
    values: (pool) => [...new Set(pool.map((m) => m.operatingPrinciple))],
    matches: (mic, target) => mic.operatingPrinciple === target,
    describe: (mic) => mic.operatingPrinciple,
  },
];

const MATCH_ROUND_SIZE = 8;
const MATCH_MIN_PER_SIDE = 2; // at least 2 matches + 2 non-matches, or the round is trivial

function buildMatchRound(dimensionKey, pool, roundSize = MATCH_ROUND_SIZE) {
  const dim = MATCH_DIMENSIONS.find((d) => d.key === dimensionKey);
  if (!dim) return null;
  // Try candidate target values in random order until one has enough
  // population on both sides — mirrors buildQuizSession's "skip and retry"
  // guard philosophy rather than assuming the first pick always works.
  for (const target of shuffle(dim.values(pool))) {
    const matches = pool.filter((m) => dim.matches(m, target));
    const nonMatches = pool.filter((m) => !dim.matches(m, target));
    if (matches.length < MATCH_MIN_PER_SIDE || nonMatches.length < MATCH_MIN_PER_SIDE) continue;
    const maxMatches = Math.min(matches.length, roundSize - MATCH_MIN_PER_SIDE);
    const wantMatches = MATCH_MIN_PER_SIDE + randomInt(maxMatches - MATCH_MIN_PER_SIDE + 1);
    const chosen = [
      ...sample(matches, wantMatches),
      ...sample(nonMatches, Math.min(roundSize - wantMatches, nonMatches.length)),
    ];
    const items = shuffle(chosen).map((mic) => ({ mic, isMatch: dim.matches(mic, target) }));
    return { dimensionKey, target, dimLabel: dim.label, items };
  }
  return null; // no target value in this (possibly filtered) pool has enough of both sides
}

// selectedIds: a Set of mic ids the player chose as matches.
function scoreMatchRound(round, selectedIds) {
  return round.items.map((item) => {
    const selected = selectedIds.has(item.mic.id);
    return { ...item, selected, correct: selected === item.isMatch };
  });
}

function isMatchRoundFullyCorrect(scored) {
  return scored.every((s) => s.correct);
}
