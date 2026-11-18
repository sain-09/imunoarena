const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const {makeMission}=require('../js/missions.js'),config=require('../js/config.js'),engine=require('../netlify/room.cjs');
class Part{constructor(geometry,material){this.geometry=geometry;this.material=material;this.children=[];this.position={set(x,y,z){Object.assign(this,{x,y,z});}};this.rotation={};this.scale={set(){}};}add(p){this.children.push(p);}traverse(fn){fn(this);this.children.forEach(p=>p.traverse(fn));}}
class Material{constructor(properties={}){Object.assign(this,properties);this.color={setHex(){}};}dispose(){}}
class Geometry{dispose(){}setFromPoints(){return this;}}
const THREE={Group:Part,Mesh:Part,Sprite:class extends Part{constructor(mat){super(null,mat);}},Line:Part,TorusGeometry:Geometry,SphereGeometry:Geometry,BufferGeometry:Geometry,MeshBasicMaterial:Material,MeshStandardMaterial:Material,SpriteMaterial:Material,LineBasicMaterial:Material,CanvasTexture:class{dispose(){}},Vector3:class{constructor(x,y,z){Object.assign(this,{x,y,z});}}};
const create=vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../js/world-missions.js'),'utf8')+'\ncreateWorldMission',{THREE,makeMission,document:{createElement:()=>({getContext:()=>({clearRect(){},beginPath(){},roundRect(){},fill(){},fillText(){}})})}});
function run(id){const player={x:0,z:10},scene={add(){},remove(){}},button={classList:{toggle(){}}},minus={classList:{toggle(){}}},plus={classList:{toggle(){}}},model={userData:{}};let time=0,complete=false;const m=create({scene,player,getModel:()=>model,button,minus,plus,status:{},stage:{id},roomId:'test',duration:120,elapsed:()=>time,symbolTexture:()=>({dispose(){}}),onVisual(){},onComplete:()=>{complete=true;}});return {player,button,minus,plus,model,m,set time(t){time=t;},get complete(){return complete;},visit(x,z){Object.assign(player,{x,z});m.update();m.interact();}};}
{
 const t=run('barriers');t.m.interact();assert.equal(t.complete,false);const order=makeMission('barriers','test').initial,xs=[-8.16,-2.72,2.72,8.16];
 for(let card=0;card<4;card++){t.visit(xs[order.indexOf(card)],6.9);t.visit(xs[card],-.42);}
 assert.ok(t.complete);assert.deepEqual(Array.from(t.m.finish().order),[0,1,2,3]);assert.ok(t.model.userData.timelineTargets.length===4);t.m.dispose();
}
{
 const t=run('patrol'),regions=[[-8,0],[0,-9],[8,0]];
 for(let i=0;i<9;i++){t.time=Math.floor(i/3)*8+1;const [x,z]=regions[i%3];t.visit(x+(i%2?1:-1),z+2+Math.floor(i/3)*1.2-.045);}
 assert.ok(t.complete);assert.equal(t.m.finish().intercepts.length,9);t.m.dispose();
}
{
 const t=run('vaccine');for(const [x,z] of [[-4.7,-4.5],[4.7,-4.5],[4.7,4.2],[-4.7,4.2]])t.visit(x,z);
 assert.ok(t.complete);assert.deepEqual(Array.from(t.m.finish().links),[0,1,2,3]);t.m.dispose();
}
{
 const t=run('inflammation');for(const x of [-7.3,0,7.3]){Object.assign(t.player,{x,z:7});t.m.update();t.plus.onclick();t.m.interact();}
 assert.ok(t.complete);assert.deepEqual(Array.from(t.m.finish().values),[30,30,30]);t.m.dispose();
}
{
 const t=run('memory');t.visit(-4.7,7.3);assert.equal(t.complete,false);t.time=5;
 for(let i=0;i<6;i++){t.time=5+i*2;t.visit(i%2?-4.7:4.7,7.3);}
 assert.ok(t.complete);assert.equal(t.m.finish().answers.length,6);t.m.dispose();
}
function reef(delay){let r=engine.empty(),now=1000;const act=(action,v={})=>{r=engine.apply(r,'a',{action,room:r.id,stage:r.stage,present:true,...v},now).room;};act('join',{name:'A'});r.stage=2;act('start');while(now<r.startAt+1000){now+=1000;act('read');}
 assert.throws(()=>act('quiz',{marks:[0]}),{status:409});
 act('quiz',{marks:[0,1,2,3,4,5,6]});const at=r.quizStarts.a.at;
 for(let i=0;i<delay;i++){now+=1000;act('read');}
 act('submit',{answer:config.stages[2].correct,marks:[]});assert.equal(r.phase,'results');assert.ok(at<r.startAt+config.targetSeconds*1000);return r.players[0].results[0].quiz;}
assert.ok(reef(1)>reef(12),'Respostas corretas mais rápidas devem valer mais.');
console.log('Interações por proximidade, transporte e encaixe no mapa, mecanismos, memória, pergunta antecipada e bônus por rapidez verificados.');

{
 let r=engine.empty(),now=1000;const act=(id,action,v={})=>{r=engine.apply(r,id,{action,room:r.id,stage:r.stage,present:true,...v},now).room;};
 act('a','join',{name:'A'});act('b','join',{name:'B'});r.stage=2;act('a','start');
 while(now<r.startAt+1000){now+=Math.min(4000,r.startAt+1000-now);act('a','read');act('b','read');}
 const marks=[...require('../js/targets.js').makeTargetPuzzle(r.id).infected];
 act('a','quiz',{marks});assert.equal(r.questionAt,null);assert.throws(()=>act('a','submit',{answer:'C'}),{status:409});
 now+=2000;act('b','quiz',{marks});assert.equal(r.questionAt,now);assert.equal(engine.snapshot(r,'a').practicalReady,2);
 act('a','submit',{answer:'C'});now+=2000;act('b','submit',{answer:'C'});
 assert.equal(r.phase,'results');assert.ok(r.players[0].results[0].quiz>r.players[1].results[0].quiz);assert.ok(r.players[0].results[0].practical>r.players[1].results[0].practical);
 console.log('Pergunta liberada assim que todos terminam, prazo compartilhado e bônus individual da prática verificados.');
}
