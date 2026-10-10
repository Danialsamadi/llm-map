// Fly mode: move freely inside the cube with keys or an on-screen joystick.
const KEYS = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'ShiftLeft', 'ShiftRight']);
const typing = t => t instanceof HTMLElement && (t.matches('input[type=search], input[type=text], textarea') || t.isContentEditable);

export const fly = {
  start(ctx, target) {
    const { THREE, scene, el, controls } = ctx, cam = scene.camera;
    const eye = new THREE.Vector3(target.point.x, -1 + 0.3, target.point.z);
    const look = new THREE.Vector3(0, eye.y, 0);
    if (look.distanceTo(eye) < 1e-3) look.set(0, eye.y, 1);
    const keys = new Set(), stick = { x: 0, y: 0 };
    let vert = 0, origin = null, id = null; // id: the finger that holds the stick
    const onButton = e => e.code === 'Space' && e.target instanceof HTMLElement && e.target.matches('button:focus-visible, summary:focus-visible, a:focus-visible'); // keyboard focus on a button: Space presses it
    const down = e => { if (!e.metaKey && !e.ctrlKey && !e.altKey && KEYS.has(e.code) && !typing(e.target) && !onButton(e)) { keys.add(e.code); e.preventDefault(); } };
    const up = e => keys.delete(e.code), blur = () => keys.clear();

    // phone: joystick to move, Up / Down buttons
    const knob = el('span', { className: 'knob' }), pad = el('div', { className: 'stick', 'aria-hidden': 'true' }, knob);
    pad.addEventListener('pointerdown', e => { id = e.pointerId; origin = [e.clientX, e.clientY]; e.preventDefault(); });
    const move = e => {
      if (!origin || e.pointerId !== id) return;
      stick.x = Math.max(-1, Math.min(1, (e.clientX - origin[0]) / 40));
      stick.y = Math.max(-1, Math.min(1, (e.clientY - origin[1]) / 40));
      knob.style.translate = `${stick.x * 30}px ${stick.y * 30}px`;
    };
    const release = e => { if (e.pointerId !== id) return; id = origin = null; stick.x = stick.y = 0; knob.style.translate = ''; };
    const hold = (label, dir) => {
      const b = el('button', { textContent: label });
      b.addEventListener('pointerdown', () => { vert = dir; });
      for (const t of ['pointerup', 'pointerleave', 'pointercancel']) b.addEventListener(t, () => { vert = 0; });
      return b;
    };
    const listeners = [['keydown', down], ['keyup', up], ['blur', blur], ['pointermove', move], ['pointerup', release], ['pointercancel', release]];
    for (const [t, f] of listeners) addEventListener(t, f);
    controls.replaceChildren(el('div', { className: 'fly' }, pad, el('div', { className: 'vbtns' }, hold(ctx.tr('sv.up'), 1), hold(ctx.tr('sv.down'), -1)),
      el('p', { className: 'keys', textContent: ctx.tr('sv.keys') })));

    const fwd = new THREE.Vector3(), right = new THREE.Vector3(), v = new THREE.Vector3();
    const k = c => (keys.has(c) ? 1 : 0);
    return {
      title: ctx.tr('sv.flying'),
      pose: { position: eye, look, fov: 75 },
      frame(dt) {
        const f = k('KeyW') + k('ArrowUp') - k('KeyS') - k('ArrowDown') - stick.y;
        const s = k('KeyD') + k('ArrowRight') - k('KeyA') - k('ArrowLeft') + stick.x;
        const u = k('Space') - k('ShiftLeft') - k('ShiftRight') + vert;
        if (!f && !s && !u) return;
        cam.getWorldDirection(fwd);
        right.crossVectors(fwd, cam.up).normalize();
        v.set(0, u, 0).addScaledVector(fwd, f).addScaledVector(right, s);
        if (v.lengthSq() > 1) v.normalize();
        cam.position.addScaledVector(v, 0.6 * dt).clampScalar(-1.1, 1.1); // stop softly just outside the walls
      },
      stop() { for (const [t, f] of listeners) removeEventListener(t, f); },
      valid: () => true,
      link: () => ({ mode: 'fly' }),
    };
  },
};
