// Debug helpers for Micle — console-only, no visual UI.
//
//   MicleDebug.getState()      -> { dayIndex, dateStr, target, dayState, stats }
//   MicleDebug.revealAnswer()  -> logs + returns today's target mic
//   MicleDebug.winInstantly()  -> marks today solved with the correct guess, reloads
//   MicleDebug.loseInstantly() -> fills today with 10 wrong guesses, reloads
//   MicleDebug.resetToday()    -> clears today's progress, reloads
//   MicleDebug.resetAll()      -> clears all Micle localStorage, reloads
//   MicleDebug.gotoDate(str)   -> jumps to that calendar date (adds ?debug=1&date=..., reloads)
//   MicleDebug.poolStats()     -> { total, eligible, quarantined, scheduleLength }

(function () {
  function currentTarget() {
    return todayTargetMic();
  }

  function poolStats() {
    const total = MIC_DB.length;
    const eligible = MIC_DB.filter((m) => m.needsVerification !== true).length;
    return { total, eligible, quarantined: total - eligible, scheduleLength: SCHEDULE.order.length };
  }

  function winInstantly() {
    const { dayIndex, mic } = currentTarget();
    const state = { guesses: [mic.id], solved: true, exhausted: false };
    saveDayState(dayIndex, state);
    recordCompletion(dayIndex, true, 1);
    location.reload();
  }

  function loseInstantly() {
    const { dayIndex, mic } = currentTarget();
    const wrongGuesses = MIC_DB.filter((m) => m.id !== mic.id)
      .slice(0, MAX_GUESSES)
      .map((m) => m.id);
    const state = { guesses: wrongGuesses, solved: false, exhausted: true };
    saveDayState(dayIndex, state);
    recordCompletion(dayIndex, false, wrongGuesses.length);
    location.reload();
  }

  function resetToday() {
    const { dayIndex } = currentTarget();
    localStorage.removeItem(dayKey(dayIndex));
    location.reload();
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
    const { dayIndex, dateStr, mic } = currentTarget();
    return { dayIndex, dateStr, target: mic, dayState: loadDayState(dayIndex), stats: loadStats() };
  }

  function revealAnswer() {
    const { mic, dayIndex, dateStr } = currentTarget();
    console.log(`[Micle] Puzzle #${dayIndex + 1} (${dateStr}) answer:`, mic.displayName, mic);
    return mic;
  }

  window.MicleDebug = {
    getState,
    revealAnswer,
    winInstantly,
    loseInstantly,
    resetToday,
    resetAll,
    gotoDate,
    poolStats,
  };
})();
