import { getStore } from '@netlify/blobs';
import engine from '../room.cjs';

const reply = (data, status = 200) => Response.json(data, {
  status, headers: { 'Cache-Control': 'no-store' }
});

export default async function handler(request) {
  if (request.method !== 'POST') return reply({ error: 'Método inválido.' }, 405);
  let body;
  try { body = await request.json(); }
  catch { return reply({ error: 'Pedido inválido.' }, 400); }
  if (!body || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.id)) {
    return reply({ error: 'Identificador inválido.' }, 400);
  }

  const store = getStore({ name: 'imunoarena', consistency: 'strong' });
  for (let attempt = 0; attempt < 12; attempt++) {
    try {
      const saved = await store.getWithMetadata('sala', { type: 'json' });
      const { room, changed } = engine.apply(saved?.data ?? engine.empty(), body.id, body, Date.now());
      if (changed || !saved) {
        const condition = saved ? { onlyIfMatch: saved.etag } : { onlyIfNew: true };
        const write = await store.setJSON('sala', room, condition);
        if (!write.modified) {
          await new Promise(resolve => setTimeout(resolve, 20 + Math.random() * 65));
          continue;
        }
      }
      return reply(engine.snapshot(room, body.id));
    } catch (error) {
      if (!error.status) console.error(error);
      return reply({ error: error.status ? error.message : 'Sala temporariamente indisponível.' }, error.status || 503);
    }
  }
  return reply({ error: 'A sala está ocupada. Tente novamente.' }, 503);
}
