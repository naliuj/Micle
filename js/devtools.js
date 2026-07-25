// Debug helpers for MicGuessr.
//
// Console API (always available, no URL flag needed):
//   MicGuessrDebug.getState()      -> { dateStr, target, dayState, stats }
//   MicGuessrDebug.revealAnswer()  -> logs + returns today's target mic
//   MicGuessrDebug.winInstantly()  -> marks today solved with the correct guess, reloads
//   MicGuessrDebug.loseInstantly() -> fills today with 10 wrong guesses, reloads
//   MicGuessrDebug.resetToday()    -> clears today's progress, reloads
//   MicGuessrDebug.resetAll()      -> clears all MicGuessr localStorage, reloads
//   MicGuessrDebug.gotoDate(str)   -> navigates to that calendar date (requires ?debug=1, reloads)
//   MicGuessrDebug.poolStats()     -> { total, eligible, quarantined }
//
// Visual panel: add ?debug=1 to the URL (also unlocks ?date=YYYY-MM-DD to
// preview any date's mic without touching your system clock).

(function () {
  function currentTarget() {
    return todayTargetMic();
  }

  function poolStats() {
    const total = MIC_DB.length;
    const eligible = eligibleMics().length;
    return { total, eligible, quarantined: total - eligible };
  }

  function winInstantly() {
    const { dateStr, mic } = currentTarget();
    const state = { guesses: [mic.id], solved: true, exhausted: false };
    saveDayState(dateStr, state);
    recordCompletion(dateStr, true, 1);
    location.reload();
  }

  function loseInstantly() {
    const { dateStr, mic } = currentTarget();
    const wrongGuesses = MIC_DB.filter((m) => m.id !== mic.id)
      .slice(0, MAX_GUESSES)
      .map((m) => m.id);
    const state = { guesses: wrongGuesses, solved: false, exhausted: true };
    saveDayState(dateStr, state);
    recordCompletion(dateStr, false, wrongGuesses.length);
    location.reload();
  }

  function resetToday() {
    const { dateStr } = currentTarget();
    localStorage.removeItem(dateKey(dateStr));
    location.reload();
  }

  function resetAll() {
    Object.keys(localStorage)
      .filter((k) => k.startsWith("micguessr_"))
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
    const { dateStr, mic } = currentTarget();
    return { dateStr, target: mic, dayState: loadDayState(dateStr), stats: loadStats() };
  }

  function revealAnswer() {
    const { mic, dateStr } = currentTarget();
    console.log(`[MicGuessr] ${dateStr} answer:`, mic.displayName, mic);
    return mic;
  }

  window.MicGuessrDebug = {
    getState,
    revealAnswer,
    winInstantly,
    loseInstantly,
    resetToday,
    resetAll,
    gotoDate,
    poolStats,
  };

  const params = new URLSearchParams(location.search);
  if (params.get("debug") !== "1") return;

  function buildPanel() {
    const { dateStr, mic } = currentTarget();
    const stats = poolStats();

    const panel = document.createElement("div");
    panel.id = "mg-debug-panel";
    panel.innerHTML = `
      <strong>MicGuessr Debug</strong>
      <div>Date: ${dateStr}</div>
      <div>Pool: ${stats.eligible} eligible / ${stats.total} total (${stats.quarantined} quarantined)</div>
      <div class="mg-debug-answer" hidden>Answer: <strong></strong></div>
      <div class="mg-debug-row">
        <button data-action="reveal">Reveal</button>
        <button data-action="win">Win instantly</button>
        <button data-action="lose">Lose instantly</button>
      </div>
      <div class="mg-debug-row">
        <button data-action="reset-today">Reset today</button>
        <button data-action="reset-all">Reset all</button>
      </div>
      <div class="mg-debug-row">
        <input type="date" class="mg-debug-date-input" value="${dateStr}" />
        <button data-action="goto">Go to date</button>
      </div>
    `;
    document.body.appendChild(panel);

    panel.querySelector('[data-action="reveal"]').addEventListener("click", () => {
      const answerEl = panel.querySelector(".mg-debug-answer");
      answerEl.hidden = false;
      answerEl.querySelector("strong").textContent = mic.displayName;
      revealAnswer();
    });
    panel.querySelector('[data-action="win"]').addEventListener("click", winInstantly);
    panel.querySelector('[data-action="lose"]').addEventListener("click", loseInstantly);
    panel.querySelector('[data-action="reset-today"]').addEventListener("click", resetToday);
    panel.querySelector('[data-action="reset-all"]').addEventListener("click", resetAll);
    panel.querySelector('[data-action="goto"]').addEventListener("click", () => {
      const val = panel.querySelector(".mg-debug-date-input").value;
      if (val) gotoDate(val);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", buildPanel);
  } else {
    buildPanel();
  }
})();
