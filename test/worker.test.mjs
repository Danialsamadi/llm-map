import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { fetchAA, build } from '../src/worker.js';

const realFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = realFetch; });
const json = (body, status = 200) => new Response(JSON.stringify(body), { status });
const aa = (id) => ({ id, name: `Model ${id}`, model_creator: { name: 'X' } });

test('fetchAA follows pages and sends the key header', async () => {
  const seen = [];
  globalThis.fetch = async (url, init) => {
    seen.push([String(url), init.headers['x-api-key']]);
    const page = Number(new URL(url).searchParams.get('page'));
    return json({ data: [aa(`p${page}`)], pagination: { has_more: page < 2 } });
  };
  const models = await fetchAA('k');
  assert.deepEqual(models.map(m => m.id), ['p1', 'p2']);
  assert.deepEqual(seen.map(s => s[1]), ['k', 'k']);
});

test('fetchAA stops when a page adds nothing new', async () => {
  let calls = 0;
  globalThis.fetch = async () => { calls++; return json({ data: [aa('same')], pagination: { has_more: true } }); };
  assert.equal((await fetchAA('k')).length, 1);
  assert.equal(calls, 2);
});

test('AA failure throws', async () => {
  globalThis.fetch = async () => json({ error: 'bad key' }, 401);
  await assert.rejects(fetchAA('k'), /401/);
});

test('ARC failure leaves agi null', async () => {
  globalThis.fetch = async (url) => String(url).includes('arcprize')
    ? json({}, 500)
    : json({ data: [aa('a')], pagination: { has_more: false } });
  const out = await build('k');
  assert.equal(out.source, 'live');
  assert.equal(out.models.length, 1);
  assert.equal(out.models[0].agi, null);
});
