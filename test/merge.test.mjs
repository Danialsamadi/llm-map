import { test } from 'node:test';
import assert from 'node:assert/strict';
import { key, merge } from '../src/merge.js';

test('key ignores word order, effort and noise words', () => {
  assert.equal(key('Claude Opus 4 (Thinking 16K)'), key('Claude 4 Opus (Reasoning)'));
  assert.equal(key('Gemini 3.5 Flash Preview'), key('Gemini 3.5 Flash'));
  assert.equal(key('claude-sonnet-4-20250514'), key('Claude Sonnet 4'));
  assert.equal(key('GPT-5.6 Sol (high)'), key('GPT-5.6 Sol'));
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

test('merge maps AA fields and attaches max ARC-AGI-2 score', () => {
  const arcModels = [{ id: 'm1', displayName: 'GPT-5.6 Sol' }, { id: 'm2', displayName: 'GPT-5.6 Sol (low)' }];
  const arcEvals = [
    { datasetId: 'v2_Semi_Private', modelId: 'm2', score: 0.925, display: true },
    { datasetId: 'v2_Semi_Private', modelId: 'm1', score: 0.9, display: true },
    { datasetId: 'v1_Semi_Private', modelId: 'm1', score: 0.99, display: true },
  ];
  assert.deepEqual(merge([aaModel()], arcModels, arcEvals), [{
    name: 'GPT-5.6 Sol (high)', company: 'OpenAI', release: '2026-07-01',
    intelligence: 70.2, cost: 0.5, price: 4, speed: 120, agi: 92.5,
  }]);
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
