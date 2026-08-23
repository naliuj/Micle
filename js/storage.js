// localStorage persistence — versioned keys, defensive reads. Keyed by
// day index (position in SCHEDULE.order), which is what's actually stable
// — the calendar date is only used for display.

const STORAGE_VERSION = "v1";
const MAX_GUESSES = 6;

// How many past Random Mic targets a repeat is disallowed against. Persisted
// rather than kept in memory so reloading the page can't be used to reset the
// no-repeat memory.
const RANDOM_HISTORY_LIMIT = 30;

function statsKey() {
  return `micle_${STORAGE_VERSION}_stats`;
}

function dayKey(dayIndex) {
  return `micle_${STORAGE_VERSION}_day_${dayIndex}`;
}

function randomHistoryKey() {
  return `micle_${STORAGE_VERSION}_random_history`;
}

function defaultStats() {
  return {
    gamesPlayed: 0,
    gamesWon: 0,
    currentStreak: 0,
    maxStreak: 0,
    guessDistribution: Object.fromEntries(
      Array.from({ length: MAX_GUESSES }, (_, i) => [String(i + 1), 0])
    ),
    lastCompletedDayIndex: null,
  };
}

function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return fallback;
    return parsed;
  } catch (e) {
    return fallback;
  }
}

function writeJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    // localStorage unavailable (private browsing, quota) — fail silently,
    // game still works, just without persistence.
  }
}

function loadStats() {
  return { ...defaultStats(), ...readJSON(statsKey(), {}) };
}

function loadDayState(dayIndex) {
  return readJSON(dayKey(dayIndex), { guesses: [], solved: false, exhausted: false });
}

function saveDayState(dayIndex, state) {
  writeJSON(dayKey(dayIndex), state);
}

function loadRandomHistory() {
  const ids = readJSON(randomHistoryKey(), []);
  return Array.isArray(ids) ? ids : [];
}

// Appends the newest target and drops anything past RANDOM_HISTORY_LIMIT, so
// the exclusion list itself never grows unbounded in localStorage.
function recordRandomTarget(id) {
  const history = loadRandomHistory();
  history.push(id);
  writeJSON(randomHistoryKey(), history.slice(-RANDOM_HISTORY_LIMIT));
}

function recordCompletion(dayIndex, won, guessCount) {
  const stats = loadStats();
  stats.gamesPlayed += 1;
  if (won) {
    stats.gamesWon += 1;
    const key = String(Math.min(guessCount, MAX_GUESSES));
    stats.guessDistribution[key] = (stats.guessDistribution[key] || 0) + 1;
    const isConsecutive = stats.lastCompletedDayIndex === dayIndex - 1;
    stats.currentStreak = isConsecutive ? stats.currentStreak + 1 : 1;
    stats.maxStreak = Math.max(stats.maxStreak, stats.currentStreak);
  } else {
    stats.currentStreak = 0;
  }
  stats.lastCompletedDayIndex = dayIndex;
  writeJSON(statsKey(), stats);
  return stats;
}

function quizStatsKey() {
  return `micle_${STORAGE_VERSION}_quiz_stats`;
}

// QUIZ_CATEGORIES comes from js/quiz.js, loaded after this file on the
// training page — safe because this only runs when a caller invokes it
// (training.js), never at parse time, by which point quiz.js has loaded.
function defaultQuizStats() {
  return {
    totalAnswered: 0,
    totalCorrect: 0,
    byCategory: Object.fromEntries(QUIZ_CATEGORIES.map((c) => [c.key, { answered: 0, correct: 0 }])),
  };
}

function loadQuizStats() {
  const stored = readJSON(quizStatsKey(), {});
  const defaults = defaultQuizStats();
  return {
    ...defaults,
    ...stored,
    // Merged per-key rather than replaced wholesale, so a stats blob saved
    // before a category existed still gets that category's zeroed entry.
    byCategory: { ...defaults.byCategory, ...(stored.byCategory || {}) },
  };
}

function recordQuizAnswer(categoryKey, correct) {
  const stats = loadQuizStats();
  stats.totalAnswered += 1;
  if (correct) stats.totalCorrect += 1;
  const forCategory = stats.byCategory[categoryKey] || { answered: 0, correct: 0 };
  forCategory.answered += 1;
  if (correct) forCategory.correct += 1;
  stats.byCategory[categoryKey] = forCategory;
  writeJSON(quizStatsKey(), stats);
  return stats;
}

function orderStatsKey() {
  return `micle_${STORAGE_VERSION}_order_stats`;
}

// ORDER_DIMENSIONS comes from js/order.js — same lazy-reference safety as
// defaultQuizStats()'s use of QUIZ_CATEGORIES above (resolved at call time,
// not parse time).
function defaultOrderStats() {
  return {
    totalRounds: 0,
    totalFullyCorrect: 0,
    byDimension: Object.fromEntries(ORDER_DIMENSIONS.map((d) => [d.key, { rounds: 0, fullyCorrect: 0 }])),
  };
}

function loadOrderStats() {
  const stored = readJSON(orderStatsKey(), {});
  const defaults = defaultOrderStats();
  return {
    ...defaults,
    ...stored,
    byDimension: { ...defaults.byDimension, ...(stored.byDimension || {}) },
  };
}

// fullyCorrect: round-level pass/fail (every position in place) — matches
// "accuracy per dimension," partial credit is shown in the UI but not
// persisted, keeping this the same granularity as recordQuizAnswer above.
function recordOrderAnswer(dimensionKey, fullyCorrect) {
  const stats = loadOrderStats();
  stats.totalRounds += 1;
  if (fullyCorrect) stats.totalFullyCorrect += 1;
  const forDim = stats.byDimension[dimensionKey] || { rounds: 0, fullyCorrect: 0 };
  forDim.rounds += 1;
  if (fullyCorrect) forDim.fullyCorrect += 1;
  stats.byDimension[dimensionKey] = forDim;
  writeJSON(orderStatsKey(), stats);
  return stats;
}

function matchStatsKey() {
  return `micle_${STORAGE_VERSION}_match_stats`;
}

// MATCH_DIMENSIONS comes from js/match.js — same lazy-reference safety as above.
function defaultMatchStats() {
  return {
    totalRounds: 0,
    totalFullyCorrect: 0,
    byDimension: Object.fromEntries(MATCH_DIMENSIONS.map((d) => [d.key, { rounds: 0, fullyCorrect: 0 }])),
  };
}

function loadMatchStats() {
  const stored = readJSON(matchStatsKey(), {});
  const defaults = defaultMatchStats();
  return {
    ...defaults,
    ...stored,
    byDimension: { ...defaults.byDimension, ...(stored.byDimension || {}) },
  };
}

function recordMatchAnswer(dimensionKey, fullyCorrect) {
  const stats = loadMatchStats();
  stats.totalRounds += 1;
  if (fullyCorrect) stats.totalFullyCorrect += 1;
  const forDim = stats.byDimension[dimensionKey] || { rounds: 0, fullyCorrect: 0 };
  forDim.rounds += 1;
  if (fullyCorrect) forDim.fullyCorrect += 1;
  stats.byDimension[dimensionKey] = forDim;
  writeJSON(matchStatsKey(), stats);
  return stats;
}
