const ARENAS = {
  factory: { title: 'Linfonodo', tint: 0x30204a, fog: 0x61477d, start: 11, end: -11, width: 11, walls: [
    [-6,6.6,7,.935],[6,6.6,7,.935],[0,2.75,8,1.1],[-7,-1.1,6,.99],[7,-1.1,6,.99]
  ] },
  race: { title: 'Circuito vascular', tint: 0x521838, fog: 0x883452, start: 24, end: -93, width: 13, walls: [
    [-4,16,17,1.8],[4,5,17,1.8],[-4,-7,17,1.8],[4,-19,17,1.8],
    [-4,-32,17,1.8],[4,-45,17,1.8],[-4,-58,17,1.8],[-9,-71,7,1.8],[2,-71,9,1.8],[-9,-83,7,1.8],[2,-83,10.5,1.8],[10,-79,4,2]
  ] },
  targets: { title: 'Recife celular', tint: 0x123941, fog: 0x306a70, start: 18, end: -33, width: 13, walls: [
    [-8,10,3,4],[5,6,3,4],[-2,0,4,5],[8,-7,4,3],[-7,-12,4,3],[2,-18,5,3],[-8,-25,3,4]
  ] }
};
const CELL_PODS = [
  [-10,15],[-3,13],[7,15],[10,9],[-10,4],[-5,5],[1,8],[9,0],[-9,-5],[-4,-6],
  [3,-3],[11,-12],[3,-11],[-10,-17],[-3,-16],[7,-18],[-5,-23],[0,-25],[9,-26],[4,-30]
];
const GATES = [
  { x:8.7, z:13.5, phase:0 }, { x:8.7, z:-9.5, phase:1.9 },
  { x:8.7, z:-34.5, phase:3.8 }, { x:8.7, z:-60.5, phase:5.7 },
  { x:-4, z:-78, phase:7.6 }
];
const RACE_CHECKPOINTS = [-15,-49,-68];
function gateX(gate, elapsed) { return gate.x + 2.6 * Math.sin(elapsed * 1.55 + gate.phase); }
function gateWarning(gate, elapsed) {
  const angle = elapsed * 1.55 + gate.phase;
  return Math.abs(Math.cos(angle)) > .7;
}
function reefSector(z) {
  return z > 2 ? 'Membranas' : z > -17 ? 'Fibras' : 'Colônias';
}
function inside(x,z,wall) {
  return Math.abs(x-wall[0]) < wall[2]/2+.42 && Math.abs(z-wall[1]) < wall[3]/2+.42;
}
if (typeof module !== 'undefined') module.exports = { ARENAS, CELL_PODS, GATES, RACE_CHECKPOINTS, reefSector, gateWarning };
