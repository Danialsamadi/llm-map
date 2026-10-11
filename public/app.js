// Page logic: data, questions, companies, details card, About dialog and the link. The 3D view is scene.js.
import { createScene } from './scene.js';
import { readSV, writeSV, FLY_START, percentile, rangeScale, inRanges, readRanges, writeRanges } from './space.js';
import { t, fmt, rankWord, verdict } from './i18n.js';
import { createStreetView } from './streetview.js';
import { createSheet } from './sheet.js';
import { COMPANIES, companyFacts, sortCompanies } from './companies.js';
import { createTour } from './tour.js';

const lang = document.documentElement.lang === 'fa' ? 'fa' : 'en'; // decided before first paint by index.html's head script
const tr = (k, v) => t(lang, k, v), f = fmt(lang), rtl = lang === 'fa';

const M = (k, o) => ({ name: tr('name.' + k), axis: tr('axis.' + k), about: tr('about.' + k), ...o });
const MEASURES = {
  intelligence: M('intelligence', { better: tr('better.higher'), fmt: v => f.num(v, 1) }),
  cost: M('cost', { log: true, better: tr('better.lower'), fmt: v => f.money(v) }),
  price: M('price', { log: true, better: tr('better.lower'), fmt: v => tr('fmt.price', { v: f.money(v) }), tile: tr('tile.price'), short: v => f.money(v) }),
  speed: M('speed', { better: tr('better.higher'), fmt: v => tr('fmt.speed', { v: f.int(v) }), tile: tr('tile.speed'), short: v => tr('fmt.speedShort', { v: f.int(v) }) }), // Persian puts the unit in the label: «۳۴۷ توکن/ثانیه» overflows a tile
  agi: M('agi', { better: tr('better.higher'), fmt: v => f.pct(v) }),
  release: M('release', { date: true, better: tr('better.newest'), fmt: v => f.date(v) }),
};
const QUESTIONS = [['value', ['intelligence', 'cost', 'speed']], ['agi', ['release', 'agi', 'intelligence']], ['prices', ['release', 'price', 'intelligence']], ['custom', null]]
  .map(([id, axes]) => ({ id, title: tr('q.' + id), text: tr('q.' + id + '.text'), axes }));
const TOP = 5; // companies shown when the link doesn't name any
const PALETTE = ['#4e79a7','#f28e2b','#59a14f','#e15759','#b07aa1','#76b7b2','#edc948','#ff9da7','#9c755f','#bab0ac','#1f77b4','#ff7f0e','#2ca02c','#d62728','#9467bd','#8c564b','#e377c2','#17becf','#bcbd22','#7f7f7f'];
const $ = id => document.getElementById(id);
const el = (tag, props = {}, ...kids) => { // tiny DOM builder; strings become text, never HTML
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) k.startsWith('aria-') ? e.setAttribute(k, v) : e[k] = v;
  e.append(...kids);
  return e;
};
const icon = d => { // small stroked SVG icon from a path
  const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg'), p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('aria-hidden', 'true'); s.setAttribute('fill', 'none'); s.setAttribute('stroke', 'currentColor');
  s.setAttribute('stroke-width', '2.6'); s.setAttribute('stroke-linecap', 'round'); s.setAttribute('stroke-linejoin', 'round');
  p.setAttribute('d', d); s.append(p);
  return s;
};
const mq = matchMedia('(max-width: 699px)'); // phone: bottom sheet, short axis titles
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const kindOf = k => (MEASURES[k].log ? 'log' : MEASURES[k].date ? 'date' : 'linear');

// static page text: data-t -> text, data-t-label -> aria-label, data-t-title -> title, data-t-ph -> placeholder
for (const e of document.querySelectorAll('[data-t]')) e.textContent = tr(e.dataset.t);
for (const e of document.querySelectorAll('[data-t-label]')) e.setAttribute('aria-label', tr(e.dataset.tLabel));
for (const e of document.querySelectorAll('[data-t-title]')) e.title = tr(e.dataset.tTitle);
for (const e of document.querySelectorAll('[data-t-ph]')) e.placeholder = tr(e.dataset.tPh);
document.title = tr('brand');
$('langBtn').lang = rtl ? 'en' : 'fa'; // the button names the other language, in that language
const switchLang = () => { // to the other language: remembered, kept in the link, applied by reloading
  const p = new URLSearchParams(location.hash.slice(1));
  try { localStorage.setItem('lang', rtl ? 'en' : 'fa'); } catch {}
  if (rtl) p.delete('lang'); else p.set('lang', 'fa');
  history.replaceState(null, '', '#' + p);
  location.reload();
};
$('langBtn').onclick = switchLang;

let data, names, totals, color, picked, axes, question, shownAxes, wantSV = null, hiding = null;
let ranges = {}; // filter: { measure: [lo, hi] }; the chart's axes and release date apply
const boxes = new Map(); // company -> its checkbox in the company list
let sv = null; // Street View, once available
let hovered = null, selected = null; // model under the pointer; model whose card is open

const scene = createScene($('chart'), {
  onHover: (i, x, y) => { hovered = i; refocus(); tip(i, x, y); },
  onClick: (i, e) => { if (sv?.handleTap(i, e)) return; if (i != null) showCard(i); else hideCard(); },
});
window.llmMap = { scene, get sv() { return sv; } }; // handle for console debugging and browser checks
if (scene.ok) sv = createStreetView({ scene, lang, getState: () => ({ models: data.models, axes }), showCard, onChange: () => { if (data) writeLink(); chrome(); } });
else $('figure').hidden = true;

// ---------- phone sheets ----------
// peek: just the grabber, the question and the axis key; half; nearly full
const sheetHeights = () => [document.querySelector('#rail .grip').offsetHeight, Math.round(innerHeight * 0.5), Math.round(innerHeight - 56)];
// Dragging moves only the sheet: no per-move reads, page-wide styles or chart redraws (those made it lag on phones).
const sheet = createSheet($('rail'), { detents: sheetHeights, grip: '.grip', enabled: () => mq.matches });
const contentHeight = node => { const prev = node.style.height; node.style.height = 'auto'; const h = node.scrollHeight; node.style.height = prev; return h; };
const cardSheet = createSheet($('card'), {
  detents: () => [Math.min(contentHeight($('card')) + 1, Math.round(innerHeight * 0.72))], // +1: scrollHeight rounds, and half a pixel short makes the body scroll
  grip: '#card .grabber, #card .head', enabled: () => mq.matches, onDismiss: () => hideCard({ instant: true }),
});

// the highlighted dot: the hovered one, else the selected one; none in Street View
function refocus() { if (scene.ok) scene.setFocus(sv?.active() ? null : hovered ?? selected); }

// keep the cube centred in the part of the screen the panels leave open
function chrome() {
  const inside = !!sv?.active();
  document.body.classList.toggle('sv-on', inside);
  if (!scene.ok) return;
  refocus();
  if (mq.matches) {
    document.documentElement.style.setProperty('--sheet', (inside ? 0 : sheetHeights()[0]) + 'px');
    scene.setInsets({ left: 0, bottom: inside ? 0 : sheetHeights()[0] }); // centred above the peek; like Maps, the chart stays put while the sheet moves
  } else { const r = $('rail').getBoundingClientRect(); scene.setInsets(rtl ? { right: innerWidth - r.left } : { left: r.right }); } // the rail sits on the reading-start side
}

async function load() {
  try {
    const r = await fetch('/api/models');
    if (!r.ok) throw new Error(r.status);
    return { ...(await r.json()), mode: 'live' };
  } catch {
    const r = await fetch('models.json');
    if (!r.ok) throw new Error('no snapshot');
    return { ...(await r.json()), mode: 'snapshot' };
  }
}

function statusText() {
  if (data.mode === 'snapshot') return tr('status.snapshot', { date: f.date(data.updated.slice(0, 10)) });
  const mins = Math.max(0, Math.round((Date.now() - new Date(data.updated)) / 60000)), hours = Math.round(mins / 60);
  if (mins < 1) return tr('status.now');
  return tr('status.ago', { when: mins < 60 ? tr(mins === 1 ? 'unit.minute' : 'unit.minutes', { n: f.int(mins) }) : tr(hours === 1 ? 'unit.hour' : 'unit.hours', { n: f.int(hours) }) });
}

// ---------- question list ----------
function renderQuestions() {
  for (const q of QUESTIONS) {
    const input = el('input', { type: 'radio', name: 'question', value: q.id });
    input.onchange = () => { question = q.id; if (q.axes) axes = [...q.axes]; change(); };
    const more = el('div', { className: 'q-more' }, el('span', { textContent: q.text }));
    more.append(q.axes ? el('ul', { className: 'measures', id: 'm-' + q.id }) : customPicker());
    $('questions').append(el('label', { className: 'q' }, input, el('span', { className: 'q-title', textContent: q.title }), more));
  }
}

function customPicker() {
  const wrap = el('div', { id: 'custom' });
  ['X', 'Y', 'Z'].forEach((label, i) => {
    const s = el('select', { 'aria-label': tr('axisName', { axis: label }) });
    for (const [k, m] of Object.entries(MEASURES)) s.append(el('option', { value: k, textContent: m.name }));
    s.onchange = () => { axes[i] = s.value; change(); };
    wrap.append(el('label', {}, el('span', { className: 'ax-text-' + i, textContent: tr('axisName', { axis: label }) }), s));
  });
  wrap.append(el('ul', { className: 'measures', id: 'm-custom' }));
  return wrap;
}

// what each axis means for the chosen question, under its title (and in the phone sheet's peek)
const mark = i => el('i', { className: 'ax-mark ax-mark-' + i });
function renderMeasures() {
  for (const q of QUESTIONS) {
    const ul = $('m-' + q.id);
    if (q.id !== question) { ul.replaceChildren(); continue; }
    ul.replaceChildren(...axes.map((k, i) => el('li', {}, el('span', {}, mark(i), MEASURES[k].name), el('span', { textContent: MEASURES[k].better }))));
  }
  document.querySelectorAll('#custom select').forEach((s, i) => { s.value = axes[i]; });
  document.querySelector(`input[name=question][value=${question}]`).checked = true;
  $('peekQ').textContent = QUESTIONS.find(q => q.id === question).title;
  $('peekKey').replaceChildren(...axes.map((k, i) => el('li', {}, mark(i), MEASURES[k].name)));
}

// ---------- filter: a min-max slider per axis, on the axis's own scale, plus release date, which always filters ----------
// A handle at the end of its track is no limit on that side (null), so models newer than the newest today still show up.
const RECENT = [new Date(Date.now() - 365 * 864e5).toISOString().slice(0, 10), null]; // default: released in the last year
const filterKeys = () => [...new Set([...axes, 'release'])];
const isRecent = r => r?.[0] === RECENT[0] && r[1] == null;

function renderFilters() {
  $('filters').replaceChildren(...filterKeys().map(k => {
    const i = axes.indexOf(k), ms = MEASURES[k], show = ms.short ?? ms.fmt, sc = rangeScale(kindOf(k), data.models.map(m => m[k]));
    const ends = [sc.fromPos(0), sc.fromPos(1)], v = ranges[k] ? [...ranges[k]] : [null, null]; // v: the exact range, as in the link
    const thumb = (j, key) => el('input', { type: 'range', min: 0, max: 1000, value: v[j] == null ? j * 1000 : Math.round(sc.toPos(v[j]) * 1000), 'aria-label': tr(key, { name: ms.name }) });
    const a = thumb(0, 'filter.min'), b = thumb(1, 'filter.max'), fill = el('i'), val = el('span', { className: 'f-val' });
    fill.style.background = i < 0 ? 'var(--slate)' : `var(--ax-${i})`;
    const paint = () => {
      const [lo, hi] = v.map((x, j) => show(x ?? ends[j]));
      Object.assign(fill.style, { insetInlineStart: a.value / 10 + '%', insetInlineEnd: 100 - b.value / 10 + '%' });
      val.textContent = tr('filter.range', { lo, hi });
      a.setAttribute('aria-valuetext', lo); b.setAttribute('aria-valuetext', hi);
    };
    const read = x => (x.valueAsNumber === (x === a ? 0 : 1000) ? null : sc.fromPos(x.valueAsNumber / 1000));
    a.oninput = b.oninput = e => {
      const j = e.target === a ? 0 : 1, other = j ? a : b;
      if (a.valueAsNumber > b.valueAsNumber) { other.value = e.target.value; v[1 - j] = read(other); } // pushing past the other handle takes it along
      v[j] = read(e.target);
      if (k === 'release' || v.some(x => x != null)) ranges[k] = [...v]; else delete ranges[k]; // release keeps [null, null]: "all time", not the default
      paint(); resetShown(); writeLink(); draw();
    };
    paint();
    return el('div', { className: 'frow' }, el('div', { className: 'f-head' }, el('span', {}, i < 0 ? el('i', { className: 'ax-mark ax-mark-none' }) : mark(i), ms.tile ?? ms.name), val),
      el('div', { className: 'f-range' }, el('span', { className: 'f-track' }, fill), a, b));
  }));
  resetShown();
}
const resetShown = () => { $('fReset').hidden = filterKeys().every(k => (k === 'release' ? isRecent(ranges.release) : !ranges[k])); };
$('fReset').onclick = () => { for (const k of axes) delete ranges[k]; ranges.release = [...RECENT]; change(); };

// ---------- companies ----------
function renderPicker() {
  const check = 'M5 12.5l4.5 4.5L19 7';
  for (const co of names) { // textContent only: company names come from the API
    const cb = el('input', { type: 'checkbox', className: 'sr' });
    cb.onchange = () => { cb.checked ? picked.add(co) : picked.delete(co); change(); };
    boxes.set(co, cb);
    const name = el('span', { className: 'name' }, co);
    const row = el('label', { className: 'co' }, cb, dot(co), name, el('span', { className: 'n', textContent: f.int(totals.get(co)) }), icon(check));
    row.lastChild.classList.add('check');
    const info = el('button', { className: 'info', 'aria-label': tr('aboutCo', { name: co }) }, icon('M12 21a9 9 0 1 0 0-18a9 9 0 0 0 0 18zM12 11v5M12 7.5h.01'));
    info.onclick = () => showCompany(co, info);
    $('cos-list').append(el('div', { className: 'co-row' }, row, info)); // the button sits beside the label: inside it, it would join the checkbox's name
  }
  $('sort').onchange = () => $('cos-list').append(...sortCompanies(data.models, names, $('sort').value).map(co => boxes.get(co).closest('.co-row'))); // only the order changes: Top 5 and colours stay by model count
  $('q').oninput = () => { const q = $('q').value.toLowerCase(); for (const [co, cb] of boxes) cb.closest('.co-row').hidden = !co.toLowerCase().includes(q); };
  for (const b of document.querySelectorAll('.seg button')) b.onclick = () => {
    picked = new Set(b.dataset.pick === 'all' ? names : b.dataset.pick === 'top' ? names.slice(0, TOP) : []);
    change();
  };
}

const dot = co => { const d = el('span', { className: 'dot' }); d.style.background = color.get(co); return d; };

function renderCompanies(onChart) {
  const top = names.slice(0, TOP);
  const pickedNow = picked.size === names.length ? 'all' : !picked.size ? 'none' : picked.size === TOP && top.every(c => picked.has(c)) ? 'top' : null;
  for (const b of document.querySelectorAll('.seg button')) b.setAttribute('aria-pressed', b.dataset.pick === pickedNow);
  for (const [co, cb] of boxes) {
    cb.checked = picked.has(co);
    const name = cb.parentNode.querySelector('.name'), empty = picked.has(co) && !onChart.get(co);
    name.replaceChildren(co, ...(empty ? [el('span', { className: 'note', textContent: tr('notInView') })] : []));
  }
}

// ---------- chart ----------
function draw() {
  const visible = data.models.flatMap((m, i) => (picked.has(m.company) && axes.every(k => m[k] != null) && inRanges(m, ranges, filterKeys()) ? [i] : []));
  if (scene.ok) {
    scene.setData({ models: data.models, visible, axes, kinds: axes.map(kindOf), titles: axes.map(k => (mq.matches ? MEASURES[k].name : MEASURES[k].axis)), colors: color,
      tickLabel: rtl ? tk => (tk.iso ? f.month(tk.iso) : f.digits(tk.label)) : undefined });
    sv?.refresh();
  }
  const onChart = new Map([...Map.groupBy(visible, i => data.models[i].company)].map(([co, idx]) => [co, idx.length]));
  $('count').textContent = tr('count', { shown: f.int(visible.length), total: f.int(data.models.length) });
  renderCompanies(onChart);
  emptyState(visible.length);
}

function tip(i, x, y) {
  const t = $('tip');
  if (i == null || !data) { t.hidden = true; return; }
  const m = data.models[i];
  t.replaceChildren(el('strong', { textContent: m.name }), el('span', { textContent: m.company }));
  t.hidden = false;
  t.style.left = Math.max(8, Math.min(rtl ? x - 14 - t.offsetWidth : x + 14, innerWidth - t.offsetWidth - 8)) + 'px'; // beside the pointer, on the reading-end side
  t.style.top = Math.max(8, y - t.offsetHeight - 12) + 'px';
}

function emptyState(n) {
  if (!scene.ok) return; // the "can't show 3D" message stays
  const box = $('empty');
  box.hidden = n > 0;
  if (n) return;
  if (!picked.size) {
    const b = el('button', { className: 'btn', textContent: tr('empty.top5') });
    b.onclick = () => { picked = new Set(names.slice(0, TOP)); change(); };
    box.replaceChildren(el('p', { textContent: tr('empty.pick') }), b);
  } else {
    const theirs = data.models.filter(m => picked.has(m.company));
    if (theirs.some(m => axes.every(k => m[k] != null))) { // they have models here: the filter hides them all
      const b = el('button', { className: 'btn', textContent: tr('empty.reset') });
      b.onclick = () => $('fReset').click();
      return box.replaceChildren(el('p', { textContent: tr('empty.filtered') }), b);
    }
    const missing = axes.filter(k => !theirs.some(m => m[k] != null)).map(k => MEASURES[k].name);
    box.replaceChildren(el('p', { textContent: missing.length ? tr('empty.missing', { measures: missing.join(tr('list.or')) }) : tr('empty.missingAll') }));
  }
}

// ---------- details card: a popover that grows out of what was clicked; a sheet on phones ----------
let moved = false, drag = null; // desktop: dragged by hand since it opened; the drag in progress

// head: title lines (on phones they drag the sheet); body: the rest (on phones it scrolls when the sheet is full)
// (ax, ay): the point it grows out of on desktop; leave them out to keep it where it is
function openCard(head, body, ax, ay) {
  const card = $('card');
  const close = el('button', { id: 'close', 'aria-label': tr('close') }, icon('M6 6l12 12M18 6L6 18'));
  close.onclick = () => hideCard();
  card.replaceChildren(el('div', { className: 'grabber' }), close, el('div', { className: 'head' }, ...head), el('div', { className: 'scroll' }, ...body));
  hiding?.cancel(); hiding = null; // reopened while closing: keep it open
  const wasOpen = !card.hidden;
  card.hidden = false;
  document.body.classList.add('card-on'); // phones: the card stands in for the rail, which fades out
  if (mq.matches) {
    card.style.left = card.style.top = card.style.transformOrigin = '';
    if (wasOpen) cardSheet.layout(); // new content: resize to it
    else { cardSheet.reset(); cardSheet.open(0); } // rises from the bottom on a spring
    return;
  }
  // desktop popover: beside the anchor, inside the open area, scaling out from the anchor itself; once dragged, it stays put
  const w = card.offsetWidth, stay = ax == null || moved;
  const beside = rtl ? (ax - 20 - w < 12 ? ax + 20 : ax - 20 - w) : (ax + 20 + w > innerWidth - 12 ? ax - 20 - w : ax + 20); // reading-end side of the dot first
  const { left, top } = placeCard(stay ? card.offsetLeft : beside, stay ? card.offsetTop : ay - 44);
  if (!stay) card.style.transformOrigin = `${ax - left}px ${ay - top}px`;
  if (!wasOpen) card.animate(reduced.matches ? [{ opacity: 0 }, { opacity: 1 }]
    : [{ opacity: 0, transform: 'scale(.6)', filter: 'blur(8px)' }, { opacity: 1, transform: 'none', filter: 'blur(0)' }],
  { duration: reduced.matches ? 150 : 260, easing: 'cubic-bezier(.2, .9, .25, 1)' });
}

// desktop: inside the window and clear of the rail (which is on the right in Persian)
function placeCard(left, top) {
  const card = $('card'), r = $('rail').getBoundingClientRect();
  left = Math.max(rtl ? 12 : r.right + 12, Math.min(left, (rtl ? r.left - 12 : innerWidth - 12) - card.offsetWidth));
  top = Math.max(12, Math.min(top, innerHeight - 12 - card.offsetHeight));
  Object.assign(card.style, { left: left + 'px', top: top + 'px' });
  return { left, top };
}

function showCard(i) {
  if (i == null) return;
  selected = i; refocus();
  const m = data.models[i];
  const ranks = Object.keys(MEASURES).filter(k => k !== 'release').map(k => [k, percentile(data.models, m, k)]);
  const stats = ranks.map(([k, p]) => {
    const ms = MEASURES[k], label = el('span', { className: 'lab', textContent: ms.tile ?? ms.name });
    if (p == null) return el('div', { className: 'stat' }, label, el('span', { className: 'none', textContent: tr('notMeasured') }));
    const fill = el('i'), ax = axes.indexOf(k); // on the chart now: the bar takes that axis's colour
    Object.assign(fill.style, { width: p + '%', background: ax < 0 ? 'var(--slate)' : `var(--ax-${ax})` });
    return el('div', { className: 'stat' }, label, el('span', { className: 'big', textContent: (ms.short ?? ms.fmt)(m[k]) }), el('span', { className: 'bar' }, fill),
      el('span', { className: 'badge ' + (p >= 60 ? 'good' : p >= 40 ? 'mid' : 'low'), textContent: rankWord(lang, p) }));
  });
  const co = el('button', { 'aria-label': tr('aboutCo', { name: m.company }), textContent: m.company });
  co.onclick = () => showCompany(m.company);
  const p = scene.worldOf(i)?.clone().project(scene.camera); // grows out of the dot
  openCard([el('h3', { textContent: m.name }),
    el('p', { className: 'who' }, dot(m.company), el('span', {}, co, ...(m.release ? [tr('released', { date: MEASURES.release.fmt(m.release) })] : [])))],
  [el('p', { className: 'verdict', textContent: verdict(lang, ranks) }), el('div', { className: 'stats' }, ...stats)],
  p ? ((p.x + 1) / 2) * innerWidth : innerWidth - 40, p ? ((1 - p.y) / 2) * innerHeight : innerHeight - 40);
}

// from: the ⓘ button in the company list; left out when switching from a model's card, which then stays put
function showCompany(co, from) {
  selected = null; refocus();
  const facts = companyFacts(data.models, co, Object.keys(MEASURES).filter(k => k !== 'release')), c = COMPANIES[co];
  const rows = facts.best.map(({ key, model }) => el('div', { className: 'row' },
    el('dt', { textContent: MEASURES[key].name }), el('dd', {}, model.name, el('small', { textContent: MEASURES[key].fmt(model[key]) }))));
  const head = [el('h3', { textContent: co })], kids = [];
  if (c) head.push(el('p', { className: 'who' }, dot(co), el('a', { href: c.url, target: '_blank', rel: 'noopener', textContent: new URL(c.url).hostname.replace(/^www\./, '') + ' ↗' }))),
    kids.push(el('p', { textContent: rtl ? c.fa : c.about }));
  kids.push(el('p', { className: 'facts', textContent: tr(facts.count === 1 ? 'models.one' : 'models.many', { n: f.int(facts.count) })
    + (facts.newest ? tr('newest', { name: facts.newest.name, date: MEASURES.release.fmt(facts.newest.release) }) : '') }),
    el('dl', {}, ...rows));
  if (!from) return openCard(head, kids);
  const r = from.getBoundingClientRect();
  openCard(head, kids, r.left + r.width / 2, r.top + r.height / 2);
}

function hideCard({ instant = false } = {}) {
  selected = null; refocus();
  const card = $('card');
  if (card.hidden) return;
  document.body.classList.remove('card-on'); // the rail fades back while the card leaves
  moved = false; // reopened while closing: beside its anchor again
  const done = () => { card.hidden = true; cardSheet.reset(); moved = false; drop(); };
  if (instant) return done();
  if (mq.matches) return cardSheet.close(done);
  hiding = card.animate(reduced.matches ? [{ opacity: 1 }, { opacity: 0 }]
    : [{ opacity: 1, transform: 'none', filter: 'blur(0)' }, { opacity: 0, transform: 'scale(.6)', filter: 'blur(8px)' }], // back into the dot
  { duration: reduced.matches ? 120 : 180, easing: 'cubic-bezier(.4, 0, 1, 1)' });
  hiding.onfinish = () => { hiding = null; done(); };
}

// desktop: drag the card by its top strip (on phones cardSheet drags it)
const drop = () => { drag = null; $('card').classList.remove('dragging'); };
$('card').addEventListener('pointerdown', e => {
  if (mq.matches || e.button > 0 || !e.target.closest('.grabber')) return;
  const card = $('card');
  e.preventDefault(); // no text selection
  try { card.setPointerCapture(e.pointerId); } catch {} // on the card: the grabber is replaced when the content changes
  drag = { id: e.pointerId, dx: e.clientX - card.offsetLeft, dy: e.clientY - card.offsetTop };
  card.classList.add('dragging');
});
$('card').addEventListener('pointermove', e => {
  if (drag?.id !== e.pointerId) return;
  if (!e.buttons) return drop(); // its pointerup went missing, e.g. released outside the window
  moved = true;
  $('card').style.transformOrigin = ''; // far from its dot now: close by shrinking in place
  placeCard(e.clientX - drag.dx, e.clientY - drag.dy);
});
$('card').addEventListener('pointerup', drop);
$('card').addEventListener('pointercancel', drop);

// ---------- state <-> link ----------
// #x=..&y=..&z=..[&price=lo_hi …one filter range per axis]&c=Company&c=Company[&sv=stand&m=Model | &sv=ride&r=Company | &sv=fly]
// No c: top 5. c=*: all. c= (empty): none.
function writeLink() {
  const p = new URLSearchParams({ x: axes[0], y: axes[1], z: axes[2] });
  const top = names.slice(0, TOP);
  if (picked.size === names.length) p.append('c', '*');
  else if (!picked.size) p.append('c', '');
  else if (!(picked.size === top.length && top.every(c => picked.has(c)))) for (const c of names.filter(c => picked.has(c))) p.append('c', c);
  writeRanges(p, { ...ranges, release: isRecent(ranges.release) ? null : ranges.release }, filterKeys()); // the default stays out of the link: it means the last year whenever the link is opened
  writeSV(p, sv?.current());
  if (rtl) p.set('lang', 'fa');
  history.replaceState(null, '', '#' + p);
}

function change() {
  if (question !== 'custom') { const q = QUESTIONS.find(q => q.axes?.every((k, i) => axes[i] === k)); if (!q) question = 'custom'; }
  if (shownAxes && shownAxes.join() !== axes.join()) sv?.exit({ instant: true }); // every dot moves: leave Street View first
  shownAxes = [...axes];
  writeLink();
  renderMeasures();
  renderFilters();
  draw();
}

function readLink() {
  const p = new URLSearchParams(location.hash.slice(1));
  const a = ['x', 'y', 'z'].map(k => p.get(k));
  axes = a.every(k => Object.hasOwn(MEASURES, k)) ? a : [...QUESTIONS[0].axes];
  question = QUESTIONS.find(q => q.axes?.every((k, i) => axes[i] === k))?.id ?? 'custom';
  const c = p.getAll('c'), known = c.filter(n => totals.has(n));
  picked = new Set(c.includes('*') ? names : c.length === 1 && c[0] === '' ? [] : known.length ? known : names.slice(0, TOP));
  ranges = readRanges(p, Object.fromEntries(Object.keys(MEASURES).map(k => [k, kindOf(k)])));
  ranges.release ??= [...RECENT];
  wantSV = readSV(p);
}

// open Street View from the link, if the page can honour it; otherwise drop those link parts
function openSV() {
  const want = wantSV;
  wantSV = null;
  if (want && sv) {
    if (want.mode === 'stand') { const i = scene.visible().find(j => data.models[j].name === want.model); if (i != null) sv.enter({ kind: 'dot', index: i }); }
    if (want.mode === 'ride') {
      if (!picked.has(want.company) && totals.has(want.company)) { picked.add(want.company); change(); }
      if (scene.lines().some(l => l.company === want.company && l.points.length > 1)) sv.enter({ kind: 'line', company: want.company });
    }
    if (want.mode === 'fly') sv.enter({ kind: 'floor', point: FLY_START });
  }
  writeLink();
}

function init() {
  const by = Map.groupBy(data.models, m => m.company);
  totals = new Map([...by].map(([c, ms]) => [c, ms.length]));
  names = [...by.keys()].sort((a, b) => totals.get(b) - totals.get(a) || a.localeCompare(b)); // name breaks ties so colours match between live and saved copy
  color = new Map(names.map((c, i) => [c, PALETTE[i % PALETTE.length]]));
  $('status').textContent = $('about-status').textContent = statusText();
  if (!scene.ok) {
    $('empty').hidden = false;
    $('empty').replaceChildren(el('p', { textContent: tr('no3d') }));
  }
  renderQuestions();
  renderPicker();
  readLink();
  change();
  layout();
  openSV();
}

function layout() {
  if (mq.matches) sheet.open(sheet.index(), { instant: true }); else sheet.reset();
  chrome();
}

// ---------- page chrome ----------
$('glossary').append(...Object.values(MEASURES).map(m => el('li', {}, el('strong', { textContent: m.name + ': ' }), m.about)));
$('aboutBtn').onclick = () => $('about').showModal();
const tour = createTour($('tour'), { tr, rtl, int: f.int, onLang: at => { try { sessionStorage.setItem('tourAt', at); } catch {} switchLang(); } });
const tourAt = () => { try { const at = sessionStorage.getItem('tourAt'); sessionStorage.removeItem('tourAt'); return at == null ? null : +at; } catch { return null; } }; // set when the tour switched language
$('tourBtn').onclick = () => { $('about').close(); tour.open(); };
$('homeBtn').onclick = () => scene.ok && scene.resetView(reduced.matches ? 0 : 700);
$('grabber').onclick = () => sheet.cycle();
document.querySelector('.peek').onclick = () => { if (sheet.index() === 0) sheet.open(1); };
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && !$('card').hidden && !$('about').open) { hideCard(); e.preventDefault(); } // preventDefault: Street View won't also exit
}, true); // capture: runs before Street View's own Escape handler, which was registered earlier
mq.addEventListener('change', () => { hideCard({ instant: true }); if (data) { layout(); draw(); } });
addEventListener('resize', () => { if (data && mq.matches) sheet.layout(); chrome(); });
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => data && draw()); // colours come from CSS variables
document.fonts?.ready.then(() => data && draw()); // redraw labels once fonts are ready
addEventListener('hashchange', () => location.reload()); // a pasted link in an open tab; our own replaceState doesn't fire this

// ---------- loading cover: up from the first paint until the chart, panel and font are ready, so the page appears whole ----------
const nextFrame = () => new Promise(s => { requestAnimationFrame(() => s()); setTimeout(s, 200); }); // a hidden tab draws no frames
async function reveal() {
  await Promise.race([document.fonts?.ready, new Promise(s => setTimeout(s, 2500))]); // a slow font doesn't hold the page back
  await nextFrame(); await nextFrame(); // the chart's first frame is on screen
  await new Promise(s => setTimeout(s, 1600 - performance.now())); // at least one full wave of the hopping balls, even on a fast load
  const cover = $('loading');
  await Promise.race([morph(cover), new Promise(s => setTimeout(s, 1500))]); // a hidden tab may never finish animating
  cover.remove();
}

// The cover morphs into the page: the three balls arc into the axis key's three dots (same colours) while the cover dissolves.
function morph(cover) {
  const balls = [...cover.querySelectorAll('.dots i')];
  const marks = [...document.querySelectorAll(mq.matches ? '#peekKey .ax-mark' : `#m-${question} .ax-mark`)];
  const landable = marks.length === 3 && marks.every(m => { const r = m.getBoundingClientRect(); return r.width > 0 && r.top >= 0 && r.bottom <= innerHeight; });
  if (reduced.matches || sv?.active() || !landable) {
    cover.classList.add('done'); // a plain fade: no movement, so fine with reduced motion too
    return new Promise(s => setTimeout(s, 300));
  }
  const from = balls.map(b => b.getBoundingClientRect()); // mid-hop, where the eye last saw them
  cover.classList.add('morph'); // stops the hop; shadows and text fade
  cover.animate([{ backgroundColor: getComputedStyle(cover).backgroundColor }, { backgroundColor: 'transparent' }], { duration: 450, easing: 'ease', fill: 'forwards' });
  return Promise.all(balls.map((b, i) => {
    const base = b.getBoundingClientRect(), to = marks[i].getBoundingClientRect(), f = from[i];
    const at = (x, y, w) => `translate(${x - (base.left + base.width / 2)}px, ${y - (base.top + base.height / 2)}px) scale(${w / base.width})`;
    const fx = f.left + f.width / 2, fy = f.top + f.height / 2, tx = to.left + to.width / 2, ty = to.top + to.height / 2;
    return b.animate([{ transform: at(fx, fy, f.width) }, { transform: at((fx + tx) / 2, (fy + ty) / 2 - 48, (f.width + to.width) / 2), offset: 0.45 }, { transform: at(tx, ty, to.width) }],
      { duration: 700, delay: i * 60, easing: 'cubic-bezier(.45, 0, .2, 1)', fill: 'forwards' }).finished;
  }));
}

$('loadMsg').textContent = tr('load.models'); // this module only runs once three.js has arrived
load().then(d => { data = d; $('loadMsg').textContent = tr('load.drawing'); try { init(); } finally { reveal().then(() => { const at = tourAt(); if (at != null) tour.open(at); else if (!tour.seen()) tour.open(); }); } }, () => {
  const again = el('button', { className: 'btn', textContent: tr('load.reload') });
  again.onclick = () => location.reload();
  $('loading').replaceChildren(el('p', { textContent: tr('load.failed') }), again);
});
