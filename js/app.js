(function () {
  const HI_LO_KEYS = new Set(["year", "price"]);

  const CATEGORIES = [
    { key: "country", label: "Origin", getValue: (m) => m.countryOfOrigin },
    { key: "principle", label: "Principle", getValue: (m) => m.operatingPrinciple },
    { key: "pattern", label: "Polar Pattern", getValue: patternLabel },
    { key: "manufacturer", label: "Manufacturer", getValue: (m) => m.manufacturer },
    { key: "year", label: "Year", getValue: (m) => String(m.releaseYear) },
    { key: "price", label: "Price", getValue: msrpLabel },
  ];

  function patternLabel(mic) {
    const base = mic.polarPatterns.join(" / ");
    return mic.switchable ? `${base} (Switchable)` : base;
  }

  function msrpLabel(mic) {
    return mic.msrp == null ? "Unknown" : `$${mic.msrp.toLocaleString("en-US")}`;
  }

  const SHARE_EMOJI = {
    match: "🟩",
    partial: "🟨",
    "no-match": "⬛",
    unknown: "⬜",
    higher: "⬆️",
    lower: "⬇️",
  };

  function buildShareText() {
    const { dayIndex, target, state } = daily;
    const scoreLabel = state.solved ? String(state.guesses.length) : "X";
    const header = `Micle ${(dayIndex + 1).toLocaleString("en-US")} ${scoreLabel}/${MAX_GUESSES}`;
    const rows = state.guesses.map((id) => {
      const guessMic = micById(id);
      const won = isWinningGuess(guessMic, target);
      const result = compareGuess(guessMic, target);
      return CATEGORIES.map((cat) => {
        if (won) return SHARE_EMOJI.match;
        const isHiLo = HI_LO_KEYS.has(cat.key);
        const cellState = isHiLo ? result[cat.key].state : result[cat.key];
        return SHARE_EMOJI[cellState] || SHARE_EMOJI["no-match"];
      }).join("");
    });
    return [header, "", ...rows].join("\n");
  }

  async function copyShareText() {
    const text = buildShareText();
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (e) {
      // Fallback for browsers/contexts without the async Clipboard API.
      try {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        const ok = document.execCommand("copy");
        document.body.removeChild(ta);
        return ok;
      } catch (e2) {
        return false;
      }
    }
  }

  function formatDateLabel(dateStr) {
    const [y, m, d] = dateStr.split("-").map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d));
    return dt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
  }

  function eligibleMics() {
    return MIC_DB.filter((m) => m.needsVerification !== true);
  }

  function randomEligibleMic() {
    const pool = eligibleMics();
    return pool[Math.floor(Math.random() * pool.length)];
  }

  const els = {
    input: document.getElementById("guess-input"),
    list: document.getElementById("ac-list"),
    board: document.getElementById("board"),
    guessesLeft: document.getElementById("guesses-left"),
    status: document.getElementById("status-banner"),
    dayLabel: document.getElementById("day-label"),
    statsBtn: document.getElementById("stats-btn"),
    statsModal: document.getElementById("stats-modal"),
    statsBody: document.getElementById("stats-body"),
    statsClose: document.getElementById("stats-close"),
    shareBtn: document.getElementById("share-btn"),
    modeDailyBtn: document.getElementById("mode-daily-btn"),
    modeRandomBtn: document.getElementById("mode-random-btn"),
    modeNote: document.getElementById("mode-note"),
    newRandomBtn: document.getElementById("new-random-btn"),
  };

  // Two independent game sessions living side by side: the persistent daily
  // puzzle (saved to localStorage, feeds stats/streak) and an ephemeral,
  // unlimited-replay random session (in-memory only — resets on reload,
  // never touches stats). `mode` picks which one the UI is currently
  // driving; switching modes never mutates the other session's state.
  const daily = (() => {
    const { dayIndex, dateStr, mic } = todayTargetMic();
    const state = loadDayState(dayIndex);
    return { dayIndex, dateStr, target: mic, state, guessedIds: new Set(state.guesses) };
  })();

  let random = null;

  function newRandomRound() {
    random = {
      target: randomEligibleMic(),
      state: { guesses: [], solved: false, exhausted: false },
      guessedIds: new Set(),
    };
  }

  let mode = "daily";

  function session() {
    return mode === "daily" ? daily : random;
  }

  function micById(id) {
    return MIC_DB.find((m) => m.id === id);
  }

  function renderHeaderRow() {
    const row = document.createElement("div");
    row.className = "board-row board-row--header";
    const guessCell = document.createElement("div");
    guessCell.className = "cell cell--guess";
    guessCell.textContent = "Guess";
    row.appendChild(guessCell);
    for (const cat of CATEGORIES) {
      const c = document.createElement("div");
      c.className = "cell cell--header";
      c.textContent = cat.label;
      row.appendChild(c);
    }
    els.board.appendChild(row);
  }

  function renderGuessRow(guessMic) {
    const target = session().target;
    const result = compareGuess(guessMic, target);
    const won = isWinningGuess(guessMic, target);
    const row = document.createElement("div");
    row.className = "board-row";

    const nameCell = document.createElement("div");
    nameCell.className = "cell cell--guess";
    nameCell.textContent = guessMic.displayName;
    row.appendChild(nameCell);

    for (const cat of CATEGORIES) {
      const cell = document.createElement("div");
      const isHiLo = HI_LO_KEYS.has(cat.key);
      const state = won ? "match" : isHiLo ? result[cat.key].state : result[cat.key];
      cell.className = `cell cell--${state}`;
      let text = cat.getValue(guessMic);
      let icon = state === "match" ? "✓" : state === "partial" ? "◐" : "✗";
      if (isHiLo && !won) {
        if (state === "higher") icon = "↑";
        else if (state === "lower") icon = "↓";
        else if (state === "unknown") icon = "?";
        else icon = "✓";
      }
      cell.innerHTML = `<span class="cell-icon" aria-hidden="true">${icon}</span><span class="cell-text">${text}</span>`;
      row.appendChild(cell);
    }
    els.board.appendChild(row);
  }

  function renderBoard() {
    els.board.innerHTML = "";
    renderHeaderRow();
    for (const id of session().state.guesses) {
      renderGuessRow(micById(id));
    }
    updateGuessesLeft();
  }

  function updateGuessesLeft() {
    const s = session();
    const remaining = MAX_GUESSES - s.state.guesses.length;
    els.guessesLeft.textContent = s.state.solved
      ? "Solved!"
      : s.state.exhausted
        ? "Out of guesses"
        : `${remaining} guess${remaining === 1 ? "" : "es"} left`;
  }

  function lockInput() {
    const s = session();
    els.input.disabled = true;
    els.input.placeholder = s.state.solved
      ? "You got it!"
      : mode === "daily"
        ? "Better luck tomorrow"
        : "Try a new random mic!";
  }

  function unlockInput() {
    els.input.disabled = false;
    els.input.placeholder = "Type a microphone name…";
  }

  function showStatus(message) {
    els.status.textContent = message;
    els.status.hidden = false;
  }

  function hideStatus() {
    els.status.hidden = true;
    els.status.textContent = "";
  }

  function submitGuess(mic) {
    const s = session();
    const target = s.target;
    const isDaily = mode === "daily";
    if (s.state.solved || s.state.exhausted) return;
    if (s.guessedIds.has(mic.id)) return;

    s.guessedIds.add(mic.id);
    s.state.guesses.push(mic.id);
    renderGuessRow(mic);
    updateGuessesLeft();

    const won = isWinningGuess(mic, target);
    if (won) {
      s.state.solved = true;
      if (isDaily) {
        saveDayState(daily.dayIndex, daily.state);
        recordCompletion(daily.dayIndex, true, s.state.guesses.length);
      }
      updateGuessesLeft();
      lockInput();
      showStatus(`Solved in ${s.state.guesses.length} guess${s.state.guesses.length === 1 ? "" : "es"}! It was the ${target.displayName}.`);
      if (isDaily) openStats();
      return;
    }

    if (s.state.guesses.length >= MAX_GUESSES) {
      s.state.exhausted = true;
      if (isDaily) {
        saveDayState(daily.dayIndex, daily.state);
        recordCompletion(daily.dayIndex, false, s.state.guesses.length);
      }
      updateGuessesLeft();
      lockInput();
      showStatus(`Out of guesses. The answer was the ${target.displayName}.`);
      if (isDaily) openStats();
      return;
    }

    if (isDaily) saveDayState(daily.dayIndex, daily.state);
  }

  function openStats() {
    const stats = loadStats();
    const winPct = stats.gamesPlayed ? Math.round((100 * stats.gamesWon) / stats.gamesPlayed) : 0;
    els.statsBody.innerHTML = `
      <div class="stats-grid">
        <div><strong>${stats.gamesPlayed}</strong><span>Played</span></div>
        <div><strong>${winPct}%</strong><span>Win rate</span></div>
        <div><strong>${stats.currentStreak}</strong><span>Streak</span></div>
        <div><strong>${stats.maxStreak}</strong><span>Max streak</span></div>
      </div>
    `;
    els.shareBtn.hidden = !(daily.state.solved || daily.state.exhausted);
    els.shareBtn.textContent = "📋 Share Results";
    els.statsModal.hidden = false;
  }

  function updateModeUI() {
    els.modeDailyBtn.classList.toggle("mode-btn--active", mode === "daily");
    els.modeRandomBtn.classList.toggle("mode-btn--active", mode === "random");
    els.modeDailyBtn.setAttribute("aria-selected", String(mode === "daily"));
    els.modeRandomBtn.setAttribute("aria-selected", String(mode === "random"));
    els.modeNote.hidden = mode !== "random";
    els.newRandomBtn.hidden = mode !== "random";
    els.dayLabel.textContent =
      mode === "daily" ? `Puzzle #${daily.dayIndex + 1} · ${formatDateLabel(daily.dateStr)}` : "Random Mode";
  }

  function refreshView() {
    updateModeUI();
    renderBoard();
    hideStatus();
    const s = session();
    if (s.state.solved || s.state.exhausted) {
      lockInput();
      const scope = mode === "daily" ? "today's puzzle" : "this round";
      showStatus(
        s.state.solved
          ? `Already solved ${scope} in ${s.state.guesses.length} guess${s.state.guesses.length === 1 ? "" : "es"}. It was the ${s.target.displayName}.`
          : `Already out of guesses for ${scope}. The answer was the ${s.target.displayName}.`
      );
    } else {
      unlockInput();
    }
  }

  function switchMode(newMode) {
    if (newMode === mode) return;
    mode = newMode;
    if (mode === "random" && !random) newRandomRound();
    autocomplete.reset();
    refreshView();
  }

  els.statsBtn.addEventListener("click", openStats);
  els.statsClose.addEventListener("click", () => {
    els.statsModal.hidden = true;
  });
  els.statsModal.addEventListener("click", (e) => {
    if (e.target === els.statsModal) els.statsModal.hidden = true;
  });

  els.shareBtn.addEventListener("click", async () => {
    const ok = await copyShareText();
    els.shareBtn.textContent = ok ? "✅ Copied!" : "Couldn't copy — select text manually";
    setTimeout(() => {
      els.shareBtn.textContent = "📋 Share Results";
    }, 2000);
  });

  els.modeDailyBtn.addEventListener("click", () => switchMode("daily"));
  els.modeRandomBtn.addEventListener("click", () => switchMode("random"));
  els.newRandomBtn.addEventListener("click", () => {
    newRandomRound();
    autocomplete.reset();
    refreshView();
  });

  const autocomplete = createAutocomplete({
    input: els.input,
    listEl: els.list,
    isGuessed: (id) => session().guessedIds.has(id),
    onSelect: submitGuess,
  });

  refreshView();
})();
