(function () {
  // Hardcoded rather than location.href — js/devtools.js's gotoDate() adds
  // ?debug=1&date=... to the URL, so sharing the live location could leak a
  // debug link to whoever the player shares with.
  const CANONICAL_URL = "https://micle.julianro.se/";

  const HI_LO_KEYS = new Set(["year", "price"]);

  // Inline Lucide icons (https://lucide.dev, ISC license) for the states this
  // file generates dynamically. Static, HTML-only buttons keep their own
  // inline <svg> markup directly in index.html instead of being duplicated
  // here — these are only the ones actually built by JS.
  const SVG_ATTRS = 'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"';
  const ICONS = {
    check: `<svg ${SVG_ATTRS}><path d="M20 6 9 17l-5-5"/></svg>`,
    x: `<svg ${SVG_ATTRS}><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>`,
    circleDashed: `<svg ${SVG_ATTRS}><path d="M10.1 2.182a10 10 0 0 1 3.8 0"/><path d="M13.9 21.818a10 10 0 0 1-3.8 0"/><path d="M17.609 3.721a10 10 0 0 1 2.69 2.7"/><path d="M2.182 13.9a10 10 0 0 1 0-3.8"/><path d="M20.279 17.609a10 10 0 0 1-2.7 2.69"/><path d="M21.818 10.1a10 10 0 0 1 0 3.8"/><path d="M3.721 6.391a10 10 0 0 1 2.7-2.69"/><path d="M6.391 20.279a10 10 0 0 1-2.69-2.7"/></svg>`,
    arrowUp: `<svg ${SVG_ATTRS}><path d="m5 12 7-7 7 7"/><path d="M12 19V5"/></svg>`,
    arrowDown: `<svg ${SVG_ATTRS}><path d="M12 5v14"/><path d="m19 12-7 7-7-7"/></svg>`,
    circleQuestion: `<svg ${SVG_ATTRS}><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/></svg>`,
    clipboardCopy: `<svg ${SVG_ATTRS}><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M8 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/><path d="M16 4h2a2 2 0 0 1 2 2v4"/><path d="M21 14H11"/><path d="m15 10-4 4 4 4"/></svg>`,
  };

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

  // Both Umami and GoatCounter are loaded via <script> tags in index.html and
  // can be ad-blocked or slow to load, so every call site guards on presence
  // rather than assuming window.umami/window.goatcounter exist. Umami fires
  // alongside GoatCounter temporarily so counts can be cross-validated before
  // Umami's script tag (index.html) and the window.umami line below are removed.
  function track(name, data) {
    if (window.umami) window.umami.track(name, data);
    if (window.goatcounter) window.goatcounter.count(toGoatCounterEvent(name, data));
  }

  // GoatCounter's event API takes a path/title pair, not an arbitrary data
  // object, so mode/outcome are folded into the path (queryable as distinct
  // events in the dashboard) and guesses rides along as a non-queryable label.
  function toGoatCounterEvent(name, data) {
    switch (name) {
      case "infinity_toggle":
        return { path: `infinity_toggle:${data.enabled ? "on" : "off"}`, event: true };
      case "mode_switch":
        return { path: `mode_switch:${data.mode}`, event: true };
      case "round_complete":
        return {
          path: `round_complete:${data.mode}:${data.outcome}`,
          title: `${data.guesses} guess${data.guesses === 1 ? "" : "es"}`,
          event: true,
        };
      default:
        return { path: name, event: true };
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

  // crypto.getRandomValues draws fresh OS entropy on every call, rather than
  // relying on a single engine-seeded state the way Math.random() does — so
  // there's no way for two devices' picks to correlate, even if they load the
  // page in the same instant. Falls back to Math.random() only if the Web
  // Crypto API is unavailable (very old browsers).
  function randomInt(n) {
    if (n <= 0) return 0;
    if (window.crypto && window.crypto.getRandomValues) {
      // Rejection sampling: without it, `raw % n` is biased toward the low end
      // whenever n doesn't evenly divide 2^32.
      const range = Math.floor(0x100000000 / n) * n;
      const buf = new Uint32Array(1);
      let raw;
      do {
        window.crypto.getRandomValues(buf);
        raw = buf[0];
      } while (raw >= range);
      return raw % n;
    }
    return Math.floor(Math.random() * n);
  }

  // Excludes today's daily answer (so Random Mic can't hand out a free look at
  // it) and the last RANDOM_HISTORY_LIMIT random targets (so back-to-back
  // rounds don't repeat). Falls back in stages if the eligible pool is ever
  // small enough for those exclusions to exhaust it — at the current pool
  // size (110+) neither fallback should trigger, but a shrunk pool should
  // degrade gracefully rather than return undefined.
  function randomEligibleMic() {
    const excludeIds = new Set([daily.target.id, ...loadRandomHistory()]);
    let pool = eligibleMics().filter((m) => !excludeIds.has(m.id));
    if (pool.length === 0) pool = eligibleMics().filter((m) => m.id !== daily.target.id);
    if (pool.length === 0) pool = eligibleMics();
    return pool[randomInt(pool.length)];
  }

  function randomUnguessedMic() {
    const s = session();
    const pool = eligibleMics().filter((m) => !s.guessedIds.has(m.id));
    return pool[randomInt(pool.length)];
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
    infinityToggleBtn: document.getElementById("infinity-toggle-btn"),
    randomGuessBtn: document.getElementById("random-guess-btn"),
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
    const target = randomEligibleMic();
    random = {
      target,
      state: { guesses: [], solved: false, exhausted: false },
      guessedIds: new Set(),
    };
    recordRandomTarget(target.id);
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
    track("infinity_toggle", { enabled });
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
  //
  // `isAnswer` renders the target mic itself as a final row on a loss, so
  // players see every category instead of just the name in the status
  // message. It reuses the normal win styling (isWinningGuess(mic, mic) is
  // already true for a mic compared against itself) — the only difference is
  // the "Answer:" label and a distinct row class so it doesn't read as a
  // guess the player actually made.
  function renderGuessRow(guessMic, animate, isAnswer) {
    const target = session().target;
    const result = compareGuess(guessMic, target);
    const won = isAnswer || isWinningGuess(guessMic, target);
    const row = document.createElement("div");
    row.className = animate ? "board-row board-row--reveal" : "board-row";
    if (isAnswer) row.classList.add("board-row--answer");
    row.setAttribute("role", "row");

    const nameCell = document.createElement("div");
    nameCell.className = "cell cell--guess";
    nameCell.setAttribute("role", "rowheader");
    nameCell.textContent = isAnswer ? `Answer: ${guessMic.displayName}` : guessMic.displayName;
    row.appendChild(nameCell);

    for (const cat of CATEGORIES) {
      const cell = document.createElement("div");
      const isHiLo = HI_LO_KEYS.has(cat.key);
      const state = won ? "match" : isHiLo ? result[cat.key].state : result[cat.key];
      cell.className = `cell cell--${state}`;
      let text = cat.getValue(guessMic);
      const fullText = cat.getFullValue ? cat.getFullValue(guessMic) : text;
      let icon = state === "match" ? ICONS.check : state === "partial" ? ICONS.circleDashed : ICONS.x;
      if (isHiLo && !won) {
        if (state === "higher") icon = ICONS.arrowUp;
        else if (state === "lower") icon = ICONS.arrowDown;
        else if (state === "unknown") icon = ICONS.circleQuestion;
        else icon = ICONS.check;
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
    if (session().state.exhausted) renderGuessRow(session().target, false, true);
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
    els.randomGuessBtn.disabled = true;
    els.input.placeholder = s.state.solved
      ? "You got it!"
      : mode === "daily"
        ? "Better luck tomorrow"
        : "Try a new random mic!";
  }

  function unlockInput() {
    els.input.disabled = false;
    els.randomGuessBtn.disabled = false;
    els.input.placeholder = "Type a microphone name…";
  }

  // `state` is "win" or "loss" — the banner has no colour of its own, so
  // omitting it would render a loss in the same green as a win.
  // Un-hiding before mutating the text (rather than after) is what reliably
  // triggers the role="alert" announcement across browser/AT combinations.
  function showStatus(message, state) {
    els.status.hidden = false;
    els.status.className = `status-banner status-banner--${state}`;
    els.status.textContent = message;
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
      track("round_complete", { mode, outcome: "win", guesses: s.state.guesses.length });
      if (isDaily) openStats();
      return;
    }

    if (!isUnlimited() && s.state.guesses.length >= MAX_GUESSES) {
      s.state.exhausted = true;
      if (isDaily) {
        saveDayState(daily.dayIndex, daily.state);
        recordCompletion(daily.dayIndex, false, s.state.guesses.length);
      }
      renderGuessRow(target, true, true);
      updateGuessesLeft();
      lockInput();
      showStatus(`Out of guesses. The answer was the ${target.displayName}.`, "loss");
      track("round_complete", { mode, outcome: "loss", guesses: s.state.guesses.length });
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
    els.statsModal.showModal();
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
    els.infinityToggleBtn.hidden = mode !== "random";
    els.infinityToggleBtn.classList.toggle("infinity-toggle--active", randomInfinity);
    els.infinityToggleBtn.setAttribute("aria-checked", String(randomInfinity));
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
    track("mode_switch", { mode: newMode });
    autocomplete.reset();
    // Not used for individual guess submission — that already has its own
    // .board-row--reveal keyframe animation, and layering a view-transition
    // snapshot on top of a freshly-inserted row risks a double-animation.
    // Mode-switching is the one interaction with no motion story otherwise.
    if (document.startViewTransition) {
      document.startViewTransition(() => refreshView());
    } else {
      refreshView();
    }
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
    els.statsModal.close();
  });
  // Native <dialog> doesn't backdrop-light-dismiss on its own — clicking the
  // dialog element's own (now-padding-free) box outside .modal-content still
  // matches e.target === els.statsModal, same as the old div-based check.
  els.statsModal.addEventListener("click", (e) => {
    if (e.target === els.statsModal) els.statsModal.close();
  });

  async function handleShareClick(btn) {
    const text = buildShareText();
    // Native share sheet where available (mainly mobile) — falls through to
    // the clipboard path below only if the browser lacks navigator.share or
    // the share itself fails for a reason other than the user cancelling.
    if (navigator.share) {
      try {
        await navigator.share({ text, title: "Micle", url: CANONICAL_URL });
        return;
      } catch (e) {
        if (e && e.name === "AbortError") return;
      }
    }
    const ok = await copyShareText();
    btn.innerHTML = ok ? `${ICONS.check} Copied!` : "Couldn't copy, select text manually";
    setTimeout(() => {
      btn.innerHTML = `${ICONS.clipboardCopy} Share Results`;
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
  els.infinityToggleBtn.addEventListener("click", () => setRandomInfinity(!randomInfinity));
  els.randomGuessBtn.addEventListener("click", () => {
    const mic = randomUnguessedMic();
    autocomplete.reset();
    if (mic) submitGuess(mic);
  });

  // Keyboard shortcuts. Extended (letter-key) shortcuts only fire when the
  // guess input isn't focused — typing a mic name must never be hijacked —
  // and everything is suppressed while the stats dialog is open, so its own
  // native focus-trap/Escape-close behavior is never second-guessed here.
  // Each extended shortcut just clicks the real button behind its own
  // visibility/disabled guard, so it always runs the exact same code path
  // (analytics tracking included) a real click would.
  document.addEventListener("keydown", (e) => {
    if (els.statsModal.open) return;

    if (e.key === "/") {
      e.preventDefault(); // Firefox binds "/" to quick-find otherwise.
      if (document.activeElement !== els.input) els.input.focus();
      return;
    }
    if (e.key === "?") {
      e.preventDefault();
      els.helpBtn.click();
      return;
    }
    if (e.key === "Escape") {
      if (!els.instructions.hidden) {
        els.instructions.hidden = true;
        els.helpBtn.setAttribute("aria-expanded", "false");
      }
      return;
    }

    if (document.activeElement === els.input) return;

    switch (e.key.toLowerCase()) {
      case "s":
        e.preventDefault();
        els.statsBtn.click();
        break;
      case "d":
        e.preventDefault();
        els.modeDailyBtn.click();
        break;
      case "m":
        e.preventDefault();
        els.modeRandomBtn.click();
        break;
      case "n":
        if (!els.newRandomBtn.hidden) {
          e.preventDefault();
          els.newRandomBtn.click();
        }
        break;
      case "r":
        if (!els.randomGuessBtn.disabled) {
          e.preventDefault();
          els.randomGuessBtn.click();
        }
        break;
      case "i":
        if (!els.infinityToggleBtn.hidden) {
          e.preventDefault();
          els.infinityToggleBtn.click();
        }
        break;
    }
  });

  const autocomplete = createAutocomplete({
    input: els.input,
    listEl: els.list,
    isGuessed: (id) => session().guessedIds.has(id),
    onSelect: submitGuess,
  });

  // Bridge for js/devtools.js, which loads before this file and so can't
  // close over `mode`/`session`/etc. directly — its functions read this at
  // call time instead, by which point app.js has already run. Random-mode
  // sessions live only in memory (never localStorage), so devtools mutates
  // session().state directly and calls refreshView() to reflect it, rather
  // than the write-then-reload approach that works for the daily puzzle.
  window.MicleApp = {
    getMode: () => mode,
    getSession: session,
    eligibleMics,
    micById,
    newRandomRound,
    refreshView,
  };

  refreshView();
})();
