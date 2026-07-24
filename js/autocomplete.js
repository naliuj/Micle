// Lightweight vanilla-JS typeahead over MIC_DB. No framework, no dependency.

function createAutocomplete({ input, listEl, onSelect, isGuessed }) {
  let activeIndex = -1;
  let currentResults = [];

  function normalize(s) {
    return s.toLowerCase().trim();
  }

  function score(query, mic) {
    const q = normalize(query);
    const candidates = [normalize(mic.displayName), ...mic.aliases.map(normalize)];
    let best = Infinity;
    for (const c of candidates) {
      if (c === q) best = Math.min(best, 0);
      else if (c.startsWith(q)) best = Math.min(best, 1);
      else if (c.split(/\s+/).some((word) => word.startsWith(q))) best = Math.min(best, 2);
      else if (c.includes(q)) best = Math.min(best, 3);
    }
    return best;
  }

  function search(query) {
    if (!query.trim()) return [];
    return MIC_DB.map((mic) => ({ mic, s: score(query, mic) }))
      .filter((r) => r.s < Infinity)
      .sort((a, b) => a.s - b.s || a.mic.displayName.localeCompare(b.mic.displayName))
      .slice(0, 8)
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
