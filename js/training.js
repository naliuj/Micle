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
    setAsideSelect: document.getElementById("set-aside-select"),
    setAsideChips: document.getElementById("set-aside-chips"),

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
    referenceFilterMenus: document.getElementById("reference-filter-menus"),
    referenceFilterPanels: document.getElementById("reference-filter-panels"),
    referenceActiveFilters: document.getElementById("reference-active-filters"),
    referenceEmpty: document.getElementById("reference-empty"),
    referenceBoard: document.getElementById("reference-board"),
    referenceMap: document.getElementById("reference-map"),
    referenceChips: document.getElementById("reference-chips"),
    referenceSort: document.getElementById("reference-sort"),
    referenceSortPills: document.getElementById("reference-sort-pills"),
    referenceStatus: document.getElementById("reference-status"),
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
  // sortKey ties each column to a comparator in js/worldmap.js's SORT_VALUE.
  // Don't rename the labels: css/styles.css keys a full-width card-mode rule
  // to the literal string [data-label="Polar Pattern"], css/training.css keys
  // the Reference table's right-aligned numeric columns to Year and Price,
  // and the 7-column .board-row grid is sized to REFERENCE_FIELDS.length + 1.
  // The order mirrors app.js's CATEGORIES so a mic reads the same in the
  // reference as it does on the daily board.
  // Mirrors app.js's own PRINCIPLE_ABBR, deliberately including the wording:
  // "Condenser (LDC)" is what a player sees on the daily board, so the
  // reference contracting it the same way keeps one vocabulary across the
  // site. It also keeps the column to one line in ~90 of 118 rows, since the
  // full "Condenser (Large-Diaphragm)" wraps at every sensible column width.
  // Polar Pattern is deliberately NOT abbreviated the way the board does it:
  // pattern names are the thing being learned here, and only a handful of
  // multi-pattern mics run long.
  const PRINCIPLE_ABBR = {
    "Condenser (Large-Diaphragm)": "Condenser (LDC)",
    "Condenser (Small-Diaphragm)": "Condenser (SDC)",
  };

  const REFERENCE_FIELDS = [
    { label: "Origin", getValue: (m) => m.countryOfOrigin, sortKey: "country" },
    {
      label: "Principle",
      getValue: (m) => PRINCIPLE_ABBR[m.operatingPrinciple] || m.operatingPrinciple,
      sortKey: "principle",
    },
    { label: "Polar Pattern", getValue: formatPatterns, sortKey: "pattern" },
    { label: "Manufacturer", getValue: (m) => m.manufacturer, sortKey: "manufacturer" },
    { label: "Year", getValue: (m) => String(m.releaseYear), sortKey: "year" },
    { label: "Price", getValue: formatPrice, sortKey: "price" },
  ];

  // The columns offered as sort pills below 800px, where the header row is
  // display:none and there is nothing to click. Origin is omitted on purpose:
  // in a country view every row shares one value, so sorting it is a no-op.
  const SORT_PILLS = [
    { key: "name", label: "Name" },
    { key: "manufacturer", label: "Maker" },
    { key: "year", label: "Year" },
    { key: "price", label: "Price" },
  ];

  // -------------------------------------------------------- Round setup bar
  // One shared control for every mode. The pool filter persists across
  // Quiz/Order/Match; only the length row varies by mode. Collapsed to a
  // summary line by default, since most rounds are "any mic" — the summary
  // carries the live state, so collapsing hides the controls, not the facts.

  let manufacturerFilter = "";
  let countryFilter = "";
  let setupExpanded = false;

  // Standing "I already know these" list, loaded from localStorage. Distinct
  // in kind from the two filters above: those narrow a single round and reset
  // on reload, this one persists, because what you already know doesn't
  // change between rounds.
  let setAside = loadSetAside();

  // Length is per-mode state now that one control serves all three: a Quiz
  // round is N questions, an Order/Match session is N rounds, so the units
  // genuinely differ and each mode keeps its own value across tab switches.
  const LENGTH_OPTIONS = { quiz: [5, 10, 20], order: [1, 3, 5, 10], match: [1, 3, 5, 10] };
  const LENGTH_NOUN = { quiz: "question", order: "round", match: "round" };
  let lengthByMode = { quiz: 10, order: 5, match: 5 };
  let activeTab = "quiz";

  function isSetAside(mic) {
    return setAside.countries.includes(mic.countryOfOrigin) || setAside.manufacturers.includes(mic.manufacturer);
  }

  // Everything the player is still willing to be asked about. Every count and
  // every option in the setup bar is measured against this rather than the
  // raw pool, so the numbers on screen always describe what a round can
  // actually draw from.
  function practicePool() {
    return eligibleMics().filter((m) => !isSetAside(m));
  }

  // Set-aside is folded in here rather than at the call sites so it applies
  // everywhere a round's *targets* come from. Quiz distractors deliberately
  // bypass this (they take eligibleMics() directly), which is why a maker you
  // set aside still appears as a wrong answer — recognising it well enough to
  // reject it is exactly the knowledge you claimed to have.
  function applyFilters(pool) {
    return pool.filter(
      (m) =>
        !isSetAside(m) &&
        (!manufacturerFilter || m.manufacturer === manufacturerFilter) &&
        (!countryFilter || m.countryOfOrigin === countryFilter)
    );
  }

  // The pool a given pair of selections *would* produce, cascade included —
  // picking a country drops an incompatible manufacturer, so the result is
  // that country's whole set, not an empty one. Used to test an option
  // before the user commits to it.
  function projectedPool(country, manufacturer) {
    const pool = practicePool().filter((m) => !country || m.countryOfOrigin === country);
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
    const pool = practicePool();
    // Setting aside the country you're filtered to would otherwise leave the
    // filter pointing at a value the list no longer offers — same stranding
    // the manufacturer cascade already clears below.
    if (countryFilter && !pool.some((m) => m.countryOfOrigin === countryFilter)) {
      countryFilter = "";
    }
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

  // What's already accounting for every mic in a given set — set aside
  // Germany and Neumann's 17 mics are all out already, so adding Neumann
  // would be a chip that changes nothing. Computed from whether each mic is
  // covered rather than from "this maker is German", because the schema
  // allows a maker to span countries even though none does today.
  function micsForEntry(key, value) {
    return eligibleMics().filter((m) => (key === "countries" ? m.countryOfOrigin : m.manufacturer) === value);
  }

  function coveringReasons(mics) {
    if (mics.length === 0 || !mics.every(isSetAside)) return [];
    const reasons = new Set();
    mics.forEach((m) => {
      if (setAside.countries.includes(m.countryOfOrigin)) reasons.add(m.countryOfOrigin);
      if (setAside.manufacturers.includes(m.manufacturer)) reasons.add(m.manufacturer);
    });
    return [...reasons].sort((a, b) => a.localeCompare(b));
  }

  // The picker offers everything not already set aside — an entry that's out
  // is represented by its chip, which is also how you put it back, so listing
  // it in both places would just be two controls for one state.
  function renderSetAside() {
    const all = eligibleMics();
    const groups = [
      { label: "Countries", key: "countries", field: (m) => m.countryOfOrigin },
      { label: "Manufacturers", key: "manufacturers", field: (m) => m.manufacturer },
    ].map((g) => ({ ...g, options: countValues(all, g.field) }));

    els.setAsideSelect.innerHTML = '<option value="">Add…</option>';
    groups.forEach(({ label, key, options }) => {
      const available = options.filter((o) => !setAside[key].includes(o.value));
      if (available.length === 0) return;
      const group = document.createElement("optgroup");
      group.label = label;
      available.forEach(({ value, count }) => {
        const opt = document.createElement("option");
        opt.value = `${key}:${value}`;
        const covering = coveringReasons(micsForEntry(key, value));
        // Disabled rather than hidden: seeing that Neumann is already
        // covered, and by what, is more use than watching it vanish from
        // the list the moment you set Germany aside.
        opt.disabled = covering.length > 0;
        opt.textContent = covering.length > 0
          ? `${value} (${count}) — already out via ${covering.join(", ")}`
          : `${value} (${count})`;
        group.appendChild(opt);
      });
      els.setAsideSelect.appendChild(group);
    });
    els.setAsideSelect.value = "";

    els.setAsideChips.innerHTML = "";
    groups.forEach(({ key, options }) => {
      setAside[key].forEach((value) => {
        const found = options.find((o) => o.value === value);
        const chip = document.createElement("button");
        chip.type = "button";
        chip.className = "set-aside-chip";
        chip.setAttribute("aria-label", `Put ${value} back into practice`);
        const name = document.createElement("span");
        name.textContent = found ? `${value} (${found.count})` : value;
        const icon = document.createElement("span");
        icon.className = "set-aside-chip-x";
        icon.innerHTML = ICONS.x;
        chip.append(name, icon);
        chip.addEventListener("click", () => {
          setAside[key] = setAside[key].filter((v) => v !== value);
          saveSetAside(setAside);
          onFilterChange();
        });
        els.setAsideChips.appendChild(chip);
      });
    });
  }

  function setAsideCount() {
    return setAside.countries.length + setAside.manufacturers.length;
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
    if (active.length > 0) return `${active.join(", ")} · ${n} ${micWord}`;
    // "All 118 mics" is a lie the moment anything is set aside, and the whole
    // risk of a standing preference is forgetting it's on.
    const total = eligibleMics().length;
    return n === total ? `All ${n} ${micWord}` : `${n} of ${total} mics`;
  }

  // Names whichever controls are actually narrowing the pool, with the verb
  // that fits each. Telling someone to "change Country or Manufacturer" when
  // both read Any and the real cause is a set-aside maker sends them to the
  // wrong control — and you don't "widen" a set-aside list, you take
  // something back out of it.
  function widenHint() {
    const parts = [];
    if (countryFilter || manufacturerFilter) parts.push("widen Country or Manufacturer");
    if (setAsideCount() > 0) parts.push("put something back from Set aside");
    return parts.length > 0 ? parts.join(", or ") : "widen Country or Manufacturer";
  }

  function renderSetupSummary() {
    const pool = activePool();
    const n = pool.length;
    const viable = isModeViable(activeTab, pool);
    const req = MODE_REQUIREMENTS[activeTab];

    let text;
    if (n === 0) {
      text = `No mics are left to practise — ${widenHint()} to continue.`;
    } else if (!viable) {
      // Name the count, the mode it falls short of, and the bar it has to
      // clear. "Not enough mics" alone leaves you guessing how much more is
      // enough, and the pickers below can only say it one greyed pill at a
      // time.
      text = `${poolDescription(n)} — too few for ${req.label}. ${req.needs}`;
    } else {
      const len = lengthByMode[activeTab];
      const noun = LENGTH_NOUN[activeTab] || "round";
      const aside = setAsideCount() > 0 ? ` · ${setAsideCount()} set aside` : "";
      text = `${poolDescription(n)}${aside} · ${len} ${noun}${len === 1 ? "" : "s"}`;
    }

    els.roundSetupText.textContent = text;
    els.roundSetup.classList.toggle("round-setup--blocked", !viable);

    // A blocking state must never hide behind a collapsed control: force the
    // panel open and refuse to close it until the filter is fixed.
    if (!viable && !setupExpanded) setSetupExpanded(true);
    els.roundSetupToggle.setAttribute("aria-disabled", String(!viable));
  }

  function setSetupExpanded(expanded) {
    setupExpanded = expanded;
    els.roundSetupPanel.hidden = !expanded;
    els.roundSetupToggle.setAttribute("aria-expanded", String(expanded));
  }

  function onFilterChange() {
    refreshFilterSelects();
    renderSetAside();
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
        ? `No mics are left to practise — ${widenHint()} above to continue.`
        : `Only ${poolSize} mic${poolSize === 1 ? " is" : "s are"} left to practise — ${widenHint()} above to start ${MODE_REQUIREMENTS[mode].article}.`;
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
    } else {
      // Runs after the forEach above cleared `hidden`, so the tab is laid out
      // by now. Idempotent — the map is built on the first visit only. If
      // deep-linking (?tab=reference) is ever added it must route through
      // switchTab so this stays the single entry point.
      ensureReferenceMap();
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

  // The Reference tab draws from SELECTABLE_MICS (js/autocomplete.js —
  // retired !== true), NOT eligibleMics() (needsVerification !== true), so the
  // map, the table and the search box above them all agree. Clicking Germany
  // and getting a mic the search can't find would read as a bug.
  //
  // Both predicates return 118 today, which makes them look interchangeable.
  // They aren't: they coincide only because ONE mic (mxl-v69) happens to carry
  // needsVerification AND retired at once. A mic that's retired but verified,
  // or quarantined but still live, splits the two counts immediately.
  function referencePool() {
    return SELECTABLE_MICS;
  }

  // Filtering is a bag of orthogonal facets, not a mode. The old state was
  // mode: "empty" | "country" | "mic", which conflated *what is selected*
  // with *what is filtered* — workable while country was the only filter,
  // wrong the moment anything can be on alongside it.
  //
  // "mic" mode is gone with it. That existed only because the search box
  // picked one mic out of a dropdown, which then had to suppress sorting and
  // country selection. Now the box filters the table live, so typing a full
  // name yields a one-row table: same result, no special case — and the dead
  // end it created (the only way out of mic mode was toggling a country chip
  // on and off again) disappears rather than needing an escape hatch.
  //
  // Ranges are null-when-unset and are never seeded to the pool's bounds, so
  // "no filter" stays distinguishable from a deliberate extreme — see
  // buildRangePanel.
  //
  // sortKey starts at "name": the table carries a Manufacturer column, and
  // every displayName already begins with its maker, so a name sort clusters
  // by maker anyway. Choosing Maker explicitly still switches on the grouped
  // view with its per-maker counts.
  let referenceView = {
    query: "",
    filters: {
      manufacturer: [],
      principle: [],
      pattern: [],
      country: [],
      switchable: null, // null = any | true | false
      yearFrom: null,
      yearTo: null,
      priceFrom: null,
      priceTo: null,
    },
    sortKey: "name",
    sortDir: "asc",
  };
  let referenceMapBuilt = false;
  let openFacetKey = null;

  // One descriptor per facet drives the buttons, the panels, the counts, the
  // active chips and the clear — so adding a facet is one entry here, not six
  // edits scattered through the render path.
  //
  // `values` fans out for pattern and returns a single-element array for the
  // rest. Counting and matching both go through it, so a mic can never be
  // counted into an option it wouldn't actually match. The pattern counts sum
  // to 173 rather than 118 on purpose: a six-pattern mic really is in six
  // buckets, and checking Figure-8 should find every mic that can do figure-8,
  // not only the ten that do nothing else.
  //
  // Because the pattern facet tests membership, the non-canonical array order
  // in data/mics.js (the same three patterns appear as both "Omni, Cardioid,
  // Fig-8" and "Cardioid, Omni, Fig-8") is irrelevant here — includes() does
  // not care. js/autocomplete.js's patternSignature exists to canonicalise for
  // a different job and is deliberately not needed.
  const FACETS = [
    { key: "manufacturer", label: "Manufacturer", kind: "list", values: (m) => [m.manufacturer] },
    {
      key: "principle",
      label: "Principle",
      kind: "list",
      values: (m) => [m.operatingPrinciple],
      // Show the same contraction the table and the daily board show.
      format: (v) => PRINCIPLE_ABBR[v] || v,
    },
    { key: "pattern", label: "Polar pattern", kind: "list", values: (m) => m.polarPatterns },
    // Country deliberately has no dropdown button. The chips under the map are
    // already a multi-select country control with counts, sitting directly
    // above the table — a seventh button would be a second control for one
    // piece of state, which is the thing the set-aside list argues against.
    // It stays a facet here so it filters, counts and clears like the others.
    { key: "country", label: "Country", kind: "list", values: (m) => [m.countryOfOrigin], control: "chips" },
    {
      key: "year",
      label: "Year",
      kind: "range",
      from: "yearFrom",
      to: "yearTo",
      get: (m) => m.releaseYear,
      format: (n) => String(n),
    },
    {
      key: "price",
      label: "Price",
      kind: "range",
      from: "priceFrom",
      to: "priceTo",
      get: (m) => m.msrp,
      // Matches formatPrice in js/quiz.js so a chip reads like the column.
      format: (n) => `$${n.toLocaleString("en-US")}`,
    },
    { key: "switchable", label: "Switchable", kind: "bool" },
  ];

  const SWITCHABLE_CHOICES = [
    { value: "any", label: "Any", state: null },
    { value: "yes", label: "Yes", state: true },
    { value: "no", label: "No", state: false },
  ];

  // Each range slider steps over the sorted DISTINCT values of its field, not
  // over the raw number line. For year that's barely different — 49 values
  // spread fairly evenly across 1949-2025. For price it's the whole ballgame:
  // 70 of 118 mics sit under $1,000 against a $14,998 top end, so a linear
  // track buries most of the pool in its left sixteenth and one pixel of
  // travel is worth about $50. Stepping over the values instead gives every
  // position a real, reachable price and spends travel where the mics
  // actually are.
  function rangeValues(facet) {
    const seen = new Set();
    referencePool().forEach((m) => {
      const v = facet.get(m);
      if (v != null) seen.add(v);
    });
    return [...seen].sort((a, b) => a - b);
  }

  function rangeIsSet(facet) {
    return referenceView.filters[facet.from] !== null || referenceView.filters[facet.to] !== null;
  }

  function facetIsActive(facet) {
    if (facet.kind === "range") return rangeIsSet(facet);
    if (facet.kind === "bool") return referenceView.filters.switchable !== null;
    return referenceView.filters[facet.key].length > 0;
  }

  function matchesFacet(mic, facet, filters) {
    if (facet.kind === "list") {
      const chosen = filters[facet.key];
      // Empty means "no constraint", never "nothing matches".
      return chosen.length === 0 || facet.values(mic).some((v) => chosen.includes(v));
    }
    if (facet.kind === "bool") {
      return filters.switchable === null || mic.switchable === filters.switchable;
    }
    const from = filters[facet.from];
    const to = filters[facet.to];
    if (from === null && to === null) return true;
    const v = facet.get(mic);
    // A null value drops out the moment a bound is set. msrp is number|null in
    // the schema and formatPrice prints null as "Unknown"; letting it through
    // would put a mic inside "$300–$800" whose own Price cell says Unknown.
    // compareMics already refuses to guess at a null price the same way.
    if (v == null) return false;
    return (from === null || v >= from) && (to === null || v <= to);
  }

  // Base set for a facet's own counts: the pool narrowed by the query and by
  // every OTHER facet, but not by this one. That exclusion is what keeps
  // multi-select usable — count Neumann against a base that already excludes
  // non-Neumann and every other maker reads 0, so Shure could never be added
  // to a Neumann selection. Pass null to apply all of them; that's the table.
  //
  // The query is in the base set for every facet. It's a different axis from
  // all of them, and if it weren't included, typing "ksm" and opening
  // Manufacturer would offer "Neumann 17" — a count that yields no rows when
  // clicked, which is worse than showing no count at all.
  function referenceMicsExcept(exceptKey) {
    const { query, filters } = referenceView;
    return referencePool().filter(
      (m) =>
        micMatchesQuery(query, m) &&
        FACETS.every((f) => f.key === exceptKey || matchesFacet(m, f, filters))
    );
  }

  function referenceMics() {
    return referenceMicsExcept(null);
  }

  // countValues' multi-valued twin. Kept separate rather than generalising
  // that one: it is the counting half of the round-setup cascade and of the
  // country chips, and neither has an array-valued field to worry about.
  function countFacetValues(pool, facet) {
    const counts = new Map();
    pool.forEach((m) =>
      facet.values(m).forEach((v) => {
        if (v != null) counts.set(v, (counts.get(v) || 0) + 1);
      })
    );
    return counts;
  }

  // The facet vocabulary is fixed by the full pool and built exactly once.
  // Only counts, checked and disabled change afterwards, which means a render
  // never creates or destroys a control — so a render can never steal focus
  // from the checkbox you just pressed or the number you are mid-way through
  // typing. That invariant is what keeps the whole thing simple.
  function facetVocabulary(facet) {
    const counts = countFacetValues(referencePool(), facet);
    return [...counts.keys()].sort((a, b) => compareText(a, b));
  }

  function isoCountsFor(pool) {
    const counts = {};
    pool.forEach((m) => {
      const iso = COUNTRY_ISO[m.countryOfOrigin];
      if (iso) counts[iso] = (counts[iso] || 0) + 1;
    });
    return counts;
  }

  // Built once, on first reveal. Not at parse time: [hidden] is
  // display:none !important, so anything measured in here before the tab is
  // shown gets zeros. Nothing in this map measures itself (the SVG sizes from
  // its viewBox), but the flag also keeps repeated tab switches from stacking
  // duplicate SVGs.
  function ensureReferenceMap() {
    if (referenceMapBuilt) return;
    referenceMapBuilt = true;
    // Built from the FULL pool so every country that ever has mics keeps its
    // data-country hook and stays clickable; syncCountryScope greys out the
    // ones the current filters empty, rather than removing them.
    els.referenceMap.innerHTML = buildWorldMapSvg(isoCountsFor(referencePool()));
    els.referenceMap.addEventListener("click", (e) => {
      const path = e.target.closest("[data-country]");
      if (path) selectCountry(path.dataset.country);
    });
    buildCountryChips();
    buildFacetControls();
    renderReference();
  }

  function buildCountryChips() {
    els.referenceChips.innerHTML = "";
    facetVocabulary(FACETS.find((f) => f.key === "country")).forEach((value) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "country-chip";
      btn.dataset.country = value;
      btn.setAttribute("aria-pressed", "false");
      const name = document.createElement("span");
      name.textContent = value;
      const count = document.createElement("span");
      count.className = "country-chip-count";
      btn.append(name, " ", count);
      btn.addEventListener("click", () => selectCountry(value));
      els.referenceChips.appendChild(btn);
    });
  }

  // ------------------------------------------------------ Facet bar + panels

  // key -> { btn, panel, badge, options: Map(value -> {input, count, label}),
  //          inputs: slider refs for a range facet, null otherwise }
  const facetControls = new Map();

  function buildFacetControls() {
    els.referenceFilterMenus.innerHTML = "";
    els.referenceFilterPanels.innerHTML = "";
    FACETS.filter((f) => f.control !== "chips").forEach((facet) => {
      const btnId = `facet-btn-${facet.key}`;
      const panelId = `facet-panel-${facet.key}`;

      const btn = document.createElement("button");
      btn.type = "button";
      btn.id = btnId;
      btn.className = "facet-btn";
      // A disclosure, not a menu: aria-expanded + aria-controls is the whole
      // contract. aria-haspopup="menu" would promise roving-tabindex menu
      // semantics (and that activating an item closes it), both wrong for a
      // multi-select checklist.
      btn.setAttribute("aria-expanded", "false");
      btn.setAttribute("aria-controls", panelId);
      const btnLabel = document.createElement("span");
      btnLabel.textContent = facet.label;
      const badge = document.createElement("span");
      badge.className = "facet-btn-badge";
      badge.hidden = true;
      btn.append(btnLabel, badge);
      btn.addEventListener("click", () => toggleFacet(facet.key));
      btn.addEventListener("keydown", (e) => {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          openFacet(facet.key);
        }
      });
      els.referenceFilterMenus.appendChild(btn);

      const panel = document.createElement("div");
      panel.id = panelId;
      panel.className = "facet-panel";
      panel.setAttribute("role", "group");
      panel.setAttribute("aria-labelledby", btnId);
      panel.hidden = true;
      els.referenceFilterPanels.appendChild(panel);

      const entry = { facet, btn, panel, badge, options: new Map(), inputs: null };
      if (facet.kind === "list") buildListPanel(entry);
      else if (facet.kind === "bool") buildBoolPanel(entry);
      else buildRangePanel(entry);

      // Escape is bound on the panel, not the document, so it can't swallow
      // Escape meant for the search box (which clears the query).
      panel.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
          e.stopPropagation();
          closeFacet({ restoreFocus: true });
        }
      });
      // focusout bubbles where blur does not, so tabbing past the last option
      // closes the panel the same way clicking away does.
      //
      // The relatedTarget guard is load-bearing, not defensive. Clicking an
      // option's own text moves focus off the checkbox with relatedTarget
      // null — the <span> isn't focusable, so focus is on its way to the body
      // — and closing on that hid the panel before the label could forward
      // the click to its checkbox. The whole click was swallowed: the option
      // appeared to just dismiss the panel without filtering anything.
      // Only a move to a real element outside the panel should close it;
      // clicks that land nowhere are left to the document mousedown handler.
      panel.addEventListener("focusout", (e) => {
        if (!e.relatedTarget) return;
        if (!panel.contains(e.relatedTarget) && e.relatedTarget !== btn) closeFacet();
      });

      facetControls.set(facet.key, entry);
    });
  }

  function buildListPanel(entry) {
    const list = document.createElement("div");
    list.className = "facet-options";
    facetVocabulary(entry.facet).forEach((value) => {
      const label = document.createElement("label");
      label.className = "facet-option";
      const input = document.createElement("input");
      input.type = "checkbox";
      input.value = value;
      const name = document.createElement("span");
      name.className = "facet-option-name";
      name.textContent = entry.facet.format ? entry.facet.format(value) : value;
      const count = document.createElement("span");
      count.className = "facet-option-count";
      label.append(input, name, count);
      input.addEventListener("change", () => toggleListValue(entry.facet.key, value));
      list.appendChild(label);
      entry.options.set(value, { input, count, label });
    });
    entry.panel.appendChild(list);
  }

  // Three radios rather than a checkbox: a checkbox cannot express "any"
  // honestly, and "any" has to be a visible, reachable choice rather than an
  // absence. Mirrors the round-length radiogroup in training/index.html.
  function buildBoolPanel(entry) {
    const group = document.createElement("div");
    group.className = "facet-options";
    group.setAttribute("role", "radiogroup");
    group.setAttribute("aria-label", "Switchable pattern");
    SWITCHABLE_CHOICES.forEach(({ value, label: text, state }) => {
      const label = document.createElement("label");
      label.className = "facet-option";
      const input = document.createElement("input");
      input.type = "radio";
      input.name = "facet-switchable";
      input.value = value;
      const name = document.createElement("span");
      name.className = "facet-option-name";
      name.textContent = text;
      const count = document.createElement("span");
      count.className = "facet-option-count";
      label.append(input, name, count);
      input.addEventListener("change", () => {
        setFilters({ switchable: state });
      });
      group.appendChild(label);
      entry.options.set(value, { input, count, label });
    });
    entry.panel.appendChild(group);
  }

  // A two-handle slider over rangeValues(), so every stop is a real value in
  // the pool rather than a point on an abstract number line.
  //
  // Untouched is expressed as "both handles parked at the ends", which is the
  // only thing a slider can mean by it — unlike a pair of text boxes, it has
  // no empty state to distinguish from a deliberate extreme. The cost is that
  // you can't deliberately ask for "1949 and later" as an active filter; the
  // gain is that nothing is lost by it, since that filter excludes nothing.
  // Both handles at the ends therefore writes null, not the pool's bounds.
  function buildRangePanel(entry) {
    const values = rangeValues(entry.facet);
    const last = values.length - 1;

    const readout = document.createElement("output");
    readout.className = "facet-range-value";

    const slider = document.createElement("div");
    slider.className = "facet-slider";
    const track = document.createElement("div");
    track.className = "facet-slider-track";
    const fill = document.createElement("div");
    fill.className = "facet-slider-fill";
    slider.append(track, fill);

    const make = (which) => {
      const input = document.createElement("input");
      input.type = "range";
      input.className = "facet-slider-input";
      input.min = "0";
      input.max = String(last);
      input.step = "1";
      input.value = which === "from" ? "0" : String(last);
      input.setAttribute("aria-label", `${which === "from" ? "Minimum" : "Maximum"} ${entry.facet.label.toLowerCase()}`);
      slider.appendChild(input);
      return input;
    };
    const from = make("from");
    const to = make("to");

    // Clamp rather than swap, so the handles can't cross and the reversed
    // state simply can't be reached — the thing a pair of text boxes needs a
    // validation message for.
    const onSlide = (moved) => {
      let a = Number(from.value);
      let b = Number(to.value);
      if (a > b) {
        if (moved === from) b = a;
        else a = b;
        from.value = String(a);
        to.value = String(b);
      }
      setFilters({
        [entry.facet.from]: a === 0 ? null : values[a],
        [entry.facet.to]: b === last ? null : values[b],
      });
    };
    from.addEventListener("input", () => onSlide(from));
    to.addEventListener("input", () => onSlide(to));

    const reset = document.createElement("button");
    reset.type = "button";
    reset.className = "facet-range-reset";
    reset.textContent = "Reset";
    reset.addEventListener("click", () => {
      from.value = "0";
      to.value = String(last);
      setFilters({ [entry.facet.from]: null, [entry.facet.to]: null });
    });

    entry.inputs = { from, to, values, last, readout, fill };
    entry.panel.append(readout, slider, reset);
  }

  // ------------------------------------------------------------ State setters

  function setFilters(patch) {
    referenceView = { ...referenceView, filters: { ...referenceView.filters, ...patch } };
    renderReference();
  }

  function toggleListValue(key, value) {
    const list = referenceView.filters[key];
    setFilters({ [key]: list.includes(value) ? list.filter((v) => v !== value) : [...list, value] });
  }

  // The country chips and the map are two views of one facet, so a click on
  // either is the same membership toggle a checkbox would be.
  //
  // Note what this no longer does: it doesn't clear the search box and it
  // doesn't reset the sort. Both were fine when country was the only filter
  // and picking one meant starting over; with orthogonal facets, changing one
  // must not silently throw away another or a view preference.
  function selectCountry(country) {
    toggleListValue("country", country);
  }

  function clearAllFilters() {
    referenceView = {
      ...referenceView,
      query: "",
      filters: {
        manufacturer: [],
        principle: [],
        pattern: [],
        country: [],
        switchable: null,
        yearFrom: null,
        yearTo: null,
        priceFrom: null,
        priceTo: null,
      },
    };
    els.referenceInput.value = "";
    // The sliders need no resetting here: syncFacetControls drives their
    // positions from state on every render, so nulling the bounds parks both
    // handles back at the ends on its own.
    // Sort is a view preference, not a filter — clearing filters shouldn't
    // silently re-sort the table under someone.
    renderReference();
  }

  function anyFilterActive() {
    return referenceView.query.trim() !== "" || FACETS.some((f) => facetIsActive(f));
  }

  // --------------------------------------------------------- Open/close panels

  function openFacet(key) {
    closeFacet();
    const entry = facetControls.get(key);
    if (!entry) return;
    openFacetKey = key;
    entry.panel.hidden = false;
    entry.btn.setAttribute("aria-expanded", "true");
    syncFacetControls();
    const first = entry.panel.querySelector("input");
    if (first) first.focus();
  }

  function closeFacet({ restoreFocus = false } = {}) {
    if (openFacetKey === null) return;
    const entry = facetControls.get(openFacetKey);
    openFacetKey = null;
    if (!entry) return;
    entry.panel.hidden = true;
    entry.btn.setAttribute("aria-expanded", "false");
    if (restoreFocus) entry.btn.focus();
  }

  function toggleFacet(key) {
    if (openFacetKey === key) closeFacet({ restoreFocus: true });
    else openFacet(key);
  }

  // mousedown, not click: it fires before focus moves, so it can't race the
  // label-to-checkbox activation that a click listener would.
  document.addEventListener("mousedown", (e) => {
    if (openFacetKey === null) return;
    const entry = facetControls.get(openFacetKey);
    if (entry && !entry.panel.contains(e.target) && !entry.btn.contains(e.target)) closeFacet();
  });

  // ---------------------------------------------------------------- Rendering

  function syncFacetControls() {
    facetControls.forEach((entry) => {
      const { facet } = entry;
      const active = facetIsActive(facet);
      entry.btn.classList.toggle("facet-btn--active", active);

      if (facet.kind === "list") {
        const counts = countFacetValues(referenceMicsExcept(facet.key), facet);
        const chosen = referenceView.filters[facet.key];
        entry.options.forEach(({ input, count, label }, value) => {
          const n = counts.get(value) || 0;
          count.textContent = String(n);
          input.checked = chosen.includes(value);
          // A selected option is never disabled — it always has to be
          // un-selectable, and by construction its own count can't be 0.
          input.disabled = n === 0 && !input.checked;
          label.classList.toggle("facet-option--empty", n === 0);
        });
        entry.badge.hidden = chosen.length === 0;
        entry.badge.textContent = String(chosen.length);
        return;
      }

      if (facet.kind === "bool") {
        const base = referenceMicsExcept(facet.key);
        const state = referenceView.filters.switchable;
        SWITCHABLE_CHOICES.forEach(({ value, state: s }) => {
          const opt = entry.options.get(value);
          const n = s === null ? base.length : base.filter((m) => m.switchable === s).length;
          opt.count.textContent = String(n);
          opt.input.checked = state === s;
          opt.label.classList.toggle("facet-option--empty", n === 0);
        });
        entry.badge.hidden = state === null;
        entry.badge.textContent = state === true ? "Yes" : "No";
        return;
      }

      // Range. The handles are the source of the displayed value, so writing
      // state back into them is always a no-op mid-drag — none of the
      // don't-clobber-the-user care a text box needs.
      const { from, to, values, last, readout, fill } = entry.inputs;
      const fromV = referenceView.filters[facet.from];
      const toV = referenceView.filters[facet.to];
      const a = fromV == null ? 0 : values.indexOf(fromV);
      const b = toV == null ? last : values.indexOf(toV);
      from.value = String(a);
      to.value = String(b);
      // The thumb reads out an index by default, which is meaningless aloud.
      from.setAttribute("aria-valuetext", facet.format(values[a]));
      to.setAttribute("aria-valuetext", facet.format(values[b]));
      readout.textContent = `${facet.format(values[a])} – ${facet.format(values[b])}`;
      fill.style.left = `${(a / last) * 100}%`;
      fill.style.right = `${100 - (b / last) * 100}%`;

      entry.badge.hidden = !rangeIsSet(facet);
      entry.badge.textContent = "1";
    });
  }

  // Re-scopes the chips and the map without touching innerHTML: eight buttons
  // and eight paths get their text and classes updated in place. Re-emitting
  // the SVG would re-parse ~160 path elements on every keystroke, and
  // rebuilding the chips would destroy the focus ring of the chip just
  // pressed.
  function syncCountryScope() {
    const facet = FACETS.find((f) => f.key === "country");
    // Counts exclude the country facet itself, exactly like every dropdown.
    // Get this wrong and picking Germany zeroes every other country, blanks
    // the map and makes a second country unselectable for good.
    const base = referenceMicsExcept("country");
    const counts = countFacetValues(base, facet);
    const chosen = referenceView.filters.country;

    els.referenceChips.querySelectorAll(".country-chip").forEach((chip) => {
      const value = chip.dataset.country;
      const n = counts.get(value) || 0;
      const selected = chosen.includes(value);
      chip.setAttribute("aria-pressed", String(selected));
      chip.querySelector(".country-chip-count").textContent = String(n);
      chip.disabled = n === 0 && !selected;
      chip.classList.toggle("country-chip--empty", n === 0);
    });

    els.referenceMap.querySelectorAll("[data-country]").forEach((path) => {
      const value = path.dataset.country;
      const n = counts.get(value) || 0;
      const selected = chosen.includes(value);
      path.classList.toggle("mic-map-country--active", selected);
      // Losing --has-mics restores the base rule's pointer-events: none, so an
      // emptied country goes inert exactly like a mic-less one already does.
      path.classList.toggle("mic-map-country--has-mics", n > 0 || selected);
    });
  }

  function renderFilterChips() {
    els.referenceActiveFilters.innerHTML = "";
    const chips = [];

    if (referenceView.query.trim() !== "") {
      // The query gets a chip like everything else. It is a second control for
      // one piece of state, which this file normally resists — but the chip
      // row's whole job is to be the single visible summary of what is
      // narrowing the table, and leaving out the most aggressive narrowing of
      // all would be the bigger lie. It also makes "Clear all" honest.
      chips.push({ label: `Search: “${referenceView.query.trim()}”`, onRemove: () => {
        els.referenceInput.value = "";
        referenceView = { ...referenceView, query: "" };
        renderReference();
      } });
    }

    FACETS.forEach((facet) => {
      if (facet.kind === "list") {
        referenceView.filters[facet.key].forEach((value) => {
          chips.push({
            label: facet.format ? facet.format(value) : value,
            onRemove: () => toggleListValue(facet.key, value),
          });
        });
        return;
      }
      if (facet.kind === "bool") {
        if (referenceView.filters.switchable === null) return;
        chips.push({
          label: referenceView.filters.switchable ? "Switchable" : "Not switchable",
          onRemove: () => setFilters({ switchable: null }),
        });
        return;
      }
      if (!rangeIsSet(facet)) return;
      chips.push({
        label: `${facet.label} ${rangeLabel(facet)}`,
        onRemove: () => setFilters({ [facet.from]: null, [facet.to]: null }),
      });
    });

    chips.forEach(({ label, onRemove }) => {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "set-aside-chip";
      chip.setAttribute("aria-label", `Remove filter: ${label}`);
      const name = document.createElement("span");
      name.textContent = label;
      const icon = document.createElement("span");
      icon.className = "set-aside-chip-x";
      icon.innerHTML = ICONS.x;
      chip.append(name, icon);
      chip.addEventListener("click", onRemove);
      els.referenceActiveFilters.appendChild(chip);
    });

    if (chips.length > 0) {
      const clear = document.createElement("button");
      clear.type = "button";
      clear.className = "mic-clear-all";
      clear.textContent = "Clear all";
      clear.addEventListener("click", clearAllFilters);
      els.referenceActiveFilters.appendChild(clear);
    }
    els.referenceActiveFilters.hidden = chips.length === 0;
  }

  // "or earlier" / "and later", not "before" / "after": the bounds are
  // inclusive, and a chip that misstates its own filter is worse than a long
  // one.
  function rangeLabel(facet) {
    const from = referenceView.filters[facet.from];
    const to = referenceView.filters[facet.to];
    if (from !== null && to !== null) return `${facet.format(from)}–${facet.format(to)}`;
    if (from !== null) return `${facet.format(from)} and up`;
    return `${facet.format(to)} or less`;
  }

  // A column whose visible rows all share one value has nothing to sort, so
  // its control goes away. This generalises the old "Origin is constant inside
  // a country view" rule to every column, and lands three more things for
  // free: a one-row result loses every sort control (which is exactly what
  // mic mode used to do by hand), and filtering to a single manufacturer both
  // drops that column's sort and — because sortKey then falls back to "name" —
  // stops buildMicRows emitting a lone group heading over the whole list.
  function constantColumns(mics) {
    const constant = new Set();
    if (mics.length <= 1) {
      constant.add("name");
      REFERENCE_FIELDS.forEach((f) => constant.add(f.sortKey));
      return constant;
    }
    REFERENCE_FIELDS.forEach((f) => {
      const first = f.getValue(mics[0]);
      if (mics.every((m) => f.getValue(m) === first)) constant.add(f.sortKey);
    });
    return constant;
  }

  // displayName is unique across the pool, so "name" is constant only when
  // there's at most one row — which makes it the one always-valid sort and the
  // safe place to land when the active one loses its column.
  function normalizeSort(constant) {
    if (constant.has(referenceView.sortKey) && referenceView.sortKey !== "name") {
      referenceView = { ...referenceView, sortKey: "name", sortDir: "asc" };
    }
  }

  // Clicking the active column flips direction; a new column starts ascending.
  function setSort(key) {
    referenceView =
      referenceView.sortKey === key
        ? { ...referenceView, sortDir: referenceView.sortDir === "asc" ? "desc" : "asc" }
        : { ...referenceView, sortKey: key, sortDir: "asc" };
    renderReference();
  }

  function renderSortPills(constant) {
    els.referenceSortPills.innerHTML = "";
    SORT_PILLS.filter(({ key }) => !constant.has(key)).forEach(({ key, label }) => {
      const btn = document.createElement("button");
      btn.type = "button";
      const active = referenceView.sortKey === key;
      btn.className = active ? "mic-sort-pill mic-sort-pill--active" : "mic-sort-pill";
      btn.setAttribute("aria-pressed", String(active));
      btn.textContent = active ? `${label} ${referenceView.sortDir === "asc" ? "↑" : "↓"}` : label;
      btn.addEventListener("click", () => setSort(key));
      els.referenceSortPills.appendChild(btn);
    });
  }

  // No debounce on any of this. 118 rows of 7 cells is well inside the
  // browser's own input-to-paint budget, and a timer would add latency you can
  // feel on every keystroke to solve a problem that doesn't exist at this
  // size — while opening a window where the table disagrees with the box. If
  // it ever does need help, coalesce with requestAnimationFrame rather than
  // reintroducing a delay.
  function renderReference() {
    const mics = referenceMics();
    const constant = constantColumns(mics);
    normalizeSort(constant);

    syncCountryScope();
    syncFacetControls();
    renderFilterChips();

    const empty = mics.length === 0;
    // A sort control over nothing reads as a broken table.
    els.referenceSort.hidden = empty;
    els.referenceBoard.hidden = empty;
    els.referenceEmpty.hidden = !empty;

    if (empty) {
      els.referenceEmpty.textContent = emptyMessage();
      els.referenceBoard.innerHTML = "";
    } else {
      renderSortPills(constant);
      renderMicTable(mics, constant);
    }
    announceReference(mics.length);
  }

  function emptyMessage() {
    const q = referenceView.query.trim();
    const facets = FACETS.some((f) => facetIsActive(f));
    if (q && facets) return `No mics match “${q}” with these filters.`;
    if (q) return `No mics match “${q}”.`;
    return "No mics match these filters.";
  }

  // One sentence carrying the whole state change, for screen readers — far
  // more useful than making someone traverse 48 rows to infer what happened.
  // role="status" is aria-live="polite", so while typing each update
  // supersedes the last rather than queueing a backlog of them.
  function announceReference(count) {
    if (count === 0) {
      els.referenceStatus.textContent = emptyMessage();
      return;
    }
    const q = referenceView.query.trim();
    // Three short sentences rather than one long clause. Strung together with
    // commas the facets ran into each other — "54 mics, price $400–$1,760,
    // sorted by name" gives no way to hear where the filters stop and the
    // sort begins, and a two-value facet adds commas of its own.
    const parts = [];
    FACETS.forEach((facet) => {
      if (!facetIsActive(facet)) return;
      if (facet.kind === "list") {
        parts.push(referenceView.filters[facet.key].map((v) => (facet.format ? facet.format(v) : v)).join(" or "));
      } else if (facet.kind === "bool") {
        parts.push(referenceView.filters.switchable ? "switchable" : "not switchable");
      } else {
        parts.push(`${facet.label.toLowerCase()} ${rangeLabel(facet)}`);
      }
    });
    const pill = SORT_PILLS.find((p) => p.key === referenceView.sortKey);
    const dir = referenceView.sortDir === "asc" ? "ascending" : "descending";
    const showing = `Showing ${count} mic${count === 1 ? "" : "s"}${q ? ` matching “${q}”` : ""}.`;
    const filters = parts.length ? ` Filtered to ${parts.join("; ")}.` : "";
    els.referenceStatus.textContent = `${showing}${filters} Sorted by ${(pill ? pill.label : referenceView.sortKey).toLowerCase()} ${dir}.`;
  }

  // A header row plus N .board-rows, so the ≤800px wrapped-row mode, the
  // data-label chips and the 7-column grid all keep working untouched.
  // Built into a fragment and appended once: 118 rows otherwise cost 118
  // layout passes instead of one.
  function renderMicTable(mics, constant) {
    const frag = document.createDocumentFragment();

    const headerRow = document.createElement("div");
    headerRow.className = "board-row board-row--header";
    headerRow.appendChild(buildHeaderCell({ label: "Microphone", sortKey: "name" }, constant, "cell cell--guess cell--header"));
    REFERENCE_FIELDS.forEach((f) => headerRow.appendChild(buildHeaderCell(f, constant, "cell cell--header")));
    frag.appendChild(headerRow);

    buildMicRows(mics, referenceView.sortKey, referenceView.sortDir).forEach((entry) => {
      if (entry.type === "group") {
        // A plain div, not a .board-row variant: below 800px .board-row picks
        // up card padding/border/background and .board-row--header goes
        // display:none, either of which would wreck a group heading.
        const group = document.createElement("div");
        group.className = "mic-group";
        group.textContent = `${entry.label} · ${entry.count}`;
        frag.appendChild(group);
        return;
      }
      frag.appendChild(buildMicRow(entry.mic));
    });

    els.referenceBoard.innerHTML = "";
    els.referenceBoard.appendChild(frag);
  }

  function buildHeaderCell(field, constant, className) {
    const cell = document.createElement("div");
    cell.className = className;
    // Same data-label the body cells carry, so css/training.css can align a
    // heading over its column (Year and Price right) with one rule instead of
    // a second set keyed to nth-child.
    cell.dataset.label = field.label;
    const sortable = field.sortKey && !constant.has(field.sortKey);
    if (!sortable) {
      cell.textContent = field.label;
      return cell;
    }
    const active = referenceView.sortKey === field.sortKey;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "mic-sort-header";
    btn.textContent = active ? `${field.label} ${referenceView.sortDir === "asc" ? "↑" : "↓"}` : field.label;
    btn.addEventListener("click", () => setSort(field.sortKey));
    cell.setAttribute("aria-sort", active ? (referenceView.sortDir === "asc" ? "ascending" : "descending") : "none");
    cell.appendChild(btn);
    return cell;
  }

  function buildMicRow(mic) {
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
    return row;
  }

  // The search box narrows the table rather than opening a dropdown, so it
  // carries no combobox roles and needs no autocomplete instance. It matches
  // through micMatchesQuery (js/autocomplete.js), the same matcher the daily
  // game's guess input ranks with — so "ksm", "rode" and "u89" find the same
  // mics in both places and the two can't drift apart.
  els.referenceInput.addEventListener("input", () => {
    referenceView = { ...referenceView, query: els.referenceInput.value };
    renderReference();
  });

  els.referenceInput.addEventListener("keydown", (e) => {
    if (e.key !== "Escape" || els.referenceInput.value === "") return;
    els.referenceInput.value = "";
    referenceView = { ...referenceView, query: "" };
    renderReference();
  });

  // ------------------------------------------------------------------- Init

  els.roundSetupToggle.addEventListener("click", () => {
    if (els.roundSetupToggle.getAttribute("aria-disabled") === "true") return;
    setSetupExpanded(!setupExpanded);
  });

  els.filterManufacturerSelect.addEventListener("change", () => {
    manufacturerFilter = els.filterManufacturerSelect.value;
    onFilterChange();
  });
  els.setAsideSelect.addEventListener("change", () => {
    const raw = els.setAsideSelect.value;
    if (!raw) return;
    const split = raw.indexOf(":");
    const key = raw.slice(0, split);
    const value = raw.slice(split + 1);
    if (!setAside[key] || setAside[key].includes(value)) return;
    // The option is disabled too, so this is unreachable by mouse or
    // keyboard — but the guard belongs on the state change, not only on the
    // control, so a stale selection can't add a chip that does nothing.
    if (coveringReasons(micsForEntry(key, value)).length > 0) {
      els.setAsideSelect.value = "";
      return;
    }
    setAside[key].push(value);
    setAside[key].sort((a, b) => a.localeCompare(b));
    saveSetAside(setAside);
    // refreshFilterSelects() clears a filter left pointing at something the
    // list no longer offers, so setting aside what you're filtered to
    // resolves itself rather than emptying the pool.
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
  renderSetAside();
  renderLengthPills();
  renderSetupSummary();
  renderCategoryPicker();
  renderOrderDimensionPicker();
  renderMatchDimensionPicker();
})();
