// Debug helpers for Micle — console-only, no visual UI. All of these act on
// whichever mode (Daily Puzzle / Random Mic) is currently on screen — check
// MicleDebug.getState().mode if you're not sure which one that is.
//
//   MicleDebug.getState()            -> { mode, target, state, [dayIndex, dateStr, stats if Daily] }
//   MicleDebug.revealAnswer()        -> logs + returns the current target mic
//   MicleDebug.setTarget(query)      -> Random Mic only: sets the target to a matching mic, fresh round
//   MicleDebug.winInstantly()        -> marks the round solved with the correct guess
//   MicleDebug.loseInstantly()       -> fills the round with MAX_GUESSES wrong guesses
//   MicleDebug.resetToday()          -> Daily: clears today's progress, reloads. Random: starts a fresh round in place.
//   MicleDebug.resetAll()            -> clears all Micle localStorage, reloads
//   MicleDebug.gotoDate(str)         -> jumps Daily to that calendar date (adds ?debug=1&date=..., reloads)
//   MicleDebug.poolStats()           -> { total, eligible, quarantined, scheduleLength }
//   MicleDebug.showPossibleGuesses() -> logs + returns every eligible mic still consistent with all guesses so far
//
// Random-mode sessions live only in memory (never localStorage, by design —
// see README), so unlike Daily these mutate session().state directly and
// call refreshView() to reflect it immediately, rather than the
// write-then-reload approach Daily uses. See window.MicleApp in js/app.js
// for the bridge this reads.

(function () {
  function isDaily() {
    return MicleApp.getMode() === "daily";
  }

  // Exact id first, then exact displayName (case-insensitive), then a
  // substring match against displayName/aliases — same leniency the
  // in-game autocomplete gives players, minus the accent/punctuation
  // folding, since this is typed by whoever's testing, not guessed blind.
  function findMic(query) {
    const q = query.trim().toLowerCase();
    return (
      MIC_DB.find((m) => m.id === query) ||
      MIC_DB.find((m) => m.displayName.toLowerCase() === q) ||
      MIC_DB.find(
        (m) => m.displayName.toLowerCase().includes(q) || m.aliases.some((a) => a.toLowerCase().includes(q))
      )
    );
  }

  function poolStats() {
    const total = MIC_DB.length;
    const eligible = MIC_DB.filter((m) => m.needsVerification !== true).length;
    return { total, eligible, quarantined: total - eligible, scheduleLength: SCHEDULE.order.length };
  }

  function winInstantly() {
    const s = MicleApp.getSession();
    if (isDaily()) {
      const state = { guesses: [s.target.id], solved: true, exhausted: false };
      saveDayState(s.dayIndex, state);
      recordCompletion(s.dayIndex, true, 1);
      location.reload();
      return;
    }
    s.state.guesses = [s.target.id];
    s.state.solved = true;
    s.state.exhausted = false;
    s.guessedIds.add(s.target.id);
    MicleApp.refreshView();
  }

  function loseInstantly() {
    const s = MicleApp.getSession();
    const wrongGuesses = MIC_DB.filter((m) => m.id !== s.target.id)
      .slice(0, MAX_GUESSES)
      .map((m) => m.id);
    if (isDaily()) {
      const state = { guesses: wrongGuesses, solved: false, exhausted: true };
      saveDayState(s.dayIndex, state);
      recordCompletion(s.dayIndex, false, wrongGuesses.length);
      location.reload();
      return;
    }
    s.state.guesses = wrongGuesses;
    s.state.solved = false;
    s.state.exhausted = true;
    wrongGuesses.forEach((id) => s.guessedIds.add(id));
    MicleApp.refreshView();
  }

  function resetToday() {
    if (isDaily()) {
      localStorage.removeItem(dayKey(MicleApp.getSession().dayIndex));
      location.reload();
      return;
    }
    MicleApp.newRandomRound();
    MicleApp.refreshView();
  }

  // Random Mic only — Daily's target comes from the committed schedule, and
  // letting this touch it would undermine the whole point of that schedule
  // (a stable, non-reroll-able history of past answers). Starts a fresh
  // round with the chosen mic as target, same as a manual "New Mic" click
  // but with a picked answer instead of a random one — handy for setting up
  // a specific scenario to test comparisons/hints/showPossibleGuesses against.
  function setTarget(query) {
    if (isDaily()) {
      console.warn("[Micle] setTarget() only works in Random Mic mode — switch modes first.");
      return;
    }
    const mic = findMic(query);
    if (!mic) {
      console.warn(`[Micle] No mic found matching "${query}".`);
      return;
    }
    const s = MicleApp.getSession();
    s.target = mic;
    s.state.guesses = [];
    s.state.solved = false;
    s.state.exhausted = false;
    s.guessedIds.clear();
    MicleApp.refreshView();
    console.log("[Micle] Target set to:", mic.displayName, mic);
    return mic;
  }

  function resetAll() {
    Object.keys(localStorage)
      .filter((k) => k.startsWith("micle_"))
      .forEach((k) => localStorage.removeItem(k));
    location.reload();
  }

  function gotoDate(dateStr) {
    const params = new URLSearchParams(location.search);
    params.set("debug", "1");
    params.set("date", dateStr);
    location.search = params.toString();
  }

  function getState() {
    const mode = MicleApp.getMode();
    const s = MicleApp.getSession();
    const base = { mode, target: s.target, state: s.state };
    if (mode !== "daily") return base;
    return { ...base, dayIndex: s.dayIndex, dateStr: s.dateStr, stats: loadStats() };
  }

  function revealAnswer() {
    const mode = MicleApp.getMode();
    const s = MicleApp.getSession();
    if (mode === "daily") {
      console.log(`[Micle] Puzzle #${s.dayIndex + 1} (${s.dateStr}) answer:`, s.target.displayName, s.target);
    } else {
      console.log(`[Micle] ${mode} answer:`, s.target.displayName, s.target);
    }
    return s.target;
  }

  // Re-derives, from the guesses already on the board, every eligible mic
  // that's still indistinguishable from the target — i.e. every candidate
  // `c` where compareGuess(guess, c) reproduces the exact result already
  // shown for that guess, for every guess made so far. That covers all six
  // categories at once: an exact match pins the required value, a no-match
  // excludes the guessed value (without requiring any particular other
  // value), a partial/no-match pattern reproduces the same overlap logic,
  // and higher/lower keeps candidates on the correct side of the guessed
  // year/price. Reuses compareGuess() itself rather than reimplementing
  // that per-category logic, so it can't drift from what the board actually
  // displays.
  function showPossibleGuesses() {
    const s = MicleApp.getSession();
    const guesses = s.state.guesses.map(MicleApp.micById);
    const pool = MicleApp.eligibleMics();
    if (guesses.length === 0) {
      console.log(`[Micle] No guesses yet — all ${pool.length} eligible mics are still possible.`);
      return pool.map((m) => m.displayName);
    }
    const observed = guesses.map((g) => JSON.stringify(compareGuess(g, s.target)));
    const candidates = pool.filter((candidate) =>
      guesses.every((g, i) => JSON.stringify(compareGuess(g, candidate)) === observed[i])
    );
    console.log(`[Micle] ${candidates.length} mic(s) still consistent with every guess so far:`);
    candidates.forEach((m) => console.log(" -", m.displayName));
    return candidates.map((m) => m.displayName);
  }

  window.MicleDebug = {
    getState,
    revealAnswer,
    setTarget,
    winInstantly,
    loseInstantly,
    resetToday,
    resetAll,
    gotoDate,
    poolStats,
    showPossibleGuesses,
  };
})();
