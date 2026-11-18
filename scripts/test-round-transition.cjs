const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const source=fs.readFileSync(path.join(__dirname,'../js/game.js'),'utf8'),nodes=new Map();let disposed=0,intros=0;
const node=id=>{if(!nodes.has(id))nodes.set(id,{classList:{add(){},remove(){},toggle(){}}});return nodes.get(id);};
const context={room:{id:'room',stage:0,phase:'playing'},activeRound:'room/0',scheduled:null,played:'room/0',livePeers:new Map,state:{phase:'practical-wait'},missionPanel:{dispose(){disposed++;}},missionPayload:{},$:node,roundKey:r=>r.id+'/'+r.stage,resetInput(){},hideIntro(){},clearTimeout(){},setTimeout(){return 1;},classroom:{now:()=>1000},currentStage:()=>({id:'race'}),loadArena:()=>Promise.resolve(),showIntro(){intros++;},setPhase:phase=>context.state.phase=phase};
vm.runInNewContext(source.slice(source.indexOf('function handleRoom('),source.indexOf('function startTurn('))+'\nhandleRoom({id:"room",stage:1,phase:"playing",joined:true,submitted:false,questionAt:null,startAt:2000,closeAt:90000,players:[]});',context);
assert.equal(context.state.phase,'loading');assert.equal(intros,1);assert.equal(disposed,1);assert.equal(context.scheduled,1);
(async()=>{
 const requests=[],errors=[];let resolveFirst;
 const connect=vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../js/classroom.js'),'utf8')+'\nconnectClassroom',{crypto,AbortSignal,Date,performance,Blob,console:{error(){}},document:{hidden:false,addEventListener(){}},window:{addEventListener(){}},setInterval(){},setTimeout(){},createDirectMotion:()=>({close(){},sync(){},tick(){},covered:()=>[]}),fetch:async(url,options)=>{requests.push(JSON.parse(options.body).action);if(requests.length===1)await new Promise(resolve=>resolveFirst=resolve);return {ok:true,status:200,json:async()=>({id:'room',phase:'lobby',stage:0,joined:false,players:[],now:Date.now()})};}});
 const client=connect(()=>{throw new Error('erro visual simulado');},message=>errors.push(message),()=>{});
 await client.send('next');resolveFirst();for(let i=0;i<8;i++)await new Promise(resolve=>setImmediate(resolve));
 assert.deepEqual(requests,['read','next']);assert.ok(errors.every(message=>message.startsWith('Não foi possível atualizar a tela.')));
 console.log('Troca da fase 1 para a 2 descarta espera antiga; comando durante consulta não se perde; erro visual não é confundido com falha da sala.');
})().catch(error=>{console.error(error);process.exitCode=1;});
