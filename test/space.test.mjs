import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeScale, ticks, layout, nearest, compare, BETTER, betterSign, makePath, segDist, readSV, writeSV } from '../public/space.js';

const close = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} ≈ ${b}`);

test('linear scale maps the range to -1..1 with 5% padding', () => {
  const s = makeScale('linear', [0, 10]);
  close(s.toCube(5), 0); close(s.toCube(0), -10 / 11); close(s.toCube(10), 10 / 11);
});

test('log scale works in powers of ten', () => {
  const s = makeScale('log', [0.01, 1]);
  close(s.toCube(0.1), 0); close(s.toCube(0.01), -2 / 2.2);
});

test('date scale spreads by time', () => {
  close(makeScale('date', ['2024-01-01', '2025-01-01']).toCube('2024-07-02'), 0, 1e-12);
});

test('a single value sits in the middle; no values does not break', () => {
  close(makeScale('linear', [5, 5]).toCube(5), 0);
  close(makeScale('date', ['2025-03-01']).toCube('2025-03-01'), 0);
  assert.ok(Number.isFinite(makeScale('linear', []).toCube(0.5)));
});

test('linear ticks use 1/2/5 steps', () => {
  assert.deepEqual(ticks(makeScale('linear', [0, 10])).map(t => t.label), ['0', '2', '4', '6', '8', '10']);
  assert.deepEqual(ticks(makeScale('linear', [0, 1])).map(t => t.label), ['0.0', '0.2', '0.4', '0.6', '0.8', '1.0']);
});

test('log ticks are powers of ten, with 2 and 5 when the range is narrow', () => {
  assert.deepEqual(ticks(makeScale('log', [0.01, 100])).map(t => t.label), ['0.01', '0.1', '1', '10', '100']);
  assert.deepEqual(ticks(makeScale('log', [2, 4])).map(t => t.label), ['2']);
});

test('date ticks are month labels at even steps', () => {
  assert.deepEqual(ticks(makeScale('date', ['2024-01-15', '2026-01-15'])).map(t => t.label),
    ['Jan 2024', 'Jul 2024', 'Jan 2025', 'Jul 2025', 'Jan 2026']);
});

test('every tick sits inside the cube', () => {
  for (const s of [makeScale('linear', [3, 97]), makeScale('log', [0.003, 41]), makeScale('date', ['2023-05-01', '2026-09-30'])])
    for (const t of ticks(s)) assert.ok(t.cube >= -1 - 1e-9 && t.cube <= 1 + 1e-9, `${t.label} at ${t.cube}`);
});

test('layout gives cube positions for visible models only', () => {
  const models = [{ a: 1, b: 10 }, { a: 2, b: 100 }, { a: 3, b: 1000 }];
  const { pos } = layout(models, [0, 2], ['a', 'b', 'a'], ['linear', 'log', 'linear']);
  assert.deepEqual([...pos.keys()], [0, 2]);
  close(pos.get(0)[0], -1 / 1.1); close(pos.get(2)[1], 1 / 1.1);
});

test('nearest returns the closest others, closest first', () => {
  const pos = new Map([[1, [0, 0, 0]], [2, [0.5, 0, 0]], [3, [0.1, 0, 0]], [4, [0, -0.3, 0]]]);
  assert.deepEqual(nearest(pos, [0, 0, 0], 2, 1), [3, 4]);
  assert.deepEqual(nearest(pos, [0, 0, 0], 10, 1), [3, 4, 2]);
});

test('compare names the two biggest differences in plain words', () => {
  const axes = ['intelligence', 'cost', 'speed'];
  assert.equal(compare(axes, [0, 0, 0], [-0.2, -0.5, 0.05]), 'much cheaper, a bit less smart');
  assert.equal(compare(axes, [0, 0, 0], [0.45, 0.1, 0.3]), 'much smarter, a bit faster');
  assert.equal(compare(axes, [0, 0, 0], [0.05, -0.09, 0]), 'very similar');
  assert.equal(compare(['release', 'agi', 'price'], [0, 0, 0], [0.4, -0.6, 0]), 'much lower ARC-AGI-2, a bit newer');
  assert.equal(compare(['cost', 'cost', 'speed'], [0, 0, 0], [0.5, 0.5, 0.2]), 'much pricier, a bit faster');
});

test('better direction per measure', () => {
  assert.equal(betterSign('cost'), -1); assert.equal(betterSign('price'), -1); assert.equal(betterSign('speed'), 1);
  assert.equal(BETTER.price, 'cheaper'); assert.equal(BETTER.release, 'newer');
});

test('a path is walked by distance', () => {
  const p = makePath([[0, 0, 0], [3, 4, 0], [3, 4, 2]]);
  assert.equal(p.length, 7);
  assert.deepEqual(p.at(2.5), [1.5, 2, 0]); assert.deepEqual(p.at(6), [3, 4, 1]);
  assert.deepEqual(p.at(-1), [0, 0, 0]); assert.deepEqual(p.at(99), [3, 4, 2]);
  assert.equal(p.reached(4.9), 0); assert.equal(p.reached(5), 1); assert.equal(p.reached(7), 2);
  const one = makePath([[1, 2, 3]]);
  assert.equal(one.length, 0); assert.deepEqual(one.at(5), [1, 2, 3]); assert.equal(one.reached(0), 0);
});

test('distance from a point to a screen segment', () => {
  assert.equal(segDist(0, 1, 0, 0, 2, 0), 1);
  assert.equal(segDist(3, 0, 0, 0, 2, 0), 1);
  close(segDist(1, 1, 0, 0, 0, 0), Math.SQRT2);
});

test('Street View links round-trip and ignore incomplete ones', () => {
  const p = writeSV(new URLSearchParams('x=a&sv=fly'), { mode: 'stand', model: 'R&D Model 2 (High)' });
  const back = new URLSearchParams(p.toString());
  assert.deepEqual(readSV(back), { mode: 'stand', model: 'R&D Model 2 (High)' });
  assert.equal(back.get('x'), 'a');
  assert.deepEqual(readSV(new URLSearchParams('sv=ride&r=Z AI')), { mode: 'ride', company: 'Z AI' });
  assert.deepEqual(readSV(new URLSearchParams('sv=fly')), { mode: 'fly' });
  assert.equal(readSV(new URLSearchParams('sv=stand')), null);
  assert.equal(readSV(new URLSearchParams('sv=dance')), null);
  assert.equal(writeSV(new URLSearchParams('sv=stand&m=X&r=Y&c=A'), null).toString(), 'c=A');
});
