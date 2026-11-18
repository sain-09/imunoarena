'use strict';

function createDirectMotion(id, receive) {
  const links=new Map(), latest=new Map(), dirty=new Set();
  let room, self=-1, hub=-1, star=false, generation=0, polling=false, nextPoll=0;
  let sequence=0, lastLocal=null, lastSend=0, configured=false, configurationAt=0;
  const epoch=Date.now()>>>0;
  let iceServers=[{urls:['stun:stun.l.google.com:19302','stun:stun.cloudflare.com:3478']}];
  const clock=()=>performance.now();
  const roomHash=value=>{let h=2166136261;for(const c of value)h=Math.imul(h^c.charCodeAt(0),16777619);return h>>>0;};
  const wanted=()=>room.players.filter(p=>p.key!==self && (!star || self===hub || p.key===hub));
  const current=link=>links.get(link.key)===link && link.roomId===room?.id;
  async function signal(roomId,payload,configure=false) {
    const response=await fetch('/.netlify/functions/sinal',{
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({id,room:roomId,signal:payload,configure}),signal:AbortSignal.timeout(4000)
    });
    if(!response.ok)throw new Error('Sinalização indisponível');
    return response.json();
  }
  function drop(key) {const link=links.get(key);if(link){links.delete(key);link.pc.close();}}
  function reset() {
    generation++;for(const key of links.keys())drop(key);
    latest.clear();dirty.clear();lastLocal=null;polling=false;nextPoll=0;configured=false;
  }
  function sync(snapshot) {
    const key=snapshot.players.find(p=>p.me)?.key??-1;
    const nextStar=snapshot.players.length>8;
    const nextHub=Math.min(...snapshot.players.map(p=>p.key));
    if(room?.id!==snapshot.id || key!==self || nextStar!==star || nextHub!==hub)reset();
    if(room && room.stage!==snapshot.stage){latest.clear();dirty.clear();lastLocal=null;}
    room=snapshot;self=key;star=nextStar;hub=nextHub;
    const keys=new Set(wanted().map(p=>p.key));
    for(const key of links.keys())if(!keys.has(key))drop(key);
  }
  function encode(samples) {
    const buffer=new ArrayBuffer(8+24*samples.length),v=new DataView(buffer);
    v.setUint16(0,0x4941);v.setUint8(2,2);v.setUint8(3,room.stage);v.setUint32(4,roomHash(room.id));
    samples.forEach((p,i)=>{
      const o=8+i*24;
      v.setUint8(o,p.key);v.setUint8(o+1,p.char==='female'?1:0);
      v.setUint16(o+2,Math.min(65535,Math.max(0,clock()-p.received+(p.ageMs||0))));
      v.setUint32(o+4,p.seq);v.setUint32(o+8,p.epoch);
      [p.x,p.z,Math.atan2(Math.sin(p.facing),Math.cos(p.facing)),p.vx,p.vz].forEach((n,j)=>v.setInt16(o+12+j*2,Math.round(n*(j===2?1000:100))));
    });
    return buffer;
  }
  function accept(link,data) {
    if(!current(link) || !(data instanceof ArrayBuffer) || data.byteLength<32 || (data.byteLength-8)%24 || data.byteLength>968)return;
    const v=new DataView(data);
    if(v.getUint16(0)!==0x4941 || v.getUint8(2)!==2 || v.getUint8(3)!==room.stage || v.getUint32(4)!==roomHash(room.id))return;
    for(let o=8;o<data.byteLength;o+=24) {
      const key=v.getUint8(o),ageMs=v.getUint16(o+2),seq=v.getUint32(o+4),session=v.getUint32(o+8);
      if(key===self || (star && self!==hub ? link.key!==hub : key!==link.key) || ageMs>1000)continue;
      const player=room.players.find(p=>p.key===key);if(!player)continue;
      const previous=latest.get(key);
      if(previous && (session===previous.epoch ? seq<=previous.seq : ((session-previous.epoch)>>>0)>0x7fffffff))continue;
      const p={key,seq,epoch:session,ageMs,x:v.getInt16(o+12)/100,z:v.getInt16(o+14)/100,facing:v.getInt16(o+16)/1000,vx:v.getInt16(o+18)/100,vz:v.getInt16(o+20)/100,char:v.getUint8(o+1)?'female':'male',received:clock()};
      if(Math.abs(p.x)>14 || p.z < -95 || p.z>27 || Math.hypot(p.vx,p.vz)>15)continue;
      latest.set(key,p);if(star && self===hub)dirty.add(key);
      receive({...p,round:room.id+'/'+room.stage,name:player.name});
    }
  }
  function configure(link,channel) {
    link.channel=channel;channel.binaryType='arraybuffer';
    channel.onmessage=event=>accept(link,event.data);
    channel.onopen=()=>{if(current(link))lastLocal=null;};
    channel.onclose=()=>{if(current(link))link.failedAt=clock();};
  }
  function makeLink(key) {
    const pc=new RTCPeerConnection({iceServers});
    const link={pc,key,roomId:room.id,created:clock(),offerId:crypto.randomUUID(),candidates:[],iceSeen:new Set()};links.set(key,link);
    pc.onicecandidate=event=>{
      if(event.candidate){link.candidates.push(event.candidate.toJSON());flushIce(link);}
    };
    pc.ondatachannel=event=>configure(link,event.channel);
    pc.onconnectionstatechange=()=>{
      if(!current(link))return;
      if(['failed','disconnected','closed'].includes(pc.connectionState))link.failedAt??=clock();
      else link.failedAt=null;
    };
    return link;
  }
  function flushIce(link) {
    if(!current(link) || !link.published || !link.candidates.length || link.iceBusy || link.iceSent===link.candidates.length)return;
    const count=link.candidates.length;
    link.iceBusy=true;
    signal(link.roomId,{to:link.key,type:'ice',offerId:link.offerId,candidates:link.candidates.slice()})
      .then(()=>{link.iceSent=count;}).catch(()=>{}).finally(()=>{
        link.iceBusy=false;
        if(link.iceSent===count && count<link.candidates.length)flushIce(link);
      });
  }
  async function publish(link,description) {
    await link.pc.setLocalDescription(description);
    if(!current(link) || !link.pc.localDescription)return;
    await signal(link.roomId,{to:link.key,type:link.pc.localDescription.type,sdp:link.pc.localDescription.sdp,offerId:link.offerId});
    link.published=true;flushIce(link);
  }
  async function negotiate(token) {
    const snapshot=room;
    const data=await signal(snapshot.id,undefined,!configured || clock()-configurationAt>1800000);
    if(token!==generation)return;
    if(Array.isArray(data.iceServers) && data.iceServers.length){iceServers=data.iceServers;configurationAt=clock();}
    configured=true;
    // Read answers before starting more offers, avoiding one slow peer blocking the whole room.
    await Promise.all((data.signals||[]).map(async message=>{
      if(!wanted().some(p=>p.key===message.from))return;
      let link=links.get(message.from);
      try {
        if(message.type==='offer' && message.from<self && link?.offerId!==message.offerId) {
          drop(message.from);link=makeLink(message.from);link.offerId=message.offerId;
          await link.pc.setRemoteDescription({type:'offer',sdp:message.sdp});
          link.remoteSdp=message.sdp;
          if(token!==generation || !current(link))return;
          await publish(link,await link.pc.createAnswer());
        }else if(message.type==='answer' && message.from>self && link && !link.remoteSdp && link.offerId===message.offerId) {
          await link.pc.setRemoteDescription({type:'answer',sdp:message.sdp});link.remoteSdp=message.sdp;
        }
        if(link && current(link) && link.remoteSdp && link.offerId===message.offerId) {
          for(const candidate of message.candidates||[]) {
            const key=JSON.stringify(candidate);
            if(link.iceSeen.has(key))continue;
            await link.pc.addIceCandidate(candidate);link.iceSeen.add(key);
          }
        }
      }catch{if(link && current(link))drop(link.key);}
    }));
    if(token!==generation)return;
    await Promise.all(wanted().filter(p=>p.key>self && !links.has(p.key)).map(async p=>{
      const link=makeLink(p.key);
      try {
        configure(link,link.pc.createDataChannel('movimento-v2',{ordered:false,maxRetransmits:0}));
        await publish(link,await link.pc.createOffer());
      }catch{if(current(link))drop(link.key);}
    }));
  }
  function tick() {
    if(!globalThis.RTCPeerConnection || !room?.joined || self<0 || room.players.length<2 || document.hidden || polling || clock()<nextPoll)return;
    for(const [key,link] of links) {
      flushIce(link);
      if((link.failedAt!=null && clock()-link.failedAt>2000) ||
         (key>self && link.channel?.readyState!=='open' && clock()-link.created>10000))drop(key);
    }
    if(wanted().every(p=>links.get(p.key)?.channel?.readyState==='open'))return;
    polling=true;const token=generation;
    negotiate(token).catch(()=>{}).finally(()=>{if(token===generation){polling=false;nextPoll=clock()+450;}});
  }
  function send(position) {
    if(!room || position.round!==room.id+'/'+room.stage)return null;
    const now=clock();
    const signature=[position.x,position.z,position.facing,position.vx,position.vz].map(n=>Math.round(n*100)).join('/')+'/'+position.char;
    if(signature!==lastLocal || now-lastSend>=250) {
      lastLocal=signature;lastSend=now;
      latest.set(self,{...position,key:self,seq:++sequence,epoch,received:now,ageMs:0});dirty.add(self);
    }
    const samples=[...dirty].map(key=>latest.get(key)).filter(p=>p && now-p.received<1000);
    if(samples.length)for(const link of links.values()) {
      if(link.channel?.readyState!=='open' || link.channel.bufferedAmount>1024)continue;
      const batch=samples.filter(p=>p.key!==link.key && (!star || self===hub || p.key===self));
      if(batch.length)try{link.channel.send(encode(batch));}catch{/* The HTTP fallback remains active. */}
    }
    dirty.clear();return {seq:sequence,epoch};
  }
  function covered() {
    return (room?.players||[]).filter(p=>{
      const link=links.get(star && self!==hub?hub:p.key);
      return p.key!==self && link?.channel?.readyState==='open' && link.failedAt==null && latest.has(p.key) && clock()-latest.get(p.key).received<900;
    }).map(p=>p.key);
  }
  return {sync,tick,send,covered};
}
