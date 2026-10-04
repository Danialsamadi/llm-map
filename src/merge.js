// Pure merge of Artificial Analysis models + ARC-AGI-2 scores. Shared by the Worker and tests.

// Words that differ between sources' names for the same model.
const NOISE = new Set(['preview', 'thinking', 'reasoning', 'non', 'high', 'low', 'medium', 'minimal', 'xhigh', 'latest', 'beta']);

// Name → match key: words sorted (order differs between sources), numbers kept in order (GPT-5.4 ≠ GPT-4.5).
// ponytail: heuristic name matching; add a manual alias map if important models fail to match.
export function key(name) {
  const tokens = name.toLowerCase().split(/[^a-z0-9]+/)
    .filter(t => t && !NOISE.has(t) && !/^\d{4,8}$/.test(t) && !/^\d+k$/.test(t));
  const words = tokens.filter(t => !/^\d+$/.test(t)).sort();
  const nums = tokens.filter(t => /^\d+$/.test(t));
  return `${words.join(' ')}|${nums.join(' ')}`;
}

const num = v => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const pos = v => (num(v) > 0 ? v : null); // log axes need > 0; 0 means "not measured"

export function merge(aa, arcModels, arcEvals) {
  const arcName = new Map(arcModels.map(m => [m.id, m.displayName]));
  const agi = new Map();
  for (const e of arcEvals) {
    const name = arcName.get(e.modelId);
    if (e.datasetId !== 'v2_Semi_Private' || !e.display || !name || num(e.score) == null) continue;
    const k = key(name);
    agi.set(k, Math.max(agi.get(k) ?? 0, Math.round(e.score * 1000) / 10));
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
      agi: agi.get(key(m.name)) ?? null,
    };
  });
}
