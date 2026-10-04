// Pure merge of Artificial Analysis models + ARC-AGI-2 scores. Shared by the Worker and tests.

// Words that differ between sources' names for the same model.
const NOISE = new Set(['preview', 'thinking', 'reasoning', 'non', 'high', 'low', 'medium', 'minimal', 'xhigh', 'none', 'latest', 'beta']);

// Name → match key: words sorted (order differs between sources), numbers kept in order (GPT-5.4 ≠ GPT-4.5).
// ponytail: heuristic name matching; add a manual alias map if important models fail to match.
export function key(name) {
  let cleaned = name.toLowerCase();
  // Strip common date patterns before tokenizing
  cleaned = cleaned.replace(/\d{4}-\d{2}-\d{2}/g, ''); // YYYY-MM-DD (e.g. 2025-05-14)
  cleaned = cleaned.replace(/(0[1-9]|1[0-2])-\d{2}/g, ''); // MM-DD where MM is 01-12 (e.g. 05-06)
  cleaned = cleaned.replace(/\b(jan|january|feb|february|mar|march|apr|april|may|jun|june|jul|july|aug|august|sep|september|oct|october|nov|november|dec|december)\.?\s*'?\d{2,4}/gi, ''); // month + year (e.g. Nov '24, Sep 2025)

  const tokens = cleaned.split(/[^a-z0-9]+/)
    .filter(t => t && !NOISE.has(t) && !/^\d{4,8}$/.test(t) && !/^\d+k$/.test(t));
  const words = tokens.filter(t => !/^\d+$/.test(t)).sort();
  const nums = tokens.filter(t => /^\d+$/.test(t));
  return `${words.join(' ')}|${nums.join(' ')}`;
}

// Effort level in parentheses, e.g. "(Low)"; "Non-reasoning" and "None" are the same level. No tag → null. "Qwen3 Max" has no parentheses, so it is untouched.
const EFFORT = /\((non-reasoning|none|minimal|low|medium|high|xhigh|max)\)/i;
const tag = name => { const t = name.match(EFFORT)?.[1].toLowerCase(); return t === 'non-reasoning' ? 'none' : t ?? null; };

const num = v => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const pos = v => (num(v) > 0 ? v : null); // log axes need > 0; 0 means "not measured"

export function merge(aa, arcModels, arcEvals) {
  const arcName = new Map(arcModels.map(m => [m.id, m.displayName]));
  const exact = new Map(), family = new Map(); // exact: key#effort → score, family: key → max over all efforts
  const best = (map, k, v) => map.set(k, Math.max(map.get(k) ?? 0, v));
  for (const e of arcEvals) {
    const name = arcName.get(e.modelId);
    if (e.datasetId !== 'v2_Semi_Private' || !e.display || !name || num(e.score) == null) continue;
    const k = key(name), t = tag(name), v = Math.round(e.score * 1000) / 10;
    best(family, k, v);
    if (t) best(exact, `${k}#${t}`, v);
  }
  return aa.map(m => {
    const p = m.pricing ?? {};
    const blended = (3 * (p.price_1m_input_tokens ?? 0) + (p.price_1m_output_tokens ?? 0)) / 4;
    return {
      name: m.name,
      company: m.model_creator?.name ?? 'Unknown',
      release: m.release_date ?? null,
      intelligence: num(m.evaluations?.artificial_analysis_intelligence_index),
      cost: pos(m.artificial_analysis_intelligence_index_cost?.cost_per_task?.total_cost),
      price: pos(blended),
      speed: pos(m.performance?.median_output_tokens_per_second),
      agi: (t => t ? exact.get(`${key(m.name)}#${t}`) : family.get(key(m.name)))(tag(m.name)) ?? null, // a tagged model never borrows another effort's score
    };
  });
}
