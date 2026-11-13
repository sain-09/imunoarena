'use strict';

function rankRace(results, prizes) {
  const finishers = results.filter(result => result.raceMs !== null)
    .sort((a, b) => a.raceMs - b.raceMs);
  finishers.forEach(result => {
    const place = finishers.findIndex(other => other.raceMs === result.raceMs) + 1;
    result.place = place;
    result.practical = prizes[Math.min(place, prizes.length) - 1];
  });
}

function scoreTargets(selected, infected, maxPoints) {
  let hits = 0;
  let falseMarks = 0;
  for (const target of selected) {
    if (infected.has(target)) hits++;
    else falseMarks++;
  }
  return Math.round(maxPoints * Math.max(0, hits - falseMarks) / infected.size);
}

if (typeof module !== 'undefined') module.exports = { rankRace, scoreTargets };

