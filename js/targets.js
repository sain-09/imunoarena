'use strict';

function makeTargetPuzzle(roomId) {
  const symbols = ['◆','◇','▲','△','▶','▷','●','○','✚','✖'];
  let seed = 2166136261;
  for (const letter of roomId) seed = Math.imul(seed ^ letter.charCodeAt(0), 16777619);
  function random(max) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return Math.floor(seed / 4294967296 * max);
  }
  const marker = symbols[random(symbols.length)];
  const distractors = symbols.filter(symbol => symbol !== marker);
  const cells = Array.from({length: 20}, (_, i) => i < 7 ? marker : distractors[random(distractors.length)]);
  for (let i = cells.length - 1; i > 0; i--) {
    const j = random(i + 1);
    [cells[i], cells[j]] = [cells[j], cells[i]];
  }
  const infected = new Set();
  cells.forEach((symbol,i) => { if (symbol === marker) infected.add(i); });
  return { marker, cells, infected };
}

if (typeof module !== 'undefined') module.exports = { makeTargetPuzzle };
