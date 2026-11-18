const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),crypto=require('node:crypto');
const engine=require('../netlify/room.cjs');
function game(){let room=engine.empty(),now=1000;return {get room(){return room;},get now(){return now;},advance(ms){now+=ms;},act(id,action,values={}){room=engine.apply(room,id,{room:room.id,stage:room.stage,action,present:true,...values},now).room;return engine.snapshot(room,id);}};}
{
 const g=game();g.act('a','join',{name:'Ana'});g.act('b','join',{name:'Bia'});g.act('a','start');g.advance(5000);g.act('a','submit',{answer:'B',selectedAt:10});
 assert.equal(g.room.phase,'playing');
 for(let i=0;i<3;i++){g.advance(5000);g.act('a','read');}
 assert.equal(g.room.phase,'results','A sala deve parar de esperar pelo jogador que sumiu.');
 assert.deepEqual(engine.snapshot(g.room,'a').players.map(p=>p.name),['Ana']);assert.equal(engine.snapshot(g.room,'a').received,1);
 const previous=g.room.id;g.act('a','reset');assert.notEqual(g.room.id,previous);assert.equal(g.room.stage,0);assert.equal(g.room.phase,'lobby');assert.deepEqual(g.room.players[0].results,[]);
 g.act('a','leave');assert.equal(g.room.players.length,0);assert.equal(g.room.stage,0);
}
{
 const g=game();g.act('a','join',{name:'Ana'});g.act('b','join',{name:'Bia'});g.act('c','join',{name:'Caio'});g.act('a','start');
 const original=g.room.id;
 for(let i=0;i<4;i++){g.advance(4000);g.act('b','read');g.act('c','read');}
 assert.equal(g.room.id,original);assert.equal(g.room.host,'b');assert.equal(g.room.phase,'playing');
 assert.deepEqual(engine.snapshot(g.room,'b').players.map(p=>p.key),[1,2],'As chaves WebRTC não podem mudar após uma saída.');
 assert.equal(g.act('new-page','read').joined,false);assert.equal(g.room.id,original,'Abrir outro link não deve reiniciar os colegas.');
 assert.equal(g.act('new-page','join',{name:'Novo'}).joined,false,'Entradas no meio da partida ficam no lobby local.');
}
{
 const g=game();g.act('a','join',{name:'Ana'});g.act('b','join',{name:'Bia'});
 const previous=engine.snapshot(g.room,'b').players.find(p=>p.name==='Bia').connection;
 g.act('b','leave');g.act('c','join',{name:'Caio'});
 const c=engine.snapshot(g.room,'c').players.find(p=>p.me);assert.equal(c.key,1);assert.notEqual(c.connection,previous);assert.equal(g.room.players.length,2);
 g.act('a','start');g.act('a','leave');assert.equal(g.room.host,'c');assert.equal(g.room.phase,'playing');
 g.act('c','leave');const snap=g.act('visitor','read');assert.equal(snap.stage,0);assert.equal(snap.phase,'lobby');assert.equal(snap.players.length,0);
}
{
 const legacy={...engine.empty(),phase:'playing',stage:6,players:[{id:'abandoned',name:'Antigo',results:[]}]};
 const {room}=engine.apply(legacy,'new-page',{action:'read'},Date.now());assert.equal(room.stage,0);assert.equal(room.phase,'lobby');assert.equal(room.players.length,0);
}
{
 const g=game();g.act('a','join',{name:'Ana'});g.act('a','start');g.advance(engine.presenceTimeoutMs+1);const snap=g.act('a','read');assert.equal(snap.joined,false);assert.equal(snap.stage,0);
}

{
 const config=require('../js/config.js'),g=game();g.act('a','join',{name:'Ana'});g.act('b','join',{name:'Bia'});g.act('a','start');
 for(let stage=0;stage<config.stages.length;stage++){
  const item=config.stages[stage],activity=item.seconds||(item.id==='targets'?config.targetSeconds:0);
  const target=g.room.startAt+activity*1000+(item.id==='race'?5000:1000);
  while(g.now<target){g.advance(Math.min(4000,target-g.now));g.act('a','read');g.act('b','read');}
  for(const id of ['a','b'])g.act(id,'submit',{answer:item.correct,selectedAt:10,raceMs:4000,marks:[],mission:{}});
  assert.equal(g.room.phase,'results');assert.ok(g.room.players.every(p=>p.results.length===stage+1));
  if(stage<config.stages.length-1)g.act('a','next');
 }
 const previous=g.room.id;g.act('a','reset');assert.notEqual(g.room.id,previous);assert.equal(g.room.stage,0);assert.ok(g.room.players.every(p=>p.results.length===0));assert.equal(engine.snapshot(g.room,'b').joined,true);
}

async function clientTest(){
 const g=game(),source=fs.readFileSync(path.join(__dirname,'../js/classroom.js'),'utf8'),requests=[],beacons=[];
 const document={hidden:false,listeners:{},addEventListener(type,fn){this.listeners[type]=fn;}};
 const window={listeners:{},addEventListener(type,fn){this.listeners[type]=fn;}};
 const intervals=[],updates=[];let closeCount=0;
 async function handle(body){requests.push(body);const data=g.act(body.id,body.action,{...body,room:body.room});data.now=g.now;return {ok:true,json:async()=>data};}
 const create=vm.runInNewContext(source+'\nconnectClassroom',{
  crypto,AbortSignal,Blob,Date:{now:()=>g.now},performance:{now:()=>g.now},document,window,
  localStorage:{getItem(){throw new Error('Não reutilizar identidade persistente.');}},
  createDirectMotion:()=>({tick(){},sync(){},close(){closeCount++;},covered:()=>[],send:()=>({seq:1,epoch:1})}),
  navigator:{sendBeacon(url,blob){beacons.push(blob.text().then(text=>handle(JSON.parse(text))));return true;}},
  fetch:async(url,options)=>handle(JSON.parse(options.body)),setInterval(fn,ms){intervals.push({fn,ms});},setTimeout(){}
 });
 const client=create(snapshot=>updates.push(snapshot),message=>{throw new Error(message);},()=>{});
 const settle=async()=>{for(let i=0;i<6;i++)await new Promise(resolve=>setImmediate(resolve));};await settle();
 assert.equal(g.room.players.length,0,'Só abrir a página não inclui um jogador.');assert.equal(updates.at(-1).joined,false);
 await client.send('join',{name:'Ana'});assert.equal(updates.at(-1).joined,true);await client.send('start');
 const id=requests[0].id;assert.equal(requests.find(r=>r.action==='read').present,false);
 document.hidden=true;const before=requests.length;intervals.find(i=>i.ms===1800).fn();await settle();assert.equal(requests.length,before,'Aba oculta não confirma presença.');
 document.hidden=false;g.advance(5000);document.listeners.visibilitychange();await settle();assert.ok(requests.at(-1).present);
 window.listeners.pagehide();await Promise.all(beacons);assert.equal(updates.at(-1).joined,false);assert.equal(g.room.phase,'lobby');assert.equal(g.room.stage,0);assert.ok(closeCount>0);
 window.listeners.pageshow();await settle();assert.equal(updates.at(-1).joined,false);
 // A new invocation creates another page identity and never restores the old player.
 const another=create(snapshot=>updates.push(snapshot),message=>{throw new Error(message);},()=>{});await settle();assert.notEqual(requests.at(-1).id,id);assert.equal(updates.at(-1).joined,false);
}
function localLobbyTest(){
 const source=fs.readFileSync(path.join(__dirname,'../js/game.js'),'utf8');
 const fn=source.slice(source.indexOf('function handleRoom('),source.indexOf('function startTurn('));
 const nodes=new Map,views=[];const node=id=>{if(!nodes.has(id))nodes.set(id,{classList:{toggle(){},add(){},remove(){}}});return nodes.get(id);};
 const context={room:null,activeRound:null,scheduled:null,played:null,livePeers:new Map,missionPanel:null,missionPayload:null,state:{stageIndex:7},player:{},mapReady:true,START_POS:{x:0,z:11},roundKey:r=>r.id+'/'+r.stage,clearTimeout(){},$:node,resetInput(){},setPhase(){},hideIntro(){},showMap:id=>views.push(id),refreshSelection(){},showStandings(){throw new Error('Visitante não pode pular para a fase antiga.');}};
 vm.runInNewContext(fn+'\nhandleRoom({id:"active",phase:"playing",stage:6,joined:false,players:[]});',context);
 assert.equal(context.state.stageIndex,0);assert.equal(views.at(-1),'factory');assert.equal(node('startBtn').disabled,true);
 vm.runInNewContext('handleRoom({id:"active",phase:"results",stage:5,joined:false,players:[]});',context);assert.equal(context.state.stageIndex,0);
}
(async()=>{await clientTest();localLobbyTest();console.log('Presença, expiração, saída, anfitrião substituto, chaves estáveis, sessões antigas e entrada sempre pelo início verificados.');})().catch(error=>{console.error(error);process.exitCode=1;});
