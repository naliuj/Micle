// Debug helpers for MicGuessr.
//
// Console API (always available, no URL flag needed):
//   MicGuessrDebug.getState()      -> { dayIndex, target, dayState, stats }
//   MicGuessrDebug.revealAnswer()  -> logs + returns today's target mic
//   MicGuessrDebug.winInstantly()  -> marks today solved with the correct guess, reloads
//   MicGuessrDebug.loseInstantly() -> fills today with 10 wrong guesses, reloads
//   MicGuessrDebug.resetToday()    -> clears today's progress, reloads
//   MicGuessrDebug.resetAll()      -> clears all MicGuessr localStorage, reloads
//   MicGuessrDebug.gotoDay(n)      -> navigates to puzzle #n+1 (requires ?debug=1, reloads)
//   MicGuessrDebug.poolStats()     -> { total, eligible, quarantined }
//
// Visual panel: add ?debug=1 to the URL (also unlocks ?day=N to jump the
// puzzle date without touching your system clock).

(function () {
  function currentTarget() {
    return todayTargetMic();
  }

  function poolStats() {
    const total = MIC_DB.length;
    const eligible = SCHEDULE.order.length;
    return { total, eligible, quarantined: total - eligible };
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
      .filter((k) => k.startsWith("micguessr_"))
      .forEach((k) => localStorage.removeItem(k));
    location.reload();
  }

  function gotoDay(n) {
    const params = new URLSearchParams(location.search);
    params.set("debug", "1");
    params.set("day", String(n));
    location.search = params.toString();
  }

  function getState() {
    const { dayIndex, mic } = currentTarget();
    return { dayIndex, target: mic, dayState: loadDayState(dayIndex), stats: loadStats() };
  }

  function revealAnswer() {
    const { mic, dayIndex } = currentTarget();
    console.log(`[MicGuessr] Day #${dayIndex + 1} answer:`, mic.displayName, mic);
    return mic;
  }

  window.MicGuessrDebug = {
    getState,
    revealAnswer,
    winInstantly,
    loseInstantly,
    resetToday,
    resetAll,
    gotoDay,
    poolStats,
  };

  const params = new URLSearchParams(location.search);
  if (params.get("debug") !== "1") return;

  function buildPanel() {
    const { dayIndex, mic } = currentTarget();
    const stats = poolStats();

    const panel = document.createElement("div");
    panel.id = "mg-debug-panel";
    panel.innerHTML = `
      <strong>MicGuessr Debug</strong>
      <div>Day #${dayIndex + 1} (index ${dayIndex})</div>
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
        <input type="number" class="mg-debug-day-input" placeholder="day #" min="1" />
        <button data-action="goto">Go to day</button>
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
      const val = parseInt(panel.querySelector(".mg-debug-day-input").value, 10);
      if (!Number.isNaN(val)) gotoDay(val - 1);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", buildPanel);
  } else {
    buildPanel();
  }
})();
