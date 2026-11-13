'use strict';

function createDirectMotion(id, receive) {
  const links = new Map();
  let room;
  let self = -1;
  let sequence = 0;
  let polling = false;
  let nextPoll = 0;

  async function signal(roomId, payload) {
    const response = await fetch('/.netlify/functions/sinal', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body:JSON.stringify({id,room:roomId,signal:payload}),
      signal:AbortSignal.timeout(3500)
    });
    if (!response.ok) throw new Error('Sinalização indisponível');
    return response.json();
  }

  function reset() {
    for (const link of links.values()) link.pc.close();
    links.clear();
  }

  function sync(snapshot) {
    const key = snapshot.players.find(player => player.me)?.key ?? -1;
    if (room?.id !== snapshot.id || key !== self || snapshot.players.length > 16) reset();
    room = snapshot;
    self = key;
  }

  function makeLink(key) {
    const pc = new RTCPeerConnection({iceServers:[{urls:'stun:stun.l.google.com:19302'}]});
    const link = {pc,key,roomId:room.id,created:performance.now(),offerId:crypto.randomUUID(),lastSeq:-1};
    links.set(key,link);
    pc.ondatachannel = event => configure(link,event.channel);
    return link;
  }

  function configure(link, channel) {
    link.channel = channel;
    channel.onmessage = event => {
      if (links.get(link.key) !== link) return;
      let packet;
      try { packet = JSON.parse(event.data); } catch { return; }
      if (!packet || packet.round !== room.id+'/'+room.stage ||
          !Number.isSafeInteger(packet.seq) || packet.seq <= link.lastSeq ||
          ![packet.x,packet.z,packet.facing,packet.vx,packet.vz].every(Number.isFinite) ||
          Math.abs(packet.x)>14 || packet.z < -95 || packet.z > 27 ||
          Math.abs(packet.facing)>100 || Math.hypot(packet.vx,packet.vz)>15) return;
      const player = room.players.find(entry => entry.key === link.key);
      if (!player) return;
      link.lastSeq = packet.seq;
      receive({...packet,key:player.key,name:player.name,char:packet.char === 'female' ? 'female' : 'male'});
    };
  }

  async function publish(link, description) {
    const pc = link.pc;
    await pc.setLocalDescription(description);
    if (pc.iceGatheringState !== 'complete') await new Promise(resolve => {
      const check = () => { if (pc.iceGatheringState === 'complete') finish(); };
      const timer = setTimeout(finish,2200);
      function finish() { clearTimeout(timer); pc.removeEventListener('icegatheringstatechange',check); resolve(); }
      pc.addEventListener('icegatheringstatechange',check);
    });
    if (links.get(link.key) !== link || !pc.localDescription) return;
    await signal(link.roomId,{to:link.key,type:pc.localDescription.type,sdp:pc.localDescription.sdp,offerId:link.offerId});
  }

  async function negotiate(snapshot) {
    await Promise.all(snapshot.players.filter(p => p.key > self && !links.has(p.key)).map(async p => {
      const link = makeLink(p.key);
      try {
        configure(link,link.pc.createDataChannel('movimento',{ordered:false,maxRetransmits:0}));
        await publish(link,await link.pc.createOffer());
      } catch { link.pc.close(); if (links.get(p.key) === link) links.delete(p.key); }
    }));
    if (room?.id !== snapshot.id) return;
    const {signals} = await signal(snapshot.id);
    if (room?.id !== snapshot.id) return;
    await Promise.all(signals.map(async message => {
      let link = links.get(message.from);
      try {
        if (message.type === 'offer' && message.from < self && link?.remoteSdp !== message.sdp) {
          link?.pc.close();
          link = makeLink(message.from);
          link.offerId = message.offerId;
          await link.pc.setRemoteDescription({type:'offer',sdp:message.sdp});
          link.remoteSdp = message.sdp;
          await publish(link,await link.pc.createAnswer());
        } else if (message.type === 'answer' && message.from > self && link && !link.remoteSdp && link.offerId === message.offerId) {
          await link.pc.setRemoteDescription({type:'answer',sdp:message.sdp});
          link.remoteSdp = message.sdp;
        }
      } catch { /* An older answer may arrive before the answer to this offer. */ }
    }));
  }

  function tick() {
    if (!globalThis.RTCPeerConnection || !room?.joined || room.players.length < 2 || room.players.length > 16 || polling ||
        document.hidden || performance.now() < nextPoll) return;
    if (room.players.length > 1 && links.size === room.players.length-1 &&
        [...links.values()].every(link => link.channel?.readyState === 'open')) return;
    for (const [key,link] of links) {
      if (key > self && link.channel?.readyState !== 'open' && performance.now()-link.created > 14000) {
        link.pc.close();
        links.delete(key);
      }
    }
    polling = true;
    negotiate(room).catch(() => {}).finally(() => {
      polling = false;
      nextPoll = performance.now()+1000;
    });
  }

  function send(position) {
    const packet = JSON.stringify({...position,seq:++sequence});
    for (const {channel} of links.values()) {
      if (channel?.readyState === 'open' && channel.bufferedAmount < 2048) {
        try { channel.send(packet); } catch { /* The relay covers closed channels. */ }
      }
    }
  }

  return {sync,tick,send};
}
