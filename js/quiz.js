// Pure quiz-question builders — no DOM, no state. Mirrors js/compare.js's
// design: takes its data pool as a parameter rather than reading MIC_DB
// itself, so it's hand-testable in isolation.

// crypto.getRandomValues draws fresh OS entropy on every call, rather than
// relying on a single engine-seeded state the way Math.random() does — same
// approach as js/app.js's randomInt (duplicated here since this page doesn't
// load app.js). Falls back to Math.random() only if the Web Crypto API is
// unavailable (very old browsers).
function randomInt(n) {
  if (n <= 0) return 0;
  if (window.crypto && window.crypto.getRandomValues) {
    // Rejection sampling: without it, `raw % n` is biased toward the low end
    // whenever n doesn't evenly divide 2^32.
    const range = Math.floor(0x100000000 / n) * n;
    const buf = new Uint32Array(1);
    let raw;
    do {
      window.crypto.getRandomValues(buf);
      raw = buf[0];
    } while (raw >= range);
    return raw % n;
  }
  return Math.floor(Math.random() * n);
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function sample(arr, k) {
  return shuffle(arr).slice(0, k);
}

// Arrays aren't deep-equal by === or in a Set, so multi-pattern mics need a
// canonical string form to dedupe/compare by. Sorting makes pattern order
// irrelevant, matching comparePatterns()'s own set-equality semantics in
// js/compare.js — two mics with the same patterns in different array order
// still collapse to one signature/option here.
function patternSignature(mic) {
  return [...mic.polarPatterns].sort().join("|") + (mic.switchable ? "+SW" : "");
}

function formatPatterns(mic) {
  const base = mic.polarPatterns.join(", ");
  return mic.switchable ? `${base} (switchable)` : base;
}

function formatPrice(mic) {
  return mic.msrp == null ? "Unknown" : `$${mic.msrp.toLocaleString("en-US")}`;
}

// Bucket edges chosen against the real pool (checked via a one-off node -e
// against data/mics.js), not guessed — decade buckets split 3/14/7/9/25/34/
// 13/6 across 111 mics, price buckets split 19/37/32/13/10. Neither has one
// dominant bucket that would make the question trivial.
const YEAR_BUCKET_EDGES = [1960, 1970, 1980, 1990, 2000, 2010, 2020];
const YEAR_BUCKET_LABELS = ["Before 1960", "1960s", "1970s", "1980s", "1990s", "2000s", "2010s", "2020s"];

function yearBucket(mic) {
  let i = 0;
  while (i < YEAR_BUCKET_EDGES.length && mic.releaseYear >= YEAR_BUCKET_EDGES[i]) i++;
  return YEAR_BUCKET_LABELS[i];
}

const PRICE_BUCKET_EDGES = [300, 800, 2000, 5000];
const PRICE_BUCKET_LABELS = ["Under $300", "$300–$800", "$800–$2,000", "$2,000–$5,000", "$5,000+"];

// null for a null-MSRP mic (none exist today, but the schema allows one) —
// buildMcQuestion's null-value filter excludes it from this category.
function priceBucket(mic) {
  if (mic.msrp == null) return null;
  let i = 0;
  while (i < PRICE_BUCKET_EDGES.length && mic.msrp >= PRICE_BUCKET_EDGES[i]) i++;
  return PRICE_BUCKET_LABELS[i];
}

const QUIZ_CATEGORIES = [
  {
    key: "manufacturer",
    label: "Manufacturer",
    getValue: (m) => m.manufacturer,
    getLabel: (m) => m.manufacturer,
    // Uses model, not manufacturer/displayName, so the prompt never leaks
    // its own answer (data/mics.js's `model` field never embeds the brand).
    prompt: (m) => `Which manufacturer makes the ${m.model}?`,
  },
  {
    key: "country",
    label: "Country of Origin",
    getValue: (m) => m.countryOfOrigin,
    getLabel: (m) => m.countryOfOrigin,
    prompt: (m) => `Where is the ${m.displayName} from?`,
  },
  {
    key: "principle",
    label: "Operating Principle",
    getValue: (m) => m.operatingPrinciple,
    getLabel: (m) => m.operatingPrinciple,
    prompt: (m) => `What's the ${m.displayName}'s operating principle?`,
  },
  {
    key: "pattern",
    label: "Polar Pattern",
    getValue: patternSignature,
    getLabel: formatPatterns,
    prompt: (m) => `What polar pattern(s) does the ${m.displayName} have?`,
  },
  {
    key: "year",
    label: "Release Year",
    getValue: yearBucket,
    getLabel: yearBucket,
    prompt: (m) => `What decade was the ${m.displayName} released in?`,
  },
  {
    key: "price",
    label: "Price (MSRP)",
    getValue: priceBucket,
    getLabel: priceBucket,
    prompt: (m) => `What price bracket is the ${m.displayName} in?`,
  },
];

// Builds the option list for a multiple-choice question: one correct value
// plus up to `want - 1` distractors drawn from the pool's *distinct* values
// for this category (not from other mics directly) — so a category with a
// low-population value (e.g. only one Russian-made mic) never runs short of
// distractors, since it only needs enough *distinct values* to exist
// somewhere in the pool, not enough *other mics* sharing the correct one.
// `want - 1` naturally shrinks if the category has fewer distinct values
// than needed, rather than duplicating an option or throwing.
function buildMcOptions(pool, getValue, getLabel, correctValue, want = 4) {
  const seen = new Map(); // value -> label, first-seen label wins
  for (const mic of pool) {
    const v = getValue(mic);
    // Skip a null value (only price, for a null-MSRP mic) — it has no real
    // bracket, so it must never surface as a selectable distractor.
    if (v != null && !seen.has(v)) seen.set(v, getLabel(mic));
  }
  const alternatives = [...seen.entries()].filter(([v]) => v !== correctValue);
  const distractors = sample(alternatives, Math.min(want - 1, alternatives.length));
  const correctLabel = seen.get(correctValue);
  return shuffle([[correctValue, correctLabel], ...distractors]).map(([value, label]) => ({ value, label }));
}

// `asked` is a Set of "micId:categoryKey" strings already used this session,
// so the same mic isn't quizzed twice on the same category in one round.
// Candidates with a null getValue (only price, for a null-MSRP mic — none
// exist today, but the schema allows one) are skipped, since there'd be no
// correct value to build a question around.
function buildMcQuestion(category, pool, asked) {
  const candidates = pool.filter(
    (m) => !asked.has(`${m.id}:${category.key}`) && category.getValue(m) != null
  );
  if (candidates.length === 0) return null;
  const mic = candidates[randomInt(candidates.length)];
  asked.add(`${mic.id}:${category.key}`);
  const correctValue = category.getValue(mic);
  const options = buildMcOptions(pool, category.getValue, category.getLabel, correctValue);
  return {
    categoryKey: category.key,
    prompt: category.prompt(mic),
    mic,
    options, // [{value, label}], shuffled, includes the correct one
    correctValue,
  };
}

function buildQuizSession(selectedCategoryKeys, pool, questionCount = 10) {
  const cats = QUIZ_CATEGORIES.filter((c) => selectedCategoryKeys.includes(c.key));
  if (cats.length === 0) return [];
  const asked = new Set();
  const questions = [];
  let guard = 0;
  // Guarded rather than infinite: a question builder can legitimately return
  // null (e.g. a category exhausted this round), and this bounds retries
  // instead of looping forever if a selection can't fill questionCount.
  while (questions.length < questionCount && guard++ < questionCount * 10) {
    const cat = cats[randomInt(cats.length)];
    const q = buildMcQuestion(cat, pool, asked);
    if (q) questions.push(q);
  }
  return questions;
}
