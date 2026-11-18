'use strict';

function connectClassroom(onUpdate, onError, onPositions) {
  const id = crypto.randomUUID();
  let entered=false;
  let revision=0;
  let room = null;
  let busy = false;
  let queued = null;
  let retryAt = 0;
  let offset = 0;
  let readPosition = () => null;
  const direct = createDirectMotion(id, peer => {
    if (readPosition()?.round === peer.round) onPositions([{...peer,direct:true,at:-(peer.ageMs||0)}],0,peer.round);
  });
  setInterval(() => direct.tick(),300);
  let previousDirect;
  let motionStamp=null;
  setInterval(() => {
    const position = document.hidden ? null : readPosition();
    if (!position || room?.phase !== 'playing' || room.submitted) { previousDirect = null; return; }
    const now = performance.now();
    const old = previousDirect?.round === position.round ? previousDirect : null;
    const dt = old ? Math.max(.02,(now-old.now)/1000) : 1;
    const vx = old ? (position.x-old.x)/dt : 0, vz = old ? (position.z-old.z)/dt : 0;
    const clamp = Math.min(1,10/Math.max(.001,Math.hypot(vx,vz)));
    previousDirect = {...position,now};
    motionStamp=direct.send({...position,vx:vx*clamp,vz:vz*clamp});
  },50);

  async function send(action, values = {}) {
    if (busy) return false;
    busy = true;
    const version=revision;
    const start = Date.now();
    try {
      const response = await fetch('/.netlify/functions/sala', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action, room: room?.id, stage: room?.stage, present:entered&&!document.hidden, ...values }),
        signal: AbortSignal.timeout(8000)
      });
      const data = await response.json();
      if(version!==revision)return false;
      if (!response.ok) throw new Error(data.error);
      if(action==='join')entered=!!data.joined;
      if(!entered){data.joined=false;data.host=false;}
      if(!data.joined)entered=false;
      offset = data.now - (start + Date.now()) / 2;
      room = data;
      if(data.joined)direct.sync(data);else direct.close();
      if (queued && (room.id !== queued.room || room.stage !== queued.stage || room.submitted || room.phase !== 'playing')) queued = null;
      onUpdate(data);
      return true;
    } catch (error) {
      if(version!==revision)return false;
      onError(error instanceof SyntaxError ? 'Não foi possível acessar a sala. Confira a conexão e a publicação da função no Netlify.' : 'Falha na sala. ' + error.message);
      return false;
    } finally {
      if(version===revision)busy = false;
    }
  }

  function tick() {
    if (document.hidden || busy || Date.now() < retryAt) return;
    if (queued) {
      const action = queued.retryRead ? 'read' : 'submit';
      send(action, action === 'submit' ? queued : {}).then(ok => {
        if (queued) queued.retryRead = !ok || action === 'submit';
        if (!ok) retryAt = Date.now() + 1000;
      });
    } else send('read');
  }
  setInterval(tick, 1800);

  let previous = null;
  async function pollMotion() {
    const position = document.hidden ? null : readPosition();
    if (!position || room?.phase !== 'playing' || room.submitted || position.round !== room.id + '/' + room.stage) {
      previous = null;
      setTimeout(pollMotion,200);
      return;
    }
    const { id: roomId, stage } = room;
    const sent = performance.now();
    const sameStage = previous?.roomId === roomId && previous.stage === stage;
    const elapsed = sameStage ? Math.max(.08,(sent-previous.sent)/1000) : 1;
    const vx = sameStage ? (position.x-previous.x)/elapsed : 0;
    const vz = sameStage ? (position.z-previous.z)/elapsed : 0;
    const scale = Math.min(1,10/Math.max(.001,Math.hypot(vx,vz)));
    previous = { ...position, roomId, stage, sent };
    const exclude=direct.covered();
    let delay = exclude.length===room.players.length-1 ? 700 : 200;
    try {
      const response = await fetch('/.netlify/functions/movimento', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body:JSON.stringify({id,room:roomId,stage,exclude,position:{...position,...motionStamp,vx:vx*scale,vz:vz*scale}}),
        signal:AbortSignal.timeout(1500)
      });
      if (!response.ok) throw new Error('Movimento temporariamente indisponível');
      const data = await response.json();
      if (room?.id === roomId && room.stage === stage && readPosition()?.round === position.round) {
        onPositions(data.positions, data.now ?? Date.now() + offset, position.round);
      }
    } catch {
      delay = Math.max(delay,650);
    }
    setTimeout(pollMotion,Math.max(70,delay-(performance.now()-sent))+Math.random()*55);
  }
  setTimeout(pollMotion, 200);
  function leave() {
    const participating=entered;
    entered=false;revision++;busy=false;queued=null;direct.close();
    if(!participating)return;
    const payload=JSON.stringify({id,room:room?.id,stage:room?.stage,action:'leave'});
    let sent=false;
    try{sent=!!navigator.sendBeacon?.('/.netlify/functions/sala',new Blob([payload],{type:'application/json'}));}catch{}
    if(!sent) {
      fetch('/.netlify/functions/sala',{method:'POST',headers:{'Content-Type':'application/json'},body:payload,keepalive:true}).catch(()=>{});
    }
    if(room){room={...room,joined:false,host:false};onUpdate(room);}
  }
  window.addEventListener('pagehide',leave);
  window.addEventListener('pageshow',()=>tick());
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)tick();});
  tick();
  return {
    setPositionSource(source) { readPosition = source; },
    send, leave, now: () => Date.now() + offset,
    submit(values) {
      queued = { ...values, room: room.id, stage: room.stage, retryRead: false };
      tick();
    }
  };
}
