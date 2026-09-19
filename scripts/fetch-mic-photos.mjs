#!/usr/bin/env node
// Fetches the curated Wikimedia Commons photos for the Reference tab and
// writes their attribution into data/photos.js.
//
// The list below is CURATED BY HAND, never filled by search. A Commons search
// on a mic's model number is badly polluted: when this was first surveyed, the
// "strong" filename matches included WWII U-boats (U-47, U-67), railway
// kilometre markers (km 184), Swedish runestones (U 89), a tram (-149),
// hurricane tracks (KM 84, KM 86) and a Samsung sedan (SM7). Every entry here
// was looked at before it was added.
//
// Author and licence come from the Commons API, not from hand-typed text, so
// attribution can't drift from the source. Photos Julian adds himself are
// entries in data/photos.js without `origin: "commons"`; this script keeps
// those untouched and only rewrites the entries it owns.
//
// Images are resized with macOS's built-in `sips`, which keeps the repo's
// no-npm-dependency rule at the cost of being macOS-only.
//
// Usage: node scripts/fetch-mic-photos.mjs

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const photosPath = join(root, "data", "photos.js");
const imagesDir = join(root, "images", "mics");

// Long edge of the stored file. The card shows a 56px thumbnail, so this is
// generous on purpose — enough headroom for a click-to-enlarge later without
// re-fetching everything.
const LONG_EDGE = 600;
const USER_AGENT = "MicleReferencePhotos/1.0 (https://micle.julianro.se; julianrose508@gmail.com)";

// `note` records anything a reader should know about the identification. It
// isn't shown on the card; it's here so a caveat accepted once doesn't quietly
// turn into a fact.
const CURATED = {
  "akg-c414": { file: "File:AKG-C414-front.jpg" },
  "akg-c451": {
    file: "File:AKG C451B.jpg",
    note: "Pictured is the C451 B, the 2001 reissue, not the 1969 C451 this entry describes. Visually near-identical; kept by maintainer decision.",
  },
  "at-atm87r": { file: "File:Audio-technica ATM87R.jpg" },
  "coles-4038": {
    file: "File:BBC microphones (The Beatles Story).jpg",
    note: "A museum display case rather than a product shot; the double-grille 4038 ribbons are unmistakable.",
  },
  "dpa-4055": { file: "File:4055-on-stand-boom.jpg" },
  "ev-re20": { file: "File:EV RE20 voiceover booth.jpg" },
  "neumann-ku100": { file: "File:Georg Neumann Ku 100 Dummy Head.jpg" },
  "neumann-tlm103": { file: "File:Neumann TLM 103.jpg" },
  "neumann-tlm170r": { file: "File:Neumann TLM170R & Elastic Suspension.jpg" },
  "neumann-u47": { file: "File:Neumann U47 Tube.jpg" },
  "neumann-u67": {
    file: "File:Microphone Neumann U-67 (1953).jpg",
    note: "Identification unverified. The Commons label dates this 1953, but the U 67 was introduced in 1960, and it resembles the U 47 museum shot. Kept by maintainer decision.",
  },
  "royer-r121": { file: "File:Royer 121 (201884599).jpeg" },
  "shure-sm57": { file: "File:Shure SM57.jpg" },
  "shure-sm58": { file: "File:Shure SM58.jpg" },
};

// NonCommercial and NoDerivatives are refused outright: the site is public,
// and resizing is a derivative, so ND would forbid the one change we make.
const ACCEPTABLE = /^(cc0|public domain|cc by(-sa)? [0-9.]+( [a-z]+)?)$/i;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchWithRetry(url, asJson) {
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return asJson ? await res.json() : Buffer.from(await res.arrayBuffer());
    } catch (err) {
      if (attempt === 5) throw err;
      await sleep(800 * attempt);
    }
  }
}

function stripHtml(html) {
  return decodeEntities((html || "").replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim();
}

function decodeEntities(text) {
  return text
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

// Commons' Artist field is free-form wiki text, so it arrives carrying
// signatures, talk links and upload boilerplate. This tidies the formatting
// only. It must never drop a name: a derivative work credits both the
// original author and whoever made the derivative, and the licence requires
// both — so "X.jpg: Alice derivative work: Bob" becomes
// "Alice; derivative work by Bob", not "Bob".
function cleanAuthor(raw) {
  let a = raw;
  const uploader = /^The original uploader was (.+?) at (.+?)\.?$/i.exec(a);
  if (uploader) return `${uploader[1]} (${uploader[2]})`;
  a = a.replace(/^[^:]*\.(jpe?g|png|gif|tiff?|svg):\s*/i, ""); // "Source.jpg: " prefix
  a = a.replace(/\s*-\s*\S+\s+\d{1,2}:\d{2},\s+\d{1,2}\s+\w+\s+\d{4}\s+\(UTC\)/g, ""); // wiki signature
  a = a.replace(/\s*\(talk\)/gi, "");
  a = a.replace(/~[a-z]+wiki\b/gi, ""); // single-login rename suffix
  a = a.replace(/\s*derivative work:\s*/i, "; derivative work by ");
  return a.replace(/\s+/g, " ").trim();
}

// Only a link to an actual user page counts as the author's URL. The first
// href in an Artist field is often something else entirely — on a derivative
// work it's the original file — and a wrong author link is worse than none.
function authorHref(html) {
  for (const m of (html || "").matchAll(/href="([^"]+)"/g)) {
    if (!/\/wiki\/User:/i.test(m[1])) continue;
    return m[1].startsWith("//") ? `https:${m[1]}` : m[1];
  }
  return "";
}

function licenseUrlFor(shortName, apiUrl) {
  if (apiUrl) return apiUrl;
  if (/^cc0$/i.test(shortName)) return "https://creativecommons.org/publicdomain/zero/1.0/";
  return "";
}

function sipsDimensions(path) {
  const out = execFileSync("sips", ["-g", "pixelWidth", "-g", "pixelHeight", path], { encoding: "utf8" });
  return {
    width: Number(/pixelWidth: (\d+)/.exec(out)[1]),
    height: Number(/pixelHeight: (\d+)/.exec(out)[1]),
  };
}

function loadExisting() {
  if (!existsSync(photosPath)) return {};
  const src = readFileSync(photosPath, "utf8");
  const sandbox = { module: { exports: {} } };
  new Function("module", "exports", `${src}\n;module.exports = { MIC_PHOTOS };`)(sandbox.module, sandbox.module.exports);
  return sandbox.module.exports.MIC_PHOTOS || {};
}

async function main() {
  mkdirSync(imagesDir, { recursive: true });
  const work = mkdtempSync(join(tmpdir(), "micle-photos-"));
  const existing = loadExisting();

  // Anything not generated here — Julian's own photos — carries over as-is.
  const photos = Object.fromEntries(Object.entries(existing).filter(([, p]) => p.origin !== "commons"));
  const failures = [];

  try {
    for (const [id, { file, note }] of Object.entries(CURATED)) {
      const api =
        "https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo" +
        `&iiprop=url|extmetadata|mime&iiurlwidth=${LONG_EDGE * 2}&titles=${encodeURIComponent(file)}`;
      const json = await fetchWithRetry(api, true);
      const page = Object.values(json.query.pages)[0];
      const info = page.imageinfo && page.imageinfo[0];
      if (!info) {
        failures.push(`${id}: ${file} not found on Commons`);
        continue;
      }

      const meta = info.extmetadata || {};
      const license = ((meta.LicenseShortName || {}).value || "").trim();
      if (!ACCEPTABLE.test(license)) {
        failures.push(`${id}: licence "${license}" is not acceptable`);
        continue;
      }

      // Commons renders the downscale server-side, so a 12 MB original never
      // has to come down the wire just to be shrunk locally.
      const source = info.thumburl || info.url;
      const download = join(work, `${id}.src`);
      writeFileSync(download, await fetchWithRetry(source, false));

      const out = join(imagesDir, `${id}.jpg`);
      execFileSync("sips", ["-s", "format", "jpeg", "-s", "formatOptions", "82", "-Z", String(LONG_EDGE), download, "--out", out], {
        stdio: "ignore",
      });
      const { width, height } = sipsDimensions(out);

      const converted = info.mime !== "image/jpeg";
      const author = cleanAuthor(stripHtml((meta.Artist || {}).value)) || "Unknown";
      photos[id] = {
        file: `${id}.jpg`,
        width,
        height,
        author,
        authorUrl: authorHref((meta.Artist || {}).value),
        license,
        licenseUrl: licenseUrlFor(license, (meta.LicenseUrl || {}).value),
        sourceUrl: info.descriptionurl,
        modified: converted ? `resized to ${LONG_EDGE}px and converted to JPEG` : `resized to ${LONG_EDGE}px`,
        origin: "commons",
        ...(note ? { note } : {}),
      };
      console.log(`  ${id.padEnd(18)} ${width}x${height}  ${license}  ${author}`);
      await sleep(300);
    }
  } finally {
    rmSync(work, { recursive: true, force: true });
  }

  // Dropping an entry from CURATED would otherwise leave its image orphaned in
  // the repo. Only files this script previously wrote are removed — an id is
  // eligible solely because the *old* data had origin: "commons" for it, so a
  // photo of Julian's can never be caught by this.
  for (const [id, prev] of Object.entries(existing)) {
    if (prev.origin !== "commons" || CURATED[id]) continue;
    const orphan = join(imagesDir, prev.file);
    if (existsSync(orphan)) {
      rmSync(orphan);
      console.log(`  removed ${prev.file} (no longer curated)`);
    }
  }

  const header = readFileSync(photosPath, "utf8").split("const MIC_PHOTOS")[0];
  const sorted = Object.fromEntries(Object.entries(photos).sort(([a], [b]) => a.localeCompare(b)));
  writeFileSync(
    photosPath,
    `${header}const MIC_PHOTOS = ${JSON.stringify(sorted, null, 2)};\n\nif (typeof module !== "undefined") module.exports = { MIC_PHOTOS };\n`
  );

  console.log(`\nWrote ${Object.keys(sorted).length} photo entries to data/photos.js.`);
  if (failures.length) {
    console.error(`\n${failures.length} failed:\n${failures.map((f) => `  ${f}`).join("\n")}`);
    process.exit(1);
  }
}

main();
