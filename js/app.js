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

  function formatDateLabel(dateStr) {
    const [y, m, d] = dateStr.split("-").map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d));
    return dt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
  }

  const els = {
    input: document.getElementById("guess-input"),
    list: document.getElementById("ac-list"),
    board: document.getElementById("board"),
    guessesLeft: document.getElementById("guesses-left"),
    status: document.getElementById("status-banner"),
    form: document.getElementById("guess-form"),
    dayLabel: document.getElementById("day-label"),
    statsBtn: document.getElementById("stats-btn"),
    statsModal: document.getElementById("stats-modal"),
    statsBody: document.getElementById("stats-body"),
    statsClose: document.getElementById("stats-close"),
  };

  const { dayIndex, dateStr, mic: target } = todayTargetMic();
  let dayState = loadDayState(dayIndex);
  const guessedIds = new Set(dayState.guesses);

  els.dayLabel.textContent = `Puzzle #${dayIndex + 1} · ${formatDateLabel(dateStr)}`;

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
    for (const id of dayState.guesses) {
      renderGuessRow(micById(id));
    }
    updateGuessesLeft();
  }

  function updateGuessesLeft() {
    const remaining = MAX_GUESSES - dayState.guesses.length;
    els.guessesLeft.textContent = dayState.solved
      ? "Solved!"
      : dayState.exhausted
        ? "Out of guesses"
        : `${remaining} guess${remaining === 1 ? "" : "es"} left`;
  }

  function lockInput() {
    els.input.disabled = true;
    els.input.placeholder = dayState.solved ? "You got it!" : "Better luck tomorrow";
  }

  function showStatus(message) {
    els.status.textContent = message;
    els.status.hidden = false;
  }

  function submitGuess(mic) {
    if (dayState.solved || dayState.exhausted) return;
    if (guessedIds.has(mic.id)) return;

    guessedIds.add(mic.id);
    dayState.guesses.push(mic.id);
    renderGuessRow(mic);
    updateGuessesLeft();

    const won = isWinningGuess(mic, target);
    if (won) {
      dayState.solved = true;
      saveDayState(dayIndex, dayState);
      recordCompletion(dayIndex, true, dayState.guesses.length);
      updateGuessesLeft();
      lockInput();
      showStatus(`Solved in ${dayState.guesses.length} guess${dayState.guesses.length === 1 ? "" : "es"}! It was the ${target.displayName}.`);
      openStats();
      return;
    }

    if (dayState.guesses.length >= MAX_GUESSES) {
      dayState.exhausted = true;
      saveDayState(dayIndex, dayState);
      recordCompletion(dayIndex, false, dayState.guesses.length);
      updateGuessesLeft();
      lockInput();
      showStatus(`Out of guesses. The answer was the ${target.displayName}.`);
      openStats();
      return;
    }

    saveDayState(dayIndex, dayState);
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
    els.statsModal.hidden = false;
  }

  els.statsBtn.addEventListener("click", openStats);
  els.statsClose.addEventListener("click", () => {
    els.statsModal.hidden = true;
  });
  els.statsModal.addEventListener("click", (e) => {
    if (e.target === els.statsModal) els.statsModal.hidden = true;
  });

  els.form.addEventListener("submit", (e) => e.preventDefault());

  createAutocomplete({
    input: els.input,
    listEl: els.list,
    isGuessed: (id) => guessedIds.has(id),
    onSelect: submitGuess,
  });

  renderBoard();

  if (dayState.solved) {
    lockInput();
    showStatus(`Already solved today's puzzle in ${dayState.guesses.length} guess${dayState.guesses.length === 1 ? "" : "es"}. It was the ${target.displayName}.`);
  } else if (dayState.exhausted) {
    lockInput();
    showStatus(`Already out of guesses today. The answer was the ${target.displayName}.`);
  }
})();
