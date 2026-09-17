// Pure helpers for the Study Mode Reference map and table. No DOM mutation,
// no state — same shape as quiz.js/order.js/match.js, so everything here is
// callable from the console against MIC_DB for a sanity check.
//
// Loads after data/worldmap.js (needs WORLD_MAP) and before js/training.js.

// data/mics.js stores countries as display strings, not codes — "USA" and
// "UK", not "US"/"GB" — so something has to bridge them to the map's ISO
// keys. Eight entries rather than a general-purpose country table: the map
// only needs to know about countries the pool actually contains, and an
// unmapped one should be visible (see the warning in buildWorldMapSvg) rather
// than quietly resolved by a fuzzy match.
const COUNTRY_ISO = {
  USA: "US",
  Germany: "DE",
  Japan: "JP",
  Austria: "AT",
  Denmark: "DK",
  Australia: "AU",
  UK: "GB",
  Russia: "RU",
};

const ISO_COUNTRY = Object.fromEntries(Object.entries(COUNTRY_ISO).map(([name, iso]) => [iso, name]));

// Sort comparators keyed by the sortKey on REFERENCE_FIELDS. Each returns a
// raw comparable, never a formatted string: formatPrice gives "$1,234", and
// string-sorting that puts $1,000 ahead of $200.
const SORT_VALUE = {
  name: (m) => m.displayName,
  country: (m) => m.countryOfOrigin,
  principle: (m) => m.operatingPrinciple,
  pattern: (m) => m.polarPatterns.join(", "),
  manufacturer: (m) => m.manufacturer,
  year: (m) => m.releaseYear,
  price: (m) => m.msrp,
};

// Manufacturer is the one key that groups; every other column flattens. It's
// a property of the key rather than a special case for year/price, because
// you can't simultaneously group by manufacturer and order globally by
// anything else — one rule instead of an enumeration.
function sortGroupsByManufacturer(sortKey) {
  return sortKey === "manufacturer";
}

// localeCompare with numeric:true so model numbers read naturally — KM 84
// before KM 184, matching browseAll() in js/autocomplete.js.
function compareText(a, b) {
  return String(a).localeCompare(String(b), undefined, { numeric: true });
}

// Tie-break is always displayName ascending and deliberately does NOT follow
// sortDir: sorting by year descending should still list the 1967 mics A-Z,
// not Z-A.
function compareMics(a, b, sortKey, sortDir) {
  const get = SORT_VALUE[sortKey] || SORT_VALUE.name;
  const av = get(a);
  const bv = get(b);

  // Unknown price sorts last in BOTH directions. Nulls are allowed by the
  // schema (compareMsrp in js/compare.js already degrades for them), and
  // without this "cheapest first" would open with a run of mics that have no
  // price at all.
  const aNull = av == null;
  const bNull = bv == null;
  if (aNull || bNull) {
    if (aNull && bNull) return compareText(a.displayName, b.displayName);
    return aNull ? 1 : -1;
  }

  let cmp = typeof av === "number" && typeof bv === "number" ? av - bv : compareText(av, bv);
  if (sortDir === "desc") cmp = -cmp;
  return cmp || compareText(a.displayName, b.displayName);
}

// Returns a flat list of render instructions rather than nested arrays, so the
// caller can emit rows in one pass: { type: "group" } rows carry a heading,
// { type: "mic" } rows carry the mic. In the grouped case the manufacturers
// themselves are ordered by sortDir, while mics inside each stay A-Z.
function buildMicRows(mics, sortKey, sortDir) {
  if (!sortGroupsByManufacturer(sortKey)) {
    return [...mics].sort((a, b) => compareMics(a, b, sortKey, sortDir)).map((mic) => ({ type: "mic", mic }));
  }

  const groups = new Map();
  mics.forEach((mic) => {
    if (!groups.has(mic.manufacturer)) groups.set(mic.manufacturer, []);
    groups.get(mic.manufacturer).push(mic);
  });

  const names = [...groups.keys()].sort((a, b) => (sortDir === "desc" ? compareText(b, a) : compareText(a, b)));

  const rows = [];
  names.forEach((name) => {
    const inGroup = groups.get(name).sort((a, b) => compareText(a.displayName, b.displayName));
    rows.push({ type: "group", label: name, count: inGroup.length });
    inGroup.forEach((mic) => rows.push({ type: "mic", mic }));
  });
  return rows;
}

// isoCounts: { US: 48, DE: 30, ... }. Countries absent from it render inert —
// not clickable, not focusable, visibly de-emphasised.
//
// The <svg> is aria-hidden and nothing inside it is focusable on purpose. The
// country chips are the real control: at the widths this renders at, Denmark
// is about 5x3 CSS pixels on a phone and Austria 8x3, well under any usable
// target size, and their centroids sit close enough together that enlarged
// hit areas would overlap and steal each other's clicks. Keyboard users would
// also be tabbing through 160-odd countries with no mics to reach one that
// has them. So the map is a picture that happens to be clickable, and every
// bit of state it shows is reachable from the chips.
function buildWorldMapSvg(isoCounts) {
  const unmapped = Object.keys(isoCounts).filter((iso) => !WORLD_MAP.paths[iso]);
  if (unmapped.length) {
    // A new country in data/mics.js with no COUNTRY_ISO entry (or an ISO code
    // the map lacks) would otherwise just silently never highlight.
    console.warn(`[Micle] World map has no path for: ${unmapped.join(", ")} — add it to COUNTRY_ISO in js/worldmap.js.`);
  }

  const paths = Object.entries(WORLD_MAP.paths)
    .map(([iso, d]) => {
      const count = isoCounts[iso];
      const cls = count ? "mic-map-country mic-map-country--has-mics" : "mic-map-country";
      const country = ISO_COUNTRY[iso];
      const label = count ? ` data-country="${country}"` : "";
      return `<path class="${cls}"${label} d="${d}"/>`;
    })
    .join("");

  return `<svg class="mic-map-svg" viewBox="${WORLD_MAP.viewBox}" aria-hidden="true" focusable="false">${paths}</svg>`;
}

if (typeof module !== "undefined") {
  module.exports = { COUNTRY_ISO, ISO_COUNTRY, buildMicRows, buildWorldMapSvg, compareMics };
}
