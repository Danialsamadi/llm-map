import { merge } from './merge.js';
import { slimDecisions } from './decisions.js';

const AA = 'https://artificialanalysis.ai/api/v2/language/models/free';
const ARC = 'https://arcprize.org/media/data/';
const DIX = 'https://huggingface.co/spaces/multimodalart/jev-decision-index/resolve/main/data/index.json'; // ~2 MB; slimmed to ~20 KB below
// ponytail: Cache API is per data center; a miss costs ~4 AA calls (~690 models / 200 per page), so ~16 calls/day per DC: the 100/day free limit is hit at ~6 DCs. Cron + KV if it grows.
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

// its own endpoint: parsing ~2 MB takes ~15 ms of CPU, which stays off the language-model request
export async function fetchDecisions() {
  const r = await fetch(DIX);
  if (!r.ok) throw new Error(`Decision Index ${r.status}`);
  const decisions = slimDecisions(await r.json());
  if (!decisions.length) throw new Error('Decision Index returned no models'); // 502 → page falls back to the snapshot
  return { updated: new Date().toISOString(), source: 'live', decisions };
}

export async function build(apiKey) {
  const [aa, arc] = await Promise.all([fetchAA(apiKey), fetchARC()]);
  if (!aa.length) throw new Error('Artificial Analysis returned no models'); // 502 → page falls back to the snapshot
  return { updated: new Date().toISOString(), source: 'live', models: merge(aa, arc.models, arc.evals) };
}

export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url);
    const API = { '/api/models': () => build(env.AA_API_KEY), '/api/decisions': fetchDecisions }[url.pathname];
    if (!API) return env.ASSETS.fetch(req);
    const cacheKey = new Request(`${url.origin}${url.pathname}?v=2`);
    const hit = await caches.default.match(cacheKey);
    if (hit) return hit;
    try {
      const res = Response.json(await API(), { headers: { 'cache-control': `public, max-age=${TTL}` } });
      ctx.waitUntil(caches.default.put(cacheKey, res.clone()));
      return res;
    } catch (e) {
      return Response.json({ error: e.message }, { status: 502 });
    }
  },
};
