#!/usr/bin/env node
// Regenerates PHOTOS.md — the shot list of mics still needing a photo.
//
// Derived from data/mics.js and data/photos.js rather than maintained by
// hand, so it can't claim a mic still needs shooting after its photo lands.
// Formatted for Obsidian (frontmatter, callouts, checkboxes) but it's plain
// Markdown and renders fine anywhere.
//
// Re-running produces a FRESH list with every box unticked. If you're
// tracking progress by ticking boxes in your vault, that copy is the one
// with your ticks — regenerate into the repo, not over your notes.
//
// Usage: node scripts/build-photo-checklist.mjs

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function loadGlobal(file, name) {
  const src = readFileSync(join(root, file), "utf8");
  const sandbox = { module: { exports: {} } };
  new Function("module", "exports", `${src}\n;module.exports = { ${name} };`)(sandbox.module, sandbox.module.exports);
  return sandbox.module.exports[name];
}

const MIC_DB = loadGlobal("data/mics.js", "MIC_DB");
const MIC_PHOTOS = loadGlobal("data/photos.js", "MIC_PHOTOS");

const pool = MIC_DB.filter((m) => m.needsVerification !== true);
const byName = (a, b) => a.displayName.localeCompare(b.displayName);
const need = pool.filter((m) => !MIC_PHOTOS[m.id]);
const have = pool.filter((m) => MIC_PHOTOS[m.id]);

// Enough to tell near-identical models apart while holding one: a U 47 from a
// U 47 FET, a KM 84 from a KM 184.
function describe(mic) {
  const patterns = mic.polarPatterns.join(" / ") + (mic.switchable ? " (switchable)" : "");
  return `${mic.operatingPrinciple} · ${patterns} · ${mic.releaseYear}`;
}

function groupByMaker(mics) {
  const groups = new Map();
  mics.forEach((m) => {
    if (!groups.has(m.manufacturer)) groups.set(m.manufacturer, []);
    groups.get(m.manufacturer).push(m);
  });
  return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
}

let out = `---
tags:
  - micle
  - photography
  - checklist
mics_total: ${pool.length}
photos_done: ${have.length}
photos_remaining: ${need.length}
---

# Micle — mic photo shot list

**${have.length} of ${pool.length} done.** ${need.length} still to photograph.

> [!info] How a photo gets into the app
> 1. Shoot the mic, export a JPEG at **600px on the long edge**.
> 2. Name it exactly as the \`code\` on its line and put it in \`images/mics/\`.
> 3. Add an entry to \`data/photos.js\` — the field notes are at the top of
>    that file. **Leave out the \`origin\` field** and
>    \`scripts/fetch-mic-photos.mjs\` will never overwrite your entry.

> [!tip] Shooting notes
> The card shows a **56px thumbnail** with \`object-fit: contain\`, so a busy
> background turns to mush at that size — plain and light-on-dark reads best.
> Clicking the thumbnail opens the photo at full size, so the 600px detail is
> worth getting right. Portrait suits most mics; the stored file keeps
> whatever aspect ratio you shoot.

## To photograph (${need.length})

`;

groupByMaker(need).forEach(([maker, mics]) => {
  out += `### ${maker}\n\n`;
  mics.sort(byName).forEach((m) => {
    out += `- [ ] **${m.displayName}** — ${describe(m)} — \`${m.id}.jpg\`\n`;
  });
  out += "\n";
});

out += `## Already covered (${have.length})

> [!done]- From Wikimedia Commons — no need to shoot these
`;
have.sort(byName).forEach((m) => {
  const p = MIC_PHOTOS[m.id];
  out += `> - [x] **${m.displayName}** — ${p.author}, ${p.license}${p.note ? " ⚠️" : ""}\n`;
});

const caveats = have.filter((m) => MIC_PHOTOS[m.id].note);
if (caveats.length) {
  out += `
> [!warning]- ${caveats.length} covered with a caveat — reshoot if you want them exact
`;
  caveats.forEach((m) => {
    out += `> - **${m.displayName}** — ${MIC_PHOTOS[m.id].note}\n`;
  });
}

writeFileSync(join(root, "PHOTOS.md"), `${out.trimEnd()}\n`);
console.log(`PHOTOS.md: ${need.length} to shoot, ${have.length} covered, ${caveats.length} with caveats.`);
