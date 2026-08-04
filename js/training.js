(function () {
  const QUESTION_COUNT = 10;

  const els = {
    tabQuizBtn: document.getElementById("tab-quiz-btn"),
    tabReferenceBtn: document.getElementById("tab-reference-btn"),
    quizTab: document.getElementById("quiz-tab"),
    referenceTab: document.getElementById("reference-tab"),

    quizPicker: document.getElementById("quiz-picker"),
    categoryList: document.getElementById("category-list"),
    startQuizBtn: document.getElementById("start-quiz-btn"),

    quizActive: document.getElementById("quiz-active"),
    quizProgress: document.getElementById("quiz-progress"),
    quizPrompt: document.getElementById("quiz-prompt"),
    quizOptions: document.getElementById("quiz-options"),
    quizFeedback: document.getElementById("quiz-feedback"),
    quizNextBtn: document.getElementById("quiz-next-btn"),

    quizSummary: document.getElementById("quiz-summary"),
    quizSummaryScore: document.getElementById("quiz-summary-score"),
    quizSummaryBreakdown: document.getElementById("quiz-summary-breakdown"),
    retryMissedBtn: document.getElementById("retry-missed-btn"),
    newRoundBtn: document.getElementById("new-round-btn"),

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

  let session = [];
  let currentIndex = 0;
  let missed = [];
  let score = 0;
  let categoryResults = {}; // this round only: key -> {answered, correct}
  let selectedCategories = new Set(QUIZ_CATEGORIES.map((c) => c.key));

  function switchTab(tab) {
    const isQuiz = tab === "quiz";
    els.tabQuizBtn.classList.toggle("mode-btn--active", isQuiz);
    els.tabQuizBtn.setAttribute("aria-selected", String(isQuiz));
    els.tabReferenceBtn.classList.toggle("mode-btn--active", !isQuiz);
    els.tabReferenceBtn.setAttribute("aria-selected", String(!isQuiz));
    els.quizTab.hidden = !isQuiz;
    els.referenceTab.hidden = isQuiz;
  }

  function renderCategoryPicker() {
    const stats = loadQuizStats();
    els.categoryList.innerHTML = "";
    QUIZ_CATEGORIES.forEach((cat) => {
      const id = `cat-${cat.key}`;
      const label = document.createElement("label");
      label.className = "category-pill";
      label.htmlFor = id;

      const input = document.createElement("input");
      input.type = "checkbox";
      input.id = id;
      input.checked = selectedCategories.has(cat.key);
      input.addEventListener("change", () => {
        if (input.checked) selectedCategories.add(cat.key);
        else selectedCategories.delete(cat.key);
        updateStartButton();
      });

      const catStats = stats.byCategory[cat.key] || { answered: 0, correct: 0 };
      const accuracyText =
        catStats.answered > 0
          ? `${Math.round((catStats.correct / catStats.answered) * 100)}% accuracy (${catStats.answered} answered)`
          : "Not studied yet";

      const textWrap = document.createElement("span");
      textWrap.className = "category-pill-label";
      const nameEl = document.createElement("span");
      nameEl.className = "category-pill-name";
      nameEl.textContent = cat.label;
      const accEl = document.createElement("span");
      accEl.className = "category-pill-accuracy";
      accEl.textContent = accuracyText;
      textWrap.appendChild(nameEl);
      textWrap.appendChild(accEl);

      label.appendChild(input);
      label.appendChild(textWrap);
      els.categoryList.appendChild(label);
    });
    updateStartButton();
  }

  function updateStartButton() {
    els.startQuizBtn.disabled = selectedCategories.size === 0;
  }

  function showScreen(name) {
    els.quizPicker.hidden = name !== "picker";
    els.quizActive.hidden = name !== "active";
    els.quizSummary.hidden = name !== "summary";
  }

  function startQuiz() {
    if (selectedCategories.size === 0) return;
    const pool = eligibleMics();
    session = buildQuizSession([...selectedCategories], pool, QUESTION_COUNT);
    if (session.length === 0) {
      alert("Couldn't build a round from the selected categories. Try a different combination.");
      return;
    }
    currentIndex = 0;
    missed = [];
    score = 0;
    categoryResults = {};
    showScreen("active");
    renderQuestion();
  }

  function retryMissed() {
    if (missed.length === 0) return;
    session = missed;
    missed = [];
    currentIndex = 0;
    score = 0;
    categoryResults = {};
    showScreen("active");
    renderQuestion();
  }

  function renderQuestion() {
    const q = session[currentIndex];
    els.quizProgress.textContent = `Question ${currentIndex + 1} of ${session.length}`;
    els.quizPrompt.textContent = q.prompt;
    els.quizFeedback.hidden = true;
    els.quizNextBtn.hidden = true;
    els.quizOptions.innerHTML = "";
    q.options.forEach((opt) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "quiz-option";
      btn.textContent = opt.label;
      btn.addEventListener("click", () => answerQuestion(q, opt, btn));
      els.quizOptions.appendChild(btn);
    });
  }

  function labelFor(question, value) {
    const match = question.options.find((o) => o.value === value);
    return match ? match.label : value;
  }

  function answerQuestion(question, chosen, chosenBtn) {
    const correct = chosen.value === question.correctValue;

    [...els.quizOptions.children].forEach((btn, i) => {
      btn.disabled = true;
      const opt = question.options[i];
      if (opt.value === question.correctValue) btn.classList.add("quiz-option--correct");
      else if (btn === chosenBtn) btn.classList.add("quiz-option--incorrect");
    });

    if (correct) score += 1;
    else missed.push(question);

    const forCat = categoryResults[question.categoryKey] || { answered: 0, correct: 0 };
    forCat.answered += 1;
    if (correct) forCat.correct += 1;
    categoryResults[question.categoryKey] = forCat;

    recordQuizAnswer(question.categoryKey, correct);

    els.quizFeedback.hidden = false;
    els.quizFeedback.className = `status-banner ${correct ? "status-banner--win" : "status-banner--loss"}`;
    els.quizFeedback.innerHTML = "";
    if (correct) {
      els.quizFeedback.textContent = "Correct!";
    } else {
      const mic = question.mic;
      els.quizFeedback.appendChild(
        document.createTextNode(`Incorrect. The answer was "${labelFor(question, question.correctValue)}." `)
      );
      // Bracket questions (Year/Price) only reveal the bracket above, not the
      // exact number — this fills in the precise value either way, since
      // it's useful study context regardless of which category was missed.
      const facts = document.createElement("span");
      facts.className = "quiz-feedback-facts";
      facts.textContent = `${mic.displayName}: released ${mic.releaseYear}, ${formatPrice(mic)}`;
      els.quizFeedback.appendChild(facts);
    }

    els.quizNextBtn.hidden = false;
    els.quizNextBtn.textContent = currentIndex === session.length - 1 ? "See results" : "Next";
  }

  function nextQuestion() {
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
    els.quizSummaryBreakdown.innerHTML = "";
    Object.keys(categoryResults).forEach((key) => {
      const cat = QUIZ_CATEGORIES.find((c) => c.key === key);
      const r = categoryResults[key];
      const row = document.createElement("div");
      row.className = "quiz-summary-row";
      const strong = document.createElement("strong");
      strong.textContent = cat.label;
      row.appendChild(strong);
      row.appendChild(document.createTextNode(`${r.correct} / ${r.answered}`));
      els.quizSummaryBreakdown.appendChild(row);
    });
    els.retryMissedBtn.hidden = missed.length === 0;
    els.retryMissedBtn.textContent = `Retry Missed (${missed.length})`;
  }

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

  els.tabQuizBtn.addEventListener("click", () => switchTab("quiz"));
  els.tabReferenceBtn.addEventListener("click", () => switchTab("reference"));
  els.startQuizBtn.addEventListener("click", startQuiz);
  els.quizNextBtn.addEventListener("click", nextQuestion);
  els.retryMissedBtn.addEventListener("click", retryMissed);
  els.newRoundBtn.addEventListener("click", () => {
    showScreen("picker");
    renderCategoryPicker();
  });

  renderCategoryPicker();
})();
