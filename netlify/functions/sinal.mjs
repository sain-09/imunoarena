import { getStore } from '@netlify/blobs';

const reply = (data, status = 200) => Response.json(data, {
  status, headers: { 'Cache-Control': 'no-store' }
});
const uuid = /^[0-9a-f-]{36}$/i;

export default async function handler(request) {
  if (request.method !== 'POST') return reply({},405);
  let body;
  try { body = await request.json(); } catch { return reply({},400); }
  if (typeof body?.id !== 'string' || !uuid.test(body.id)) return reply({},400);
  const store = getStore({name:'imunoarena',consistency:'strong'});
  const room = await store.get('sala',{type:'json'});
  const self = room?.players.findIndex(player => player.id === body.id) ?? -1;
  if (!room || room.id !== body.room || self < 0 || room.players.length > 16) return reply({signals:[]});
  const prefix = 'rtc/' + room.id + '/';
  if (body.signal) {
    const {to,type,sdp,offerId} = body.signal;
    if (!Number.isInteger(to) || !room.players[to] || to === self ||
        (self < to ? type !== 'offer' : type !== 'answer') ||
        typeof offerId !== 'string' || !uuid.test(offerId) || typeof sdp !== 'string' || sdp.length > 20000) return reply({},400);
    await store.setJSON(prefix+self+'/'+to,{from:self,type,sdp,offerId});
    return reply({});
  }
  const signals = await Promise.all(room.players.map((_,from) => from === self ? null :
    store.get(prefix+from+'/'+self,{type:'json'})));
  return reply({signals:signals.filter(Boolean)});
}
