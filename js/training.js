(function () {
  const DEFAULT_QUESTION_COUNT = 10;

  // Inline Lucide icons, matching js/app.js's ICONS — correct/incorrect must
  // not be signalled by colour alone.
  const SVG_ATTRS =
    'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"';
  const ICONS = {
    check: `<svg ${SVG_ATTRS}><path d="M20 6 9 17l-5-5"/></svg>`,
    x: `<svg ${SVG_ATTRS}><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>`,
  };

  const OPTION_KEYS = ["a", "b", "c", "d"];

  const els = {
    poolFilters: document.getElementById("pool-filters"),
    filterManufacturerSelect: document.getElementById("filter-manufacturer"),
    filterCountrySelect: document.getElementById("filter-country"),
    poolFilterCount: document.getElementById("pool-filter-count"),

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
    quizCountSelect: document.getElementById("quiz-count-select"),
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

    orderPicker: document.getElementById("order-picker"),
    orderDimensionList: document.getElementById("order-dimension-list"),
    orderRoundsSelect: document.getElementById("order-rounds-select"),
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
    matchRoundsSelect: document.getElementById("match-rounds-select"),
    startMatchBtn: document.getElementById("start-match-btn"),
    matchActive: document.getElementById("match-active"),
    matchPrompt: document.getElementById("match-prompt"),
    matchGrid: document.getElementById("match-grid"),
    submitMatchBtn: document.getElementById("submit-match-btn"),
    matchSummary: document.getElementById("match-summary"),
    matchSummaryScore: document.getElementById("match-summary-score"),
    matchSummaryGrid: document.getElementById("match-summary-grid"),
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

  // ------------------------------------------------------------- Pool filter
  // Shared across Quiz/Order/Match (set once, narrows whichever mode is
  // active) — hidden only on Reference, where it has no meaning.

  let manufacturerFilter = "";
  let countryFilter = "";

  function applyFilters(pool) {
    return pool.filter(
      (m) =>
        (!manufacturerFilter || m.manufacturer === manufacturerFilter) &&
        (!countryFilter || m.countryOfOrigin === countryFilter)
    );
  }

  function populateFilterSelect(selectEl, pool, getValue) {
    const counts = new Map();
    pool.forEach((m) => {
      const v = getValue(m);
      counts.set(v, (counts.get(v) || 0) + 1);
    });
    const opts = [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0]));
    selectEl.innerHTML = '<option value="">Any</option>';
    opts.forEach(([v, n]) => {
      const opt = document.createElement("option");
      opt.value = v;
      opt.textContent = `${v} (${n})`;
      selectEl.appendChild(opt);
    });
  }

  // Toggles a distinct, unmissable warning style (not just muted caption
  // text) when the filter combination matches nothing — this is the state
  // that locks every category/dimension out at once, so it needs to read as
  // "fix this before you can do anything" rather than blend into the rest
  // of the small print.
  function updateFilterCount() {
    const n = applyFilters(eligibleMics()).length;
    els.poolFilterCount.textContent =
      n === 0
        ? "No mics match this filter — pick a different Manufacturer/Country combination."
        : n === 1
        ? "1 mic matches this filter"
        : `${n} mics match this filter`;
    els.poolFilterCount.classList.toggle("pool-filter-count--empty", n === 0);
  }

  function onFilterChange() {
    updateFilterCount();
    renderCategoryPicker();
    renderOrderDimensionPicker();
    renderMatchDimensionPicker();
  }

  // Shared "filter matches nothing" empty state for all three pickers below
  // — replaces the whole list (not just a per-item note) so it's impossible
  // to miss, and disables the corresponding Start button.
  function renderEmptyPoolNotice(listEl, startBtn) {
    listEl.innerHTML = "";
    const notice = document.createElement("p");
    notice.className = "pool-empty-notice";
    notice.textContent = "No mics match the current filter. Change Manufacturer/Country above to continue.";
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
    els.poolFilters.hidden = tab === "reference";
  }

  function renderCategoryPicker() {
    const stats = loadQuizStats();
    const targetPool = applyFilters(eligibleMics());
    if (targetPool.length === 0) {
      renderEmptyPoolNotice(els.categoryList, els.startQuizBtn);
      return;
    }
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
    const count = Number(els.quizCountSelect.value) || DEFAULT_QUESTION_COUNT;
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
    if (pool.length === 0) {
      renderEmptyPoolNotice(els.orderDimensionList, els.startOrderBtn);
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
    orderRoundsTotal = Number(els.orderRoundsSelect.value) || 5;
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

      const grip = document.createElement("span");
      grip.className = "order-item-grip";
      grip.setAttribute("aria-hidden", "true");
      grip.textContent = "⠿"; // ⠿
      grip.addEventListener("pointerdown", onOrderGripPointerDown);

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
  function onOrderGripPointerDown(e) {
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
  function showOrderRoundResult(scored, fullyCorrect, inPlaceCount) {
    orderShowingSessionSummary = false;
    showOrderScreen("summary");
    const dim = ORDER_DIMENSIONS.find((d) => d.key === currentOrderDimension);
    els.orderSummaryScore.textContent = `Round ${orderRoundIndex + 1} of ${orderRoundsTotal}: ${
      fullyCorrect ? "Correct order!" : `${inPlaceCount} / ${scored.length} in the right spot`
    }`;
    els.orderSummaryList.innerHTML = "";
    scored.forEach((item) => {
      const li = document.createElement("li");
      li.className = `order-summary-item ${item.inPlace ? "order-summary-item--correct" : "order-summary-item--incorrect"}`;
      const nameSpan = document.createElement("span");
      nameSpan.textContent = item.mic.displayName;
      const valueSpan = document.createElement("span");
      valueSpan.textContent = dim.format(item.mic);
      li.appendChild(nameSpan);
      li.appendChild(valueSpan);
      els.orderSummaryList.appendChild(li);
    });
    els.newOrderRoundBtn.textContent = orderRoundIndex + 1 >= orderRoundsTotal ? "See Session Results" : "Next Round";
  }

  function showOrderSessionSummary() {
    orderShowingSessionSummary = true;
    showOrderScreen("summary");
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
    if (pool.length === 0) {
      renderEmptyPoolNotice(els.matchDimensionList, els.startMatchBtn);
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
    matchRoundsTotal = Number(els.matchRoundsSelect.value) || 5;
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
    showMatchScreen("active");
    renderMatchGrid();
  }

  function renderMatchGrid() {
    const prompt =
      matchRound.dimensionKey === "pattern"
        ? `select every mic below with a ${matchRound.target} polar pattern.`
        : `select every mic below that's a ${matchRound.target} microphone.`;
    els.matchPrompt.textContent = `Round ${matchRoundIndex + 1} of ${matchRoundsTotal} — ${prompt}`;
    els.matchGrid.innerHTML = "";
    matchRound.items.forEach((item) => {
      const id = `match-item-${item.mic.id}`;
      const label = document.createElement("label");
      label.className = "match-card";
      label.htmlFor = id;

      const input = document.createElement("input");
      input.type = "checkbox";
      input.id = id;
      input.checked = selectedMatchIds.has(item.mic.id);
      input.addEventListener("change", () => {
        if (input.checked) selectedMatchIds.add(item.mic.id);
        else selectedMatchIds.delete(item.mic.id);
      });

      const name = document.createElement("span");
      name.textContent = item.mic.displayName;

      label.appendChild(input);
      label.appendChild(name);
      els.matchGrid.appendChild(label);
    });
  }

  function submitMatch() {
    const scored = scoreMatchRound(matchRound, selectedMatchIds);
    const fullyCorrect = isMatchRoundFullyCorrect(scored);
    const correctCount = scored.filter((s) => s.correct).length;
    recordMatchAnswer(matchRound.dimensionKey, fullyCorrect);
    matchSessionResults.push({ fullyCorrect, correctCount, roundSize: scored.length });
    showMatchRoundResult(scored, fullyCorrect, correctCount);
  }

  // Same two-purpose "summary" screen pattern as Order mode — see the
  // comment above showOrderRoundResult().
  function showMatchRoundResult(scored, fullyCorrect, correctCount) {
    matchShowingSessionSummary = false;
    showMatchScreen("summary");
    els.matchSummaryScore.textContent = `Round ${matchRoundIndex + 1} of ${matchRoundsTotal}: ${
      fullyCorrect ? "Correct!" : `${correctCount} / ${scored.length} correctly identified`
    }`;
    els.matchSummaryGrid.innerHTML = "";
    scored.forEach((item) => {
      const card = document.createElement("div");
      card.className = `match-card ${item.correct ? "match-card--correct" : "match-card--incorrect"}`;
      card.textContent = `${item.mic.displayName} — ${item.isMatch ? "matches" : "doesn't match"}`;
      els.matchSummaryGrid.appendChild(card);
    });
    els.newMatchRoundBtn.textContent = matchRoundIndex + 1 >= matchRoundsTotal ? "See Session Results" : "Next Round";
  }

  function showMatchSessionSummary() {
    matchShowingSessionSummary = true;
    showMatchScreen("summary");
    const fullyCorrectCount = matchSessionResults.filter((r) => r.fullyCorrect).length;
    els.matchSummaryScore.textContent = `Session complete: ${fullyCorrectCount} / ${matchSessionResults.length} rounds fully correct`;
    els.matchSummaryGrid.innerHTML = "";
    matchSessionResults.forEach((r, i) => {
      const card = document.createElement("div");
      card.className = `match-card ${r.fullyCorrect ? "match-card--correct" : "match-card--incorrect"}`;
      card.textContent = `Round ${i + 1}: ${r.correctCount} / ${r.roundSize} correctly identified`;
      els.matchSummaryGrid.appendChild(card);
    });
    els.newMatchRoundBtn.textContent = "Back to Menu";
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

  function populateFilterSelects() {
    const pool = eligibleMics();
    populateFilterSelect(els.filterManufacturerSelect, pool, (m) => m.manufacturer);
    populateFilterSelect(els.filterCountrySelect, pool, (m) => m.countryOfOrigin);
  }

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
  els.submitMatchBtn.addEventListener("click", submitMatch);
  els.newMatchRoundBtn.addEventListener("click", handleMatchContinue);

  populateFilterSelects();
  updateFilterCount();
  renderCategoryPicker();
  renderOrderDimensionPicker();
  renderMatchDimensionPicker();
})();
