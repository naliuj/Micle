// Pure comparison functions — no DOM, no state. Easy to hand-test in a console.

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
