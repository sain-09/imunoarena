'use strict';

function connectClassroom(onUpdate, onError) {
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
  setInterval(tick, 2500);
  tick();
  return {
    send, now: () => Date.now() + offset,
    submit(values) {
      queued = { ...values, room: room.id, stage: room.stage, retryRead: false };
      tick();
    }
  };
}
