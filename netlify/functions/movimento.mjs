import { getStore } from '@netlify/blobs';
import arenaData from '../../js/arenas.js';
import config from '../../js/config.js';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const reply = (data, status = 200) => Response.json(data, {
  status, headers: { 'Cache-Control': 'no-store' }
});
const freshForMs = 5000;

export default async function handler(request) {
  if (request.method !== 'POST') return reply({}, 405);
  let body;
  try { body = await request.json(); }
  catch { return reply({}, 400); }
  if (!body || typeof body.id !== 'string' || !uuid.test(body.id)) return reply({}, 400);

  const store = getStore({ name: 'imunoarena', consistency: 'strong' });
  const room = await store.get('sala', { type: 'json' });
  const now = Date.now();
  if (!room || room.id !== body.room || room.stage !== body.stage || room.phase !== 'playing' ||
      now < room.startAt || now >= room.closeAt || room.submissions[body.id] ||
      !room.players.some(player => player.id === body.id)) return reply({ positions: [] });

  // Each player updates an independent entry, away from the lobby/score transaction.
  const prefix = 'motion/' + room.id + '/' + room.stage + '/';
  const arena = arenaData.ARENAS[config.stages[room.stage]?.id];
  if (!arena) return reply({ positions: [] });
  const p = body.position;
  if (p && [p.x,p.z,p.facing,p.vx,p.vz].every(Number.isFinite) &&
      Math.abs(p.x)<=arena.width+.01 && p.z>=arena.end-1.01 && p.z<=arena.start+2.01 &&
      Math.abs(p.facing)<=100 && Math.hypot(p.vx,p.vz)<=15) {
    await store.setJSON(prefix + body.id, {
      x:p.x, z:p.z, facing:p.facing, vx:p.vx, vz:p.vz,
      char:p.char === 'female' ? 'female' : 'male', at: now
    });
  }
  const positions = await Promise.all(room.players.map(async (player,key) => {
    if (player.id === body.id || room.submissions[player.id]) return null;
    const entry = await store.get(prefix + player.id,{type:'json'});
    if (!entry || now - entry.at > freshForMs) return null;
    return { ...entry, key, name: player.name };
  }));
  return reply({ positions: positions.filter(Boolean), now: Date.now() });
}
