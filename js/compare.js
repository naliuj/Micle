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

function compareGuess(guess, target) {
  return {
    country: guess.countryOfOrigin === target.countryOfOrigin ? "match" : "no-match",
    principle: guess.operatingPrinciple === target.operatingPrinciple ? "match" : "no-match",
    pattern: comparePatterns(guess.polarPatterns, target.polarPatterns),
    manufacturer: guess.manufacturer === target.manufacturer ? "match" : "no-match",
    year: compareYear(guess.releaseYear, target.releaseYear),
  };
}

function isWinningGuess(guess, target) {
  return guess.id === target.id;
}
