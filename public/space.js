// Pure math for the LLM map: no DOM, no three.js. Tested by test/space.test.mjs.
import { t } from './i18n.js';

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

// Tick marks for one axis: [{ cube, label, iso? }], inside -1..1. Date ticks carry their date so a page can label them in its own calendar.
export function ticks(scale, count = 5) {
  const { kind, lo, hi, cube } = scale, out = [];
  if (kind === 'date') {
    const months = (hi - lo) / (30.44 * DAY);
    const step = [1, 2, 3, 6, 12, 24, 60].find(s => months / s <= count) ?? 120;
    const d = new Date(lo);
    let m = d.getUTCFullYear() * 12 + d.getUTCMonth() + 1; // first month that starts after lo
    m = Math.ceil(m / step) * step;
    for (; Date.UTC(Math.floor(m / 12), m % 12, 1) <= hi; m += step)
      out.push({ u: Date.UTC(Math.floor(m / 12), m % 12, 1), label: `${MONTHS[m % 12]} ${Math.floor(m / 12)}`, iso: new Date(Date.UTC(Math.floor(m / 12), m % 12, 1)).toISOString().slice(0, 10) });
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
  return out.map(({ u, ...rest }) => ({ cube: cube(u), ...rest }));
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

export const betterSign = k => (k === 'cost' || k === 'price' ? -1 : 1);

// How `to` differs from `from`, in words, from the two biggest differences (cube units).
export function compare(axes, from, to, lang = 'en') {
  const diffs = axes.map((k, i) => ({ k, d: to[i] - from[i] }))
    .filter(({ d }) => Math.abs(d) >= 0.1)
    .sort((a, b) => Math.abs(b.d) - Math.abs(a.d))
    .filter((x, i, all) => all.findIndex(y => y.k === x.k) === i) // the same measure twice (custom axes) counts once
    .slice(0, 2);
  if (!diffs.length) return t(lang, 'cmp.same');
  return diffs.map(({ k, d }) => t(lang, Math.abs(d) > 0.4 ? 'cmp.much' : 'cmp.bit', { w: t(lang, `cmp.${k}.${d > 0 ? 'up' : 'down'}`) })).join(t(lang, 'list.comma'));
}

// Share (0-100) of the models measured on k that model m beats, in k's better direction; ties don't count. null if m has no value.
export function percentile(models, m, k) {
  if (m[k] == null) return null;
  const s = betterSign(k), xs = models.filter(o => o[k] != null);
  return Math.round((100 * xs.filter(o => s * o[k] < s * m[k]).length) / xs.length);
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

// How each visible dot and each company line is drawn. A Street View drop preview wins over focus, and focus over the best trade-offs.
// visible: model indices on the chart; lineCompanies: company per line, in line order;
// focus: model index or null; drop: null | { kind: 'dot', index } | { kind: 'line', company } | { kind: 'floor', point }; best: Set of model indices or null
export function emphasis(visible, lineCompanies, focus, drop, best = null) {
  const on = !drop && focus != null && visible.includes(focus) ? focus : null;
  const lit = drop || on != null || !best?.size ? null : best;
  return {
    scale: visible.map(j => (drop?.kind === 'dot' && j === drop.index ? 2.2 : j === on ? 2.4 : lit?.has(j) ? 1.6 : 1)),
    alpha: visible.map(j => (on != null ? (j === on ? 1 : FADE) : lit ? (lit.has(j) ? 1 : FADE) : 1)),
    lines: lineCompanies.map(c => (drop?.kind === 'line' ? (c === drop.company ? 1 : 0.15) : on != null || lit ? FADE_LINE : 0.9)),
  };
}

// Model search: indices of models whose name has every word of q; exact names first, then names starting with q, then newest.
export function searchModels(models, q, limit = 6) {
  const want = q.trim().toLowerCase(), words = want.split(/\s+/);
  if (want.length < 2) return [];
  return models.flatMap((m, i) => {
    const n = m.name.toLowerCase();
    return words.every(w => n.includes(w)) ? [[i, n === want ? 0 : n.startsWith(want) ? 1 : 2, m.release ?? '']] : [];
  }).sort((a, b) => a[1] - b[1] || (a[2] < b[2] ? 1 : a[2] > b[2] ? -1 : 0)).slice(0, limit).map(([i]) => i);
}

// Best trade-offs (the Pareto front): visible models that no other visible model matches or beats on every key and beats on at least one.
// ponytail: compares every pair, ~500k checks for 700 models; fine at this size.
export function frontier(models, visible, keys) {
  const ks = [...new Set(keys)], v = (m, k) => betterSign(k) * (typeof m[k] === 'string' ? Date.parse(m[k]) : m[k]);
  const beats = (o, m) => ks.every(k => v(o, k) >= v(m, k)) && ks.some(k => v(o, k) > v(m, k));
  return new Set(visible.filter(j => !visible.some(o => o !== j && beats(models[o], models[j]))));
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

// ---------- filter ranges: { measure: [lo, hi] } in the measure's own units (ISO date strings for dates); null is no limit on that side ----------
const unit = kind => (kind === 'log' ? Math.log10 : kind === 'date' ? Date.parse : Number);
const fromUnit = (kind, u) => (kind === 'date' ? new Date(u).toISOString().slice(0, 10) : Number((kind === 'log' ? 10 ** u : u).toPrecision(3)));

// A slider over all of a measure's values: position 0..1 <-> value, on the axis's own scale. The ends are the exact extremes.
export function rangeScale(kind, values) {
  const t = unit(kind), vs = values.filter(v => v != null && Number.isFinite(t(v)));
  const min = vs.reduce((a, v) => (t(v) < t(a) ? v : a), vs[0]), max = vs.reduce((a, v) => (t(v) > t(a) ? v : a), vs[0]);
  const lo = t(min), hi = t(max);
  return {
    toPos: v => (hi === lo ? 0 : Math.max(0, Math.min(1, (t(v) - lo) / (hi - lo)))),
    fromPos: p => (p <= 0 ? min : p >= 1 ? max : fromUnit(kind, lo + p * (hi - lo))),
  };
}

// Only the measures in keys filter; a model without a value is outside any range with a limit.
export const inRanges = (m, ranges, keys) => keys.every(k => {
  const [lo, hi] = ranges[k] ?? [null, null];
  return (lo == null && hi == null) || (m[k] != null && (lo == null || m[k] >= lo) && (hi == null || m[k] <= hi));
});

export function writeRanges(p, ranges, axes) {
  for (const k of new Set(axes)) if (ranges[k]) p.set(k, ranges[k].map(v => v ?? '').join('_'));
  return p;
}

// kinds: { measure: 'linear' | 'log' | 'date' }; anything unreadable or reversed is dropped
export function readRanges(p, kinds) {
  const out = {};
  for (const [k, kind] of Object.entries(kinds)) {
    const parts = p.get(k)?.split('_');
    if (parts?.length !== 2) continue;
    const r = parts.map(v => (v === '' ? null : kind === 'date' ? v : Number(v)));
    if (r.every(v => v == null || Number.isFinite(unit(kind)(v))) && !(r[0] != null && r[1] != null && r[0] > r[1])) out[k] = r;
  }
  return out;
}
