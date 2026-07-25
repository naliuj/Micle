(function () {
  const HI_LO_KEYS = new Set(["year", "price"]);

  // Tiles are a fixed height, so the longest values have to shorten to fit two
  // lines. Unabbreviated text is kept in each cell's `title` and `aria-label`,
  // so nothing is actually lost. Purely presentational: comparePatterns() reads
  // the raw polarPatterns array and buildShareText() never calls getValue.
  const PATTERN_ABBR = {
    Omnidirectional: "Omni",
    "Figure-8": "Fig-8",
    Supercardioid: "Super",
    Hypercardioid: "Hyper",
    "Wide Cardioid": "Wide",
  };

  const PRINCIPLE_ABBR = {
    "Condenser (Large-Diaphragm)": "Condenser (LDC)",
    "Condenser (Small-Diaphragm)": "Condenser (SDC)",
  };

  const CATEGORIES = [
    { key: "country", label: "Origin", getValue: (m) => m.countryOfOrigin },
    {
      key: "principle",
      label: "Principle",
      getValue: (m) => PRINCIPLE_ABBR[m.operatingPrinciple] || m.operatingPrinciple,
      getFullValue: (m) => m.operatingPrinciple,
    },
    { key: "pattern", label: "Polar Pattern", getValue: patternLabel, getFullValue: patternLabelFull },
    { key: "manufacturer", label: "Manufacturer", getValue: (m) => m.manufacturer },
    { key: "year", label: "Year", getValue: (m) => String(m.releaseYear) },
    { key: "price", label: "Price", getValue: msrpLabel },
  ];

  // Screen-reader phrasing for each cell state. Without these the icon glyph is
  // aria-hidden, so a cell announced as bare "Austria" with no match state.
  const STATE_LABEL = {
    match: "correct",
    partial: "partial match",
    "no-match": "incorrect",
    unknown: "unknown",
    higher: "answer is higher",
    lower: "answer is lower",
  };

  function withSwitchable(mic, base) {
    return mic.switchable ? `${base} (Switchable)` : base;
  }

  function patternLabel(mic) {
    const base = mic.polarPatterns.map((p) => PATTERN_ABBR[p] || p).join(" / ");
    return withSwitchable(mic, base);
  }

  function patternLabelFull(mic) {
    return withSwitchable(mic, mic.polarPatterns.join(" / "));
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
    shareBtnModal: document.getElementById("share-btn"),
    shareBtnPage: document.getElementById("share-btn-page"),
    modeDailyBtn: document.getElementById("mode-daily-btn"),
    modeRandomBtn: document.getElementById("mode-random-btn"),
    modeNote: document.getElementById("mode-note"),
    newRandomBtn: document.getElementById("new-random-btn"),
    infinityToggleLabel: document.getElementById("infinity-toggle-label"),
    infinityToggle: document.getElementById("infinity-toggle"),
    helpBtn: document.getElementById("help-btn"),
    instructions: document.getElementById("instructions"),
  };

  // Two independent game sessions living side by side: the persistent daily
  // puzzle (saved to localStorage, feeds stats/streak) and an ephemeral
  // random session (in-memory only — resets on reload, never touches stats).
  // `mode` picks which one the UI is currently driving; switching modes never
  // mutates the other session's state. Within Random Mic, the Infinity
  // checkbox (`randomInfinity`) lifts the MAX_GUESSES cap for that session —
  // it's a toggle on the random session, not a session of its own.
  const daily = (() => {
    const { dayIndex, dateStr, mic } = todayTargetMic();
    const state = loadDayState(dayIndex);
    return { dayIndex, dateStr, target: mic, state, guessedIds: new Set(state.guesses) };
  })();

  let random = null;
  let randomInfinity = false;

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

  // Random is the only mode where the guess cap can be lifted — via the
  // Infinity checkbox — so the round only ends by solving it.
  function isUnlimited() {
    return mode === "random" && randomInfinity;
  }

  // Toggling mid-round re-derives `exhausted` from the current guess count
  // rather than just flipping a flag, so turning Infinity on unlocks a round
  // that just ran out of guesses, and turning it off re-locks one that's
  // already past the cap.
  function setRandomInfinity(enabled) {
    randomInfinity = enabled;
    if (random && !random.state.solved) {
      random.state.exhausted = !randomInfinity && random.state.guesses.length >= MAX_GUESSES;
    }
    refreshView();
  }

  function micById(id) {
    return MIC_DB.find((m) => m.id === id);
  }

  function renderHeaderRow() {
    const row = document.createElement("div");
    row.className = "board-row board-row--header";
    row.setAttribute("role", "row");
    const guessCell = document.createElement("div");
    guessCell.className = "cell cell--guess";
    guessCell.setAttribute("role", "columnheader");
    guessCell.textContent = "Guess";
    row.appendChild(guessCell);
    for (const cat of CATEGORIES) {
      const c = document.createElement("div");
      c.className = "cell cell--header";
      c.setAttribute("role", "columnheader");
      c.textContent = cat.label;
      row.appendChild(c);
    }
    els.board.appendChild(row);
  }

  // `animate` is only true for a freshly submitted guess. renderBoard() must
  // leave it false: it rebuilds the whole board from state.guesses, so passing
  // true there would replay the reveal on every page load and mode switch.
  function renderGuessRow(guessMic, animate) {
    const target = session().target;
    const result = compareGuess(guessMic, target);
    const won = isWinningGuess(guessMic, target);
    const row = document.createElement("div");
    row.className = animate ? "board-row board-row--reveal" : "board-row";
    row.setAttribute("role", "row");

    const nameCell = document.createElement("div");
    nameCell.className = "cell cell--guess";
    nameCell.setAttribute("role", "rowheader");
    nameCell.textContent = guessMic.displayName;
    row.appendChild(nameCell);

    for (const cat of CATEGORIES) {
      const cell = document.createElement("div");
      const isHiLo = HI_LO_KEYS.has(cat.key);
      const state = won ? "match" : isHiLo ? result[cat.key].state : result[cat.key];
      cell.className = `cell cell--${state}`;
      let text = cat.getValue(guessMic);
      const fullText = cat.getFullValue ? cat.getFullValue(guessMic) : text;
      let icon = state === "match" ? "✓" : state === "partial" ? "◐" : "✗";
      if (isHiLo && !won) {
        if (state === "higher") icon = "↑";
        else if (state === "lower") icon = "↓";
        else if (state === "unknown") icon = "?";
        else icon = "✓";
      }
      // Card mode surfaces the category name via CSS content: attr(data-label).
      cell.dataset.label = cat.label;
      // The role has to land with the label — aria-label on a role-less div is
      // silently discarded. aria-label also suppresses descendant and generated
      // text, so the ::before label can't be announced twice.
      cell.setAttribute("role", "cell");
      cell.setAttribute("aria-label", `${cat.label}: ${fullText}, ${STATE_LABEL[state]}`);
      if (fullText !== text) cell.title = fullText;
      cell.innerHTML = `<span class="cell-icon" aria-hidden="true">${icon}</span><span class="cell-text">${text}</span>`;
      row.appendChild(cell);
    }
    els.board.appendChild(row);
  }

  function renderBoard() {
    els.board.innerHTML = "";
    // No column labels over an empty board — they read as a stray row before
    // the first guess exists.
    if (session().state.guesses.length > 0) renderHeaderRow();
    for (const id of session().state.guesses) {
      renderGuessRow(micById(id), false);
    }
    updateGuessesLeft();
  }

  function updateGuessesLeft() {
    const s = session();
    if (s.state.solved) {
      els.guessesLeft.textContent = "Solved!";
    } else if (s.state.exhausted) {
      els.guessesLeft.textContent = "Out of guesses";
    } else if (isUnlimited()) {
      const count = s.state.guesses.length;
      els.guessesLeft.textContent = `${count} guess${count === 1 ? "" : "es"} so far`;
    } else {
      const remaining = MAX_GUESSES - s.state.guesses.length;
      els.guessesLeft.textContent = `${remaining} guess${remaining === 1 ? "" : "es"} left`;
    }
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

  // `state` is "win" or "loss" — the banner has no colour of its own, so
  // omitting it would render a loss in the same green as a win.
  function showStatus(message, state) {
    els.status.textContent = message;
    els.status.className = `status-banner status-banner--${state}`;
    els.status.hidden = false;
  }

  function hideStatus() {
    els.status.hidden = true;
    els.status.textContent = "";
    els.status.className = "status-banner";
  }

  function submitGuess(mic) {
    const s = session();
    const target = s.target;
    const isDaily = mode === "daily";
    if (s.state.solved || s.state.exhausted) return;
    if (s.guessedIds.has(mic.id)) return;

    s.guessedIds.add(mic.id);
    s.state.guesses.push(mic.id);
    // This appends rather than rebuilding, so the first guess has to bring the
    // column header with it — renderBoard() withholds it while the board is empty.
    if (!els.board.querySelector(".board-row--header")) renderHeaderRow();
    renderGuessRow(mic, true);
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
      showStatus(
        `Solved in ${s.state.guesses.length} guess${s.state.guesses.length === 1 ? "" : "es"}! It was the ${target.displayName}.`,
        "win"
      );
      if (isDaily) openStats();
      return;
    }

    if (!isUnlimited() && s.state.guesses.length >= MAX_GUESSES) {
      s.state.exhausted = true;
      if (isDaily) {
        saveDayState(daily.dayIndex, daily.state);
        recordCompletion(daily.dayIndex, false, s.state.guesses.length);
      }
      updateGuessesLeft();
      lockInput();
      showStatus(`Out of guesses. The answer was the ${target.displayName}.`, "loss");
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
    updateShareButtons();
    els.statsModal.hidden = false;
  }

  function updateShareButtons() {
    const dailyDone = daily.state.solved || daily.state.exhausted;
    // The modal's stats/streak are always about the daily puzzle regardless
    // of which mode is currently on screen, so that button just needs the
    // daily puzzle to be done. The page-level button sits right under
    // whichever board is currently showing, though — leaving it visible
    // while a Random Mic round is on screen would let players click
    // "Share Results" and copy the daily result instead of what they're
    // looking at, so it's further gated on actually being in daily mode.
    els.shareBtnModal.hidden = !dailyDone;
    els.shareBtnPage.hidden = !(dailyDone && mode === "daily");
  }

  function updateModeUI() {
    els.modeDailyBtn.classList.toggle("mode-btn--active", mode === "daily");
    els.modeRandomBtn.classList.toggle("mode-btn--active", mode === "random");
    els.modeDailyBtn.setAttribute("aria-selected", String(mode === "daily"));
    els.modeRandomBtn.setAttribute("aria-selected", String(mode === "random"));
    els.modeNote.hidden = mode !== "random";
    els.newRandomBtn.hidden = mode !== "random";
    els.infinityToggleLabel.hidden = mode !== "random";
    els.infinityToggle.checked = randomInfinity;
    if (mode === "daily") {
      // The date sits in its own span so narrow screens can drop it and keep the
      // puzzle number, which is the part that identifies the puzzle.
      els.dayLabel.textContent = `Puzzle #${daily.dayIndex + 1}`;
      const date = document.createElement("span");
      date.className = "day-label__date";
      date.textContent = ` · ${formatDateLabel(daily.dateStr)}`;
      els.dayLabel.appendChild(date);
    } else {
      els.dayLabel.textContent = randomInfinity ? "Random Mode (Infinity)" : "Random Mode";
    }
  }

  function refreshView() {
    updateModeUI();
    renderBoard();
    hideStatus();
    updateShareButtons();
    const s = session();
    if (s.state.solved || s.state.exhausted) {
      lockInput();
      const scope = mode === "daily" ? "today's puzzle" : "this round";
      showStatus(
        s.state.solved
          ? `Already solved ${scope} in ${s.state.guesses.length} guess${s.state.guesses.length === 1 ? "" : "es"}. It was the ${s.target.displayName}.`
          : `Already out of guesses for ${scope}. The answer was the ${s.target.displayName}.`,
        s.state.solved ? "win" : "loss"
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

  // A plain inline disclosure rather than a second modal: #stats-modal is
  // single-purpose and generalising openStats for another consumer is more risk
  // than this is worth.
  els.helpBtn.addEventListener("click", () => {
    const open = els.instructions.hidden;
    els.instructions.hidden = !open;
    els.helpBtn.setAttribute("aria-expanded", String(open));
  });

  els.statsBtn.addEventListener("click", openStats);
  els.statsClose.addEventListener("click", () => {
    els.statsModal.hidden = true;
  });
  els.statsModal.addEventListener("click", (e) => {
    if (e.target === els.statsModal) els.statsModal.hidden = true;
  });

  async function handleShareClick(btn) {
    const ok = await copyShareText();
    btn.textContent = ok ? "✅ Copied!" : "Couldn't copy — select text manually";
    setTimeout(() => {
      btn.textContent = "📋 Share Results";
    }, 2000);
  }

  els.shareBtnModal.addEventListener("click", () => handleShareClick(els.shareBtnModal));
  els.shareBtnPage.addEventListener("click", () => handleShareClick(els.shareBtnPage));

  els.modeDailyBtn.addEventListener("click", () => switchMode("daily"));
  els.modeRandomBtn.addEventListener("click", () => switchMode("random"));
  els.newRandomBtn.addEventListener("click", () => {
    newRandomRound();
    autocomplete.reset();
    refreshView();
  });
  els.infinityToggle.addEventListener("change", (e) => setRandomInfinity(e.target.checked));

  const autocomplete = createAutocomplete({
    input: els.input,
    listEl: els.list,
    isGuessed: (id) => session().guessedIds.has(id),
    onSelect: submitGuess,
  });

  refreshView();
})();
