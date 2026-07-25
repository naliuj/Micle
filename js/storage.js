// localStorage persistence — versioned keys, defensive reads. Keyed by
// day index (position in SCHEDULE.order), which is what's actually stable
// — the calendar date is only used for display.

const STORAGE_VERSION = "v1";
const MAX_GUESSES = 10;

function statsKey() {
  return `micguessr_${STORAGE_VERSION}_stats`;
}

function dayKey(dayIndex) {
  return `micguessr_${STORAGE_VERSION}_day_${dayIndex}`;
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
