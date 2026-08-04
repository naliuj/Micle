# Micle

A Wordle-style daily guessing game for studio microphones. Static site, no build step, no backend — deploys straight to GitHub Pages.

Guess today's microphone by exact product name (autocomplete assists). Each guess compares six categories against the answer: **manufacturer origin (country)**, **operating principle**, **polar pattern** (marked "Switchable" if the mic offers more than one), **manufacturer**, **release year** (with a higher/lower hint), and **price** (also higher/lower — shows "Unknown" if no MSRP could be sourced). You get 6 guesses per day.

The mic pool is sourced from a real recording-studio equipment inventory — every mic in the game actually exists in that inventory.

Two modes, switchable via tabs above the guess box: **Daily Puzzle** (the shared, persistent puzzle described above — saved to localStorage, feeds your stats/streak) and **Random Mic** (unlimited practice — pulls a fresh random mic from the same eligible pool, "New Mic" starts another round anytime, and none of it touches your stats or persists across a reload). Both share the same board/comparison UI; only where the target comes from and whether progress is saved differs.

Random Mic also has an **Infinity** pill toggle that lifts the 6-guess cap for that mode entirely — toggle it anytime mid-round to keep guessing past the normal limit (or re-impose it by toggling it off). It has no effect on Daily Puzzle, which always keeps the 6-guess cap.

A dice-icon button next to the guess input submits a random unguessed mic from the eligible pool as your next guess — in any mode, Daily included. It's available for the whole round (not just the opening guess) and disables along with the input once the round ends.

## Keyboard shortcuts

`/`, `?`, and `Esc` always work. The rest only fire while the guess input isn't focused, so they never interfere with typing a mic name:

| Key | Action |
|---|---|
| `/` | Focus the guess input |
| `?` | Toggle the instructions panel |
| `Esc` | Close the instructions panel |
| `S` | Open stats |
| `D` | Switch to Daily Puzzle |
| `M` | Switch to Random Mic |
| `N` | New Mic (Random Mic only) |
| `R` | Random guess |
| `I` | Toggle Infinity (Random Mic only) |

All of them are suppressed while the stats dialog is open, so they never fight with its native focus-trap/Escape-close behavior.

## Project structure

```
index.html          entry point
css/styles.css       all styling
js/                   app logic (vanilla JS, no framework)
  app.js               orchestration / rendering
  compare.js            pure guess-comparison functions
  autocomplete.js        typeahead search component
  schedule.js             resolves "today's" target mic from SCHEDULE.order (see below)
  storage.js               localStorage persistence, keyed by day index
  devtools.js               debug console API, no UI (see "Debugging" below)
data/
  mics.js               the curated mic database (hand-edited)
  schedule.js             precomputed daily answer order (generated — don't hand-edit `order`)
scripts/
  parse_inventory.py    xlsx -> raw candidate mic names (maintainer tool, rerun if source spreadsheet changes)
  build-schedule.mjs      generates/extends data/schedule.js (maintainer tool)
  raw_candidates.json      staging output of parse_inventory.py, kept for provenance
```

## How the daily mic is picked

`data/schedule.js` is precomputed by `scripts/build-schedule.mjs` and holds a flat `order` array — one mic id per day, starting at `launchDate`. `js/schedule.js` just indexes into it: `order[dayIndex]`, where `dayIndex` is the number of days since `launchDate` (player's local calendar date). No live randomness, no dependency on the eligible pool's current size — so past days are permanently stable no matter what gets added to `data/mics.js` later.

**Avoiding the obvious flaw with that approach:** a naive version of this (single shuffle, then `order[dayIndex % order.length]` once you run past the end) would make every cycle through the pool identical — day 40 would always mirror day 1, day 41 would always mirror day 2, and so on, forever. That pattern is detectable by an attentive player. Instead, `order` is a concatenation of **generations** — each generation is one full shuffled pass through every eligible mic (covering all of them exactly once before any repeat), but every generation gets its *own independent* shuffle seed. Generation 2 has no relationship to generation 1's order; a player who plays long enough to see the pool cycle won't see the sequence repeat. `build-schedule.mjs` also checks that a generation's first pick never matches the previous generation's last pick, so there's no same-mic-two-days-in-a-row seam at the boundary either.

`build-schedule.mjs` keeps roughly two years of runway ahead of "today" and is safe to re-run any time (cron, or just whenever you remember) — it only ever *appends* new generations, so it's a no-op if there's already enough buffer, and it never rewrites anything already written.

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
     operatingPrinciple: "...",         // "Dynamic" | "Ribbon" | "Tube" | "Condenser (Large-Diaphragm)" | "Condenser (Small-Diaphragm)"
     polarPatterns: ["..."],             // always an array, even for a single fixed pattern
     switchable: false,                   // true only if the mic itself has a pattern-select switch
     releaseYear: 0000,
     msrp: 0000,                            // whole USD; null if no credible price was found (renders as "Unknown")
     needsVerification: false,             // true quarantines it from the daily pool (see below)
     verificationNote: null
   }
   ```
2. Run `node scripts/build-schedule.mjs` — new eligible mics only enter rotation in the *next* generation appended after they're added, never retroactively inserted into an already-written generation (that's what keeps past days stable). If the schedule already has enough buffer left, this is a no-op; run with `--buffer-days=0` to force a fresh top-up sooner if you want the new mic in rotation without waiting ~2 years.
3. Commit `data/mics.js` and `data/schedule.js` together.

**`needsVerification: true`** keeps a mic playable as an autocomplete/decoy option but excludes it from ever being picked as *today's answer* until you flip the flag to `false` and re-run the schedule script — this protects against a shaky release year **or MSRP** silently producing a wrong hi/lo hint for players. A `null` msrp on its own is safe and does *not* require this flag — the game just shows "Unknown" and skips the hi/lo hint for that guess (see `compareMsrp` in `js/compare.js`). Flag it when you have a *number* you're not confident in (a guessed/inferred/single-source price), not just when the price is missing entirely.

**Never delete or reuse an `id`** once it has appeared in `data/schedule.js`'s `order` — that breaks the historical record of past puzzles. If an entry turns out to be wrong, correct its fields in place instead.

## Running locally

No server needed — just open `index.html` directly in a browser (double-click it, or `open index.html` on macOS). Everything loads via classic `<script>` tags, so there's no CORS/`fetch()` issue with `file://`.

## Debugging

`js/devtools.js` always exposes a console API — no URL flag needed. Every
command acts on whichever mode (Daily Puzzle / Random Mic) is currently on
screen:

```js
MicleDebug.revealAnswer()        // logs + returns the current target mic
MicleDebug.setTarget("query")    // Random Mic only: sets the target to a matching mic, starts a fresh round
MicleDebug.winInstantly()        // marks the round solved with the correct guess
MicleDebug.loseInstantly()       // fills the round with 6 wrong guesses
MicleDebug.resetToday()          // Daily: clears today's progress, reloads. Random: fresh round in place.
MicleDebug.resetAll()            // clears all Micle localStorage, reloads
MicleDebug.gotoDate("2026-08-15") // jumps Daily to that date (adds ?debug=1&date=..., reloads)
MicleDebug.getState()            // { mode, target, state, [dayIndex, dateStr, stats if Daily] }
MicleDebug.poolStats()           // { total, eligible, quarantined, scheduleLength }
MicleDebug.showPossibleGuesses() // logs + returns every eligible mic still consistent with all guesses so far (matches, no-matches, and hi/lo hints)
```

There's no visual UI for any of this — it's console-only. `gotoDate()` works by adding `?debug=1&date=YYYY-MM-DD` to the URL and reloading; the date override in `js/schedule.js` only activates when `debug=1` is present, so it can't be triggered by accident via a stray query string.

Daily commands persist to localStorage and reload the page, same as before.
Random Mic sessions are never persisted (by design — see above), so those
commands instead mutate the in-memory session directly and re-render in
place; no reload, since that would also wipe the random round. `js/app.js`
exposes a small `window.MicleApp` bridge for this — see its comment there if
you're extending devtools.js further.

## Deploying to GitHub Pages

1. Push this repo to GitHub.
2. In the repo, go to **Settings → Pages**.
3. Under **Build and deployment**, set **Source** to "Deploy from a branch", branch `main`, folder `/ (root)`.
4. Save — GitHub will publish at `https://<username>.github.io/<repo-name>/`.

No GitHub Actions workflow is needed since there's no build step.

## Icons

`favicon.svg` is the source of truth for the mic mark (a flat rounded-square
badge, with its own `prefers-color-scheme` media query so the tab icon flips
with the OS theme independent of the manifest icons). The PNGs it's
rasterized to — `icons/apple-touch-icon.png`, `icons/icon-192.png`,
`icons/icon-512.png`, and `social-card.png` (the Open Graph/Twitter preview
image) — are generated by `scripts/build-icons.mjs`, a maintainer script in
the same spirit as `build-schedule.mjs`: it never runs at request time, and
its output is committed as static assets. It has no image-library dependency
(hand-rolled PNG encoder using only Node's built-in `zlib`), since the mark is
simple rounded-rect geometry with no text.

Re-run it after changing `favicon.svg`'s shapes or the `ACCENT` color in
`scripts/build-icons.mjs` (kept in sync with `--accent` in `css/styles.css`
by hand, not read from the CSS file):

```bash
node scripts/build-icons.mjs
```

## PWA

`manifest.webmanifest` + `sw.js` make Micle installable ("Add to Home
Screen") and give it a minimal offline shell. `sw.js` precaches every static
asset (`index.html`, `css/styles.css`, all `js/*.js`, `data/*.js`) and serves
**network-first with cache fallback** — deliberately not cache-first, since
this is a no-build-step site with no hashed filenames, so a cache-first
strategy could serve a stale `data/schedule.js` (and thus the wrong "today's
puzzle") indefinitely to a returning visitor.

**Maintenance gotcha:** `sw.js`'s `CACHE_VERSION` constant must be bumped by
hand whenever any precached file changes — nothing does this automatically.
Forgetting isn't catastrophic (network-first means fresh content still wins
on every online load), but the *offline* copy would keep serving the old
version until the version bump ships.

## Analytics

Micle uses [GoatCounter](https://www.goatcounter.com) for traffic analytics —
it's cookieless (no consent banner needed), free for a personal/non-commercial
site at this scale, and its script domain is less commonly adblocked than
Umami Cloud's (the previous analytics provider, being phased out — its script
tag is still present in `index.html` temporarily so counts can be
cross-validated before it's removed). The tracking script is a single
`<script>` tag in `index.html`; there's no build step or server involved.

Beyond automatic pageviews/visitors, a few custom events are tracked from
`js/app.js`, all through a small `track(name, data)` wrapper that no-ops if the
script is blocked or hasn't loaded yet. GoatCounter's event API takes a
`path`/`title` pair rather than an arbitrary data object, so `track()`
translates each call into a `name:variant` event path (queryable as a
distinct event in the GoatCounter dashboard) via `toGoatCounterEvent()`:
- `round_complete` — fired whenever a round ends (win or loss), from
  `submitGuess()`. Becomes `round_complete:<mode>:<outcome>` (e.g.
  `round_complete:daily:win`), with the guess count as the event's title.
- `mode_switch` — fired on every Daily Puzzle / Random Mic switch, from
  `switchMode()`. Becomes `mode_switch:<mode>`.
- `infinity_toggle` — fired when the Infinity pill is toggled on/off, from
  `setRandomInfinity()`. Becomes `infinity_toggle:on` or `infinity_toggle:off`.

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
