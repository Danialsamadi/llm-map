// Page logic: data, questions, companies, details card, About dialog and the link. The 3D view is scene.js.
import { createScene } from './scene.js';
import { readSV, writeSV, FLY_START } from './space.js';

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
const mq = matchMedia('(max-width: 699px)'); // phone: short axis titles
const kindOf = k => (MEASURES[k].log ? 'log' : MEASURES[k].date ? 'date' : 'linear');

let data, names, totals, color, picked, axes, question, shownAxes, wantSV = null;
const boxes = new Map(); // company -> its checkbox in the "Add a company" list
let sv = null; // Street View, once available

const scene = createScene($('chart'), {
  onHover: tip,
  onClick: (i, e) => { if (sv?.handleTap(i, e)) return; if (i != null) showCard(i); },
});
window.llmMap = { scene, get sv() { return sv; } }; // handle for console debugging and browser checks

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
    wrap.append(el('label', {}, el('span', { textContent: label + ' axis' }), s));
  });
  wrap.append(el('ul', { className: 'measures', id: 'm-custom' }));
  return wrap;
}

// what each axis means for the chosen question, under its title
function renderMeasures() {
  for (const q of QUESTIONS) {
    const ul = $('m-' + q.id);
    if (q.id !== question) { ul.replaceChildren(); continue; }
    ul.replaceChildren(...axes.map(k => el('li', {}, el('span', { textContent: MEASURES[k].name }), el('span', { textContent: MEASURES[k].better }))));
  }
  document.querySelectorAll('#custom select').forEach((s, i) => { s.value = axes[i]; });
  document.querySelector(`input[name=question][value=${question}]`).checked = true;
}

// ---------- companies ----------
function renderPicker() {
  for (const co of names) { // textContent only: company names come from the API
    const cb = el('input', { type: 'checkbox' });
    cb.onchange = () => { cb.checked ? picked.add(co) : picked.delete(co); change(); };
    boxes.set(co, cb);
    $('list').append(el('label', {}, cb, dot(co), el('span', { textContent: co }), el('span', { className: 'n', textContent: totals.get(co) })));
  }
  $('q').oninput = () => { const q = $('q').value.toLowerCase(); for (const [co, cb] of boxes) cb.parentNode.hidden = !co.toLowerCase().includes(q); };
  $('all').onclick = () => { picked = new Set(names); change(); };
  $('none').onclick = () => { picked = new Set(); change(); };
  $('top').onclick = () => { picked = new Set(names.slice(0, TOP)); change(); };
}

const dot = co => { const d = el('span', { className: 'dot' }); d.style.background = color.get(co); return d; };

function renderChips(onChart) {
  $('chips').replaceChildren(...names.filter(c => picked.has(c)).map(co => {
    const x = el('button', { textContent: '×', title: 'Remove ' + co, 'aria-label': 'Remove ' + co });
    x.onclick = () => { picked.delete(co); change(); };
    const n = onChart.get(co) ?? 0;
    return el('li', {}, dot(co), el('span', { textContent: co }), el('span', { className: 'n', textContent: n ? `${n} on chart` : 'no data here' }), x);
  }));
  for (const [co, cb] of boxes) cb.checked = picked.has(co);
}

// ---------- chart ----------
function draw() {
  const visible = data.models.flatMap((m, i) => (picked.has(m.company) && axes.every(k => m[k] != null) ? [i] : []));
  if (scene.ok) {
    scene.setData({ models: data.models, visible, axes, kinds: axes.map(kindOf), titles: axes.map(k => (mq.matches ? MEASURES[k].name : MEASURES[k].axis)), colors: color });
    sv?.refresh();
  }
  const onChart = new Map([...Map.groupBy(visible, i => data.models[i].company)].map(([co, idx]) => [co, idx.length]));
  $('count').textContent = `${visible.length} of ${data.models.length} models on the chart`;
  renderChips(onChart);
  emptyState(visible.length);
}

function tip(i, x, y) {
  const t = $('tip');
  if (i == null || !data) { t.hidden = true; return; }
  const m = data.models[i], r = $('stage').getBoundingClientRect();
  t.replaceChildren(el('strong', { textContent: m.name }), el('span', { textContent: m.company }));
  t.hidden = false;
  t.style.left = Math.max(8, Math.min(x - r.left + 14, r.width - t.offsetWidth - 8)) + 'px';
  t.style.top = Math.max(8, y - r.top - t.offsetHeight - 12) + 'px';
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

function showCard(i) {
  if (i == null) return;
  const m = data.models[i];
  const close = el('button', { id: 'close', textContent: '×', 'aria-label': 'Close details' });
  close.onclick = hideCard;
  const rows = Object.entries(MEASURES).filter(([k]) => k !== 'release').flatMap(([k, ms]) => [
    el('dt', { textContent: ms.name }),
    m[k] == null ? el('dd', { className: 'none', textContent: 'Not measured' }) : el('dd', {}, ms.fmt(m[k]), el('small', { textContent: ms.better })),
  ]);
  $('card').replaceChildren(close, el('h3', { textContent: m.name }),
    el('p', { className: 'who' }, dot(m.company), el('span', { textContent: m.company + (m.release ? ', released ' + MEASURES.release.fmt(m.release) : '') })),
    el('dl', {}, ...rows));
  $('card').hidden = false;
}
function hideCard() { $('card').hidden = true; }

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
  openSV();
}

// ---------- page chrome ----------
$('glossary').append(...Object.values(MEASURES).map(m => el('li', {}, el('strong', { textContent: m.name + ': ' }), m.about)));
$('aboutBtn').onclick = () => $('about').showModal();
for (const t of ['ask', 'cos']) $('tab-' + t).onclick = () => {
  document.querySelector('.app').dataset.tab = t;
  for (const u of ['ask', 'cos']) $('tab-' + u).setAttribute('aria-selected', u === t);
};
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && !$('card').hidden && !$('about').open) { hideCard(); e.preventDefault(); } // preventDefault: Street View won't also exit
});
mq.addEventListener('change', () => data && draw());
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => data && draw()); // colours come from CSS variables
document.fonts?.ready.then(() => data && draw()); // redraw labels once the web font is in
addEventListener('hashchange', () => location.reload()); // a pasted link in an open tab; our own replaceState doesn't fire this

load().then(d => { data = d; init(); }, () => {
  $('empty').hidden = false;
  $('empty').replaceChildren(el('p', { textContent: "The model data didn't load. Check your connection, then reload the page." }));
});
