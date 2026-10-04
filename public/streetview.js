// Street View: drag the figure into the chart to stand at a model, ride a company's line or fly around.
import * as THREE from 'three';
import { BETTER, betterSign, FLY_START } from './space.js';
import { stand } from './modes/stand.js';

const MODES = { stand };
const D2R = Math.PI / 180;
const $ = id => document.getElementById(id);
const el = (tag, props = {}, ...kids) => {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) k.startsWith('aria-') ? e.setAttribute(k, v) : e[k] = v;
  e.append(...kids);
  return e;
};
const svg = (tag, attrs = {}) => { const e = document.createElementNS('http://www.w3.org/2000/svg', tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v); return e; };
const AXIS_DIRS = [new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, -1), new THREE.Vector3(0, 1, 0)]; // measure X, Y, Z in world space (scene.js toWorld)
const modeOf = t => (t.kind === 'dot' ? 'stand' : t.kind === 'line' ? 'ride' : 'fly');

export function createStreetView({ scene, getState, showCard, onChange }) {
  const stage = $('stage'), fig = $('figure'), cam = scene.camera, canvas = scene.canvas;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const ms = d => (reduced.matches ? 0 : d);
  let mode = null, run = null, overview = null, ready = false, stopLoop = null, awaiting = null;
  let yaw = 0, pitch = 0, turn = null, tags = [], lastTagPick = -1e9, guide = [];

  // ---------- looking direction (yaw/pitch, no roll) ----------
  function syncAngles() { const d = cam.getWorldDirection(new THREE.Vector3()); yaw = Math.atan2(-d.x, -d.z); pitch = Math.asin(Math.max(-1, Math.min(1, d.y))); }
  function applyAngles() { pitch = Math.max(-85 * D2R, Math.min(85 * D2R, pitch)); cam.quaternion.setFromEuler(new THREE.Euler(pitch, yaw, 0, 'YXZ')); }
  function anglesTo(point) {
    const d = point.clone().sub(cam.position);
    if (d.lengthSq() < 1e-8) return null;
    d.normalize();
    return [Math.atan2(-d.x, -d.z), Math.asin(Math.max(-1, Math.min(1, d.y)))];
  }
  function lookAt(point) { const a = anglesTo(point); if (a) { [yaw, pitch] = a; applyAngles(); } }
  function face(point) { // turn smoothly toward a point
    const a = anglesTo(point);
    if (!a) return;
    const dy = Math.atan2(Math.sin(a[0] - yaw), Math.cos(a[0] - yaw)); // the shorter way round
    turn = { y0: yaw, p0: pitch, dy, dp: a[1] - pitch, t: 0, dur: ms(400) / 1000 };
  }
  function setTitle(t) { if ($('svTitle').textContent !== t) $('svTitle').textContent = t; }

  const ctx = { THREE, scene, getState, showCard, el, panel: $('svPanel'), controls: $('svControls'), setTitle, face, lookAt,
    hop: index => enter({ kind: 'dot', index }, { duration: 600 }) };

  // ---------- the figure: drag to drop, press to choose ----------
  const describe = t => (!t ? '' : t.kind === 'dot' ? `Stand at ${getState().models[t.index].name}` : t.kind === 'line' ? `Ride ${t.company}'s line` : 'Fly from here');
  const usable = t => (t && MODES[modeOf(t)] ? t : null);
  let drag = null;
  function dragMove(e) {
    if (!drag || (!drag.moved && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < 6)) return;
    if (!drag.moved) { drag.moved = true; fig.classList.add('dragging'); toggleMenu(false); clearHint(); }
    fig.style.translate = `${e.clientX - drag.x}px ${e.clientY - drag.y}px`;
    drag.target = usable(scene.pick(e.clientX, e.clientY));
    scene.preview(drag.target);
    const r = stage.getBoundingClientRect(), lab = $('dropLabel');
    lab.textContent = describe(drag.target);
    lab.hidden = !drag.target;
    lab.style.left = e.clientX - r.left + 'px';
    lab.style.top = e.clientY - r.top + 'px';
  }
  function dragEnd(e) {
    removeEventListener('pointermove', dragMove);
    removeEventListener('pointerup', dragEnd);
    removeEventListener('pointercancel', dragEnd);
    const { moved, target } = drag;
    drag = null;
    fig.classList.remove('dragging'); fig.style.translate = ''; $('dropLabel').hidden = true; scene.preview(null);
    if (e.type === 'pointercancel') return;
    if (!moved) toggleMenu();
    else if (target) enter(target);
  }
  fig.addEventListener('pointerdown', e => {
    if (mode || e.button > 0) return;
    e.preventDefault();
    drag = { x: e.clientX, y: e.clientY, moved: false, target: null };
    addEventListener('pointermove', dragMove);
    addEventListener('pointerup', dragEnd);
    addEventListener('pointercancel', dragEnd);
  });
  fig.addEventListener('click', e => { if (e.detail === 0) toggleMenu(); }); // keyboard (Enter / Space)

  // ---------- the menu and "tap a dot / line" hints ----------
  function toggleMenu(open = $('svMenu').hidden) { $('svMenu').hidden = !open; if (open) $('svMenu').querySelector('button:not([hidden])').focus(); }
  $('svMenu').addEventListener('click', e => { const b = e.target.closest('button[data-mode]'); if (b) choose(b.dataset.mode); });
  function choose(kind) {
    toggleMenu(false);
    if (kind === 'fly') return enter({ kind: 'floor', point: FLY_START });
    awaiting = kind === 'stand' ? 'dot' : 'line';
    const h = $('svHint'), cancel = el('button', { textContent: 'Cancel' });
    cancel.onclick = clearHint;
    h.replaceChildren(el('span', { textContent: kind === 'stand' ? 'Tap a dot to stand there.' : 'Tap a line, or pick a company:' }));
    if (kind === 'ride') for (const l of scene.lines()) if (l.points.length > 1) {
      const b = el('button', { textContent: l.company });
      b.onclick = () => { clearHint(); enter({ kind: 'line', company: l.company }); };
      h.append(b);
    }
    h.append(cancel);
    h.hidden = false;
  }
  function clearHint() { awaiting = null; $('svHint').hidden = true; }
  document.addEventListener('pointerdown', e => {
    if (!$('svMenu').hidden && !$('svMenu').contains(e.target) && !fig.contains(e.target)) toggleMenu(false);
  }, true);

  // every tap on the chart comes here first; true = Street View used it
  function handleTap(index, e) {
    if (!awaiting) return false;
    const t = usable(scene.pick(e.clientX, e.clientY, [awaiting]));
    if (t) { clearHint(); enter(t); }
    return true;
  }

  // ---------- entering and leaving ----------
  function enter(target, { duration = 1200, instant = false } = {}) {
    const kind = modeOf(target);
    if (!MODES[kind]) return;
    overview ??= { position: cam.position.clone(), target: scene.controls.target.clone(), fov: cam.fov };
    teardown(false);
    scene.setOrbit(false); scene.preview(null); toggleMenu(false); clearHint();
    mode = kind;
    run = MODES[kind].start(ctx, target);
    fig.hidden = true; $('svBar').hidden = false;
    buildGuide(); $('svGuide').toggleAttribute('hidden', false); // an <svg> has no .hidden property, so use the attribute
    setTitle(run.title);
    const { position, look, fov = 75 } = run.pose;
    scene.animateCamera({ position, look, fov, duration: instant ? 0 : ms(duration), done: () => { syncAngles(); ready = true; startLoop(); } });
    onChange();
  }

  function teardown(full = true) {
    stopLoop?.(); stopLoop = null;
    run?.stop?.(); run = null; mode = null; ready = false; turn = null; pointers.clear();
    $('svPanel').hidden = true; $('svPanel').replaceChildren(); $('svControls').replaceChildren();
    $('tags').replaceChildren(); tags = []; lastTagPick = -1e9;
    if (full) { $('svBar').hidden = true; $('svGuide').toggleAttribute('hidden', true); fig.hidden = false; }
  }

  function exit({ instant = false } = {}) {
    if (!mode) return;
    const back = overview;
    overview = null;
    teardown();
    scene.animateCamera({ position: back.position, look: back.target, fov: back.fov, duration: instant ? 0 : ms(1200),
      done: () => { scene.controls.target.copy(back.target); scene.controls.update(); scene.setOrbit(true); scene.render(); } });
    onChange();
  }
  $('svBack').onclick = () => exit();
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape' || e.defaultPrevented || $('about').open) return;
    if (awaiting) return clearHint();
    if (!$('svMenu').hidden) return toggleMenu(false);
    if (mode) exit();
  });

  // ---------- every frame while inside ----------
  function startLoop() {
    let last = null;
    stopLoop = scene.onFrame(t => {
      const dt = last == null ? 0 : Math.min(0.05, (t - last) / 1000);
      last = t;
      if (turn) {
        turn.t = turn.dur ? Math.min(1, turn.t + dt / turn.dur) : 1;
        const e = 1 - (1 - turn.t) ** 3;
        yaw = turn.y0 + turn.dy * e; pitch = turn.p0 + turn.dp * e; applyAngles();
        if (turn.t === 1) turn = null;
      }
      run?.frame?.(dt);
      updateTags(t);
      updateGuide();
    });
  }

  // ---------- look around (drag) and zoom (wheel / pinch) ----------
  const pointers = new Map();
  canvas.addEventListener('pointerdown', e => { if (ready) pointers.set(e.pointerId, { x: e.clientX, y: e.clientY }); });
  canvas.addEventListener('pointermove', e => {
    const p = pointers.get(e.pointerId);
    if (!ready || !p) return;
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()], before = Math.hypot(a.x - b.x, a.y - b.y);
      p.x = e.clientX; p.y = e.clientY;
      const after = Math.hypot(a.x - b.x, a.y - b.y);
      if (before && after) zoom(before / after);
      return;
    }
    const k = (cam.fov * D2R) / canvas.clientHeight; // drag the world: right turns you left, like Street View
    yaw += (e.clientX - p.x) * k; pitch += (e.clientY - p.y) * k;
    p.x = e.clientX; p.y = e.clientY;
    turn = null; applyAngles(); run?.looked?.();
  });
  for (const type of ['pointerup', 'pointercancel', 'pointerleave']) canvas.addEventListener(type, e => pointers.delete(e.pointerId));
  canvas.addEventListener('wheel', e => { if (!ready) return; e.preventDefault(); zoom(e.deltaY > 0 ? 1.08 : 1 / 1.08); }, { passive: false });
  function zoom(f) { cam.fov = Math.min(90, Math.max(30, cam.fov * f)); cam.updateProjectionMatrix(); }

  // ---------- name tags on the 8 models nearest to the eye ----------
  function updateTags(t) {
    if (t - lastTagPick > 250) {
      lastTagPick = t;
      const ids = scene.visible().map(j => [j, scene.worldOf(j).distanceTo(cam.position)]).filter(([, d]) => d > 0.02)
        .sort((a, b) => a[1] - b[1]).slice(0, 8).map(([j]) => j);
      if (ids.join() !== tags.map(x => x.j).join()) {
        const { models } = getState();
        tags = ids.map(j => { const b = el('button', { className: 'tag', textContent: models[j].name }); b.onclick = () => run?.tagTap?.(j) || showCard(j); return { j, b }; });
        $('tags').replaceChildren(...tags.map(x => x.b));
      }
    }
    const w = canvas.clientWidth, h = canvas.clientHeight, v = new THREE.Vector3();
    for (const { j, b } of tags) {
      const p = scene.worldOf(j);
      if (!p) { b.hidden = true; continue; }
      v.copy(p).project(cam);
      b.hidden = !(v.z < 1 && Math.abs(v.x) < 1.05 && Math.abs(v.y) < 1.05);
      if (!b.hidden) b.style.transform = `translate(${((v.x + 1) / 2) * w}px, ${((1 - v.y) / 2) * h}px) translate(-50%, -150%)`;
    }
  }

  // ---------- direction guide: which way is "better" on each measure ----------
  function buildGuide() {
    const g = $('svGuide');
    g.setAttribute('viewBox', '-65 -65 130 130');
    guide = getState().axes.map((k, i) => ({ line: svg('line', { x1: 0, y1: 0 }), text: svg('text'), dir: AXIS_DIRS[i].clone().multiplyScalar(betterSign(k)), word: BETTER[k] }));
    for (const x of guide) x.text.textContent = x.word;
    g.replaceChildren(svg('circle', { r: 3 }), ...guide.flatMap(x => [x.line, x.text]));
    updateGuide();
  }
  function updateGuide() {
    const q = cam.quaternion.clone().invert();
    for (const { line, text, dir } of guide) {
      const v = dir.clone().applyQuaternion(q), x = v.x * 38, y = -v.y * 38;
      line.setAttribute('x2', x); line.setAttribute('y2', y);
      line.setAttribute('opacity', 0.35 + 0.65 * Math.hypot(v.x, v.y)); // pointing into the screen = faint
      text.setAttribute('x', x * 1.35); text.setAttribute('y', y * 1.35);
    }
  }

  function refresh() { if (mode && !run.valid()) exit({ instant: true }); else if (mode) run.refresh?.(); }

  return { enter, exit, handleTap, refresh, active: () => !!mode, current: () => (mode ? run.link() : null) };
}
