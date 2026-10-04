// Motion in Apple's terms. Springs take a damping ratio (1 = no overshoot) and a response in seconds, and step
// from the current value and velocity, so any motion can be grabbed and re-targeted without a jump.

export function springStep({ x, v }, to, { damping = 1, response = 0.4 }, dt) {
  const k = (2 * Math.PI / response) ** 2, c = (4 * Math.PI * damping) / response; // stiffness, friction (mass 1)
  const n = Math.max(1, Math.ceil(dt / 0.004)), h = dt / n; // small steps keep stiff springs stable
  for (let i = 0; i < n; i++) { v += (-k * (x - to) - c * v) * h; x += v * h; }
  return { x, v };
}

// Runs a spring on animation frames. `rest` is how close counts as arrived, in the value's own units.
export function spring({ from, to, velocity = 0, damping = 1, response = 0.4, rest = 0.5, onUpdate, onDone }) {
  let s = { x: from, v: velocity }, last = null, id = 0;
  const tick = t => {
    const dt = last == null ? 1 / 60 : Math.min(0.05, (t - last) / 1000);
    last = t;
    s = springStep(s, to, { damping, response }, dt);
    if (Math.abs(s.x - to) < rest && Math.abs(s.v) < rest * 10) { s = { x: to, v: 0 }; id = 0; onUpdate(to); onDone?.(); return; }
    onUpdate(s.x);
    id = requestAnimationFrame(tick);
  };
  id = requestAnimationFrame(tick);
  return { stop() { cancelAnimationFrame(id); id = 0; return s; }, get running() { return id !== 0; } };
}

// Where a flick would come to rest: Apple's scroll-deceleration projection (velocity in units per second).
export const project = (velocity, rate = 0.998) => ((velocity / 1000) * rate) / (1 - rate);

// Past a boundary, follow the finger less and less, like stretching something real.
export const rubberband = (over, dimension, c = 0.55) => (over * dimension * c) / (dimension + c * Math.abs(over));

// Velocity of a drag over its last 100 ms (units per second).
export function tracker() {
  const h = [];
  return {
    add(x, t) { h.push([x, t]); while (h.length > 2 && t - h[0][1] > 100) h.shift(); },
    velocity() {
      if (h.length < 2) return 0;
      const [x0, t0] = h[0], [x1, t1] = h.at(-1);
      return t1 > t0 ? ((x1 - x0) * 1000) / (t1 - t0) : 0;
    },
  };
}
