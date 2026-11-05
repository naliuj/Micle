// Pure comparison functions — no DOM, no state. Easy to hand-test in a console.
// Also home to the few helpers both pages need (the game and Study Mode),
// since this is the one file both load before their own scripts.

// The daily/random/quiz pool. scripts/build-schedule.mjs's loadMicIds() applies
// the same rule and must stay in step with it (a node script can't load this).
function eligibleMics() {
  return MIC_DB.filter((m) => m.needsVerification !== true && m.retired !== true);
}

const PRINCIPLE_ABBR = {
  "Condenser (Large-Diaphragm)": "Condenser (LDC)",
  "Condenser (Small-Diaphragm)": "Condenser (SDC)",
};

function formatPrice(mic) {
  return mic.msrp == null ? "Unknown" : `$${mic.msrp.toLocaleString("en-US")}`;
}

// crypto.getRandomValues draws fresh OS entropy on every call, so two devices'
// picks can't correlate. Math.random() only if Web Crypto is missing.
function randomInt(n) {
  if (n <= 0) return 0;
  if (window.crypto && window.crypto.getRandomValues) {
    // Rejection sampling: without it, `raw % n` is biased toward the low end
    // whenever n doesn't evenly divide 2^32.
    const range = Math.floor(0x100000000 / n) * n;
    const buf = new Uint32Array(1);
    let raw;
    do {
      window.crypto.getRandomValues(buf);
      raw = buf[0];
    } while (raw >= range);
    return raw % n;
  }
  return Math.floor(Math.random() * n);
}

function comparePatterns(guessPatterns, targetPatterns) {
  const setA = new Set(guessPatterns);
  const setB = new Set(targetPatterns);
  const sameSize = setA.size === setB.size;
  const isSubsetOfB = [...setA].every((p) => setB.has(p));
  if (sameSize && isSubsetOfB) return "match";
  const overlaps = [...setA].some((p) => setB.has(p));
  return overlaps ? "partial" : "no-match";
}

function compareYear(guessYear, targetYear) {
  if (guessYear === targetYear) return { state: "match" };
  return { state: guessYear < targetYear ? "higher" : "lower" };
}

// Same hi/lo shape as compareYear, but tolerant of an unknown MSRP on either
// side (msrpUnknown mics are quarantined from the daily schedule — see
// data/mics.js — but a player can still *guess* one, so this has to degrade
// gracefully rather than throw).
function compareMsrp(guessMsrp, targetMsrp) {
  if (guessMsrp == null || targetMsrp == null) return { state: "unknown" };
  if (guessMsrp === targetMsrp) return { state: "match" };
  return { state: guessMsrp < targetMsrp ? "higher" : "lower" };
}

function compareGuess(guess, target) {
  return {
    country: guess.countryOfOrigin === target.countryOfOrigin ? "match" : "no-match",
    principle: guess.operatingPrinciple === target.operatingPrinciple ? "match" : "no-match",
    pattern: comparePatterns(guess.polarPatterns, target.polarPatterns),
    manufacturer: guess.manufacturer === target.manufacturer ? "match" : "no-match",
    year: compareYear(guess.releaseYear, target.releaseYear),
    price: compareMsrp(guess.msrp, target.msrp),
  };
}

function isWinningGuess(guess, target) {
  return guess.id === target.id;
}
