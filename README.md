# MicGuessr

A Wordle-style daily guessing game for studio microphones. Static site, no build step, no backend — deploys straight to GitHub Pages.

Guess today's microphone by exact product name (autocomplete assists). Each guess compares six categories against the answer: **manufacturer origin (country)**, **operating principle**, **polar pattern** (marked "Switchable" if the mic offers more than one), **manufacturer**, **release year** (with a higher/lower hint), and **MSRP** (also higher/lower — shows "Unknown" if no price could be sourced). You get 10 guesses per day.

The mic pool is sourced from a real recording-studio equipment inventory — every mic in the game actually exists in that inventory.

## Project structure

```
index.html          entry point
css/styles.css       all styling
js/                   app logic (vanilla JS, no framework)
  app.js               orchestration / rendering
  compare.js            pure guess-comparison functions
  autocomplete.js        typeahead search component
  schedule.js             resolves "today's" target mic (also handles ?debug=1&day=N override)
  storage.js               localStorage persistence
  devtools.js               debug console API + ?debug=1 panel (see "Debugging" below)
data/
  mics.js               the curated mic database (hand-edited)
  schedule.js             precomputed daily answer order (generated — don't hand-edit `order`)
scripts/
  parse_inventory.py    xlsx -> raw candidate mic names (maintainer tool, rerun if source spreadsheet changes)
  build-schedule.mjs      generates/extends data/schedule.js (maintainer tool)
  raw_candidates.json      staging output of parse_inventory.py, kept for provenance
```

## Adding a new microphone

1. Add an entry to `data/mics.js`:
   ```js
   {
     id: "manufacturer-model",       // permanent — never reuse or delete once it's shipped in a schedule
     manufacturer: "...",
     model: "...",
     displayName: "...",
     aliases: ["..."],                // shorthand names for autocomplete matching
     countryOfOrigin: "...",           // the brand's founding/HQ country
     operatingPrinciple: "...",         // "Dynamic" | "Ribbon" | "Condenser (Large-Diaphragm)" | "Condenser (Small-Diaphragm)"
     polarPatterns: ["..."],             // always an array, even for a single fixed pattern
     switchable: false,                   // true only if the mic itself has a pattern-select switch
     releaseYear: 0000,
     msrp: 0000,                            // whole USD; null if no credible price was found (renders as "Unknown")
     needsVerification: false,             // true quarantines it from the daily rotation (see below)
     verificationNote: null
   }
   ```
2. Run `node scripts/build-schedule.mjs` — this appends the new id (if `needsVerification` is not `true`) to the end of `data/schedule.js`'s `order` array. It never touches existing entries, so every past day's answer stays the same.
3. Commit both files together.

**`needsVerification: true`** keeps a mic playable as an autocomplete/decoy option but excludes it from ever being *today's answer* until you flip the flag to `false` and re-run the schedule script — this protects against a shaky release year **or MSRP** silently producing a wrong hi/lo hint for every player on that day. A `null` msrp on its own is safe and does *not* require this flag — the game just shows "Unknown" and skips the hi/lo hint for that guess (see `compareMsrp` in `js/compare.js`). Flag it when you have a *number* you're not confident in (a guessed/inferred/single-source price), not just when the price is missing entirely.

**Never delete or reuse an `id`** once it has appeared in `data/schedule.js`'s `order` — that breaks the historical record of past puzzles. If an entry turns out to be wrong, correct its fields in place instead.

## Running locally

No server needed — just open `index.html` directly in a browser (double-click it, or `open index.html` on macOS). Everything loads via classic `<script>` tags, so there's no CORS/`fetch()` issue with `file://`.

## Debugging

`js/devtools.js` always exposes a console API — no URL flag needed:

```js
MicGuessrDebug.revealAnswer()   // logs + returns today's target mic
MicGuessrDebug.winInstantly()   // marks today solved with the correct guess, reloads
MicGuessrDebug.loseInstantly()  // fills today with 10 wrong guesses, reloads
MicGuessrDebug.resetToday()     // clears today's progress, reloads
MicGuessrDebug.resetAll()       // clears all MicGuessr localStorage, reloads
MicGuessrDebug.gotoDay(n)       // jumps to puzzle #n+1 (adds ?debug=1&day=n, reloads)
MicGuessrDebug.getState()       // { dayIndex, target, dayState, stats }
MicGuessrDebug.poolStats()      // { total, eligible, quarantined }
```

Add `?debug=1` to the URL for a visual panel (bottom-right) with the same actions as buttons, plus a day-jump input. `?debug=1&day=N` also lets you preview any puzzle without touching your system clock — the day override in `js/schedule.js` only activates when `debug=1` is present, so it can't be triggered by accident via a stray query string.

## Deploying to GitHub Pages

1. Push this repo to GitHub.
2. In the repo, go to **Settings → Pages**.
3. Under **Build and deployment**, set **Source** to "Deploy from a branch", branch `main`, folder `/ (root)`.
4. Save — GitHub will publish at `https://<username>.github.io/<repo-name>/`.

No GitHub Actions workflow is needed since there's no build step.

## Regenerating the raw candidate list

If the source spreadsheet changes, re-run:

```bash
python3 scripts/parse_inventory.py "/path/to/inventory.xlsx"
```

This only regenerates `scripts/raw_candidates.json` (a staging file for manual review) — it does **not** touch `data/mics.js`. Curating that file (deduping, excluding non-mics, filling in specs) is a manual step.

## Data conventions

- **Country of origin** is the brand's founding/headquarters country, not necessarily where a given unit was manufactured.
- **Release year** is the year the specific model was first introduced. For mics later reissued or revised under the same name, the original introduction year is used.
- **MSRP** is the current official price (USD) for mics still in production, or the original launch-era price for discontinued ones. Where no official MSRP was findable, a corroborated street price was used as a fallback and noted in `verificationNote`.
- Modular capsule systems (e.g. Schoeps CMC 6 bodies with swappable capsules) are entered as one fixed-pattern entry per body+capsule combination actually in the source inventory — not marked "Switchable," since changing pattern requires physically swapping the capsule rather than flipping a switch.
