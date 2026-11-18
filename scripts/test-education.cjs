const assert=require('node:assert/strict'),c=require('../js/config.js'),{makeTargetPuzzle}=require('../js/targets.js');
assert.ok(c.introSeconds>=25);assert.ok(c.quizSeconds>=30);
for(const stage of c.stages){assert.ok(stage.context.length>60);assert.ok(stage.goal.length>30);}
for(let i=0;i<100;i++){
 const puzzle=makeTargetPuzzle('lesson-'+i);assert.equal(puzzle.infected.size,7);assert.ok(puzzle.marker.startsWith('fragmento viral'));
 puzzle.cells.forEach((symbol,index)=>{assert.equal(puzzle.infected.has(index),symbol===puzzle.marker);assert.ok(symbol===puzzle.marker||['proteína própria','membrana saudável','oxigênio'].includes(symbol));});
}
console.log('Contexto das oito provas, tempo de leitura e sete alvos virais semanticamente identificados verificados.');
