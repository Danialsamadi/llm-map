import { test } from 'node:test';
import assert from 'node:assert/strict';
import { slimDecisions } from '../src/decisions.js';

const model = (o = {}) => ({ name: 'Kev 27B', scores: { balanced_skill: 55.5, public_skill: 50 }, pending: 0, latency: { median: 80.4 },
  meta: { served_params: 27_800_000_000, model_url: 'https://huggingface.co/jaredpalmer/kev-27b', kind: 'LoRA' },
  categories: [{ id: 'tools', skill: 0.7378 }, { id: 'language', skill: 0.5 }, { id: 'knowledge', skill: 0.25 }], ...o });

test('slimDecisions keeps the headline score and the chart fields', () => {
  assert.deepEqual(slimDecisions({ suite: { headline: 'balanced_skill' }, models: [model()] }), [{
    name: 'Kev 27B', company: 'jaredpalmer', decision: 55.5, latency: 80.4, size: 27.8, tools: 73.8, language: 50, knowledge: 25, hosted: undefined,
  }]);
});

test('slimDecisions: org name first, hosted latency marked, unknown size null, unfinished runs left out', () => {
  const out = slimDecisions({ models: [
    model({ name: 'Jev 1.14', meta: { kind: 'hosted API', served_params: null, org: { name: 'typesafe.ai' } } }),
    model({ name: 'Half done', pending: 0.24 }),
    model({ name: 'No score', scores: {} }),
    model({ name: 'Nobody', meta: {} }),
  ] });
  assert.deepEqual(out.map(m => m.name), ['Jev 1.14', 'Nobody']);
  assert.equal(out[0].company, 'typesafe.ai');
  assert.equal(out[0].hosted, true);
  assert.equal(out[0].size, null);
  assert.equal(out[1].company, 'Independent');
});
