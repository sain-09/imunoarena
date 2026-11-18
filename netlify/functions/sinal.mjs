import { getStore } from '@netlify/blobs';
import rtc from '../rtc.cjs';

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
  const self = room?.players.findIndex(player => player.id === body.id && player.online!==false) ?? -1;
  if (!room || room.id !== body.room || self < 0) return reply({signals:[]});
  const hub=room.players.findIndex(player=>player.online!==false);
  const count=room.players.filter(player=>player.online!==false).length;
  const allowed=key=>room.players[key]?.online!==false && key!==self && (count<=8 || self===hub || key===hub);
  const prefix = 'rtc/' + room.id + '/';
  if (body.signal) {
    const {to,type,sdp,offerId} = body.signal;
    if (!Number.isInteger(to) || !room.players[to] || !allowed(to) ||
        typeof offerId !== 'string' || !uuid.test(offerId)) return reply({},400);
    if(type==='ice') {
      const candidates=body.signal.candidates;
      if(!Array.isArray(candidates) || candidates.length>64 || candidates.some(c=>!c ||
          typeof c.candidate!=='string' || c.candidate.length>1024 ||
          (c.sdpMid!==null && (typeof c.sdpMid!=='string' || c.sdpMid.length>32)) ||
          (c.sdpMLineIndex!==null && (!Number.isInteger(c.sdpMLineIndex) || c.sdpMLineIndex<0 || c.sdpMLineIndex>16)))) return reply({},400);
      await store.setJSON(prefix+'ice/'+self+'/'+to,{offerId,candidates});
    }else {
      if((self < to ? type !== 'offer' : type !== 'answer') || typeof sdp!=='string' || sdp.length>20000)return reply({},400);
      await store.setJSON(prefix+self+'/'+to,{from:self,type,sdp,offerId,at:Date.now()});
    }
    return reply({});
  }
  const signals = await Promise.all(room.players.map(async (_,from) => {
    if(!allowed(from))return null;
    const [signal,ice]=await Promise.all([store.get(prefix+from+'/'+self,{type:'json'}),store.get(prefix+'ice/'+from+'/'+self,{type:'json'})]);
    return signal?{...signal,candidates:ice?.offerId===signal.offerId?ice.candidates:[]}:null;
  }));
  return reply({signals:signals.filter(Boolean),...(body.configure?{iceServers:rtc.iceServers(process.env,body.id)}:{})});
}
