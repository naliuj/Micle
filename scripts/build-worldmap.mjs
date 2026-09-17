#!/usr/bin/env node
// Generates data/worldmap.js — the country outlines the Study Mode Reference
// tab draws its map from. Same shape as build-schedule.mjs: a maintainer-run
// script that writes a committed data file, never anything at request time.
//
// Source: Natural Earth 1:110m Admin 0 countries. Natural Earth is explicitly
// public domain ("no permission is needed... crediting the authors is
// unnecessary"), which is why it wins over the alternatives:
//
//   - SimpleMapLab's blank world SVG is CC0, but it's 2.6 MB with ZERO ids,
//     classes or data attributes on its 242 paths. "Separately addressable"
//     in their copy means selectable in Illustrator, not identified in
//     markup — there's nothing to hang a click handler on, and 2.6 MB in
//     PRECACHE_URLS would be pulled on install by every visitor, including
//     the ones who never open Study Mode.
//   - flekschas/simple-world-map is 74 KB with ISO ids and would drop
//     straight in, but it's CC BY-SA 3.0: attribution plus a ShareAlike
//     obligation on any adaptation. Public domain is the cleaner story.
//
// The projection is equirectangular, which is just arithmetic — no d3-geo, no
// npm dependency, matching every other script here (node builtins only; this
// repo has no package.json). Equirectangular badly distorts high latitudes,
// which for a click-target map of 8 countries is a non-issue; Antarctica is
// dropped because it has no mics and eats the bottom sixth of the viewBox.
//
// Coordinates are rounded to integers at a 2000x1000 viewBox and emitted as
// relative linetos. That's what takes the output from ~180 KB of full-
// precision absolute coordinates down to ~51 KB — at 2000 units across, a
// single unit is finer than a screen pixel at any width the map renders at,
// so the rounding is invisible.
//
// Usage:
//   node scripts/build-worldmap.mjs            # fetches source, writes data/worldmap.js
//   node scripts/build-worldmap.mjs --local=path/to.geojson

import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outPath = join(repoRoot, "data", "worldmap.js");

// Pinned to a tag rather than master so a regeneration is reproducible. The
// input SHA-256 is printed on every run; if it changes, the upstream data
// changed and the diff in data/worldmap.js deserves a look.
const SOURCE_URL =
  "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/ne_110m_admin_0_countries.geojson";

const WIDTH = 2000;
const HEIGHT = 1000;

// Antarctica: no mics, and equirectangular stretches it across the entire
// bottom of the map, which would force the viewBox taller for nothing.
const SKIP_ISO = new Set(["AQ"]);

const projectX = (lon) => Math.round(((lon + 180) / 360) * WIDTH);
const projectY = (lat) => Math.round(((90 - lat) / 180) * HEIGHT);

// Relative linetos with integer deltas. Points that collapse onto the
// previous one after rounding are dropped — at 110m resolution a fair number
// of coastline vertices land on the same pixel, and "l0 0" is pure bytes.
function ringToPath(ring) {
  let d = "";
  let lastX = null;
  let lastY = null;
  for (const [lon, lat] of ring) {
    const x = projectX(lon);
    const y = projectY(lat);
    if (lastX === null) {
      d += `M${x} ${y}`;
      lastX = x;
      lastY = y;
      continue;
    }
    const dx = x - lastX;
    const dy = y - lastY;
    if (dx === 0 && dy === 0) continue;
    d += `l${dx} ${dy}`;
    lastX = x;
    lastY = y;
  }
  return d ? `${d}Z` : "";
}

// Outer rings only — holes (enclaves like Lesotho inside South Africa) are
// dropped. They'd need fill-rule handling for a few pixels of accuracy on a
// map whose job is "which country did I click".
function featureToPath(feature) {
  const geometry = feature.geometry;
  if (!geometry) return "";
  const polygons = geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
  return polygons
    .map((polygon) => ringToPath(polygon[0]))
    .filter(Boolean)
    .join("");
}

// Every [lon, lat] in a feature's outer rings — used only for the bounding
// box, so it walks the same rings featureToPath emits.
function* featureCoords(feature) {
  const geometry = feature.geometry;
  if (!geometry) return;
  const polygons = geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
  for (const polygon of polygons) {
    for (const point of polygon[0]) yield point;
  }
}

async function loadSource(localPath) {
  if (localPath) {
    console.log(`Reading local source: ${localPath}`);
    return readFileSync(resolve(localPath), "utf8");
  }
  console.log(`Fetching ${SOURCE_URL}`);
  const res = await fetch(SOURCE_URL);
  if (!res.ok) throw new Error(`Source fetch failed: ${res.status} ${res.statusText}`);
  return res.text();
}

async function main() {
  const args = Object.fromEntries(
    process.argv.slice(2).map((a) => {
      const [k, v] = a.replace(/^--/, "").split("=");
      return [k, v ?? true];
    })
  );

  const raw = await loadSource(args.local === true ? null : args.local);
  const sourceHash = createHash("sha256").update(raw).digest("hex").slice(0, 16);
  const geojson = JSON.parse(raw);

  const paths = {};
  const bounds = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
  let skippedNoIso = 0;
  for (const feature of geojson.features) {
    // ISO_A2_EH resolves a handful of cases ISO_A2 leaves as "-99" (France,
    // Norway among them) — it's the field to prefer.
    const iso = feature.properties.ISO_A2_EH || feature.properties.ISO_A2;
    if (!iso || iso === "-99") {
      skippedNoIso += 1;
      continue;
    }
    if (SKIP_ISO.has(iso)) continue;
    const d = featureToPath(feature);
    if (!d) continue;
    paths[iso] = d;
    // Track the real extent so the viewBox can be cropped to it. Dropping
    // Antarctica leaves ~20% of a full -90..90 box as empty ocean at the
    // bottom, which would otherwise shrink every country on screen for
    // nothing — and these are already small tap targets.
    for (const [lon, lat] of featureCoords(feature)) {
      const x = projectX(lon);
      const y = projectY(lat);
      if (x < bounds.minX) bounds.minX = x;
      if (x > bounds.maxX) bounds.maxX = x;
      if (y < bounds.minY) bounds.minY = y;
      if (y > bounds.maxY) bounds.maxY = y;
    }
  }

  const viewBox = `${bounds.minX} ${bounds.minY} ${bounds.maxX - bounds.minX} ${bounds.maxY - bounds.minY}`;

  const body = `// GENERATED by scripts/build-worldmap.mjs — do not hand-edit.
//
// Country outlines for the Study Mode Reference map, from Natural Earth
// 1:110m Admin 0 countries (public domain — no attribution required).
// Keys are ISO 3166-1 alpha-2; js/worldmap.js maps data/mics.js's
// colloquial country names ("USA", "UK") onto them.
//
// Equirectangular projection, integer coordinates, relative linetos, outer
// rings only, Antarctica omitted. See the generator for why.
//
// Source SHA-256 (first 16): ${sourceHash}
const WORLD_MAP = ${JSON.stringify({ viewBox, paths }, null, 0)};

if (typeof module !== "undefined") module.exports = { WORLD_MAP };
`;

  writeFileSync(outPath, body);

  // The eight countries data/mics.js actually uses. Asserting them here means
  // an upstream change that drops or renames one fails loudly at generation
  // time rather than showing up as a country that silently can't be clicked.
  const REQUIRED = ["US", "DE", "JP", "AT", "DK", "AU", "GB", "RU"];
  const missing = REQUIRED.filter((iso) => !paths[iso]);
  if (missing.length) {
    console.error(`FAILED: required countries missing from source: ${missing.join(", ")}`);
    process.exit(1);
  }

  console.log(`Countries: ${Object.keys(paths).length} (skipped ${skippedNoIso} with no ISO code)`);
  console.log(`viewBox: ${viewBox}  (cropped from 0 0 ${WIDTH} ${HEIGHT})`);
  console.log(`Wrote ${outPath} — ${body.length.toLocaleString("en-US")} bytes`);
  console.log(`Required countries present: ${REQUIRED.map((i) => `${i}=${paths[i].length}`).join(" ")}`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
