#!/usr/bin/env node
// Stamps sw.js's CACHE_VERSION with a hash of everything it precaches, so
// the version is a fact about the content rather than a chore to remember.
//
// Why this exists: sw.js is network-first, so forgetting to bump the version
// never serves a stale file to an *online* visitor — the fetch handler
// rewrites the cache on every successful load. What it does break is the
// offline copy, which keeps whatever was cached under the old name until a
// new version ships. That's a quiet enough failure that it survived two
// deploys unnoticed, which is exactly the kind of thing to make structural.
//
// The hash covers the precached files, never sw.js itself — stamping the
// version into sw.js would change sw.js, which would change the hash.
//
// Idempotent: same content in, same version out, no diff. Safe to run on
// every commit, or by hand before one.
//
// Also asserts every PRECACHE_URLS entry resolves to a real file. That check
// matters more than it looks: install() uses cache.addAll(), which is
// all-or-nothing, so a single 404 in that list rejects the install and leaves
// the site with no offline support at all — silently, since js/pwa.js
// swallows registration failures by design.

import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const swPath = join(repoRoot, "sw.js");

// Directory URLs are served by their index.html — the same mapping GitHub
// Pages applies, so the hash covers the bytes a visitor actually receives.
function toFilePath(url) {
  const trimmed = url.replace(/^\//, "");
  return join(repoRoot, trimmed === "" || trimmed.endsWith("/") ? `${trimmed}index.html` : trimmed);
}

const sw = readFileSync(swPath, "utf8");

const listMatch = sw.match(/const PRECACHE_URLS = \[([\s\S]*?)\];/);
if (!listMatch) {
  console.error("Couldn't find PRECACHE_URLS in sw.js — has its shape changed?");
  process.exit(1);
}
const urls = [...listMatch[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);

const missing = urls.filter((u) => !existsSync(toFilePath(u)));
if (missing.length > 0) {
  console.error(
    `PRECACHE_URLS lists ${missing.length} file(s) that don't exist. cache.addAll() is ` +
      `all-or-nothing, so this would break offline support entirely:\n` +
      missing.map((u) => `  ${u} -> ${toFilePath(u)}`).join("\n")
  );
  process.exit(1);
}

// Hash the paths as well as the bytes, so adding, removing or renaming an
// entry changes the version even when the file contents are untouched.
const hash = createHash("sha256");
[...urls].sort().forEach((url) => {
  hash.update(url);
  hash.update(readFileSync(toFilePath(url)));
});
const version = hash.digest("hex").slice(0, 12);

const current = sw.match(/const CACHE_VERSION = "([^"]+)";/);
if (!current) {
  console.error("Couldn't find CACHE_VERSION in sw.js — has its shape changed?");
  process.exit(1);
}

if (current[1] === version) {
  console.log(`CACHE_VERSION already current (${version}) — ${urls.length} files unchanged.`);
  process.exit(0);
}

writeFileSync(swPath, sw.replace(/const CACHE_VERSION = "[^"]+";/, `const CACHE_VERSION = "${version}";`));
console.log(`CACHE_VERSION ${current[1]} -> ${version} (${urls.length} precached files).`);
