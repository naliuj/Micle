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
  schedule.js             resolves "today's" target mic (date-seeded random pick, see below)
  storage.js               localStorage persistence, keyed by calendar date
  devtools.js               debug console API + ?debug=1 panel (see "Debugging" below)
data/
  mics.js               the curated mic database (hand-edited)
scripts/
  parse_inventory.py    xlsx -> raw candidate mic names (maintainer tool, rerun if source spreadsheet changes)
  raw_candidates.json      staging output of parse_inventory.py, kept for provenance
```

## How the daily mic is picked

There's no precomputed schedule file. `js/schedule.js` seeds a small deterministic PRNG (mulberry32) with a hash of today's calendar date (`YYYY-MM-DD`, player's local date) and uses it to pick a random index into the eligible pool (`MIC_DB` filtered to `needsVerification !== true`). Same date always picks the same mic within a single session/pool state — it's not `Math.random()`.

**Trade-off, accepted deliberately for simplicity:** the pick for a given date depends on the *current* contents of the eligible pool, not a frozen historical snapshot. Adding a new mic to `data/mics.js`, or flipping a mic's `needsVerification` flag, can shift which mic *any* date resolves to — in principle including a date that already happened, if it's revisited after the pool changes. There's also no anti-repeat logic: independent per-date sampling can land on the same mic on two different dates by chance. If you later want the stronger guarantee (past days never change, no repeats until every mic's been used), that needs a precomputed append-only schedule instead — ask if you want that built back in.

## Adding a new microphone

1. Add an entry to `data/mics.js`:
   ```js
   {
     id: "manufacturer-model",       // keep stable — a past day's saved guesses reference ids by string
     manufacturer: "...",
     model: "...",
     displayName: "...",
     aliases: ["..."],                // shorthand names for autocomplete matching
     countryOfOrigin: "...",           // the brand's founding/HQ country
     operatingPrinciple: "...",         // "Dynamic" | "Ribbon" | "Tube" | "Condenser (Large-Diaphragm)" | "Condenser (Small-Diaphragm)"
     polarPatterns: ["..."],             // always an array, even for a single fixed pattern
     switchable: false,                   // true only if the mic itself has a pattern-select switch
     releaseYear: 0000,
     msrp: 0000,                            // whole USD; null if no credible price was found (renders as "Unknown")
     needsVerification: false,             // true quarantines it from the daily pool (see below)
     verificationNote: null
   }
   ```
2. Commit. That's it — there's no schedule file to regenerate; the mic is live and eligible to be picked for any date (including, per the trade-off above, dates already in the past) the moment it's in `data/mics.js` with `needsVerification` not `true`.

**`needsVerification: true`** keeps a mic playable as an autocomplete/decoy option but excludes it from ever being picked as *today's answer* — this protects against a shaky release year **or MSRP** silently producing a wrong hi/lo hint for players. A `null` msrp on its own is safe and does *not* require this flag — the game just shows "Unknown" and skips the hi/lo hint for that guess (see `compareMsrp` in `js/compare.js`). Flag it when you have a *number* you're not confident in (a guessed/inferred/single-source price), not just when the price is missing entirely.

**Try not to rename or delete an `id`** that's already shipped — a player's saved guesses for a past date reference mics by id, and a missing id will fail to render if that day's history is ever reloaded. If an entry turns out to be wrong, correct its fields in place instead of replacing the id.

## Running locally

No server needed — just open `index.html` directly in a browser (double-click it, or `open index.html` on macOS). Everything loads via classic `<script>` tags, so there's no CORS/`fetch()` issue with `file://`.

## Debugging

`js/devtools.js` always exposes a console API — no URL flag needed:

```js
MicGuessrDebug.revealAnswer()      // logs + returns today's target mic
MicGuessrDebug.winInstantly()      // marks today solved with the correct guess, reloads
MicGuessrDebug.loseInstantly()     // fills today with 10 wrong guesses, reloads
MicGuessrDebug.resetToday()        // clears today's progress, reloads
MicGuessrDebug.resetAll()          // clears all MicGuessr localStorage, reloads
MicGuessrDebug.gotoDate("2026-08-15") // jumps to that date (adds ?debug=1&date=..., reloads)
MicGuessrDebug.getState()          // { dateStr, target, dayState, stats }
MicGuessrDebug.poolStats()         // { total, eligible, quarantined }
```

Add `?debug=1` to the URL for a visual panel (bottom-right) with the same actions as buttons, plus a date-jump input. `?debug=1&date=YYYY-MM-DD` also lets you preview any date's mic without touching your system clock — the date override in `js/schedule.js` only activates when `debug=1` is present, so it can't be triggered by accident via a stray query string.

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
- **`operatingPrinciple: "Tube"`** is used for tube/valve condenser mics — currently only applied among the large-diaphragm condensers (a mic can only carry one `operatingPrinciple` value, so "Tube" takes priority over "Condenser (Large-Diaphragm)" when a mic is tube-based). Small-diaphragm tube mics (e.g. the Soyuz 013, as opposed to the FET 013 FET) haven't been swept for this yet and are still under "Condenser (Small-Diaphragm)" — worth revisiting if that distinction matters to you.
- Modular capsule systems (e.g. Schoeps CMC 6 bodies with swappable capsules) are entered as one fixed-pattern entry per body+capsule combination actually in the source inventory — not marked "Switchable," since changing pattern requires physically swapping the capsule rather than flipping a switch.
- **Same-name model families are merged into one entry** (e.g. all AKG C414 variants — B-ULS, B-XL II, XLII, XLS, EB — are a single "AKG C414" entry) rather than one per revision/SKU, so players aren't quizzed on trivia-level distinctions between near-identical products. Merge only applies to letter/generation revisions of the *same* recognizable model name with the *same* operating principle and polar pattern (e.g. Beta 52 → 52A, DPA 4011 → 4011C) — not to genuinely different products that happen to share a family prefix (e.g. Schoeps MK 4 vs. MK 2 capsules have different fixed patterns and stay separate; Soyuz 013 vs. 013 FET are different circuits and stay separate). For a merged entry: `releaseYear` is the earliest release year among the merged models, and `msrp` is the average of the merged models' known, non-flagged prices (falling back to whatever's available if all were flagged). The old per-variant names are kept as `aliases` so existing searches still resolve to the merged entry. `verificationNote` on a merged entry documents exactly which sources fed the year and price.
