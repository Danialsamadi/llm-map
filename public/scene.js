// The 3D chart: cube, grid, labels, dots, lines, orbit controls, picking and camera glides.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { layout, ticks, segDist, emphasis } from './space.js';

const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
// measure axes X, Y, Z -> world: X right, Z up, Y into the screen (keeps the old chart's right-handed look)
export const toWorld = ([a, b, c]) => new THREE.Vector3(a, c, -b);

const DOT_RADIUS = 0.024; // world units
// Dots are round points whose edge coverage is computed exactly per pixel, with a little shading so they read
// as balls. Mesh spheres relied on 4x multisampling, which left small far-away dots stair-stepped.
const dotMaterial = maxPx => new THREE.ShaderMaterial({
  uniforms: { uPxPerUnit: { value: 1 }, uMaxPx: { value: maxPx } },
  transparent: true,
  vertexShader: /* glsl */ `
    attribute vec3 aColor;
    attribute float aScale;
    uniform float uPxPerUnit, uMaxPx;
    varying vec3 vColor;
    varying float vRadius; // device pixels
    void main() {
      vec4 mv = modelViewMatrix * vec4(position, 1.0);
      gl_Position = projectionMatrix * mv;
      vec4 front = projectionMatrix * vec4(mv.xy, mv.z + ${DOT_RADIUS} * aScale, 1.0);
      gl_Position.z = front.z / front.w * gl_Position.w; // depth of the ball's near surface, so lines into it stay hidden
      vRadius = min(${DOT_RADIUS} * aScale * uPxPerUnit / -mv.z, uMaxPx / 2.0 - 1.0);
      gl_PointSize = 2.0 * vRadius + 2.0; // a pixel of room on each side for the soft edge
      vColor = aColor;
    }`,
  fragmentShader: /* glsl */ `
    varying vec3 vColor;
    varying float vRadius;
    void main() {
      vec2 p = (gl_PointCoord - 0.5) * (2.0 * vRadius + 2.0); // offset from the centre, device pixels
      float alpha = clamp(vRadius - length(p) + 0.5, 0.0, 1.0); // exact coverage of the edge pixel
      if (alpha <= 0.0) discard;
      vec2 q = p / vRadius;
      vec3 n = vec3(q.x, -q.y, sqrt(max(0.0, 1.0 - dot(q, q))));
      float shade = 0.72 + 0.28 * max(dot(n, normalize(vec3(-0.35, 0.45, 0.8))), 0.0);
      gl_FragColor = vec4(vColor * shade, alpha);
      #include <colorspace_fragment>
    }`,
});

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

  let state = null, dots = null, placed = false, queued = false, anim = null, ring = null, drop = null, last = null, builtK = 1;
  const subs = new Set(), bufSize = new THREE.Vector2();
  const maxPointPx = renderer.getContext().getParameter(renderer.getContext().ALIASED_POINT_SIZE_RANGE)[1];

  // ---------- rendering: only when asked, or every frame while someone is subscribed ----------
  function render() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(t => {
      queued = false;
      for (const f of subs) f(t);
      if (dots) dots.material.uniforms.uPxPerUnit.value = renderer.getDrawingBufferSize(bufSize).y / (2 * Math.tan((camera.fov * Math.PI) / 360));
      renderer.render(scene, camera);
      if (subs.size) render();
    });
  }
  const onFrame = f => { subs.add(f); render(); return () => subs.delete(f); };

  // The chart fills the window and panels float over it; insets keep the cube centred in the part left uncovered.
  let insets = { left: 0, bottom: 0 };
  function applyView() {
    const w = container.clientWidth, h = container.clientHeight;
    camera.aspect = w / h;
    if (insets.left || insets.bottom) camera.setViewOffset(w, h, -insets.left / 2, insets.bottom / 2, w, h);
    else camera.clearViewOffset();
    camera.updateProjectionMatrix();
  }
  // the starting view: the whole cube, further out when the open area is tall and narrow
  function home() {
    const w = container.clientWidth - insets.left, h = container.clientHeight - insets.bottom;
    return new THREE.Vector3(1, 0.75, -1).normalize().multiplyScalar(5 * Math.max(1, Math.min(2.2, h / Math.max(1, w))));
  }

  function resize() {
    const w = container.clientWidth, h = container.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h);
    applyView();
    if (last && Math.abs(labelScale() / builtK - 1) > 0.05) buildFrame(last.scales, last.titles); // small canvas: labels grew or shrank
    if (!placed) { placed = true; camera.position.copy(home()); controls.target.set(0, 0, 0); controls.update(); }
    render();
  }
  new ResizeObserver(resize).observe(container);
  controls.addEventListener('change', render);
  // a drag grabs the chart even in the middle of a "Reset view" glide
  canvas.addEventListener('pointerdown', () => { if (resetting) { subs.delete(anim); anim = null; resetting = false; controls.update(); } }, true);
  let resetting = false;

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
    const rule = css('--rule'), V = (x, y, z) => new THREE.Vector3(x, y, z);
    const [cx, cy, cz] = [0, 1, 2].map(i => css(`--ax-${i}`)); // one colour per axis, shared with the sidebar and Street View guide
    const [tx0, ty0, tz0] = [0, 1, 2].map(i => css(`--ax-${i}-text`) || css(`--ax-${i}`)); // text may need a darker shade
    frame.add(new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(2, 2, 2)), new THREE.LineBasicMaterial({ color: rule })));
    // the three edges the tick labels sit on, in their axis colour
    frame.add(segments([V(-1, -1, -1), V(1, -1, -1)], cx), segments([V(1, -1, -1), V(1, -1, 1)], cy), segments([V(-1, -1, -1), V(-1, 1, -1)], cz));
    const [tx, ty, tz] = scales.map(s => ticks(s)), grid = [];
    for (const t of tx) grid.push(V(t.cube, -1, -1), V(t.cube, -1, 1), V(t.cube, -1, 1), V(t.cube, 1, 1));
    for (const t of ty) { const z = -t.cube; grid.push(V(-1, -1, z), V(1, -1, z), V(-1, -1, z), V(-1, 1, z)); }
    for (const t of tz) grid.push(V(-1, t.cube, -1), V(-1, t.cube, 1), V(-1, t.cube, 1), V(1, t.cube, 1));
    frame.add(segments(grid, rule, 0.7));
    const tick = 0.09 * k, title = 0.11 * k;
    for (const t of tx) frame.add(at(textSprite(t.label, tick, tx0), t.cube, -1 - 0.05 * e, -1.14));
    for (const t of ty) frame.add(at(textSprite(t.label, tick, ty0), 1.14, -1 - 0.1 * e, -t.cube));
    for (const t of tz) frame.add(at(textSprite(t.label, tick, tz0), -1.12 - 0.05 * e, t.cube, -1.06 - 0.05 * e));
    frame.add(at(textSprite(titles[0], title, tx0, 700), 0, -1.12, -1.45 - 0.3 * e));
    frame.add(at(textSprite(titles[1], title, ty0, 700), 1.45 + 0.3 * e, -1.12, 0));
    frame.add(at(textSprite(titles[2], title, tz0, 700), -1.0 + 0.3 * e, 1.2 + 0.4 * e, -1.0 + 0.3 * e));
  }

  // ---------- data ----------
  function setData({ models, visible, axes, kinds, titles, colors }) {
    const { scales, pos } = layout(models, visible, axes, kinds);
    const world = new Map([...pos].map(([j, p]) => [j, toWorld(p)]));
    clear(data);
    dots = null;
    if (visible.length) {
      const geo = new THREE.BufferGeometry(), c = new THREE.Color();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(visible.flatMap(j => world.get(j).toArray()), 3));
      geo.setAttribute('aColor', new THREE.Float32BufferAttribute(visible.flatMap(j => c.set(colors.get(models[j].company)).toArray()), 3));
      geo.setAttribute('aScale', new THREE.Float32BufferAttribute(new Float32Array(visible.length), 1)); // paint() fills it
      dots = new THREE.Points(geo, dotMaterial(maxPointPx));
      data.add(dots);
    }
    const lines = [...Map.groupBy(visible, j => models[j].company)].map(([company, js]) => {
      const ordered = [...js].sort((a, b) => (models[a].release ?? '').localeCompare(models[b].release ?? ''));
      const points = ordered.map(j => world.get(j));
      const obj = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),
        new THREE.LineBasicMaterial({ color: colors.get(company), transparent: true }));
      data.add(obj);
      return { company, models: ordered, points, obj };
    });
    buildFrame(scales, titles);
    state = { visible, pos, world, lines };
    ring = null; clear(overlay);
    paint();
  }

  // dot sizes and line opacities, as emphasis() decides
  function paint() {
    if (!state) return;
    const e = emphasis(state.visible, state.lines.map(l => l.company), null, drop);
    if (dots) { const a = dots.geometry.attributes.aScale; a.array.set(e.scale); a.needsUpdate = true; }
    state.lines.forEach((l, i) => { l.obj.material.opacity = e.lines[i]; });
    render();
  }

  // ---------- picking: what is under a screen point ----------
  const v = new THREE.Vector3();
  const screen = (p, rect) => { v.copy(p).project(camera); return v.z > 1 || v.z < -1 ? null : [((v.x + 1) / 2) * rect.width, ((1 - v.y) / 2) * rect.height]; };
  function pick(clientX, clientY, kinds = ['dot', 'line', 'floor']) {
    if (!state) return null;
    camera.updateMatrixWorld(); // don't depend on a frame having been drawn since the camera last moved
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
    drop = target ?? null;
    if (ring) { overlay.remove(ring); ring.geometry.dispose(); ring.material.dispose(); ring = null; }
    if (target?.kind === 'floor') {
      ring = new THREE.Mesh(new THREE.RingGeometry(0.06, 0.09, 40), new THREE.MeshBasicMaterial({ color: css('--signal'), side: THREE.DoubleSide }));
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(target.point.x, -0.995, target.point.z);
      overlay.add(ring);
    }
    paint();
  }

  // ---------- camera glide (ease in-out); a new glide replaces a running one ----------
  function animateCamera({ position, look, fov = camera.fov, duration = 0, done }) {
    if (anim) subs.delete(anim);
    anim = null; resetting = false;
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
  canvas.addEventListener('pointerdown', e => { down = [e.clientX, e.clientY]; onHover(null); }); // a drag hides the hover label
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
    setInsets: ({ left = 0, bottom = 0 }) => {
      if (left === insets.left && bottom === insets.bottom) return;
      insets = { left, bottom }; applyView(); render();
    },
    // glide back to the starting view; any drag on the chart takes over immediately
    resetView: duration => {
      if (!controls.enabled) return;
      animateCamera({ position: home(), look: { x: 0, y: 0, z: 0 }, fov: 45, duration,
        done: () => { resetting = false; controls.target.set(0, 0, 0); controls.update(); } });
      resetting = duration > 0;
    },
    worldOf: j => state?.world.get(j),
    cubeOf: j => state?.pos.get(j),
    visible: () => state?.visible ?? [],
    lines: () => state?.lines ?? [],
  };
}
