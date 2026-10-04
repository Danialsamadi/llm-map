import { test } from 'node:test';
import assert from 'node:assert/strict';
import { key, merge } from '../src/merge.js';

test('key ignores word order, effort and noise words', () => {
  assert.equal(key('Claude Opus 4 (Thinking 16K)'), key('Claude 4 Opus (Reasoning)'));
  assert.equal(key('Gemini 3.5 Flash Preview'), key('Gemini 3.5 Flash'));
  assert.equal(key('claude-sonnet-4-20250514'), key('Claude Sonnet 4'));
  assert.equal(key('GPT-5.6 Sol (high)'), key('GPT-5.6 Sol'));
  assert.equal(key('GPT-5.6 Sol (None)'), key('GPT-5.6 Sol'));
  assert.equal(key('Claude Sonnet 4 (2025-05-14)'), key('Claude Sonnet 4'));
  assert.equal(key('Gemini 2.5 Pro Preview 05-06'), key('Gemini 2.5 Pro'));
  assert.equal(key("GPT-4o (Nov '24)"), key('GPT-4o'));
});

test('key keeps version order', () => {
  assert.notEqual(key('GPT-5.4'), key('GPT-4.5'));
});

const aaModel = (over = {}) => ({
  id: 'a1', name: 'GPT-5.6 Sol (high)', release_date: '2026-07-01',
  model_creator: { name: 'OpenAI' },
  evaluations: { artificial_analysis_intelligence_index: 70.2 },
  artificial_analysis_intelligence_index_cost: { cost_per_task: { total_cost: 0.5 } },
  pricing: { price_1m_input_tokens: 2, price_1m_output_tokens: 10 },
  performance: { median_output_tokens_per_second: 120 },
  ...over,
});

// ARC fixture: one display:true v2_Semi_Private row per [displayName, score].
const arc = rows => ({
  models: rows.map(([displayName], i) => ({ id: `m${i}`, displayName })),
  evals: rows.map(([, score], i) => ({ datasetId: 'v2_Semi_Private', modelId: `m${i}`, score, display: true })),
});
const agiOf = (name, rows) => { const { models, evals } = arc(rows); return merge([aaModel({ name })], models, evals)[0].agi; };
const SOL = [['GPT-5.6 Sol (Low)', 0.425], ['GPT-5.6 Sol (High)', 0.9], ['GPT-5.6 Sol (XHigh)', 0.95]];

test('merge maps AA fields and attaches the ARC-AGI-2 score of the same effort variant', () => {
  const { models, evals } = arc(SOL);
  evals.push({ datasetId: 'v1_Semi_Private', modelId: 'm1', score: 0.99, display: true });
  assert.deepEqual(merge([aaModel()], models, evals), [{
    name: 'GPT-5.6 Sol (high)', company: 'OpenAI', release: '2026-07-01',
    intelligence: 70.2, cost: 0.5, price: 4, speed: 120, agi: 90,
  }]);
});

test('tagged AA model gets its own variant score, never the family max', () => {
  assert.equal(agiOf('GPT-5.6 Sol (Low)', SOL), 42.5);
  assert.equal(agiOf('GPT-5.6 Sol (Non-reasoning)', SOL), null);
  assert.equal(agiOf('GPT-5.6 Sol (Non-reasoning)', [...SOL, ['GPT-5.6 Sol (None)', 0.017]]), 1.7);
});

test('untagged AA model gets the family max', () => {
  assert.equal(agiOf('o3', [['o3 (Low)', 0.02], ['o3 (High)', 0.065], ['o3 (Medium)', 0.03]]), 6.5);
});

test('"Max" without parentheses is part of the name, not an effort tag', () => {
  assert.equal(agiOf('Qwen3 Max', [['Qwen3 Max', 0.1], ['Qwen3', 0.5]]), 10);
});

test('merge ignores hidden ARC rows and unknown ARC model ids', () => {
  const arcEvals = [
    { datasetId: 'v2_Semi_Private', modelId: 'm1', score: 0.9, display: false },
    { datasetId: 'v2_Semi_Private', modelId: 'nope', score: 0.9, display: true },
  ];
  assert.equal(merge([aaModel()], [{ id: 'm1', displayName: 'GPT-5.6 Sol' }], arcEvals)[0].agi, null);
});

test('zero and missing values become null', () => {
  const [m] = merge([aaModel({
    model_creator: undefined, release_date: undefined, evaluations: {},
    artificial_analysis_intelligence_index_cost: { cost_per_task: { total_cost: 0 } },
    pricing: { price_1m_input_tokens: 0, price_1m_output_tokens: 0 },
    performance: { median_output_tokens_per_second: 0 },
  })], [], []);
  assert.deepEqual(m, { name: 'GPT-5.6 Sol (high)', company: 'Unknown', release: null,
    intelligence: null, cost: null, price: null, speed: null, agi: null });
});
