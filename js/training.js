(function () {

  // Inline Lucide icons, matching js/app.js's ICONS — correct/incorrect must
  // not be signalled by colour alone.
  const SVG_ATTRS =
    'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"';
  const ICONS = {
    check: `<svg ${SVG_ATTRS}><path d="M20 6 9 17l-5-5"/></svg>`,
    x: `<svg ${SVG_ATTRS}><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>`,
    arrowUp: `<svg ${SVG_ATTRS}><path d="m5 12 7-7 7 7"/><path d="M12 19V5"/></svg>`,
    arrowDown: `<svg ${SVG_ATTRS}><path d="M12 5v14"/><path d="m19 12-7 7-7-7"/></svg>`,
  };

  const OPTION_KEYS = ["a", "b", "c", "d"];

  const els = {
    roundSetup: document.getElementById("round-setup"),
    roundSetupText: document.getElementById("round-setup-text"),
    roundSetupToggle: document.getElementById("round-setup-toggle"),
    roundSetupPanel: document.getElementById("round-setup-panel"),
    roundLengthLabel: document.getElementById("round-length-label"),
    roundLengthPills: document.getElementById("round-length-pills"),
    filterManufacturerSelect: document.getElementById("filter-manufacturer"),
    filterCountrySelect: document.getElementById("filter-country"),

    tabQuizBtn: document.getElementById("tab-quiz-btn"),
    tabOrderBtn: document.getElementById("tab-order-btn"),
    tabMatchBtn: document.getElementById("tab-match-btn"),
    tabReferenceBtn: document.getElementById("tab-reference-btn"),
    quizTab: document.getElementById("quiz-tab"),
    orderTab: document.getElementById("order-tab"),
    matchTab: document.getElementById("match-tab"),
    referenceTab: document.getElementById("reference-tab"),

    quizPicker: document.getElementById("quiz-picker"),
    categoryList: document.getElementById("category-list"),
    weakSpotsBtn: document.getElementById("weak-spots-btn"),
    startQuizBtn: document.getElementById("start-quiz-btn"),

    quizActive: document.getElementById("quiz-active"),
    quizProgress: document.getElementById("quiz-progress"),
    quizScore: document.getElementById("quiz-score"),
    quizStreak: document.getElementById("quiz-streak"),
    quizProgressFill: document.getElementById("quiz-progress-fill"),
    quizPrompt: document.getElementById("quiz-prompt"),
    quizOptions: document.getElementById("quiz-options"),
    quizFeedback: document.getElementById("quiz-feedback"),
    quizActionNote: document.getElementById("quiz-action-note"),
    quizNextBtn: document.getElementById("quiz-next-btn"),

    quizSummary: document.getElementById("quiz-summary"),
    quizSummaryScore: document.getElementById("quiz-summary-score"),
    quizSummaryTrend: document.getElementById("quiz-summary-trend"),
    quizSummaryBreakdown: document.getElementById("quiz-summary-breakdown"),
    quizMissed: document.getElementById("quiz-missed"),
    quizMissedList: document.getElementById("quiz-missed-list"),
    retryMissedBtn: document.getElementById("retry-missed-btn"),
    newRoundBtn: document.getElementById("new-round-btn"),

    orderSummaryLabel: document.getElementById("order-summary-label"),
    orderAnswer: document.getElementById("order-answer"),
    orderAnswerList: document.getElementById("order-answer-list"),
    orderPicker: document.getElementById("order-picker"),
    orderDimensionList: document.getElementById("order-dimension-list"),
    startOrderBtn: document.getElementById("start-order-btn"),
    orderActive: document.getElementById("order-active"),
    orderPrompt: document.getElementById("order-prompt"),
    orderList: document.getElementById("order-list"),
    orderLive: document.getElementById("order-live"),
    submitOrderBtn: document.getElementById("submit-order-btn"),
    orderSummary: document.getElementById("order-summary"),
    orderSummaryScore: document.getElementById("order-summary-score"),
    orderSummaryList: document.getElementById("order-summary-list"),
    newOrderRoundBtn: document.getElementById("new-order-round-btn"),

    matchPicker: document.getElementById("match-picker"),
    matchDimensionList: document.getElementById("match-dimension-list"),
    startMatchBtn: document.getElementById("start-match-btn"),
    matchActive: document.getElementById("match-active"),
    matchRunBar: document.getElementById("match-run-bar"),
    matchRunCount: document.getElementById("match-run-count"),
    matchPrompt: document.getElementById("match-prompt"),
    matchMicName: document.getElementById("match-mic-name"),
    matchMicMeta: document.getElementById("match-mic-meta"),
    matchVerdict: document.getElementById("match-verdict"),
    matchNoBtn: document.getElementById("match-no-btn"),
    matchYesBtn: document.getElementById("match-yes-btn"),
    matchFeedback: document.getElementById("match-feedback"),
    matchNextBtn: document.getElementById("match-next-btn"),
    matchSummary: document.getElementById("match-summary"),
    matchSummaryScore: document.getElementById("match-summary-score"),
    matchSummaryTally: document.getElementById("match-summary-tally"),
    matchSummaryGrid: document.getElementById("match-summary-grid"),
    matchExitBtn: document.getElementById("match-exit-btn"),
    newMatchRoundBtn: document.getElementById("new-match-round-btn"),

    referenceInput: document.getElementById("reference-input"),
    referenceList: document.getElementById("reference-list"),
    referenceDetailEmpty: document.getElementById("reference-detail-empty"),
    referenceBoard: document.getElementById("reference-board"),
  };

  // Same filter as js/app.js's eligibleMics() — duplicated rather than
  // shared, since this page doesn't load app.js (it's private to that
  // file's IIFE). Keeps quarantined (needsVerification: true) mics out of
  // quiz questions the same way they're kept out of the daily/random pool.
  function eligibleMics() {
    return MIC_DB.filter((m) => m.needsVerification !== true);
  }

  // Mirrors app.js's private CATEGORIES list (label + getValue), just for
  // the reference detail card — also not shared, for the same reason above.
  const REFERENCE_FIELDS = [
    { label: "Origin", getValue: (m) => m.countryOfOrigin },
    { label: "Principle", getValue: (m) => m.operatingPrinciple },
    { label: "Polar Pattern", getValue: formatPatterns },
    { label: "Manufacturer", getValue: (m) => m.manufacturer },
    { label: "Year", getValue: (m) => String(m.releaseYear) },
    { label: "Price", getValue: formatPrice },
  ];

  // -------------------------------------------------------- Round setup bar
  // One shared control for every mode. The pool filter persists across
  // Quiz/Order/Match; only the length row varies by mode. Collapsed to a
  // summary line by default, since most rounds are "any mic" — the summary
  // carries the live state, so collapsing hides the controls, not the facts.

  let manufacturerFilter = "";
  let countryFilter = "";
  let setupExpanded = false;

  // Length is per-mode state now that one control serves all three: a Quiz
  // round is N questions, an Order/Match session is N rounds, so the units
  // genuinely differ and each mode keeps its own value across tab switches.
  const LENGTH_OPTIONS = { quiz: [5, 10, 20], order: [1, 3, 5, 10], match: [1, 3, 5, 10] };
  const LENGTH_NOUN = { quiz: "question", order: "round", match: "round" };
  let lengthByMode = { quiz: 10, order: 5, match: 5 };
  let activeTab = "quiz";

  function applyFilters(pool) {
    return pool.filter(
      (m) =>
        (!manufacturerFilter || m.manufacturer === manufacturerFilter) &&
        (!countryFilter || m.countryOfOrigin === countryFilter)
    );
  }

  // The pool a given pair of selections *would* produce, cascade included —
  // picking a country drops an incompatible manufacturer, so the result is
  // that country's whole set, not an empty one. Used to test an option
  // before the user commits to it.
  function projectedPool(country, manufacturer) {
    const pool = eligibleMics().filter((m) => !country || m.countryOfOrigin === country);
    const keepsManufacturer = manufacturer && pool.some((m) => m.manufacturer === manufacturer);
    return keepsManufacturer ? pool.filter((m) => m.manufacturer === manufacturer) : pool;
  }

  // A filter can leave mics in the pool and still make a mode unplayable:
  // Soyuz has exactly one mic, so every quiz category collapses to a single
  // answer and every Order/Match dimension goes unavailable — a picker full
  // of greyed-out pills and a dead Start button, with the cause two controls
  // away. Each mode's test below delegates to the very predicate its picker
  // uses, so the setup bar can never disagree with the tab underneath it.
  const MODE_REQUIREMENTS = {
    quiz: {
      label: "Quiz",
      article: "a quiz",
      isViable: (pool) => QUIZ_CATEGORIES.some((cat) => !isCategoryTrivial(cat, pool)),
      needs: "A quiz needs at least two mics that differ in some category.",
    },
    order: {
      label: "Order",
      article: "an Order round",
      isViable: (pool) => ORDER_DIMENSIONS.some((dim) => pool.filter((m) => dim.getValue(m) != null).length >= 2),
      needs: "Order needs at least two mics to put in sequence.",
    },
    match: {
      label: "Match",
      article: "a Match round",
      isViable: (pool) => MATCH_DIMENSIONS.some((dim) => isMatchDimensionAvailable(dim, pool)),
      needs: "Match needs at least four mics — two that share a trait and two that don't.",
    },
  };

  function isModeViable(mode, pool) {
    const req = MODE_REQUIREMENTS[mode];
    return !req || (pool.length > 0 && req.isViable(pool));
  }

  function activePool() {
    return applyFilters(eligibleMics());
  }

  // The two selects cascade rather than constrain each other symmetrically:
  // Country is the primary filter and the Manufacturer list is rebuilt from
  // whatever the chosen country contains. A conflicting pair is therefore
  // unselectable — no "Shure (0)" sitting greyed out under a Germany filter,
  // and no route into the blocking empty state from these two controls.
  function countValues(pool, getValue) {
    const counts = new Map();
    pool.forEach((m) => {
      const v = getValue(m);
      if (v == null) return;
      counts.set(v, (counts.get(v) || 0) + 1);
    });
    return [...counts.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([value, count]) => ({ value, count }));
  }

  // Options that can't sustain the mode you're about to play are labelled
  // rather than disabled. Disabling would have to be recomputed per tab, and
  // a value that's legal under Quiz but not Match would vanish from a shared
  // control mid-session; the label warns before the click and survives the
  // switch. The mode it's judged against is the active tab, so the marks
  // move when you do.
  function populateFilterSelect(selectEl, options, selected, poolFor) {
    selectEl.innerHTML = '<option value="">Any</option>';
    options.forEach(({ value, count }) => {
      const opt = document.createElement("option");
      opt.value = value;
      const playable = isModeViable(activeTab, poolFor(value));
      opt.textContent = playable ? `${value} (${count})` : `${value} (${count}) — too few`;
      selectEl.appendChild(opt);
    });
    selectEl.value = selected;
  }

  function refreshFilterSelects() {
    const pool = eligibleMics();
    // Each option is judged against the pool its own count describes —
    // country by the country alone, manufacturer by the manufacturer within
    // the selected country. Projecting a pinned manufacturer onto the
    // country list instead produced "Germany (30) — too few", a mark that
    // argues with the number beside it; the narrow manufacturer is the one
    // that deserves the flag, and it gets it.
    populateFilterSelect(
      els.filterCountrySelect,
      countValues(pool, (m) => m.countryOfOrigin),
      countryFilter,
      (value) => projectedPool(value, "")
    );

    const inCountry = countryFilter
      ? pool.filter((m) => m.countryOfOrigin === countryFilter)
      : pool;
    const manufacturers = countValues(inCountry, (m) => m.manufacturer);

    // Switching country can strand a manufacturer that the new list doesn't
    // offer. Clear the filter itself, not just the select — leaving the
    // variable set would keep filtering the pool by an option the user can
    // no longer see or undo.
    if (manufacturerFilter && !manufacturers.some((o) => o.value === manufacturerFilter)) {
      manufacturerFilter = "";
    }
    populateFilterSelect(els.filterManufacturerSelect, manufacturers, manufacturerFilter, (value) =>
      projectedPool(countryFilter, value)
    );
  }

  function renderLengthPills() {
    const options = LENGTH_OPTIONS[activeTab] || [];
    const noun = LENGTH_NOUN[activeTab] || "round";
    els.roundLengthLabel.textContent = `${noun.charAt(0).toUpperCase()}${noun.slice(1)}s`;
    els.roundLengthPills.innerHTML = "";
    options.forEach((n) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "round-length-pill";
      btn.setAttribute("role", "radio");
      btn.setAttribute("aria-checked", String(lengthByMode[activeTab] === n));
      btn.textContent = String(n);
      btn.addEventListener("click", () => {
        lengthByMode[activeTab] = n;
        renderLengthPills();
        renderSetupSummary();
      });
      els.roundLengthPills.appendChild(btn);
    });
  }

  // Describes the filter itself — "Germany, Neumann · 17 mics" — reused by
  // both the healthy summary and the blocked warning so the numbers you're
  // being warned about are the same ones you were just reading.
  function poolDescription(n) {
    const active = [countryFilter, manufacturerFilter].filter(Boolean);
    const micWord = n === 1 ? "mic" : "mics";
    return active.length === 0 ? `All ${n} ${micWord}` : `${active.join(", ")} · ${n} ${micWord}`;
  }

  function renderSetupSummary() {
    const pool = activePool();
    const n = pool.length;
    const viable = isModeViable(activeTab, pool);
    const req = MODE_REQUIREMENTS[activeTab];

    let text;
    if (n === 0) {
      text = "No mics match this filter — change Country or Manufacturer to continue.";
    } else if (!viable) {
      // Name the count, the mode it falls short of, and the bar it has to
      // clear. "Not enough mics" alone leaves you guessing how much more is
      // enough, and the pickers below can only say it one greyed pill at a
      // time.
      text = `${poolDescription(n)} — too few for ${req.label}. ${req.needs}`;
    } else {
      const len = lengthByMode[activeTab];
      const noun = LENGTH_NOUN[activeTab] || "round";
      text = `${poolDescription(n)} · ${len} ${noun}${len === 1 ? "" : "s"}`;
    }

    els.roundSetupText.textContent = text;
    els.roundSetup.classList.toggle("round-setup--blocked", !viable);

    // A blocking state must never hide behind a collapsed control: force the
    // panel open and refuse to close it until the filter is fixed.
    if (!viable && !setupExpanded) setSetupExpanded(true);
    els.roundSetupToggle.disabled = !viable;
  }

  function setSetupExpanded(expanded) {
    setupExpanded = expanded;
    els.roundSetupPanel.hidden = !expanded;
    els.roundSetupToggle.setAttribute("aria-expanded", String(expanded));
  }

  function onFilterChange() {
    refreshFilterSelects();
    renderSetupSummary();
    renderCategoryPicker();
    renderOrderDimensionPicker();
    renderMatchDimensionPicker();
  }

  // Shared blocked state for all three pickers below — replaces the whole
  // list (not just a per-item note) so it's impossible to miss, and disables
  // the corresponding Start button. Covers both "nothing matches" and "some
  // mics match, but too few to build a round": in the second case every pill
  // would otherwise render disabled with its own quiet footnote, which reads
  // as six separate problems instead of one filter to widen.
  function renderBlockedPoolNotice(listEl, startBtn, mode, poolSize) {
    listEl.innerHTML = "";
    const notice = document.createElement("p");
    notice.className = "pool-blocked-notice";
    // The setup bar directly above already spells out what the mode needs;
    // repeating it here just doubled the same red paragraph on screen. This
    // one carries the count and the way out.
    notice.textContent =
      poolSize === 0
        ? "No mics match the current filter. Change Country or Manufacturer above to continue."
        : `Only ${poolSize} mic${poolSize === 1 ? " matches" : "s match"} the current filter — widen Country or Manufacturer above to start ${MODE_REQUIREMENTS[mode].article}.`;
    listEl.appendChild(notice);
    startBtn.disabled = true;
  }

  // ---------------------------------------------------------------- Quiz tab

  let session = [];
  let currentIndex = 0;
  let missed = [];
  let score = 0;
  let streak = 0; // in-memory only, resets on a wrong answer — never persisted
  let answeredCurrent = false;
  let categoryResults = {}; // this round only: key -> {answered, correct}
  let selectedCategories = new Set(QUIZ_CATEGORIES.map((c) => c.key));
  // Captured at round start so the summary can compare against your accuracy
  // *before* this round: recordQuizAnswer() fires per-answer during play, so
  // by summary time loadQuizStats() already includes the round just played.
  let baselineStats = null;

  // A category collapses to one possible answer under the active filter
  // (e.g. "Manufacturer" once you've filtered to one manufacturer) — asking
  // about it would just be "which one was it," not real recall, so it's
  // disabled rather than left to quietly produce a trivial round.
  function isCategoryTrivial(cat, targetPool) {
    const distinctValues = new Set(targetPool.map(cat.getValue).filter((v) => v != null));
    return distinctValues.size <= 1;
  }

  function switchTab(tab) {
    const buttons = { quiz: els.tabQuizBtn, order: els.tabOrderBtn, match: els.tabMatchBtn, reference: els.tabReferenceBtn };
    const sections = { quiz: els.quizTab, order: els.orderTab, match: els.matchTab, reference: els.referenceTab };
    Object.keys(buttons).forEach((t) => {
      const isActive = t === tab;
      buttons[t].classList.toggle("mode-btn--active", isActive);
      buttons[t].setAttribute("aria-selected", String(isActive));
      sections[t].hidden = !isActive;
    });
    els.roundSetup.hidden = tab === "reference";
    if (tab !== "reference") {
      activeTab = tab;
      refreshFilterSelects();
      renderLengthPills();
      renderSetupSummary();
    }
  }

  function renderCategoryPicker() {
    const stats = loadQuizStats();
    const targetPool = applyFilters(eligibleMics());
    if (!isModeViable("quiz", targetPool)) {
      renderBlockedPoolNotice(els.categoryList, els.startQuizBtn, "quiz", targetPool.length);
      // Every category is trivial here, so selectWeakSpots() would rank
      // nothing and silently return — a live button that does nothing.
      els.weakSpotsBtn.disabled = true;
      return;
    }
    els.weakSpotsBtn.disabled = false;
    els.categoryList.innerHTML = "";
    QUIZ_CATEGORIES.forEach((cat) => {
      const id = `cat-${cat.key}`;
      const label = document.createElement("label");
      label.className = "category-pill";
      label.htmlFor = id;

      const trivial = isCategoryTrivial(cat, targetPool);

      const input = document.createElement("input");
      input.type = "checkbox";
      input.id = id;
      input.disabled = trivial;
      if (trivial) {
        selectedCategories.delete(cat.key);
        input.checked = false;
      } else {
        input.checked = selectedCategories.has(cat.key);
      }
      input.addEventListener("change", () => {
        if (input.checked) selectedCategories.add(cat.key);
        else selectedCategories.delete(cat.key);
        updateStartButton();
      });

      const textWrap = document.createElement("span");
      textWrap.className = "category-pill-label";
      const nameEl = document.createElement("span");
      nameEl.className = "category-pill-name";
      nameEl.textContent = cat.label;
      textWrap.appendChild(nameEl);

      const accEl = document.createElement("span");
      accEl.className = "category-pill-accuracy";
      if (trivial) {
        accEl.textContent = "All results match one value under the current filter";
      } else {
        const catStats = stats.byCategory[cat.key] || { answered: 0, correct: 0 };
        if (catStats.answered > 0) {
          const pct = Math.round((catStats.correct / catStats.answered) * 100);
          const track = document.createElement("span");
          track.className = "category-pill-bar";
          const fill = document.createElement("span");
          fill.className = "category-pill-bar-fill";
          fill.style.width = `${pct}%`;
          track.appendChild(fill);
          textWrap.appendChild(track);
          accEl.textContent = `${pct}% of ${catStats.answered}`;
        } else {
          accEl.textContent = "Not studied yet";
        }
      }
      textWrap.appendChild(accEl);

      label.appendChild(input);
      label.appendChild(textWrap);
      els.categoryList.appendChild(label);
    });
    updateStartButton();
  }

  // Selects the three categories you're worst at, treating never-studied as
  // weak (you can't be good at something you've never been asked).
  function selectWeakSpots() {
    const stats = loadQuizStats();
    const targetPool = applyFilters(eligibleMics());
    const ranked = QUIZ_CATEGORIES.filter((cat) => !isCategoryTrivial(cat, targetPool))
      .map((cat) => {
        const s = stats.byCategory[cat.key] || { answered: 0, correct: 0 };
        return { key: cat.key, accuracy: s.answered > 0 ? s.correct / s.answered : -1 };
      })
      .sort((a, b) => a.accuracy - b.accuracy);
    if (ranked.length === 0) return;
    selectedCategories = new Set(ranked.slice(0, 3).map((r) => r.key));
    renderCategoryPicker();
  }

  function updateStartButton() {
    els.startQuizBtn.disabled = selectedCategories.size === 0;
  }

  function showScreen(name) {
    els.quizPicker.hidden = name !== "picker";
    els.quizActive.hidden = name !== "active";
    els.quizSummary.hidden = name !== "summary";
  }

  function beginRound(questions) {
    session = questions;
    currentIndex = 0;
    missed = [];
    score = 0;
    streak = 0;
    categoryResults = {};
    showScreen("active");
    renderQuestion();
  }

  function startQuiz() {
    if (selectedCategories.size === 0) return;
    const distractorPool = eligibleMics();
    const targetPool = applyFilters(distractorPool);
    const count = lengthByMode.quiz;
    const questions = buildQuizSession([...selectedCategories], targetPool, distractorPool, count);
    if (questions.length === 0) {
      alert("Couldn't build a round from the selected categories. Try a different combination.");
      return;
    }
    // Snapshot before the first answer is recorded — see baselineStats above.
    baselineStats = loadQuizStats();
    beginRound(questions);
  }

  function retryMissed() {
    if (missed.length === 0) return;
    baselineStats = loadQuizStats();
    beginRound(missed);
  }

  function renderQuestion() {
    const q = session[currentIndex];
    answeredCurrent = false;

    els.quizProgress.textContent = `Question ${currentIndex + 1} of ${session.length}`;
    els.quizProgressFill.style.width = `${(currentIndex / session.length) * 100}%`;
    els.quizScore.textContent = `${score} correct`;
    els.quizStreak.hidden = streak < 2;
    els.quizStreak.textContent = `${streak} in a row`;
    els.quizPrompt.textContent = q.prompt;
    els.quizFeedback.textContent = "";
    els.quizActionNote.textContent = "";
    els.quizNextBtn.disabled = true;
    els.quizNextBtn.textContent = currentIndex === session.length - 1 ? "See results" : "Next";

    els.quizOptions.style.minHeight = "";
    els.quizOptions.innerHTML = "";
    q.options.forEach((opt, i) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "quiz-option";

      const row = document.createElement("span");
      row.className = "quiz-option-row";
      const badge = document.createElement("span");
      badge.className = "quiz-option-badge";
      // aria-hidden so the accessible name stays "Ribbon", not "D Ribbon".
      badge.setAttribute("aria-hidden", "true");
      badge.textContent = (OPTION_KEYS[i] || "").toUpperCase();
      const label = document.createElement("span");
      label.className = "quiz-option-label";
      label.textContent = opt.label;
      const icon = document.createElement("span");
      icon.className = "quiz-option-icon";
      row.appendChild(badge);
      row.appendChild(label);
      row.appendChild(icon);
      btn.appendChild(row);

      btn.addEventListener("click", () => answerQuestion(q, opt, btn));
      els.quizOptions.appendChild(btn);
    });

    // Reserve room for the explanation that expands inside the chosen option
    // once answered, so the Next button below doesn't jump between the
    // correct case (no explanation) and the incorrect case (two lines).
    els.quizOptions.style.minHeight = `${els.quizOptions.offsetHeight + 64}px`;
  }

  function labelFor(question, value) {
    const match = question.options.find((o) => o.value === value);
    return match ? match.label : value;
  }

  function answerQuestion(question, chosen, chosenBtn) {
    if (answeredCurrent) return;
    answeredCurrent = true;
    const correct = chosen.value === question.correctValue;
    const mic = question.mic;

    [...els.quizOptions.children].forEach((btn, i) => {
      btn.disabled = true;
      const opt = question.options[i];
      const icon = btn.querySelector(".quiz-option-icon");
      if (opt.value === question.correctValue) {
        btn.classList.add("quiz-option--correct");
        icon.innerHTML = ICONS.check;
      } else if (btn === chosenBtn) {
        btn.classList.add("quiz-option--incorrect");
        icon.innerHTML = ICONS.x;
      }
    });

    if (correct) {
      score += 1;
      streak += 1;
    } else {
      streak = 0;
      question.chosenValue = chosen.value; // read back by the summary's missed list
      missed.push(question);
      // The explanation lives inside the option you picked, so the correction
      // is attached to the answer you actually gave.
      const explain = document.createElement("span");
      explain.className = "quiz-option-explain";
      explain.textContent = `${mic.displayName} — released ${mic.releaseYear}, ${formatPrice(mic)}.`;
      chosenBtn.appendChild(explain);
    }

    const forCat = categoryResults[question.categoryKey] || { answered: 0, correct: 0 };
    forCat.answered += 1;
    if (correct) forCat.correct += 1;
    categoryResults[question.categoryKey] = forCat;

    recordQuizAnswer(question.categoryKey, correct);

    els.quizScore.textContent = `${score} correct`;
    els.quizStreak.hidden = streak < 2;
    els.quizStreak.textContent = `${streak} in a row`;
    els.quizProgressFill.style.width = `${((currentIndex + 1) / session.length) * 100}%`;

    // The visual state above is colour + glyph + position, none of which a
    // screen reader conveys — this live region is what actually announces the
    // result, so it carries the full correction either way.
    els.quizFeedback.textContent = correct
      ? "Correct."
      : `Incorrect. The answer was ${labelFor(question, question.correctValue)}. ${mic.displayName}, released ${mic.releaseYear}, ${formatPrice(mic)}.`;

    els.quizActionNote.textContent = correct ? "Correct" : `Answer: ${labelFor(question, question.correctValue)}`;
    els.quizNextBtn.disabled = false;
    els.quizNextBtn.focus();
  }

  function nextQuestion() {
    if (!answeredCurrent) return;
    currentIndex += 1;
    if (currentIndex >= session.length) {
      showSummary();
    } else {
      renderQuestion();
    }
  }

  function showSummary() {
    showScreen("summary");
    els.quizSummaryScore.textContent = `${score} / ${session.length} correct`;

    // Compare against accuracy before this round, not the all-time figure —
    // which already contains it, since answers are recorded as they happen.
    const priorAnswered = (baselineStats ? baselineStats.totalAnswered : 0);
    const priorCorrect = (baselineStats ? baselineStats.totalCorrect : 0);
    if (priorAnswered > 0) {
      const before = Math.round((priorCorrect / priorAnswered) * 100);
      const now = Math.round((score / session.length) * 100);
      const verb = now > before ? "up from" : now < before ? "down from" : "level with";
      els.quizSummaryTrend.hidden = false;
      els.quizSummaryTrend.textContent = `${now}% this round, ${verb} ${before}% before it.`;
    } else {
      els.quizSummaryTrend.hidden = true;
    }

    els.quizSummaryBreakdown.innerHTML = "";
    Object.keys(categoryResults).forEach((key) => {
      const cat = QUIZ_CATEGORIES.find((c) => c.key === key);
      const r = categoryResults[key];
      const row = document.createElement("div");
      row.className = "quiz-summary-row";

      const head = document.createElement("div");
      head.className = "quiz-summary-row-head";
      const strong = document.createElement("strong");
      strong.textContent = cat.label;
      const scoreEl = document.createElement("span");
      scoreEl.className = "quiz-summary-row-score";
      scoreEl.textContent = `${r.correct} / ${r.answered}`;
      head.appendChild(strong);
      head.appendChild(scoreEl);

      const track = document.createElement("div");
      track.className = "quiz-summary-bar";
      const fill = document.createElement("div");
      fill.className = "quiz-summary-bar-fill";
      fill.style.width = `${(r.correct / r.answered) * 100}%`;
      track.appendChild(fill);

      row.appendChild(head);
      row.appendChild(track);
      els.quizSummaryBreakdown.appendChild(row);
    });

    renderMissedList();

    els.retryMissedBtn.hidden = missed.length === 0;
    els.retryMissedBtn.textContent = `Retry Missed (${missed.length})`;
  }

  function renderMissedList() {
    els.quizMissed.hidden = missed.length === 0;
    els.quizMissedList.innerHTML = "";
    missed.forEach((q) => {
      const li = document.createElement("li");
      li.className = "quiz-missed-item";

      const micEl = document.createElement("span");
      micEl.className = "quiz-missed-mic";
      micEl.textContent = q.mic.displayName;

      const qEl = document.createElement("span");
      qEl.className = "quiz-missed-q";
      qEl.textContent = q.prompt;

      const answers = document.createElement("span");
      answers.className = "quiz-missed-answers";
      const yours = document.createElement("span");
      yours.className = "quiz-missed-yours";
      yours.textContent = `You said ${labelFor(q, q.chosenValue)}`;
      const right = document.createElement("span");
      right.className = "quiz-missed-right";
      right.textContent = `Answer: ${labelFor(q, q.correctValue)}`;
      answers.appendChild(yours);
      answers.appendChild(right);

      li.appendChild(micEl);
      li.appendChild(qEl);
      li.appendChild(answers);
      els.quizMissedList.appendChild(li);
    });
  }

  // --------------------------------------------------------------- Order tab

  let orderItems = [];
  let currentOrderDimension = null;
  let orderDragState = null;
  let orderRoundsTotal = 5;
  let orderRoundIndex = 0; // 0-based, current round within the session
  let orderSessionResults = []; // [{fullyCorrect, inPlaceCount, roundSize}], one per completed round
  let orderShowingSessionSummary = false; // distinguishes the "summary" screen's two uses (see below)

  function clamp(n, min, max) {
    return Math.min(max, Math.max(min, n));
  }

  function renderOrderDimensionPicker() {
    const stats = loadOrderStats();
    const pool = applyFilters(eligibleMics());
    if (!isModeViable("order", pool)) {
      renderBlockedPoolNotice(els.orderDimensionList, els.startOrderBtn, "order", pool.length);
      return;
    }
    const availability = ORDER_DIMENSIONS.map((dim) => ({
      dim,
      candidateCount: pool.filter((m) => dim.getValue(m) != null).length,
    }));
    if (!availability.find((a) => a.dim.key === currentOrderDimension && a.candidateCount >= 2)) {
      const firstAvailable = availability.find((a) => a.candidateCount >= 2);
      currentOrderDimension = firstAvailable ? firstAvailable.dim.key : null;
    }

    els.orderDimensionList.innerHTML = "";
    availability.forEach(({ dim, candidateCount }) => {
      const tooSmall = candidateCount < 2;
      const id = `order-dim-${dim.key}`;
      const label = document.createElement("label");
      label.className = "category-pill";
      label.htmlFor = id;

      const input = document.createElement("input");
      input.type = "radio";
      input.name = "order-dimension";
      input.id = id;
      input.disabled = tooSmall;
      input.checked = !tooSmall && currentOrderDimension === dim.key;
      input.addEventListener("change", () => {
        if (input.checked) currentOrderDimension = dim.key;
      });

      const textWrap = document.createElement("span");
      textWrap.className = "category-pill-label";
      const nameEl = document.createElement("span");
      nameEl.className = "category-pill-name";
      nameEl.textContent = dim.label;
      const accEl = document.createElement("span");
      accEl.className = "category-pill-accuracy";
      if (tooSmall) {
        accEl.textContent = "Not enough mics under the current filter";
      } else {
        const forDim = stats.byDimension[dim.key] || { rounds: 0, fullyCorrect: 0 };
        accEl.textContent =
          forDim.rounds > 0 ? `${forDim.fullyCorrect} / ${forDim.rounds} rounds correct` : "Not studied yet";
      }
      textWrap.appendChild(nameEl);
      textWrap.appendChild(accEl);

      label.appendChild(input);
      label.appendChild(textWrap);
      els.orderDimensionList.appendChild(label);
    });
    els.startOrderBtn.disabled = currentOrderDimension === null;
  }

  function showOrderScreen(name) {
    els.orderPicker.hidden = name !== "picker";
    els.orderActive.hidden = name !== "active";
    els.orderSummary.hidden = name !== "summary";
  }

  // Starts a whole session (1+ rounds, per the Rounds picker) — only called
  // from the picker's Start button. Each individual round within the
  // session is started by startOrderRound() below, without resetting the
  // session counters.
  function startOrderSession() {
    if (!currentOrderDimension) return;
    orderRoundsTotal = lengthByMode.order;
    orderRoundIndex = 0;
    orderSessionResults = [];
    startOrderRound();
  }

  function startOrderRound() {
    const pool = applyFilters(eligibleMics());
    const round = buildOrderRound(currentOrderDimension, pool);
    if (!round) {
      alert("Couldn't build a round for this dimension. Try a different filter.");
      return;
    }
    orderItems = round.items;
    showOrderScreen("active");
    renderOrderRound();
  }

  function renderOrderRound() {
    const dim = ORDER_DIMENSIONS.find((d) => d.key === currentOrderDimension);
    els.orderPrompt.textContent = `Round ${orderRoundIndex + 1} of ${orderRoundsTotal} — arrange these ${orderItems.length} mics by ${dim.label.toLowerCase()}, lowest to highest.`;
    els.orderList.innerHTML = "";
    orderItems.forEach((item, i) => {
      const li = document.createElement("li");
      li.className = "order-item";
      li.tabIndex = 0;
      li.dataset.index = String(i);
      li.setAttribute("aria-label", `Position ${i + 1} of ${orderItems.length}: ${item.mic.displayName}.`);
      li.addEventListener("keydown", onOrderItemKeydown);
      // The whole row is the drag target, not just the grip — grabbing the
      // mic name was the obvious thing to try and did nothing but select
      // text. The grip stays as the visual cue.
      li.addEventListener("pointerdown", onOrderRowPointerDown);

      const grip = document.createElement("span");
      grip.className = "order-item-grip";
      grip.setAttribute("aria-hidden", "true");
      grip.textContent = "⠿"; // ⠿

      const name = document.createElement("span");
      name.className = "order-item-name";
      name.textContent = item.mic.displayName;

      const controls = document.createElement("span");
      controls.className = "order-item-controls";
      const upBtn = document.createElement("button");
      upBtn.type = "button";
      upBtn.className = "order-move-btn";
      upBtn.textContent = "↑";
      upBtn.setAttribute("aria-label", `Move ${item.mic.displayName} up`);
      upBtn.disabled = i === 0;
      upBtn.addEventListener("click", () => moveOrderItem(i, -1));
      const downBtn = document.createElement("button");
      downBtn.type = "button";
      downBtn.className = "order-move-btn";
      downBtn.textContent = "↓";
      downBtn.setAttribute("aria-label", `Move ${item.mic.displayName} down`);
      downBtn.disabled = i === orderItems.length - 1;
      downBtn.addEventListener("click", () => moveOrderItem(i, 1));
      controls.appendChild(upBtn);
      controls.appendChild(downBtn);

      li.appendChild(grip);
      li.appendChild(name);
      li.appendChild(controls);
      els.orderList.appendChild(li);
    });
  }

  function announceOrderMove(name, index) {
    els.orderLive.textContent = `${name} moved to position ${index + 1} of ${orderItems.length}.`;
  }

  function moveOrderItem(index, dir) {
    const target = index + dir;
    if (target < 0 || target >= orderItems.length) return;
    [orderItems[index], orderItems[target]] = [orderItems[target], orderItems[index]];
    renderOrderRound();
    els.orderList.children[target].focus();
    announceOrderMove(orderItems[target].mic.displayName, target);
  }

  function onOrderItemKeydown(e) {
    const i = Number(e.currentTarget.dataset.index);
    if (e.key === "ArrowUp") {
      e.preventDefault();
      moveOrderItem(i, -1);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      moveOrderItem(i, 1);
    }
  }

  // Pointer Events (not native HTML5 drag-and-drop) unify mouse/touch/pen in
  // one code path and give full control over drag visuals — native DnD has
  // notoriously inconsistent touch support. This is a reorder-by-index drag
  // (commits on pointerup), not a free-pixel drop, which avoids drop-target
  // hit-testing entirely.
  function onOrderRowPointerDown(e) {
    // The ↑/↓ buttons live inside the row, so a press on one would otherwise
    // start a drag instead of clicking.
    if (e.target.closest(".order-move-btn")) return;
    const li = e.currentTarget.closest(".order-item");
    const liEls = [...els.orderList.children];
    const fromIndex = Number(li.dataset.index);
    orderDragState = {
      fromIndex,
      currentIndex: fromIndex,
      startY: e.clientY,
      itemHeight: li.getBoundingClientRect().height,
      liEls,
      draggedLi: li,
    };
    li.setPointerCapture(e.pointerId);
    li.classList.add("order-item--dragging");
    li.addEventListener("pointermove", onOrderGripPointerMove);
    li.addEventListener("pointerup", onOrderGripPointerUp);
    li.addEventListener("pointercancel", onOrderGripPointerUp);
  }

  function onOrderGripPointerMove(e) {
    if (!orderDragState) return;
    const { fromIndex, startY, itemHeight, liEls, draggedLi } = orderDragState;
    const dy = e.clientY - startY;
    draggedLi.style.transform = `translateY(${dy}px)`;

    const shift = Math.round(dy / itemHeight);
    const targetIndex = clamp(fromIndex + shift, 0, liEls.length - 1);
    liEls.forEach((el, i) => {
      if (el === draggedLi) return;
      let visualSlot = i;
      if (i > fromIndex && i <= targetIndex) visualSlot -= 1;
      else if (i < fromIndex && i >= targetIndex) visualSlot += 1;
      el.style.transform = visualSlot === i ? "" : `translateY(${(visualSlot - i) * itemHeight}px)`;
    });
    orderDragState.currentIndex = targetIndex;
  }

  function onOrderGripPointerUp() {
    if (!orderDragState) return;
    const { fromIndex, currentIndex, liEls, draggedLi } = orderDragState;
    liEls.forEach((el) => {
      el.style.transform = "";
      el.classList.remove("order-item--dragging");
    });
    draggedLi.removeEventListener("pointermove", onOrderGripPointerMove);
    draggedLi.removeEventListener("pointerup", onOrderGripPointerUp);
    draggedLi.removeEventListener("pointercancel", onOrderGripPointerUp);
    if (currentIndex !== fromIndex) {
      const [moved] = orderItems.splice(fromIndex, 1);
      orderItems.splice(currentIndex, 0, moved);
      renderOrderRound();
      announceOrderMove(moved.mic.displayName, currentIndex);
    }
    orderDragState = null;
  }

  function submitOrder() {
    const scored = scoreOrderArrangement(orderItems);
    const fullyCorrect = isOrderFullyCorrect(orderItems);
    const inPlaceCount = scored.filter((s) => s.inPlace).length;
    recordOrderAnswer(currentOrderDimension, fullyCorrect);
    orderSessionResults.push({ fullyCorrect, inPlaceCount, roundSize: scored.length });
    showOrderRoundResult(scored, fullyCorrect, inPlaceCount);
  }

  // The "summary" screen serves two purposes, distinguished by
  // orderShowingSessionSummary: a single round's result (with a "Next
  // Round"/"See Session Results" button) or the final session recap (with a
  // "Back to Menu" button) — handleOrderContinue below picks the right
  // action depending on which is currently showing.
  // Competition ranking, so mics sharing a value share a rank: values
  // [109, 109, 449] rank as 1, 1, 3 rather than 1, 2, 3. Ties are common in
  // this pool (21 MSRPs are shared by 2+ mics), and scoreOrderArrangement
  // already counts either arrangement of a tied pair as correct — numbering
  // them consecutively here would contradict that by implying an order.
  function orderRanks(items) {
    const sorted = [...items].sort((a, b) => a.value - b.value);
    const rankByValue = new Map();
    sorted.forEach((item, i) => {
      if (!rankByValue.has(item.value)) rankByValue.set(item.value, i + 1);
    });
    return { sorted, rankByValue };
  }

  const ORDINALS = ["1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th", "10th"];

  function ordinal(n) {
    return ORDINALS[n - 1] || `${n}th`;
  }

  function showOrderRoundResult(scored, fullyCorrect, inPlaceCount) {
    orderShowingSessionSummary = false;
    showOrderScreen("summary");
    const dim = ORDER_DIMENSIONS.find((d) => d.key === currentOrderDimension);
    const { sorted, rankByValue } = orderRanks(scored);

    els.orderSummaryScore.textContent = `Round ${orderRoundIndex + 1} of ${orderRoundsTotal}: ${
      fullyCorrect ? "Correct order!" : `${inPlaceCount} / ${scored.length} in the right spot`
    }`;

    // Part one: your attempt, with each misplaced row told where it belongs.
    els.orderSummaryLabel.hidden = false;
    els.orderSummaryList.innerHTML = "";
    scored.forEach((item, i) => {
      const li = document.createElement("li");
      li.className = `order-summary-item ${item.inPlace ? "order-summary-item--correct" : "order-summary-item--incorrect"}`;

      const nameSpan = document.createElement("span");
      nameSpan.className = "order-summary-name";
      nameSpan.textContent = item.mic.displayName;

      const valueSpan = document.createElement("span");
      valueSpan.className = "order-summary-value";
      valueSpan.textContent = dim.format(item.mic);

      li.appendChild(nameSpan);
      li.appendChild(valueSpan);

      if (item.inPlace) {
        const icon = document.createElement("span");
        icon.className = "order-summary-icon";
        icon.innerHTML = ICONS.check;
        li.appendChild(icon);
      } else {
        const rank = rankByValue.get(item.value);
        const badge = document.createElement("span");
        badge.className = "order-summary-badge";
        // Arrow points the way the row needed to move from where you put it.
        badge.innerHTML = rank - 1 < i ? ICONS.arrowUp : ICONS.arrowDown;
        const text = document.createElement("span");
        text.textContent = `goes ${ordinal(rank)}`;
        badge.appendChild(text);
        li.appendChild(badge);
      }

      els.orderSummaryList.appendChild(li);
    });

    // Part two: the answer itself, so you don't have to re-sort five values
    // in your head to work out what you should have done.
    els.orderAnswer.hidden = false;
    els.orderAnswerList.innerHTML = "";
    sorted.forEach((item) => {
      const li = document.createElement("li");
      li.className = "order-answer-item";
      const rankEl = document.createElement("span");
      rankEl.className = "order-answer-rank";
      rankEl.textContent = rankByValue.get(item.value);
      const nameEl = document.createElement("span");
      nameEl.textContent = item.mic.displayName;
      const valueEl = document.createElement("span");
      valueEl.className = "order-answer-value";
      valueEl.textContent = dim.format(item.mic);
      li.appendChild(rankEl);
      li.appendChild(nameEl);
      li.appendChild(valueEl);
      els.orderAnswerList.appendChild(li);
    });

    els.newOrderRoundBtn.textContent = orderRoundIndex + 1 >= orderRoundsTotal ? "See Session Results" : "Next Round";
  }

  function showOrderSessionSummary() {
    orderShowingSessionSummary = true;
    showOrderScreen("summary");
    // The session recap lists per-round scores, not per-mic detail, so the
    // per-round "Your order" heading and answer list don't apply here.
    els.orderSummaryLabel.hidden = true;
    els.orderAnswer.hidden = true;
    const fullyCorrectCount = orderSessionResults.filter((r) => r.fullyCorrect).length;
    els.orderSummaryScore.textContent = `Session complete: ${fullyCorrectCount} / ${orderSessionResults.length} rounds fully correct`;
    els.orderSummaryList.innerHTML = "";
    orderSessionResults.forEach((r, i) => {
      const li = document.createElement("li");
      li.className = `order-summary-item ${r.fullyCorrect ? "order-summary-item--correct" : "order-summary-item--incorrect"}`;
      li.textContent = `Round ${i + 1}: ${r.inPlaceCount} / ${r.roundSize} in the right spot`;
      els.orderSummaryList.appendChild(li);
    });
    els.newOrderRoundBtn.textContent = "Back to Menu";
  }

  function handleOrderContinue() {
    if (orderShowingSessionSummary) {
      showOrderScreen("picker");
      renderOrderDimensionPicker();
      return;
    }
    if (orderRoundIndex + 1 >= orderRoundsTotal) {
      showOrderSessionSummary();
    } else {
      orderRoundIndex += 1;
      startOrderRound();
    }
  }

  // --------------------------------------------------------------- Match tab

  let matchRound = null;
  let selectedMatchIds = new Set();
  let currentMatchDimension = null;
  let matchRoundsTotal = 5;
  let matchRoundIndex = 0;
  let matchCardIndex = 0; // which mic within the current round
  let matchOutcomes = []; // per-card correctness, drives the run bar
  let answeredMatchCard = false;
  let matchSessionResults = []; // [{fullyCorrect, correctCount, roundSize}]
  let matchShowingSessionSummary = false;

  function isMatchDimensionAvailable(dim, pool) {
    return dim.values(pool).some((target) => {
      const matchCount = pool.filter((m) => dim.matches(m, target)).length;
      return matchCount >= MATCH_MIN_PER_SIDE && pool.length - matchCount >= MATCH_MIN_PER_SIDE;
    });
  }

  function renderMatchDimensionPicker() {
    const stats = loadMatchStats();
    const pool = applyFilters(eligibleMics());
    if (!isModeViable("match", pool)) {
      renderBlockedPoolNotice(els.matchDimensionList, els.startMatchBtn, "match", pool.length);
      return;
    }
    const availability = MATCH_DIMENSIONS.map((dim) => ({ dim, available: isMatchDimensionAvailable(dim, pool) }));
    if (!availability.find((a) => a.dim.key === currentMatchDimension && a.available)) {
      const firstAvailable = availability.find((a) => a.available);
      currentMatchDimension = firstAvailable ? firstAvailable.dim.key : null;
    }

    els.matchDimensionList.innerHTML = "";
    availability.forEach(({ dim, available }) => {
      const id = `match-dim-${dim.key}`;
      const label = document.createElement("label");
      label.className = "category-pill";
      label.htmlFor = id;

      const input = document.createElement("input");
      input.type = "radio";
      input.name = "match-dimension";
      input.id = id;
      input.disabled = !available;
      input.checked = available && currentMatchDimension === dim.key;
      input.addEventListener("change", () => {
        if (input.checked) currentMatchDimension = dim.key;
      });

      const textWrap = document.createElement("span");
      textWrap.className = "category-pill-label";
      const nameEl = document.createElement("span");
      nameEl.className = "category-pill-name";
      nameEl.textContent = dim.label;
      const accEl = document.createElement("span");
      accEl.className = "category-pill-accuracy";
      if (!available) {
        accEl.textContent = "Not enough variety under the current filter";
      } else {
        const forDim = stats.byDimension[dim.key] || { rounds: 0, fullyCorrect: 0 };
        accEl.textContent =
          forDim.rounds > 0 ? `${forDim.fullyCorrect} / ${forDim.rounds} rounds correct` : "Not studied yet";
      }
      textWrap.appendChild(nameEl);
      textWrap.appendChild(accEl);

      label.appendChild(input);
      label.appendChild(textWrap);
      els.matchDimensionList.appendChild(label);
    });
    els.startMatchBtn.disabled = currentMatchDimension === null;
  }

  function showMatchScreen(name) {
    els.matchPicker.hidden = name !== "picker";
    els.matchActive.hidden = name !== "active";
    els.matchSummary.hidden = name !== "summary";
  }

  // Starts a whole session (1+ rounds, per the Rounds picker) — only called
  // from the picker's Start button. Each individual round within the
  // session is started by startMatchRound() below, without resetting the
  // session counters.
  function startMatchSession() {
    if (!currentMatchDimension) return;
    matchRoundsTotal = lengthByMode.match;
    matchRoundIndex = 0;
    matchSessionResults = [];
    startMatchRound();
  }

  function startMatchRound() {
    const pool = applyFilters(eligibleMics());
    const round = buildMatchRound(currentMatchDimension, pool);
    if (!round) {
      alert("Couldn't build a round for this dimension. Try a different filter.");
      return;
    }
    matchRound = round;
    selectedMatchIds = new Set();
    matchCardIndex = 0;
    matchOutcomes = [];
    answeredMatchCard = false;
    showMatchScreen("active");
    renderMatchRunBar();
    renderMatchCard();
  }

  // One segment per mic, filled in as you answer. Purely a picture of
  // matchOutcomes — the run count below it says the same thing in words, which
  // is why the bar itself is aria-hidden.
  function renderMatchRunBar() {
    els.matchRunBar.innerHTML = "";
    matchRound.items.forEach((_, i) => {
      const seg = document.createElement("span");
      seg.className = "match-run-seg";
      const outcome = matchOutcomes[i];
      if (outcome === true) seg.classList.add("match-run-seg--correct");
      else if (outcome === false) seg.classList.add("match-run-seg--incorrect");
      els.matchRunBar.appendChild(seg);
    });
    // Always the same shape, and short enough to hold one line at 375px.
    // Growing it from "Mic 1 of 8" to "…· 0 right so far" wrapped a second
    // line at the instant you answered and shoved the card 75px down the page.
    const right = matchOutcomes.filter(Boolean).length;
    const position = Math.min(matchCardIndex + 1, matchRound.items.length);
    els.matchRunCount.textContent = `Mic ${position} of ${matchRound.items.length} · ${right} right`;
  }

  // The meta line deliberately shows the dimension you're *not* being asked
  // about — pattern questions get the principle and vice versa — so it gives
  // you something to reason from without answering the question itself.
  function matchMetaFor(mic) {
    const other = matchRound.dimensionKey === "pattern" ? mic.operatingPrinciple : formatPatterns(mic);
    return `${mic.manufacturer} · ${mic.releaseYear} · ${other}`;
  }

  function renderMatchCard() {
    const item = matchRound.items[matchCardIndex];
    answeredMatchCard = false;

    els.matchPrompt.innerHTML = "";
    const lead = document.createElement("span");
    lead.textContent =
      matchRound.dimensionKey === "pattern" ? "Does this mic have a " : "Is this mic a ";
    const target = document.createElement("strong");
    target.className = "match-target";
    target.textContent = matchRound.target;
    const tail = document.createElement("span");
    tail.textContent = matchRound.dimensionKey === "pattern" ? " polar pattern?" : " microphone?";
    els.matchPrompt.append(lead, target, tail);

    els.matchMicName.textContent = item.mic.displayName;
    els.matchMicMeta.textContent = matchMetaFor(item.mic);

    els.matchVerdict.hidden = true;
    els.matchVerdict.className = "match-verdict";
    els.matchVerdict.innerHTML = "";
    [els.matchNoBtn, els.matchYesBtn].forEach((btn) => {
      btn.disabled = false;
      btn.classList.remove("match-choice--chosen");
    });
    els.matchNextBtn.hidden = true;
    els.matchFeedback.textContent = "";
  }

  function answerMatchCard(saidYes) {
    if (answeredMatchCard) return;
    answeredMatchCard = true;

    const item = matchRound.items[matchCardIndex];
    const dim = MATCH_DIMENSIONS.find((d) => d.key === matchRound.dimensionKey);
    const correct = saidYes === item.isMatch;
    if (saidYes) selectedMatchIds.add(item.mic.id);
    matchOutcomes[matchCardIndex] = correct;

    // The buttons stay put, disabled, with the one you pressed still marked.
    // Swapping them for the verdict collapsed ~50px and shunted everything
    // below it upward at the exact moment you're trying to read the answer —
    // and the verdict alone doesn't tell you what you said.
    els.matchNoBtn.disabled = true;
    els.matchYesBtn.disabled = true;
    (saidYes ? els.matchYesBtn : els.matchNoBtn).classList.add("match-choice--chosen");

    const truth = dim.describe(item.mic, matchRound.target);
    els.matchVerdict.className = `match-verdict match-verdict--${correct ? "correct" : "incorrect"}`;
    els.matchVerdict.innerHTML = "";
    const icon = document.createElement("span");
    icon.className = "match-verdict-icon";
    // Correct/incorrect always carries a glyph, never colour alone.
    icon.innerHTML = correct ? ICONS.check : ICONS.x;
    const text = document.createElement("span");
    text.className = "match-verdict-text";
    const headline = document.createElement("strong");
    headline.textContent = correct ? "Correct" : item.isMatch ? "Missed it" : "Wrongly picked";
    const detail = document.createElement("span");
    detail.className = "match-verdict-detail";
    detail.textContent = `${item.mic.displayName} — ${truth}`;
    text.append(headline, detail);
    els.matchVerdict.append(icon, text);

    // Content before reveal, so the live region actually announces it.
    els.matchFeedback.textContent = `${correct ? "Correct." : "Incorrect."} ${item.mic.displayName} — ${truth}.`;
    els.matchVerdict.hidden = false;

    renderMatchRunBar();
    els.matchNextBtn.hidden = false;
    els.matchNextBtn.textContent =
      matchCardIndex + 1 >= matchRound.items.length ? "See Round Result" : "Next";
    els.matchNextBtn.focus();
  }

  function nextMatchCard() {
    if (!answeredMatchCard) return;
    if (matchCardIndex + 1 >= matchRound.items.length) {
      finishMatchRound();
      return;
    }
    matchCardIndex += 1;
    renderMatchRunBar();
    renderMatchCard();
  }

  function finishMatchRound() {
    const scored = scoreMatchRound(matchRound, selectedMatchIds);
    const fullyCorrect = isMatchRoundFullyCorrect(scored);
    const correctCount = scored.filter((s) => s.correct).length;
    recordMatchAnswer(matchRound.dimensionKey, fullyCorrect);
    matchSessionResults.push({ fullyCorrect, correctCount, roundSize: scored.length });
    showMatchRoundResult(scored, correctCount);
  }

  // Same two-purpose "summary" screen pattern as Order mode — see the
  // comment above showOrderRoundResult().
  //
  // The ledger leads with what you got wrong and names *which kind* of wrong
  // it was. scoreMatchRound() has always returned `selected` alongside
  // `isMatch`; the old grid showed only the truth, so a missed mic and a
  // wrongly picked one were the same red card.
  function showMatchRoundResult(scored, correctCount) {
    matchShowingSessionSummary = false;
    showMatchScreen("summary");
    const dim = MATCH_DIMENSIONS.find((d) => d.key === matchRound.dimensionKey);

    els.matchSummaryScore.textContent = `${correctCount} of ${scored.length} correct`;
    const missed = scored.filter((s) => !s.correct && s.isMatch).length;
    const wrong = scored.filter((s) => !s.correct && !s.isMatch).length;
    // Names the target again: after eight cards it's easy to lose track of
    // which trait you were sorting for, and the ledger's right-hand column is
    // unreadable without it.
    const where = `Round ${matchRoundIndex + 1} of ${matchRoundsTotal} · ${matchRound.target}`;
    els.matchSummaryTally.textContent =
      missed + wrong === 0
        ? `${where} — a clean sweep`
        : `${where} — ${missed} missed · ${wrong} wrongly picked`;

    const rank = (s) => (s.correct ? 1 : 0); // mistakes first, order otherwise preserved
    const ordered = [...scored].sort((a, b) => rank(a) - rank(b));

    // Shared node with the session summary, which swaps in its own layout.
    els.matchSummaryGrid.className = "match-ledger";
    els.matchSummaryGrid.innerHTML = "";
    ordered.forEach((s) => {
      const row = document.createElement("div");
      row.className = `match-ledger-row match-ledger-row--${s.correct ? "correct" : "incorrect"}`;

      const icon = document.createElement("span");
      icon.className = "match-ledger-icon";
      icon.innerHTML = s.correct ? ICONS.check : ICONS.x;

      const body = document.createElement("span");
      body.className = "match-ledger-body";
      const name = document.createElement("span");
      name.className = "match-ledger-name";
      name.textContent = s.mic.displayName;
      const note = document.createElement("span");
      note.className = "match-ledger-note";
      note.textContent = s.correct
        ? s.isMatch
          ? "You said yes"
          : "You said no"
        : s.isMatch
          ? "Missed — you said no"
          : "Wrongly picked — you said yes";
      body.append(name, note);

      const value = document.createElement("span");
      value.className = "match-ledger-value";
      value.textContent = dim.describe(s.mic, matchRound.target);

      row.append(icon, body, value);
      els.matchSummaryGrid.appendChild(row);
    });

    els.newMatchRoundBtn.textContent = matchRoundIndex + 1 >= matchRoundsTotal ? "See Session Results" : "Next Round";
    // A way out mid-session. Every round played is already banked by
    // recordMatchAnswer(), so leaving early costs you nothing but the rounds
    // you skip. Not offered on the session summary, where the primary button
    // is already "Back to Menu".
    els.matchExitBtn.hidden = false;
  }

  function showMatchSessionSummary() {
    matchShowingSessionSummary = true;
    showMatchScreen("summary");
    const fullyCorrectCount = matchSessionResults.filter((r) => r.fullyCorrect).length;
    els.matchSummaryScore.textContent = `Session complete: ${fullyCorrectCount} / ${matchSessionResults.length} rounds fully correct`;
    els.matchSummaryTally.textContent = "";

    // A round is a score out of eight, not a right-or-wrong answer — the same
    // kind of object as the quiz's per-category breakdown, so it borrows that
    // row wholesale. Scoring rounds with the ledger's red ✗ branded 7/8 as a
    // failure and made it indistinguishable from 1/8; the bar tells them
    // apart, and the check is kept for the rounds that actually earned it.
    els.matchSummaryGrid.className = "quiz-summary-breakdown";
    els.matchSummaryGrid.innerHTML = "";
    matchSessionResults.forEach((r, i) => {
      const row = document.createElement("div");
      row.className = "quiz-summary-row";

      const head = document.createElement("div");
      head.className = "quiz-summary-row-head";
      const label = document.createElement("strong");
      label.textContent = `Round ${i + 1}`;
      if (r.fullyCorrect) {
        const sweep = document.createElement("span");
        sweep.className = "match-sweep";
        sweep.innerHTML = ICONS.check;
        sweep.title = "Clean sweep";
        label.appendChild(sweep);
      }
      const scoreEl = document.createElement("span");
      scoreEl.className = "quiz-summary-row-score";
      scoreEl.textContent = `${r.correctCount} / ${r.roundSize}`;
      head.append(label, scoreEl);

      const track = document.createElement("div");
      track.className = "quiz-summary-bar";
      const fill = document.createElement("div");
      fill.className = "quiz-summary-bar-fill";
      fill.style.width = `${(r.correctCount / r.roundSize) * 100}%`;
      track.appendChild(fill);

      row.append(head, track);
      els.matchSummaryGrid.appendChild(row);
    });
    els.newMatchRoundBtn.textContent = "Back to Menu";
    els.matchExitBtn.hidden = true;
  }

  function exitMatchSession() {
    showMatchScreen("picker");
    renderMatchDimensionPicker();
  }

  function handleMatchContinue() {
    if (matchShowingSessionSummary) {
      showMatchScreen("picker");
      renderMatchDimensionPicker();
      return;
    }
    if (matchRoundIndex + 1 >= matchRoundsTotal) {
      showMatchSessionSummary();
    } else {
      matchRoundIndex += 1;
      startMatchRound();
    }
  }

  // ----------------------------------------------------------- Reference tab

  function showMicDetail(mic) {
    els.referenceDetailEmpty.hidden = true;
    els.referenceBoard.hidden = false;
    els.referenceBoard.innerHTML = "";

    const headerRow = document.createElement("div");
    headerRow.className = "board-row board-row--header";
    const guessHeader = document.createElement("div");
    guessHeader.className = "cell cell--guess";
    headerRow.appendChild(guessHeader);
    REFERENCE_FIELDS.forEach((f) => {
      const cell = document.createElement("div");
      cell.className = "cell cell--header";
      cell.textContent = f.label;
      headerRow.appendChild(cell);
    });
    els.referenceBoard.appendChild(headerRow);

    const row = document.createElement("div");
    row.className = "board-row";
    const nameCell = document.createElement("div");
    nameCell.className = "cell cell--guess";
    nameCell.textContent = mic.displayName;
    row.appendChild(nameCell);
    REFERENCE_FIELDS.forEach((f) => {
      const cell = document.createElement("div");
      cell.className = "cell";
      cell.dataset.label = f.label;
      const text = document.createElement("span");
      text.className = "cell-text";
      text.textContent = f.getValue(mic);
      cell.appendChild(text);
      row.appendChild(cell);
    });
    els.referenceBoard.appendChild(row);
  }

  createAutocomplete({
    input: els.referenceInput,
    listEl: els.referenceList,
    isGuessed: () => false,
    browseAllOnEmpty: true,
    onSelect: showMicDetail,
  });

  // ------------------------------------------------------------------- Init

  els.roundSetupToggle.addEventListener("click", () => {
    if (els.roundSetupToggle.disabled) return;
    setSetupExpanded(!setupExpanded);
  });

  els.filterManufacturerSelect.addEventListener("change", () => {
    manufacturerFilter = els.filterManufacturerSelect.value;
    onFilterChange();
  });
  els.filterCountrySelect.addEventListener("change", () => {
    countryFilter = els.filterCountrySelect.value;
    onFilterChange();
  });

  els.tabQuizBtn.addEventListener("click", () => switchTab("quiz"));
  els.tabOrderBtn.addEventListener("click", () => switchTab("order"));
  els.tabMatchBtn.addEventListener("click", () => switchTab("match"));
  els.tabReferenceBtn.addEventListener("click", () => switchTab("reference"));

  els.startQuizBtn.addEventListener("click", startQuiz);
  els.weakSpotsBtn.addEventListener("click", selectWeakSpots);
  els.quizNextBtn.addEventListener("click", nextQuestion);
  els.retryMissedBtn.addEventListener("click", retryMissed);
  els.newRoundBtn.addEventListener("click", () => {
    showScreen("picker");
    renderCategoryPicker();
  });

  // A–D and 1–4 pick an answer, Enter advances. Bound because the letter
  // badges on the options are just decoration otherwise. Mirrors js/app.js's
  // shortcut handler: bail out whenever a form control has focus, so this
  // never hijacks typing in the Reference search or a filter dropdown.
  document.addEventListener("keydown", (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (els.quizTab.hidden || els.quizActive.hidden) return;
    const tag = document.activeElement ? document.activeElement.tagName : "";
    if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") return;

    if (e.key === "Enter") {
      if (!els.quizNextBtn.disabled) {
        e.preventDefault();
        nextQuestion();
      }
      return;
    }
    if (answeredCurrent) return;

    const key = e.key.toLowerCase();
    const byLetter = OPTION_KEYS.indexOf(key);
    const byNumber = /^[1-4]$/.test(key) ? Number(key) - 1 : -1;
    const index = byLetter >= 0 ? byLetter : byNumber;
    if (index < 0) return;
    const btn = els.quizOptions.children[index];
    if (btn) {
      e.preventDefault();
      btn.click();
    }
  });

  els.startOrderBtn.addEventListener("click", startOrderSession);
  els.submitOrderBtn.addEventListener("click", submitOrder);
  els.newOrderRoundBtn.addEventListener("click", handleOrderContinue);

  els.startMatchBtn.addEventListener("click", startMatchSession);
  els.matchYesBtn.addEventListener("click", () => answerMatchCard(true));
  els.matchNoBtn.addEventListener("click", () => answerMatchCard(false));
  els.matchNextBtn.addEventListener("click", nextMatchCard);
  els.newMatchRoundBtn.addEventListener("click", handleMatchContinue);
  els.matchExitBtn.addEventListener("click", exitMatchSession);

  // Y/N to answer, Enter to advance — the same "keys do what the buttons do"
  // contract the quiz handler above provides, with the same bail-out when a
  // form control has focus so it never hijacks the Reference search.
  document.addEventListener("keydown", (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (els.matchTab.hidden || els.matchActive.hidden) return;
    const tag = document.activeElement ? document.activeElement.tagName : "";
    if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") return;

    if (e.key === "Enter") {
      if (answeredMatchCard) {
        e.preventDefault();
        nextMatchCard();
      }
      return;
    }
    if (answeredMatchCard) return;

    // Numbers follow the buttons left-to-right (1 = Yes, 2 = No), the same
    // positional contract 1–4 has over the quiz's A–D options; y/n are the
    // mnemonic pair.
    const key = e.key.toLowerCase();
    if (key === "y" || key === "1") {
      e.preventDefault();
      answerMatchCard(true);
    } else if (key === "n" || key === "2") {
      e.preventDefault();
      answerMatchCard(false);
    }
  });

  refreshFilterSelects();
  renderLengthPills();
  renderSetupSummary();
  renderCategoryPicker();
  renderOrderDimensionPicker();
  renderMatchDimensionPicker();
})();
