const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const source=fs.readFileSync(require('node:path').join(__dirname,'../js/direct-motion.js'),'utf8');
const settle=async()=>{for(let i=0;i<25;i++)await new Promise(resolve=>setImmediate(resolve));};
async function simulation(count){
 let now=0,number=0;const pcs=new Map,signals=new Map,ice=new Map,queue=[],received=Array.from({length:count},()=>[]),clients=[];
 class Peer {
  constructor(){this.id=++number;pcs.set(this.id,this);this.iceGatheringState='complete';this.connectionState='new';}
  createDataChannel(name,options){assert.equal(options.ordered,false);assert.equal(options.maxRetransmits,0);return this.channel={readyState:'connecting',bufferedAmount:0,send:data=>{this.channel.lastSent=data.slice(0);assert.ok(data instanceof ArrayBuffer);assert.ok(data.byteLength<=968);queue.push({channel:this.channel.partner,data:data.slice(0),at:now+20});}};}
  async createOffer(){return {type:'offer',sdp:String(this.id)};}
  async createAnswer(){return {type:'answer',sdp:String(this.id)};}
  async setLocalDescription(data){this.localDescription=data;this.onicecandidate?.({candidate:{toJSON:()=>({candidate:'candidate:'+this.id,sdpMid:'0',sdpMLineIndex:0})}});}
  async addIceCandidate(candidate){this.addedIce??=[];this.addedIce.push(candidate);}
  async setRemoteDescription(data){
   if(data.type==='offer'){
    this.remote=pcs.get(Number(data.sdp));
    const sender=this.remote.channel;
    const channel={readyState:'connecting',bufferedAmount:0,send:bytes=>{channel.lastSent=bytes.slice(0);queue.push({channel:sender,data:bytes.slice(0),at:now+20});}};
    channel.partner=sender;sender.partner=channel;this.channel=channel;this.ondatachannel({channel});
   }else{
    this.remote=pcs.get(Number(data.sdp));
    for(const pc of [this,this.remote]){pc.connectionState='connected';pc.channel.readyState='open';pc.channel.onopen?.();}
   }
  }
  close(){this.connectionState='closed';if(this.channel){this.channel.readyState='closed';this.channel.onclose?.();if(this.channel.partner){this.channel.partner.readyState='closed';this.channel.partner.onclose?.();}}this.onconnectionstatechange?.();}
 }
 function snapshot(key,stage=0,id='room'){return {id,stage,joined:true,players:Array.from({length:count},(_,i)=>({key:i,name:'Aluno '+i,me:i===key}))};}
 for(let i=0;i<count;i++){
  const context={ArrayBuffer,DataView,RTCPeerConnection:Peer,crypto,AbortSignal,document:{hidden:false},performance:{now:()=>now},setTimeout,clearTimeout,
   fetch:async(url,options)=>{const body=JSON.parse(options.body),key=Number(body.id);if(body.signal)(body.signal.type==='ice'?ice:signals).set(key+'/'+body.signal.to,{from:key,...body.signal});return {ok:true,json:async()=>({signals:[...signals.values()].filter(s=>s.to===key).map(s=>({...s,candidates:ice.get(s.from+'/'+key)?.offerId===s.offerId?ice.get(s.from+'/'+key).candidates:[]})),iceServers:[{urls:'stun:test'}]})};}};
  clients.push(vm.runInNewContext(source+'\ncreateDirectMotion',context)(String(i),p=>received[i].push(p)));
  clients[i].sync(snapshot(i));
 }
 for(let j=0;j<4;j++){clients.forEach(c=>c.tick());await settle();now+=500;}
 assert.equal(pcs.size,count<=8?count*(count-1):2*(count-1));
 const frame=(stage,n=0)=>{
  clients.forEach((c,i)=>c.send({round:'room/'+stage,x:i%10,z:10-n*.01,facing:1,vx:0,vz:-1,char:i%2?'female':'male'}));
  now+=50;
  for(let i=queue.length-1;i>=0;i--)if(queue[i].at<=now){const item=queue.splice(i,1)[0];if(item.channel?.readyState==='open')item.channel.onmessage({data:item.data});}
 };
 for(let stage=0;stage<8;stage++){
  clients.forEach((c,i)=>c.sync(snapshot(i,stage)));
  received.forEach(a=>a.length=0);
  for(let n=0;n<8;n++)frame(stage,n);
  received.forEach((events,i)=>{
   assert.equal(new Set(events.map(p=>p.key)).size,count-1,'Visibilidade completa na fase '+stage+' do aluno '+i);
   assert.ok(events.every(p=>p.round==='room/'+stage));
   assert.equal(clients[i].covered().length,count-1);
  });
 }
 // Reordered and delayed packets may not overwrite newer samples.
 const link=[...pcs.values()].find(pc=>pc.channel?.readyState==='open');
 const directData=link.channel.partner.lastSent;
 assert.ok(directData,'O teste precisa de um pacote real já recebido.');
 const before=received.reduce((n,a)=>n+a.length,0);
 link.channel.onmessage({data:directData});link.channel.onmessage({data:directData});
 assert.equal(received.reduce((n,a)=>n+a.length,0),before,'Duplicatas não podem reaparecer.');
 const stale=directData.slice(0);new DataView(stale).setUint8(3,6);
 link.channel.onmessage({data:stale});
 assert.equal(received.reduce((n,a)=>n+a.length,0),before,'Pacote da fase anterior precisa ser descartado.');
 const root=[...pcs.values()].find(pc=>pc.localDescription?.type==='offer');
 root.connectionState='failed';root.onconnectionstatechange();now+=2500;
 for(let j=0;j<4;j++){clients.forEach(c=>c.tick());await settle();now+=500;}
 for(let n=0;n<8;n++)frame(7,n);
 assert.equal(clients.at(-1).covered().length,count-1);
 console.log(count+' jogadores: oito fases, transmissão binária, duplicatas e reconexão verificados.');
}
const game=fs.readFileSync(require('node:path').join(__dirname,'../js/game.js'),'utf8');
const begin=game.indexOf('const classroom = connectClassroom(');
const end=game.indexOf("$('startBtn').addEventListener",begin);
let merge;const livePeers=new Map();
vm.runInNewContext(game.slice(begin,end),{livePeers,activeRound:'room/0',performance:{now:()=>1000},handleRoom(){},connectClassroom(update,error,receive){merge=receive;}});
merge([{key:1,seq:10,epoch:100,x:5,direct:true,at:0}],0,'room/0');
merge([{key:1,seq:9,epoch:100,x:1,at:0},{key:2,seq:2,epoch:100,x:2,at:0}],0,'room/0');
assert.equal(livePeers.get(1).x,5);assert.ok(livePeers.has(2));
merge([{key:1,seq:11,epoch:100,x:6,direct:true,at:0}],0,'room/0');assert.equal(livePeers.get(1).x,6);
merge([{key:1,seq:999,epoch:99,x:0,direct:true,at:0}],0,'room/0');assert.equal(livePeers.get(1).x,6);
console.log('Atualização HTTP atrasada não substitui movimento novo; reinícios antigos são descartados.');
(async()=>{await simulation(2);await simulation(8);await simulation(40);})().catch(error=>{console.error(error);process.exitCode=1;});
