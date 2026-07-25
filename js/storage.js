// localStorage persistence — versioned keys, defensive reads. Keyed by
// calendar date string (YYYY-MM-DD), matching the date-seeded daily pick
// in js/schedule.js.

const STORAGE_VERSION = "v1";
const MAX_GUESSES = 10;

function statsKey() {
  return `micguessr_${STORAGE_VERSION}_stats`;
}

function dateKey(dateStr) {
  return `micguessr_${STORAGE_VERSION}_day_${dateStr}`;
}

function previousDateString(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() - 1);
  return dt.toISOString().slice(0, 10);
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
    lastCompletedDate: null,
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

function loadDayState(dateStr) {
  return readJSON(dateKey(dateStr), { guesses: [], solved: false, exhausted: false });
}

function saveDayState(dateStr, state) {
  writeJSON(dateKey(dateStr), state);
}

function recordCompletion(dateStr, won, guessCount) {
  const stats = loadStats();
  stats.gamesPlayed += 1;
  if (won) {
    stats.gamesWon += 1;
    const key = String(Math.min(guessCount, MAX_GUESSES));
    stats.guessDistribution[key] = (stats.guessDistribution[key] || 0) + 1;
    const isConsecutive = stats.lastCompletedDate === previousDateString(dateStr);
    stats.currentStreak = isConsecutive ? stats.currentStreak + 1 : 1;
    stats.maxStreak = Math.max(stats.maxStreak, stats.currentStreak);
  } else {
    stats.currentStreak = 0;
  }
  stats.lastCompletedDate = dateStr;
  writeJSON(statsKey(), stats);
  return stats;
}
