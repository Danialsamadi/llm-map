// Pure slimming of the Jev Decision Index (huggingface.co/spaces/multimodalart/jev-decision-index) to what the chart needs.
// Decision models answer with a choice or a score instead of text: routing, classifying, grading.

const pct = v => (typeof v === 'number' && Number.isFinite(v) ? Math.round(v * 1000) / 10 : null); // 0-1 skill -> 0-100
const pos = v => (typeof v === 'number' && v > 0 ? v : null);

// The Hugging Face account in a repo id or model URL, e.g. "jaredpalmer" from https://huggingface.co/jaredpalmer/kev-27b
const owner = meta => (meta.weights_repo ?? meta.model_url?.match(/huggingface\.co\/([^/]+)\//)?.[1] ?? '').split('/')[0] || null;

export function slimDecisions(index) {
  const headline = index.suite?.headline ?? 'balanced_skill'; // the board's own main ranking ("Full score")
  return (index.models ?? [])
    .filter(m => !(m.pending > 0.05)) // still being tested: unanswered requests count as wrong, so the score is too low for now
    .map(m => {
      const area = id => pct(m.categories?.find?.(c => c.id === id)?.skill);
      return {
        name: m.name,
        company: m.meta?.org?.name ?? owner(m.meta ?? {}) ?? 'Independent',
        decision: typeof m.scores?.[headline] === 'number' ? m.scores[headline] : null,
        latency: pos(m.latency?.median),
        size: pos(m.meta?.served_params) && Math.round(m.meta.served_params / 1e7) / 100, // billions of parameters
        tools: area('tools'),
        language: area('language'),
        knowledge: area('knowledge'),
        hosted: m.meta?.kind === 'hosted API' || undefined, // latency is a network round-trip, not one GPU in the lab
      };
    })
    .filter(m => m.decision != null);
}
