import { merge } from './merge.js';

const AA = 'https://artificialanalysis.ai/api/v2/language/models/free';
const ARC = 'https://arcprize.org/media/data/';
// ponytail: Cache API is per data center; ~2 AA calls per DC per 6h stays under 100/day for ~12 DCs. Cron + KV if it grows.
const TTL = 6 * 3600;

export async function fetchAA(apiKey) {
  const byId = new Map();
  for (let page = 1; page <= 10; page++) { // hard cap protects the daily quota
    const r = await fetch(`${AA}?page=${page}`, { headers: { 'x-api-key': apiKey } });
    if (!r.ok) throw new Error(`Artificial Analysis ${r.status}`);
    const j = await r.json();
    const before = byId.size;
    for (const m of j.data ?? []) byId.set(m.id, m);
    if (!j.pagination?.has_more || byId.size === before) break;
  }
  return [...byId.values()];
}

export async function fetchARC() {
  try {
    const [models, evals] = await Promise.all(['models', 'evaluations'].map(async f => {
      const r = await fetch(`${ARC}${f}.json`);
      if (!r.ok) throw new Error(`ARC ${f} ${r.status}`);
      return r.json();
    }));
    return { models, evals };
  } catch {
    return { models: [], evals: [] }; // ARC is optional: chart still works without the agi axis
  }
}

export async function build(apiKey) {
  const [aa, arc] = await Promise.all([fetchAA(apiKey), fetchARC()]);
  return { updated: new Date().toISOString(), source: 'live', models: merge(aa, arc.models, arc.evals) };
}

export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url);
    if (url.pathname !== '/api/models') return env.ASSETS.fetch(req);
    const cacheKey = new Request(`${url.origin}/api/models`);
    const hit = await caches.default.match(cacheKey);
    if (hit) return hit;
    try {
      const res = Response.json(await build(env.AA_API_KEY), { headers: { 'cache-control': `public, max-age=${TTL}` } });
      ctx.waitUntil(caches.default.put(cacheKey, res.clone()));
      return res;
    } catch (e) {
      return Response.json({ error: e.message }, { status: 502 });
    }
  },
};
