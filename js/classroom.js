'use strict';

function connectClassroom(onUpdate, onError, onPositions) {
  let id = localStorage.getItem('imunoarena-player');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('imunoarena-player', id);
  }
  let room = null;
  let busy = false;
  let queued = null;
  let retryAt = 0;
  let offset = 0;
  let readPosition = () => null;

  async function send(action, values = {}) {
    if (busy) return false;
    busy = true;
    const start = Date.now();
    try {
      const response = await fetch('/.netlify/functions/sala', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action, room: room?.id, stage: room?.stage, ...values }),
        signal: AbortSignal.timeout(8000)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      offset = data.now - (start + Date.now()) / 2;
      room = data;
      if (queued && (room.id !== queued.room || room.stage !== queued.stage || room.submitted || room.phase !== 'playing')) queued = null;
      onUpdate(data);
      return true;
    } catch (error) {
      onError(error instanceof SyntaxError ? 'Não foi possível acessar a sala. Confira a conexão e a publicação da função no Netlify.' : 'Falha na sala. ' + error.message);
      return false;
    } finally {
      busy = false;
    }
  }

  function tick() {
    if (busy || Date.now() < retryAt) return;
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
    let delay = room.players.length > 16 ? 650 : 300;
    try {
      const response = await fetch('/.netlify/functions/movimento', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body:JSON.stringify({id,room:roomId,stage,position:{...position,vx:vx*scale,vz:vz*scale}}),
        signal:AbortSignal.timeout(2200)
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
  tick();
  return {
    setPositionSource(source) { readPosition = source; },
    send, now: () => Date.now() + offset,
    submit(values) {
      queued = { ...values, room: room.id, stage: room.stage, retryRead: false };
      tick();
    }
  };
}
