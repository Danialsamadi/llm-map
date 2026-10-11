import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeScale, ticks, layout, nearest, compare, betterSign, makePath, segDist, readSV, writeSV, emphasis, percentile, rangeScale, inRanges, readRanges, writeRanges } from '../public/space.js';

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

test('a focused dot grows and everything else fades', () => {
  assert.deepEqual(emphasis([3, 5, 7], ['A', 'B'], 5, null), { scale: [1, 2.4, 1], alpha: [0.18, 1, 0.18], lines: [0.08, 0.08] });
  assert.deepEqual(emphasis([0, 5], ['A'], 0, null).alpha, [1, 0.18]);
});

test('without a visible focus everything is drawn normally', () => {
  const normal = { scale: [1, 1, 1], alpha: [1, 1, 1], lines: [0.9, 0.9] };
  assert.deepEqual(emphasis([3, 5, 7], ['A', 'B'], null, null), normal);
  assert.deepEqual(emphasis([3, 5, 7], ['A', 'B'], 4, null), normal);
  assert.deepEqual(emphasis([3, 5, 7], ['A', 'B'], 5, { kind: 'floor', point: { x: 0, y: -1, z: 0 } }), normal);
});

test('a Street View drop preview wins over focus', () => {
  assert.deepEqual(emphasis([3, 5, 7], ['A', 'B'], 5, { kind: 'line', company: 'B' }), { scale: [1, 1, 1], alpha: [1, 1, 1], lines: [0.15, 1] });
  assert.deepEqual(emphasis([3, 5, 7], ['A', 'B'], 5, { kind: 'dot', index: 7 }), { scale: [1, 1, 2.2], alpha: [1, 1, 1], lines: [0.9, 0.9] });
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

test('percentile: share of measured models beaten, in the better direction; ties and missing values excluded', () => {
  const A = { speed: 100, cost: 1 }, B = { speed: 200, cost: 0.5 }, C = { speed: 300, cost: 0.5 }, D = { speed: null, cost: 2 }, E = { speed: 400, cost: null };
  const ms = [A, B, C, D, E];
  assert.equal(percentile(ms, C, 'speed'), 50); // beats A and B of the 4 with a speed
  assert.equal(percentile(ms, E, 'speed'), 75);
  assert.equal(percentile(ms, B, 'cost'), 50); // cheaper than A and D; the tie with C doesn't count
  assert.equal(percentile(ms, A, 'cost'), 25);
  assert.equal(percentile(ms, D, 'speed'), null);
});

test('filter sliders: the ends are the exact extremes, the middle follows the axis kind and rounds to 3 figures', () => {
  const lin = rangeScale('linear', [10, 50, 30, null]);
  assert.deepEqual([lin.fromPos(0), lin.fromPos(1), lin.fromPos(0.5)], [10, 50, 30]);
  close(lin.toPos(20), 0.25);
  const log = rangeScale('log', [0.0123, 1, 100]);
  assert.deepEqual([log.fromPos(0), log.fromPos(1), log.fromPos(0.123)], [0.0123, 100, 0.0372]);
  close(log.toPos(1), Math.log10(1 / 0.0123) / Math.log10(100 / 0.0123));
  const date = rangeScale('date', ['2025-01-01', '2025-01-31']);
  assert.deepEqual([date.fromPos(0), date.fromPos(0.5), date.fromPos(1)], ['2025-01-01', '2025-01-16', '2025-01-31']);
  close(date.toPos('2025-01-16'), 0.5);
});

test('a model passes the filters when each filtered axis has a value inside its range', () => {
  const m = { intelligence: 40, price: 2, release: '2025-06-01', agi: null };
  assert.ok(inRanges(m, {}, ['intelligence', 'price', 'agi']));
  assert.ok(inRanges(m, { intelligence: [40, 50], release: ['2025-01-01', '2025-06-01'] }, ['intelligence', 'release'])); // ends count
  assert.ok(!inRanges(m, { price: [0.1, 1] }, ['price']));
  assert.ok(!inRanges(m, { agi: [0, 50] }, ['agi'])); // no score: outside
  assert.ok(inRanges(m, { price: [0.1, 1] }, ['intelligence'])); // a measure that isn't an axis doesn't filter
});

test('filter ranges go in the link, one parameter per axis, and come back', () => {
  const p = writeRanges(new URLSearchParams('x=release'), { price: [0.1, 2], release: ['2025-01-01', '2026-06-01'], speed: [1, 2] }, ['release', 'price', 'intelligence']);
  assert.equal(p.toString(), 'x=release&release=2025-01-01_2026-06-01&price=0.1_2');
  const kinds = { release: 'date', price: 'log', speed: 'linear' };
  assert.deepEqual(readRanges(p, kinds), { release: ['2025-01-01', '2026-06-01'], price: [0.1, 2] });
  assert.deepEqual(readRanges(new URLSearchParams('price=abc_2&speed=5_1&release=2025-13-99_2026-01-01'), kinds), {}); // junk, reversed, not a date
});
