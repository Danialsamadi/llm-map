import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { COMPANIES, companyFacts } from '../public/companies.js';

const models = [
  { name: 'Acme Big', company: 'Acme', release: '2025-03-01', intelligence: 40, cost: 2.5, speed: 100, agi: null },
  { name: 'Beta Max', company: 'Beta', release: '2026-01-01', intelligence: 60, cost: 0.01, speed: 900, agi: 30 },
  { name: 'Acme Mini', company: 'Acme', release: '2025-09-15', intelligence: 20, cost: 0.4, speed: 100, agi: null },
  { name: 'Acme Draft', company: 'Acme', release: null, intelligence: 10, cost: null, speed: null, agi: null },
];

test('company facts: count, newest and the best model per measure, in its own direction', () => {
  const f = companyFacts(models, 'Acme', ['intelligence', 'cost', 'speed', 'agi']);
  assert.equal(f.count, 3);
  assert.equal(f.newest.name, 'Acme Mini');
  // cost: cheapest wins and a missing cost doesn't; speed: a tie goes to the first; agi: all null, so left out
  assert.deepEqual(f.best.map(b => [b.key, b.model.name]), [['intelligence', 'Acme Big'], ['cost', 'Acme Mini'], ['speed', 'Acme Big']]);
});

test('a company with no models has no facts', () => {
  assert.deepEqual(companyFacts(models, 'Nobody', ['intelligence']), { count: 0, newest: null, best: [] });
});

test('every company in the table is named exactly as in the data', () => {
  const names = new Set(JSON.parse(readFileSync(new URL('../public/models.json', import.meta.url))).models.map(m => m.company));
  for (const co of Object.keys(COMPANIES)) assert.ok(names.has(co), `${co} is not a company in models.json`);
});

test('every company has an https website and a one-sentence description in English and Persian', () => {
  for (const [co, { url, about, fa }] of Object.entries(COMPANIES)) {
    assert.ok(typeof fa === 'string' && /[\u0600-\u06FF]/.test(fa) && fa.endsWith('.'), `${co} Persian: ${fa}`);
    assert.ok(url.startsWith('https://'), `${co}: ${url}`);
    assert.ok(typeof about === 'string' && about.length > 1 && about.endsWith('.'), `${co}: ${about}`);
  }
});
