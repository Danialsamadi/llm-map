// The 3D chart: cube, grid, labels, dots, lines, orbit controls, picking and camera glides.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { layout, ticks, segDist } from './space.js';

const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
// measure axes X, Y, Z -> world: X right, Z up, Y into the screen (keeps the old chart's right-handed look)
export const toWorld = ([a, b, c]) => new THREE.Vector3(a, c, -b);

export function createScene(container, { onHover = () => {}, onClick = () => {} } = {}) {
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); } catch { return { ok: false }; }
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  container.append(renderer.domElement);
  const canvas = renderer.domElement;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.01, 100);
  const controls = new OrbitControls(camera, canvas);
  controls.enablePan = false; controls.minDistance = 1.2; controls.maxDistance = 14;
  const frame = new THREE.Group(), data = new THREE.Group(), overlay = new THREE.Group();
  scene.add(frame, data, overlay);

  let state = null, dots = null, placed = false, queued = false, anim = null, ring = null, grown = null, last = null, builtK = 1;
  const subs = new Set();

  // ---------- rendering: only when asked, or every frame while someone is subscribed ----------
  function render() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(t => {
      queued = false;
      for (const f of subs) f(t);
      renderer.render(scene, camera);
      if (subs.size) render();
    });
  }
  const onFrame = f => { subs.add(f); render(); return () => subs.delete(f); };

  function resize() {
    const w = container.clientWidth, h = container.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    if (last && Math.abs(labelScale() / builtK - 1) > 0.05) buildFrame(last.scales, last.titles); // small canvas: labels grew or shrank
    if (!placed) { // first size known: frame the whole cube, further out on tall narrow canvases
      placed = true;
      camera.position.set(1, 0.75, -1).normalize().multiplyScalar(5 * Math.max(1, Math.min(2.2, h / w)));
      controls.target.set(0, 0, 0); controls.update();
    }
    render();
  }
  new ResizeObserver(resize).observe(container);
  controls.addEventListener('change', render);

  // ---------- building blocks ----------
  function clear(group) {
    group.traverse(o => { o.geometry?.dispose(); o.material?.map?.dispose(); o.material?.dispose(); });
    group.clear();
  }
  const at = (obj, x, y, z) => { obj.position.set(x, y, z); return obj; };
  const segments = (points, color, opacity = 1) => new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(points),
    new THREE.LineBasicMaterial({ color, transparent: opacity < 1, opacity }));
  function textSprite(text, height, color, weight = 400) {
    const font = `${weight} 48px ${css('--font') || 'system-ui, sans-serif'}`;
    const c = document.createElement('canvas'), g = c.getContext('2d');
    g.font = font;
    const w = Math.ceil(g.measureText(text).width) + 16;
    c.width = w; c.height = 64;
    g.font = font; g.fillStyle = color; g.textBaseline = 'middle'; g.fillText(text, 8, 34);
    const map = new THREE.CanvasTexture(c);
    map.colorSpace = THREE.SRGBColorSpace;
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map, transparent: true, depthWrite: false }));
    s.scale.set((height * w) / 64, height, 1);
    return s;
  }

  // labels grow on small canvases (phones) so they stay readable: 1x from 620 px up to 2x
  const labelScale = () => Math.min(2, Math.max(1, 620 / Math.min(container.clientWidth, container.clientHeight)));

  // cube edges, grid on the floor and the two back walls (x = -1, z = +1), tick labels, axis titles
  function buildFrame(scales, titles) {
    clear(frame);
    const k = labelScale(), e = k - 1; // e: extra room that bigger labels need
    last = { scales, titles }; builtK = k;
    const rule = css('--rule'), ink = css('--ink'), slate = css('--slate'), V = (x, y, z) => new THREE.Vector3(x, y, z);
    frame.add(new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(2, 2, 2)), new THREE.LineBasicMaterial({ color: rule })));
    const [tx, ty, tz] = scales.map(s => ticks(s)), grid = [];
    for (const t of tx) grid.push(V(t.cube, -1, -1), V(t.cube, -1, 1), V(t.cube, -1, 1), V(t.cube, 1, 1));
    for (const t of ty) { const z = -t.cube; grid.push(V(-1, -1, z), V(1, -1, z), V(-1, -1, z), V(-1, 1, z)); }
    for (const t of tz) grid.push(V(-1, t.cube, -1), V(-1, t.cube, 1), V(-1, t.cube, 1), V(1, t.cube, 1));
    frame.add(segments(grid, rule, 0.7));
    const tick = 0.09 * k, title = 0.11 * k;
    for (const t of tx) frame.add(at(textSprite(t.label, tick, slate), t.cube, -1 - 0.05 * e, -1.14));
    for (const t of ty) frame.add(at(textSprite(t.label, tick, slate), 1.14, -1 - 0.1 * e, -t.cube));
    for (const t of tz) frame.add(at(textSprite(t.label, tick, slate), -1.12 - 0.05 * e, t.cube, -1.06 - 0.05 * e));
    frame.add(at(textSprite(titles[0], title, ink, 600), 0, -1.12, -1.45 - 0.3 * e));
    frame.add(at(textSprite(titles[1], title, ink, 600), 1.45 + 0.3 * e, -1.12, 0));
    frame.add(at(textSprite(titles[2], title, ink, 600), -1.0 + 0.3 * e, 1.2 + 0.4 * e, -1.0 + 0.3 * e));
  }

  // ---------- data ----------
  function setData({ models, visible, axes, kinds, titles, colors }) {
    const { scales, pos } = layout(models, visible, axes, kinds);
    const world = new Map([...pos].map(([j, p]) => [j, toWorld(p)]));
    clear(data);
    dots = null;
    if (visible.length) {
      dots = new THREE.InstancedMesh(new THREE.SphereGeometry(0.024, 14, 10), new THREE.MeshBasicMaterial(), visible.length);
      const m = new THREE.Matrix4();
      visible.forEach((j, i) => { dots.setMatrixAt(i, m.makeTranslation(world.get(j))); dots.setColorAt(i, new THREE.Color(colors.get(models[j].company))); });
      data.add(dots);
    }
    const lines = [...Map.groupBy(visible, j => models[j].company)].map(([company, js]) => {
      const ordered = [...js].sort((a, b) => (models[a].release ?? '').localeCompare(models[b].release ?? ''));
      const points = ordered.map(j => world.get(j));
      const obj = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),
        new THREE.LineBasicMaterial({ color: colors.get(company), transparent: true, opacity: 0.9 }));
      data.add(obj);
      return { company, models: ordered, points, obj };
    });
    buildFrame(scales, titles);
    state = { visible, pos, world, lines };
    grown = null; ring = null; clear(overlay);
    render();
  }

  // ---------- picking: what is under a screen point ----------
  const v = new THREE.Vector3();
  const screen = (p, rect) => { v.copy(p).project(camera); return v.z > 1 || v.z < -1 ? null : [((v.x + 1) / 2) * rect.width, ((1 - v.y) / 2) * rect.height]; };
  function pick(clientX, clientY, kinds = ['dot', 'line', 'floor']) {
    if (!state) return null;
    const rect = canvas.getBoundingClientRect(), px = clientX - rect.left, py = clientY - rect.top;
    if (px < 0 || py < 0 || px > rect.width || py > rect.height) return null;
    if (kinds.includes('dot')) {
      let best = null, bd = 14;
      for (const j of state.visible) {
        const s = screen(state.world.get(j), rect);
        if (!s) continue;
        const d = Math.hypot(s[0] - px, s[1] - py);
        if (d <= bd) { bd = d; best = j; }
      }
      if (best != null) return { kind: 'dot', index: best };
    }
    if (kinds.includes('line')) {
      let best = null, bd = 8;
      for (const l of state.lines) for (let i = 1; i < l.points.length; i++) {
        const a = screen(l.points[i - 1], rect), b = screen(l.points[i], rect);
        if (!a || !b) continue;
        const d = segDist(px, py, a[0], a[1], b[0], b[1]);
        if (d <= bd) { bd = d; best = l.company; }
      }
      if (best != null) return { kind: 'line', company: best };
    }
    if (kinds.includes('floor')) {
      const ray = new THREE.Raycaster();
      ray.setFromCamera(new THREE.Vector2((px / rect.width) * 2 - 1, 1 - (py / rect.height) * 2), camera);
      const hit = ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 1), new THREE.Vector3()); // plane y = -1
      if (hit && Math.abs(hit.x) <= 1 && Math.abs(hit.z) <= 1) return { kind: 'floor', point: hit };
    }
    return null;
  }

  // ---------- drop preview ----------
  function preview(target) {
    if (!state) return;
    const m = new THREE.Matrix4();
    if (grown != null && dots) { dots.setMatrixAt(state.visible.indexOf(grown), m.makeTranslation(state.world.get(grown))); dots.instanceMatrix.needsUpdate = true; }
    grown = null;
    for (const l of state.lines) l.obj.material.opacity = 0.9;
    if (ring) { overlay.remove(ring); ring.geometry.dispose(); ring.material.dispose(); ring = null; }
    if (target?.kind === 'dot' && dots) {
      dots.setMatrixAt(state.visible.indexOf(target.index), m.compose(state.world.get(target.index), new THREE.Quaternion(), new THREE.Vector3(2.2, 2.2, 2.2)));
      dots.instanceMatrix.needsUpdate = true;
      grown = target.index;
    }
    if (target?.kind === 'line') for (const l of state.lines) l.obj.material.opacity = l.company === target.company ? 1 : 0.15;
    if (target?.kind === 'floor') {
      ring = new THREE.Mesh(new THREE.RingGeometry(0.06, 0.09, 40), new THREE.MeshBasicMaterial({ color: css('--signal'), side: THREE.DoubleSide }));
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(target.point.x, -0.995, target.point.z);
      overlay.add(ring);
    }
    render();
  }

  // ---------- camera glide (ease in-out); a new glide replaces a running one ----------
  function animateCamera({ position, look, fov = camera.fov, duration = 0, done }) {
    if (anim) subs.delete(anim);
    anim = null;
    const p0 = camera.position.clone(), l0 = camera.getWorldDirection(new THREE.Vector3()).add(camera.position), f0 = camera.fov;
    const P = new THREE.Vector3(position.x, position.y, position.z), L = new THREE.Vector3(look.x, look.y, look.z);
    const apply = e => {
      camera.position.lerpVectors(p0, P, e);
      camera.fov = f0 + (fov - f0) * e; camera.updateProjectionMatrix();
      camera.lookAt(new THREE.Vector3().lerpVectors(l0, L, e));
    };
    if (!duration) { apply(1); render(); done?.(); return; }
    let t0 = null;
    anim = t => {
      t0 ??= t;
      const k = Math.min(1, (t - t0) / duration);
      apply(k < 0.5 ? 4 * k ** 3 : 1 - (-2 * k + 2) ** 3 / 2);
      if (k === 1) { subs.delete(anim); anim = null; done?.(); }
    };
    subs.add(anim);
    render();
  }

  // ---------- hover and click on dots ----------
  let down = null;
  canvas.addEventListener('pointerdown', e => { down = [e.clientX, e.clientY]; });
  canvas.addEventListener('pointerup', e => {
    if (down && Math.hypot(e.clientX - down[0], e.clientY - down[1]) < 6) onClick(pick(e.clientX, e.clientY, ['dot'])?.index ?? null, e);
    down = null;
  });
  canvas.addEventListener('pointermove', e => { if (!e.buttons) onHover(pick(e.clientX, e.clientY, ['dot'])?.index ?? null, e.clientX, e.clientY); });
  canvas.addEventListener('pointerleave', () => onHover(null));

  resize();
  return {
    ok: true, camera, controls, canvas, render, onFrame, setData, pick, preview, animateCamera,
    setOrbit: on => { controls.enabled = on; },
    worldOf: j => state?.world.get(j),
    cubeOf: j => state?.pos.get(j),
    visible: () => state?.visible ?? [],
    lines: () => state?.lines ?? [],
  };
}
