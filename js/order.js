// Pure round-builders for Order mode — no DOM. Mirrors js/quiz.js's shape
// (and reuses its randomInt/shuffle/sample/formatPrice, loaded first).

const ORDER_DIMENSIONS = [
  { key: "price", label: "Price (MSRP)", getValue: (m) => m.msrp, format: formatPrice },
  { key: "year", label: "Release Year", getValue: (m) => m.releaseYear, format: (m) => String(m.releaseYear) },
];

const ORDER_ROUND_SIZE = 5;

function buildOrderRound(dimensionKey, pool, roundSize = ORDER_ROUND_SIZE) {
  const dim = ORDER_DIMENSIONS.find((d) => d.key === dimensionKey);
  if (!dim) return null;
  // msrp can be null (none exist today, but the schema allows one);
  // releaseYear never is — this guard covers both defensively.
  const candidates = pool.filter((m) => dim.getValue(m) != null);
  if (candidates.length < 2) return null; // need at least 2 mics to have an order
  const chosen = sample(candidates, Math.min(roundSize, candidates.length));
  return {
    dimensionKey,
    dimLabel: dim.label,
    items: shuffle(chosen).map((mic) => ({ mic, value: dim.getValue(mic) })),
  };
}

// Correct iff non-decreasing by value at every adjacent pair — this is what
// makes exact ties (e.g. two mics both $109, a real case in the pool) count
// as correct in either relative order, without needing to special-case ties
// at sampling time.
function isOrderFullyCorrect(arrangement) {
  for (let i = 0; i < arrangement.length - 1; i++) {
    if (arrangement[i].value > arrangement[i + 1].value) return false;
  }
  return true;
}

// Per-position feedback: compare *values* against an ascending-sorted
// reference at each index, not mic identity — so if two tied mics land in
// either order at their shared positions, both still count "in place." This
// stays consistent with isOrderFullyCorrect's tie philosophy: a fully
// correct (non-decreasing) arrangement always scores every position in
// place under this definition, and vice versa.
function scoreOrderArrangement(arrangement) {
  const sorted = [...arrangement].sort((a, b) => a.value - b.value);
  return arrangement.map((item, i) => ({ ...item, inPlace: item.value === sorted[i].value }));
}
