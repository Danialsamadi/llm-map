// Pure math for the LLM map: no DOM, no three.js. Tested by test/space.test.mjs.

const DAY = 864e5;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const FLY_START = { x: 0, y: -1, z: -0.85 }; // front-centre of the cube's floor, world coordinates

// Maps one measure's values onto a cube edge (-1..1), with 5% padding on each side.
export function makeScale(kind, values) {
  const t = kind === 'log' ? Math.log10 : kind === 'date' ? v => Date.parse(v) : v => v;
  const raw = values.map(t).filter(Number.isFinite);
  let lo = raw.length ? Math.min(...raw) : 0, hi = raw.length ? Math.max(...raw) : 1;
  if (lo === hi) { const half = kind === 'date' ? 15 * DAY : 0.5; lo -= half; hi += half; } // one value: centre it
  const pad = (hi - lo) * 0.05;
  lo -= pad; hi += pad;
  const cube = u => ((u - lo) / (hi - lo)) * 2 - 1; // transformed unit (log10 / ms / raw) -> cube coordinate
  return { kind, lo, hi, cube, toCube: v => cube(t(v)) };
}

const fmtSmall = v => (v >= 1 ? String(Math.round(v)) : v.toFixed(Math.ceil(-Math.log10(v))));

// Tick marks for one axis: [{ cube, label }], inside -1..1.
export function ticks(scale, count = 5) {
  const { kind, lo, hi, cube } = scale, out = [];
  if (kind === 'date') {
    const months = (hi - lo) / (30.44 * DAY);
    const step = [1, 2, 3, 6, 12, 24, 60].find(s => months / s <= count) ?? 120;
    const d = new Date(lo);
    let m = d.getUTCFullYear() * 12 + d.getUTCMonth() + 1; // first month that starts after lo
    m = Math.ceil(m / step) * step;
    for (; Date.UTC(Math.floor(m / 12), m % 12, 1) <= hi; m += step)
      out.push({ u: Date.UTC(Math.floor(m / 12), m % 12, 1), label: `${MONTHS[m % 12]} ${Math.floor(m / 12)}` });
  } else if (kind === 'log') {
    for (let n = Math.ceil(lo); n <= Math.floor(hi); n++) out.push({ u: n, label: n >= 0 ? String(10 ** n) : (10 ** n).toFixed(-n) });
    if (out.length < 2)
      for (let n = Math.floor(lo); n <= Math.ceil(hi); n++)
        for (const f of [2, 5]) { const u = n + Math.log10(f); if (u >= lo && u <= hi) out.push({ u, label: fmtSmall(f * 10 ** n) }); }
    out.sort((a, b) => a.u - b.u);
  } else {
    const raw = (hi - lo) / count, p = 10 ** Math.floor(Math.log10(raw)), r = raw / p;
    const step = (r < 1.5 ? 1 : r < 3 ? 2 : r < 7 ? 5 : 10) * p;
    const dec = Math.max(0, -Math.floor(Math.log10(step) + 1e-9));
    for (let k = Math.ceil(lo / step - 1e-9); k * step <= hi + 1e-9; k++) out.push({ u: k * step, label: (k * step).toFixed(dec) });
  }
  return out.map(({ u, label }) => ({ cube: cube(u), label }));
}

// Cube coordinates [x, y, z] for each visible model; one scale per measure, fitted to the visible models.
export function layout(models, visible, axes, kinds) {
  const scales = axes.map((k, i) => makeScale(kinds[i], visible.map(j => models[j][k])));
  const pos = new Map(visible.map(j => [j, axes.map((k, i) => scales[i].toCube(models[j][k]))]));
  return { scales, pos };
}

// The n models closest to `from` (straight-line distance in cube coordinates), closest first.
export function nearest(pos, from, n, exclude) {
  return [...pos].filter(([j]) => j !== exclude)
    .map(([j, p]) => [j, Math.hypot(p[0] - from[0], p[1] - from[1], p[2] - from[2])])
    .sort((a, b) => a[1] - b[1] || a[0] - b[0]).slice(0, n).map(([j]) => j);
}

// [word when the value is higher, word when lower]
const WORDS = {
  intelligence: ['smarter', 'less smart'], cost: ['pricier', 'cheaper'], price: ['pricier', 'cheaper'],
  speed: ['faster', 'slower'], agi: ['higher ARC-AGI-2', 'lower ARC-AGI-2'], release: ['newer', 'older'],
};
export const BETTER = { intelligence: 'smarter', cost: 'cheaper', price: 'cheaper', speed: 'faster', agi: 'higher ARC-AGI-2', release: 'newer' };
export const betterSign = k => (k === 'cost' || k === 'price' ? -1 : 1);

// How `to` differs from `from`, in words, from the two biggest differences (cube units).
export function compare(axes, from, to) {
  const diffs = axes.map((k, i) => ({ k, d: to[i] - from[i] }))
    .filter(({ d }) => Math.abs(d) >= 0.1)
    .sort((a, b) => Math.abs(b.d) - Math.abs(a.d))
    .filter((x, i, all) => all.findIndex(y => y.k === x.k) === i) // the same measure twice (custom axes) counts once
    .slice(0, 2);
  if (!diffs.length) return 'very similar';
  return diffs.map(({ k, d }) => (Math.abs(d) > 0.4 ? 'much ' : 'a bit ') + WORDS[k][d > 0 ? 0 : 1]).join(', ');
}

// A polyline through points, walked by distance along it.
export function makePath(points) {
  const cum = [0];
  for (let i = 1; i < points.length; i++) cum.push(cum[i - 1] + Math.hypot(...points[i].map((v, k) => v - points[i - 1][k])));
  const length = cum.at(-1);
  const reached = dist => { let i = 0; while (i + 1 < points.length && cum[i + 1] <= dist + 1e-9) i++; return i; };
  const at = dist => {
    const d = Math.min(length, Math.max(0, dist)), i = Math.min(reached(d), points.length - 2);
    if (i < 0) return [...points[0]];
    const seg = cum[i + 1] - cum[i], f = seg ? (d - cum[i]) / seg : 0;
    return points[i].map((v, k) => v + (points[i + 1][k] - v) * f);
  };
  return { length, reached, at };
}

// Distance from point P to segment AB, in 2D (screen pixels).
export function segDist(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay, len2 = dx * dx + dy * dy;
  const t = len2 ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2)) : 0;
  return Math.hypot(px - ax - t * dx, py - ay - t * dy);
}

export const FADE = 0.18, FADE_LINE = 0.08; // dot and line opacity while another dot is focused

// How each visible dot and each company line is drawn. A Street View drop preview wins over focus.
// visible: model indices on the chart; lineCompanies: company per line, in line order;
// focus: model index or null; drop: null | { kind: 'dot', index } | { kind: 'line', company } | { kind: 'floor', point }
export function emphasis(visible, lineCompanies, focus, drop) {
  const on = !drop && focus != null && visible.includes(focus) ? focus : null;
  return {
    scale: visible.map(j => (drop?.kind === 'dot' && j === drop.index ? 2.2 : j === on ? 2.4 : 1)),
    alpha: visible.map(j => (on == null || j === on ? 1 : FADE)),
    lines: lineCompanies.map(c => (drop?.kind === 'line' ? (c === drop.company ? 1 : 0.15) : on != null ? FADE_LINE : 0.9)),
  };
}

// Street View part of the link: sv=stand&m=<model> | sv=ride&r=<company> | sv=fly
export function readSV(p) {
  const sv = p.get('sv');
  if (sv === 'stand' && p.get('m')) return { mode: 'stand', model: p.get('m') };
  if (sv === 'ride' && p.get('r')) return { mode: 'ride', company: p.get('r') };
  if (sv === 'fly') return { mode: 'fly' };
  return null;
}

export function writeSV(p, sv) {
  for (const k of ['sv', 'm', 'r']) p.delete(k);
  if (!sv) return p;
  p.set('sv', sv.mode);
  if (sv.mode === 'stand') p.set('m', sv.model);
  if (sv.mode === 'ride') p.set('r', sv.company);
  return p;
}
