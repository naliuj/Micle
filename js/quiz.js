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
// against data/mics.js), not guessed — decade buckets split 3/14/7/9/28/38/
// 12/7 across 118 mics, price buckets split 20/38/34/16/10. Neither has one
// dominant bucket that would make the question trivial. (These splits shift
// slightly as mics are added — re-run the node -e check rather than hand-
// editing this comment if it drifts far enough to matter.)
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
  // Show the photo, name the mic. The one thing the six categories above
  // can't teach: a student has to recognise the mic on the stand, not recite
  // its polar pattern.
  //
  // getValue is the mic id, which is unique per mic, so buildMcOptions'
  // dedupe-by-value yields exactly one option per mic with no extra work.
  {
    key: "identify",
    label: "Identify the mic",
    getValue: (m) => m.id,
    getLabel: (m) => m.displayName,
    prompt: () => "Which microphone is this?",
    // Read by js/training.js's renderQuestion to render an image prompt.
    photo: true,
    // Only a photographed mic can be the answer. MIC_PHOTOS comes from
    // data/photos.js, which training/index.html loads before this file; the
    // guard keeps this harmless anywhere it isn't loaded.
    canAsk: (m) => typeof MIC_PHOTOS !== "undefined" && Boolean(MIC_PHOTOS[m.id]),
    conflictsWith: confusableWith,
  },
];

// Mics that look so alike in a photo that offering two of them as separate
// answers to one question has no defensible right answer. A group bars its
// members from appearing as distractors for each other — nothing else.
//
// Membership is about appearance, not lineage or spec. The AT4041 is absent
// from the Audio-Technica group because it is a slim pencil mic; it only
// looked like the 4040/4050 while its photo file was accidentally the
// 4060's. The DPA 4011C is absent from the 4011 group for the opposite
// reason: it shares the 4011's capsule but its compact body reads as clearly
// different, so telling them apart is a fair question.
//
// A member with no photo still matters. It can never be the answer, but it
// must still be barred as a distractor when a groupmate is asked — which is
// most of the point, since several of these groups are half unphotographed.
const CONFUSABLE_GROUPS = [
  ["at-at4040", "at-at4050", "at-at4060"],
  ["schoeps-cmc6-mk4", "schoeps-cmc6-mk2"],
  ["bk-4011", "dpa-4011"],
  ["bk-4007", "dpa-4007"],
  ["audix-d2", "audix-d4", "audix-d6", "audix-d6x"],
  ["austrianaudio-oc7", "austrianaudio-od5"],
  ["austrianaudio-cc8", "austrianaudio-cc8-sc"],
  // Long shotgun tubes. The Sennheiser MKH 40 is deliberately absent — it is
  // a short cardioid pencil and reads as a different shape entirely.
  ["sennheiser-mkh816", "sennheiser-mkh418s", "rode-ntg2"],
  // RODE's large-diaphragm bodies.
  ["rode-nt2a", "rode-nt1000", "rode-ntk"],
  ["earthworks-qtc40", "earthworks-sr69", "earthworks-tc25", "earthworks-tc40k"],
  ["neumann-km184", "neumann-km84", "warmaudio-wa84"],
  // The TLM 67 is the U 67's body with the tube swapped out, down to the
  // tapered grille and the badge position — at thumbnail size it is the U 87.
  ["neumann-u87ai", "neumann-u89", "neumann-u67", "neumann-tlm67"],
  ["royer-r121", "royer-r122"],
  ["shure-ksm27", "shure-ksm44"],
  // Aston's tumbled-steel pair: the same wave-mesh head and the same body,
  // differing only in length. Nothing in a photo separates them.
  ["aston-origin", "aston-spirit"],
  // Blue's yoke-mounted rectangles — same silhouette, same round mesh head,
  // and colour is the only tell, which a grey-ish thumbnail can lose.
  ["blue-cactus", "blue-blueberry"],
];

// id -> Set of the ids it must never share a question with. Built once at
// load rather than scanned per question.
const CONFUSABLE_BY_ID = (() => {
  const map = new Map();
  CONFUSABLE_GROUPS.forEach((group) => {
    group.forEach((id) => {
      map.set(id, new Set(group.filter((other) => other !== id)));
    });
  });
  return map;
})();

const NO_CONFUSABLES = new Set();

function confusableWith(id) {
  return CONFUSABLE_BY_ID.get(id) || NO_CONFUSABLES;
}

// Builds the option list for a multiple-choice question: one correct value
// plus up to `want - 1` distractors drawn from `distractorPool`'s *distinct*
// values for this category (not from other mics directly) — so a category
// with a low-population value (e.g. only one Russian-made mic) never runs
// short of distractors, since it only needs enough *distinct values* to
// exist somewhere in the pool, not enough *other mics* sharing the correct
// one. `want - 1` naturally shrinks if the category has fewer distinct
// values than needed, rather than duplicating an option or throwing.
//
// distractorPool is deliberately a separate parameter from the target pool
// in buildMcQuestion/buildQuizSession below: when a manufacturer/country
// filter narrows which mic gets *asked about*, distractor variety must still
// come from the whole eligible pool, or a filter like "Neumann only" (all
// German) would leave the Country category with zero valid wrong answers.
//
// `conflictsWith(value)` returns the Set of values that may not share a
// question with it. It is checked against every option already chosen, not
// just the correct one: two look-alikes offered as two WRONG answers is the
// same defect as one offered against the right one. Omit it and selection is
// a plain shuffle-and-take, exactly as before.
function buildMcOptions(distractorPool, getValue, getLabel, correctValue, want = 4, conflictsWith = null) {
  const seen = new Map(); // value -> label, first-seen label wins
  for (const mic of distractorPool) {
    const v = getValue(mic);
    // Skip a null value (only price, for a null-MSRP mic) — it has no real
    // bracket, so it must never surface as a selectable distractor.
    if (v != null && !seen.has(v)) seen.set(v, getLabel(mic));
  }
  const correctLabel = seen.get(correctValue);
  const alternatives = [...seen.entries()].filter(([v]) => v !== correctValue);

  if (!conflictsWith) {
    const distractors = sample(alternatives, Math.min(want - 1, alternatives.length));
    return shuffle([[correctValue, correctLabel], ...distractors]).map(([value, label]) => ({ value, label }));
  }

  // Greedy over a shuffled list rather than sample(): each pick has to be
  // checked against what's already in, so they can't all be drawn at once.
  const chosen = [[correctValue, correctLabel]];
  for (const entry of shuffle(alternatives)) {
    if (chosen.length >= want) break;
    if (chosen.some(([v]) => conflictsWith(v).has(entry[0]))) continue;
    chosen.push(entry);
  }
  return shuffle(chosen).map(([value, label]) => ({ value, label }));
}

// `asked` is a Set of "micId:categoryKey" strings already used this session,
// so the same mic isn't quizzed twice on the same category in one round.
// Candidates with a null getValue (only price, for a null-MSRP mic — none
// exist today, but the schema allows one) are skipped, since there'd be no
// correct value to build a question around. `targetPool` (which mic gets
// asked about) and `distractorPool` (where wrong-answer variety comes from)
// are separate on purpose — see buildMcOptions' comment above.
function buildMcQuestion(category, targetPool, distractorPool, asked) {
  const candidates = targetPool.filter(
    (m) =>
      !asked.has(`${m.id}:${category.key}`) &&
      category.getValue(m) != null &&
      // canAsk narrows which mics a category can be built around at all —
      // "Identify the mic" needs a photo, and most of the pool has one.
      (!category.canAsk || category.canAsk(m))
  );
  if (candidates.length === 0) return null;
  const mic = candidates[randomInt(candidates.length)];
  asked.add(`${mic.id}:${category.key}`);
  const correctValue = category.getValue(mic);
  const options = buildMcOptions(
    distractorPool, category.getValue, category.getLabel, correctValue, 4, category.conflictsWith || null
  );
  return {
    categoryKey: category.key,
    prompt: category.prompt(mic),
    mic,
    photo: Boolean(category.photo),
    options, // [{value, label}], shuffled, includes the correct one
    correctValue,
  };
}

// targetPool/distractorPool: pass the same array for both when there's no
// active filter (the unfiltered case is then identical to before this split
// existed). A filtered call narrows targetPool only.
function buildQuizSession(selectedCategoryKeys, targetPool, distractorPool, questionCount = 10) {
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
    const q = buildMcQuestion(cat, targetPool, distractorPool, asked);
    if (q) questions.push(q);
  }
  return questions;
}
