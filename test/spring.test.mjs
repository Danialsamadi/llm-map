import { test } from 'node:test';
import assert from 'node:assert/strict';
import { springStep, project, rubberband, tracker } from '../public/spring.js';

const run = (opts, from, to, seconds, velocity = 0) => {
  let s = { x: from, v: velocity }, peak = from;
  for (let t = 0; t < seconds; t += 1 / 60) { s = springStep(s, to, opts, 1 / 60); peak = Math.max(peak, s.x); }
  return { s, peak };
};

test('a critically damped spring settles without overshooting', () => {
  const { s, peak } = run({ damping: 1, response: 0.4 }, 0, 100, 1.5);
  assert.ok(Math.abs(s.x - 100) < 0.5, `ends at ${s.x}`);
  assert.ok(peak <= 100.0001, `peak ${peak}`);
});

test('a bouncy spring overshoots, then settles', () => {
  const { s, peak } = run({ damping: 0.6, response: 0.4 }, 0, 100, 3);
  assert.ok(peak > 101, `peak ${peak}`);
  assert.ok(Math.abs(s.x - 100) < 0.5, `ends at ${s.x}`);
});

test('a spring keeps the velocity it starts with', () => {
  const s = springStep({ x: 0, v: 2000 }, 0, { damping: 1, response: 0.4 }, 1 / 120);
  assert.ok(s.x > 10, `moved ${s.x} in the first frame`);
});

test("momentum projection uses Apple's deceleration formula", () => {
  assert.ok(Math.abs(project(1000) - 499) < 1e-9);
  assert.equal(project(0), 0);
  assert.ok(project(-500) < 0);
});

test('rubber-banding gives way less and less, never past the limit', () => {
  const a = rubberband(50, 800), b = rubberband(400, 800), far = rubberband(1e9, 800);
  assert.ok(a > 0 && a < 50 && b < 400 && b > a);
  assert.ok(far < 800 && far > 799); // however far you pull, it never stretches past one full dimension
  assert.equal(Math.sign(rubberband(-50, 800)), -1);
});

test('the tracker measures velocity over the last 100 ms', () => {
  const t = tracker();
  t.add(0, 0); t.add(10, 50); t.add(30, 100); t.add(60, 150);
  assert.equal(t.velocity(), 500); // 50 px in the last 100 ms
  const still = tracker(); still.add(5, 0);
  assert.equal(still.velocity(), 0);
});

test('a drag that paused before release has no momentum', () => {
  const t = tracker();
  t.add(0, 0); t.add(100, 50); t.add(200, 100);
  t.add(200, 250); // released 150 ms after the last move, at the same spot
  assert.equal(t.velocity(), 0);
});
