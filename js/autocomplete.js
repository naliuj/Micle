// Lightweight vanilla-JS typeahead over MIC_DB. No framework, no dependency.

function createAutocomplete({ input, listEl, onSelect, isGuessed }) {
  let activeIndex = -1;
  let currentResults = [];

  // Latin letters that don't decompose under NFD and so survive the combining-mark
  // strip below. Without these, "rode" misses RØDE and "bruel" misses Brüel & Kjær.
  const FOLD = { ø: "o", æ: "ae", œ: "oe", ß: "ss", đ: "d", ð: "d", ł: "l", þ: "th" };

  // Fold accents so a plain-ASCII query reaches the real spelling: ü->u, é->e,
  // Ø->o, æ->ae. Players type "rode" and "bruel", not "RØDE" and "Brüel".
  function fold(s) {
    return s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[øæœßđðłþ]/g, (c) => FOLD[c]);
  }

  function normalize(s) {
    return fold(s).trim();
  }

  // Space- and punctuation-insensitive form. Model numbers get typed without the
  // separator far more often than with it, and 30 of the 110 mics were otherwise
  // unreachable that way — "u89", "md409", "beta52" and "kms105" all found
  // nothing despite the mic existing.
  function compact(s) {
    return fold(s).replace(/[^a-z0-9]/g, "");
  }

  function rank(candidate, q) {
    if (candidate === q) return 0;
    if (candidate.startsWith(q)) return 1;
    if (candidate.split(/\s+/).some((word) => word.startsWith(q))) return 2;
    if (candidate.includes(q)) return 3;
    return Infinity;
  }

  function score(query, mic) {
    const q = normalize(query);
    const qc = compact(query);
    let best = Infinity;
    // manufacturer is searched too: most displayNames start with the brand, but
    // not all ("Aston Origin" vs "Aston Microphones", "DPA 4006C" vs "DPA
    // Microphones"), so brand search shouldn't depend on how a name was written.
    for (const text of [mic.displayName, mic.manufacturer, ...mic.aliases]) {
      best = Math.min(best, rank(normalize(text), q));
      // Half a step worse than a literal hit, so exact spellings still sort
      // ahead of punctuation-insensitive ones.
      if (qc) best = Math.min(best, rank(compact(text), qc) + 0.5);
    }
    return best;
  }

  // Must comfortably exceed the largest single-manufacturer group, or searching a
  // brand name silently drops mics. This was 8, which meant "neumann" — 14
  // matches, all tying on score and then sorted alphabetically — showed only the
  // KM/KMS/KU/M/SM/TLM models and hid the entire U-series, U 87 Ai included.
  // The list is capped at 280px with overflow-y: auto, so a longer result set
  // scrolls rather than overflowing.
  const MAX_RESULTS = 50;

  function search(query) {
    if (!query.trim()) return [];
    return MIC_DB.map((mic) => ({ mic, s: score(query, mic) }))
      .filter((r) => r.s < Infinity)
      // numeric so model numbers read naturally: KM 84 before KM 184.
      .sort(
        (a, b) =>
          a.s - b.s ||
          a.mic.displayName.localeCompare(b.mic.displayName, undefined, { numeric: true })
      )
      .slice(0, MAX_RESULTS)
      .map((r) => r.mic);
  }

  function render(results) {
    currentResults = results;
    activeIndex = -1;
    listEl.innerHTML = "";
    if (results.length === 0) {
      listEl.hidden = true;
      input.removeAttribute("aria-activedescendant");
      return;
    }
    results.forEach((mic, i) => {
      const li = document.createElement("li");
      li.id = `ac-option-${i}`;
      li.role = "option";
      li.textContent = mic.displayName;
      const guessed = isGuessed(mic.id);
      if (guessed) {
        li.setAttribute("aria-disabled", "true");
        li.classList.add("ac-option--disabled");
      } else {
        li.addEventListener("mousedown", (e) => {
          e.preventDefault();
          select(mic);
        });
      }
      listEl.appendChild(li);
    });
    listEl.hidden = false;
  }

  function select(mic) {
    listEl.hidden = true;
    listEl.innerHTML = "";
    input.value = "";
    input.removeAttribute("aria-activedescendant");
    onSelect(mic);
  }

  function moveActive(delta) {
    if (currentResults.length === 0) return;
    const selectable = currentResults
      .map((mic, i) => ({ mic, i }))
      .filter(({ mic }) => !isGuessed(mic.id));
    if (selectable.length === 0) return;
    let pos = selectable.findIndex(({ i }) => i === activeIndex);
    pos = (pos + delta + selectable.length) % selectable.length;
    activeIndex = selectable[pos].i;
    [...listEl.children].forEach((li, i) =>
      li.classList.toggle("ac-option--active", i === activeIndex)
    );
    // The list scrolls past ~8 items, so keep the highlight on screen — without
    // this, arrowing down a long result set moves the selection out of view.
    const activeLi = listEl.children[activeIndex];
    if (activeLi && activeLi.scrollIntoView) activeLi.scrollIntoView({ block: "nearest" });
    input.setAttribute("aria-activedescendant", `ac-option-${activeIndex}`);
  }

  input.addEventListener("input", () => render(search(input.value)));

  input.addEventListener("keydown", (e) => {
    if (listEl.hidden) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      moveActive(1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      moveActive(-1);
    } else if (e.key === "Enter") {
      if (activeIndex >= 0 && currentResults[activeIndex]) {
        e.preventDefault();
        select(currentResults[activeIndex]);
      }
    } else if (e.key === "Escape") {
      listEl.hidden = true;
    }
  });

  input.addEventListener("blur", () => {
    setTimeout(() => {
      listEl.hidden = true;
    }, 100);
  });

  return {
    reset() {
      input.value = "";
      listEl.hidden = true;
      listEl.innerHTML = "";
    },
  };
}
