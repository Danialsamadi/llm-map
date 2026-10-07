// Page logic: data, questions, companies, details card, About dialog and the link. The 3D view is scene.js.
import { createScene } from './scene.js';
import { readSV, writeSV, FLY_START } from './space.js';
import { createStreetView } from './streetview.js';
import { createSheet } from './sheet.js';
import { COMPANIES, companyFacts } from './companies.js';

const MEASURES = {
  intelligence: { name: 'Smartness', axis: 'Smartness (AA index)', better: 'higher is better', about: 'Artificial Analysis Intelligence Index: one score from tests of reasoning, coding and knowledge.', fmt: v => v.toFixed(1) },
  cost: { name: 'Cost per task', axis: 'Cost per task ($)', log: true, better: 'lower is better', about: 'What it cost to run one question of that benchmark, in US dollars.', fmt: v => money(v) },
  price: { name: 'Price', axis: 'Price ($ per 1M tokens)', log: true, better: 'lower is better', about: 'API price per million tokens, blending 3 parts input to 1 part output.', fmt: v => money(v) + ' per 1M tokens' },
  speed: { name: 'Speed', axis: 'Speed (tokens/s)', better: 'higher is better', about: 'How many tokens per second the model writes.', fmt: v => Math.round(v) + ' tokens/s' },
  agi: { name: 'ARC-AGI-2', axis: 'ARC-AGI-2 (% solved)', better: 'higher is better', about: 'Share of ARC-AGI-2 puzzles solved. They are easy for people and hard for AI.', fmt: v => v.toFixed(1) + '%' },
  release: { name: 'Release date', axis: 'Release date', date: true, better: 'newest at the far end', about: 'When the model came out.', fmt: v => new Date(v + 'T00:00:00Z').toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' }) },
};
const QUESTIONS = [
  { id: 'value', title: 'Smart, cheap or fast?', text: 'Find models that are clever without costing a lot or keeping you waiting.', axes: ['intelligence', 'cost', 'speed'] },
  { id: 'agi', title: 'How close to AGI?', text: 'Watch ARC-AGI-2 puzzle scores change with each new release.', axes: ['release', 'agi', 'intelligence'] },
  { id: 'prices', title: 'Are prices falling?', text: 'What each new model charges, with smartness for context.', axes: ['release', 'price', 'intelligence'] },
  { id: 'custom', title: 'Build my own', text: 'Pick any three measures.', axes: null },
];
const TOP = 5; // companies shown when the link doesn't name any
const PALETTE = ['#4e79a7','#f28e2b','#59a14f','#e15759','#b07aa1','#76b7b2','#edc948','#ff9da7','#9c755f','#bab0ac','#1f77b4','#ff7f0e','#2ca02c','#d62728','#9467bd','#8c564b','#e377c2','#17becf','#bcbd22','#7f7f7f'];
const money = v => '$' + (v >= 1 ? v.toFixed(2) : v.toPrecision(2));
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

let data, names, totals, color, picked, axes, question, shownAxes, wantSV = null, hiding = null;
const boxes = new Map(); // company -> its checkbox in the company list
let sv = null; // Street View, once available

const scene = createScene($('chart'), {
  onHover: tip,
  onClick: (i, e) => { if (sv?.handleTap(i, e)) return; if (i != null) showCard(i); else hideCard(); },
});
window.llmMap = { scene, get sv() { return sv; } }; // handle for console debugging and browser checks
if (scene.ok) sv = createStreetView({ scene, getState: () => ({ models: data.models, axes }), showCard, onChange: () => { if (data) writeLink(); chrome(); } });
else $('figure').hidden = true;

// ---------- phone sheets ----------
// peek: just the grabber, the question and the axis key; half; nearly full
const sheetHeights = () => [document.querySelector('#rail .grip').offsetHeight, Math.round(innerHeight * 0.5), Math.round(innerHeight - 56)];
// Dragging moves only the sheet: no per-move reads, page-wide styles or chart redraws (those made it lag on phones).
const sheet = createSheet($('rail'), { detents: sheetHeights, grip: '.grip', enabled: () => mq.matches });
const contentHeight = node => { const prev = node.style.height; node.style.height = 'auto'; const h = node.scrollHeight; node.style.height = prev; return h; };
const cardSheet = createSheet($('card'), {
  detents: () => [Math.min(contentHeight($('card')), Math.round(innerHeight * 0.72))],
  grip: '#card', enabled: () => mq.matches, onDismiss: () => hideCard({ instant: true }),
});

// keep the cube centred in the part of the screen the panels leave open
function chrome() {
  const inside = !!sv?.active();
  document.body.classList.toggle('sv-on', inside);
  if (!scene.ok) return;
  if (mq.matches) {
    document.documentElement.style.setProperty('--sheet', (inside ? 0 : sheetHeights()[0]) + 'px');
    scene.setInsets({ left: 0, bottom: inside ? 0 : sheetHeights()[0] }); // centred above the peek; like Maps, the chart stays put while the sheet moves
  } else scene.setInsets({ left: $('rail').getBoundingClientRect().right, bottom: 0 });
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
  const t = new Date(data.updated);
  if (data.mode === 'snapshot') return `Showing a saved copy from ${t.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}. Live data is unavailable right now.`;
  const mins = Math.max(0, Math.round((Date.now() - t) / 60000));
  if (mins < 1) return 'Live data, updated just now.';
  return `Live data, updated ${mins < 60 ? mins + (mins === 1 ? ' minute' : ' minutes') : Math.round(mins / 60) + (Math.round(mins / 60) === 1 ? ' hour' : ' hours')} ago.`;
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
    const s = el('select', { 'aria-label': label + ' axis' });
    for (const [k, m] of Object.entries(MEASURES)) s.append(el('option', { value: k, textContent: m.name }));
    s.onchange = () => { axes[i] = s.value; change(); };
    wrap.append(el('label', {}, el('span', { className: 'ax-text-' + i, textContent: label + ' axis' }), s));
  });
  wrap.append(el('ul', { className: 'measures', id: 'm-custom' }));
  return wrap;
}

// what each axis means for the chosen question, under its title (and in the phone sheet's peek)
function renderMeasures() {
  const mark = i => el('i', { className: 'ax-mark ax-mark-' + i });
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

// ---------- companies ----------
function renderPicker() {
  const check = 'M5 12.5l4.5 4.5L19 7';
  for (const co of names) { // textContent only: company names come from the API
    const cb = el('input', { type: 'checkbox', className: 'sr' });
    cb.onchange = () => { cb.checked ? picked.add(co) : picked.delete(co); change(); };
    boxes.set(co, cb);
    const name = el('span', { className: 'name' }, co);
    const row = el('label', { className: 'co' }, cb, dot(co), name, el('span', { className: 'n', textContent: totals.get(co) }), icon(check));
    row.lastChild.classList.add('check');
    const info = el('button', { className: 'info', 'aria-label': 'About ' + co }, icon('M12 21a9 9 0 1 0 0-18a9 9 0 0 0 0 18zM12 11v5M12 7.5h.01'));
    info.onclick = () => showCompany(co, info);
    $('cos-list').append(el('div', { className: 'co-row' }, row, info)); // the button sits beside the label: inside it, it would join the checkbox's name
  }
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
    name.replaceChildren(co, ...(empty ? [el('span', { className: 'note', textContent: 'Not in this view' })] : []));
  }
}

// ---------- chart ----------
function draw() {
  const visible = data.models.flatMap((m, i) => (picked.has(m.company) && axes.every(k => m[k] != null) ? [i] : []));
  if (scene.ok) {
    scene.setData({ models: data.models, visible, axes, kinds: axes.map(kindOf), titles: axes.map(k => (mq.matches ? MEASURES[k].name : MEASURES[k].axis)), colors: color });
    sv?.refresh();
  }
  const onChart = new Map([...Map.groupBy(visible, i => data.models[i].company)].map(([co, idx]) => [co, idx.length]));
  $('count').textContent = `${visible.length} of ${data.models.length} on the chart`;
  renderCompanies(onChart);
  emptyState(visible.length);
}

function tip(i, x, y) {
  const t = $('tip');
  if (i == null || !data) { t.hidden = true; return; }
  const m = data.models[i];
  t.replaceChildren(el('strong', { textContent: m.name }), el('span', { textContent: m.company }));
  t.hidden = false;
  t.style.left = Math.max(8, Math.min(x + 14, innerWidth - t.offsetWidth - 8)) + 'px';
  t.style.top = Math.max(8, y - t.offsetHeight - 12) + 'px';
}

function emptyState(n) {
  if (!scene.ok) return; // the "can't show 3D" message stays
  const box = $('empty');
  box.hidden = n > 0;
  if (n) return;
  if (!picked.size) {
    const b = el('button', { className: 'btn', textContent: 'Show the top 5 companies' });
    b.onclick = () => { picked = new Set(names.slice(0, TOP)); change(); };
    box.replaceChildren(el('p', { textContent: 'Choose at least one company to see its models.' }), b);
  } else {
    const theirs = data.models.filter(m => picked.has(m.company));
    const missing = axes.filter(k => !theirs.some(m => m[k] != null)).map(k => MEASURES[k].name);
    box.replaceChildren(el('p', { textContent: `None of these companies' models have ${missing.length ? 'a ' + missing.join(' or ') + ' score' : 'all three of these measures'} yet. Try another question, or add a company.` }));
  }
}

// ---------- details card: a popover that grows out of what was clicked; a sheet on phones ----------
// (ax, ay): the point it grows out of on desktop; leave them out to keep it where it is
function openCard(kids, ax, ay) {
  const card = $('card');
  const close = el('button', { id: 'close', 'aria-label': 'Close details' }, icon('M6 6l12 12M18 6L6 18'));
  close.onclick = () => hideCard();
  card.replaceChildren(el('div', { className: 'grabber' }), close, ...kids);
  hiding?.cancel(); hiding = null; // reopened while closing: keep it open
  const wasOpen = !card.hidden;
  card.hidden = false;
  if (mq.matches) {
    card.style.left = card.style.top = card.style.transformOrigin = '';
    if (wasOpen) cardSheet.layout(); // new content: resize to it
    else { cardSheet.reset(); cardSheet.open(0); } // rises from the bottom on a spring
    return;
  }
  // desktop popover: beside the anchor, inside the open area, scaling out from the anchor itself
  const w = card.offsetWidth, h = card.offsetHeight, minX = $('rail').getBoundingClientRect().right + 12, stay = ax == null;
  let left = stay ? card.offsetLeft : ax + 20 + w > innerWidth - 12 ? ax - 20 - w : ax + 20;
  left = Math.max(minX, Math.min(left, innerWidth - 12 - w));
  const top = Math.max(12, Math.min(stay ? card.offsetTop : ay - 44, innerHeight - 12 - h));
  Object.assign(card.style, { left: left + 'px', top: top + 'px' });
  if (!stay) card.style.transformOrigin = `${ax - left}px ${ay - top}px`;
  if (!wasOpen) card.animate(reduced.matches ? [{ opacity: 0 }, { opacity: 1 }]
    : [{ opacity: 0, transform: 'scale(.6)', filter: 'blur(8px)' }, { opacity: 1, transform: 'none', filter: 'blur(0)' }],
  { duration: reduced.matches ? 150 : 260, easing: 'cubic-bezier(.2, .9, .25, 1)' });
}

function showCard(i) {
  if (i == null) return;
  const m = data.models[i];
  const rows = Object.entries(MEASURES).filter(([k]) => k !== 'release').map(([k, ms]) => el('div', { className: 'row' },
    el('dt', { textContent: ms.name }),
    m[k] == null ? el('dd', { className: 'none', textContent: 'Not measured' }) : el('dd', {}, ms.fmt(m[k]), el('small', { textContent: ms.better }))));
  const co = el('button', { 'aria-label': 'About ' + m.company, textContent: m.company });
  co.onclick = () => showCompany(m.company);
  const p = scene.worldOf(i)?.clone().project(scene.camera); // grows out of the dot
  openCard([el('h3', { textContent: m.name }),
    el('p', { className: 'who' }, dot(m.company), el('span', {}, co, ...(m.release ? [', released ' + MEASURES.release.fmt(m.release)] : []))),
    el('dl', {}, ...rows)],
  p ? ((p.x + 1) / 2) * innerWidth : innerWidth - 40, p ? ((1 - p.y) / 2) * innerHeight : innerHeight - 40);
}

// from: the ⓘ button in the company list; left out when switching from a model's card, which then stays put
function showCompany(co, from) {
  const f = companyFacts(data.models, co, Object.keys(MEASURES).filter(k => k !== 'release')), c = COMPANIES[co];
  const rows = f.best.map(({ key, model }) => el('div', { className: 'row' },
    el('dt', { textContent: MEASURES[key].name }), el('dd', {}, model.name, el('small', { textContent: MEASURES[key].fmt(model[key]) }))));
  const kids = [el('h3', { textContent: co })];
  if (c) kids.push(el('p', { className: 'who' }, dot(co), el('a', { href: c.url, target: '_blank', rel: 'noopener', textContent: new URL(c.url).hostname.replace(/^www\./, '') + ' ↗' })),
    el('p', { textContent: c.about }));
  kids.push(el('p', { className: 'facts', textContent: `${f.count} ${f.count === 1 ? 'model' : 'models'}` + (f.newest ? ` · newest: ${f.newest.name}, ${MEASURES.release.fmt(f.newest.release)}` : '') }),
    el('dl', {}, ...rows));
  if (!from) return openCard(kids);
  if (mq.matches) sheet.open(0); // the rail paints over the card (it's outside #stage): lower it to its peek first, like Maps
  const r = from.getBoundingClientRect();
  openCard(kids, r.left + r.width / 2, r.top + r.height / 2);
}

function hideCard({ instant = false } = {}) {
  const card = $('card');
  if (card.hidden) return;
  const done = () => { card.hidden = true; cardSheet.reset(); };
  if (instant) return done();
  if (mq.matches) return cardSheet.close(done);
  hiding = card.animate(reduced.matches ? [{ opacity: 1 }, { opacity: 0 }]
    : [{ opacity: 1, transform: 'none', filter: 'blur(0)' }, { opacity: 0, transform: 'scale(.6)', filter: 'blur(8px)' }], // back into the dot
  { duration: reduced.matches ? 120 : 180, easing: 'cubic-bezier(.4, 0, 1, 1)' });
  hiding.onfinish = () => { hiding = null; done(); };
}

// ---------- state <-> link ----------
// #x=..&y=..&z=..&c=Company&c=Company[&sv=stand&m=Model | &sv=ride&r=Company | &sv=fly]
// No c: top 5. c=*: all. c= (empty): none.
function writeLink() {
  const p = new URLSearchParams({ x: axes[0], y: axes[1], z: axes[2] });
  const top = names.slice(0, TOP);
  if (picked.size === names.length) p.append('c', '*');
  else if (!picked.size) p.append('c', '');
  else if (!(picked.size === top.length && top.every(c => picked.has(c)))) for (const c of names.filter(c => picked.has(c))) p.append('c', c);
  writeSV(p, sv?.current());
  history.replaceState(null, '', '#' + p);
}

function change() {
  if (question !== 'custom') { const q = QUESTIONS.find(q => q.axes?.every((k, i) => axes[i] === k)); if (!q) question = 'custom'; }
  if (shownAxes && shownAxes.join() !== axes.join()) sv?.exit({ instant: true }); // every dot moves: leave Street View first
  shownAxes = [...axes];
  writeLink();
  renderMeasures();
  draw();
}

function readLink() {
  const p = new URLSearchParams(location.hash.slice(1));
  const a = ['x', 'y', 'z'].map(k => p.get(k));
  axes = a.every(k => Object.hasOwn(MEASURES, k)) ? a : [...QUESTIONS[0].axes];
  question = QUESTIONS.find(q => q.axes?.every((k, i) => axes[i] === k))?.id ?? 'custom';
  const c = p.getAll('c'), known = c.filter(n => totals.has(n));
  picked = new Set(c.includes('*') ? names : c.length === 1 && c[0] === '' ? [] : known.length ? known : names.slice(0, TOP));
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
    $('empty').replaceChildren(el('p', { textContent: "Your browser can't show 3D graphics, so the chart can't be drawn here." }));
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

load().then(d => { data = d; init(); }, () => {
  $('empty').hidden = false;
  $('empty').replaceChildren(el('p', { textContent: "The model data didn't load. Check your connection, then reload the page." }));
});
