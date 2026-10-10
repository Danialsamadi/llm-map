// Ride mode: travel along one company's line, oldest model to newest.
import { makePath } from '../space.js';

const SPEEDS = [0.5, 1, 2, 4];

export const ride = {
  start(ctx, target) {
    const { THREE, scene, getState, el, controls, tr, f } = ctx, company = target.company;
    const month = d => (d ? f.month(d) : tr('sv.noDate'));
    const V = a => new THREE.Vector3(a[0], a[1], a[2]);
    let line, path, dist = 0, playing = true, speed = 1, free = false, scrubbing = false;
    function build() { // (re)read the line; positions move when the companies shown change
      const keep = path?.length ? dist / path.length : 0;
      line = scene.lines().find(l => l.company === company);
      path = makePath(line.points.map(p => [p.x, p.y, p.z]));
      dist = keep * path.length;
    }
    build();

    const play = el('button', { textContent: tr('sv.pause') }), slower = el('button', { textContent: tr('sv.slower') }), faster = el('button', { textContent: tr('sv.faster') });
    const times = s => f.num(s, s % 1 ? 1 : 0) + '×';
    const rate = el('span', { className: 'rate', textContent: times(1) });
    const range = el('input', { type: 'range', min: 0, max: 1000, step: 1, value: 0, 'aria-label': tr('sv.position') });
    const ahead = el('button', { textContent: tr('sv.ahead') });
    const setPlaying = on => { playing = on; play.textContent = tr(on ? 'sv.pause' : 'sv.play'); };
    play.onclick = () => { if (!playing && dist >= path.length) dist = 0; setPlaying(!playing); };
    const setSpeed = d => { speed = SPEEDS[Math.max(0, Math.min(SPEEDS.length - 1, SPEEDS.indexOf(speed) + d))]; rate.textContent = times(speed); };
    slower.onclick = () => setSpeed(-1);
    faster.onclick = () => setSpeed(1);
    range.oninput = () => { dist = (range.value / 1000) * path.length; };
    const lift = () => { scrubbing = false; }; // the thumb follows the ride except while a pointer holds it
    range.addEventListener('pointerdown', () => { scrubbing = true; });
    range.addEventListener('change', lift);
    addEventListener('pointerup', lift);
    addEventListener('pointercancel', lift);
    ahead.onclick = () => { free = false; };
    controls.replaceChildren(el('div', { className: 'ride' }, play, slower, rate, faster, range, ahead));

    const passing = () => { const m = getState().models[line.models[path.reached(dist)]]; return tr('sv.passing', { name: m.name, date: month(m.release) }); };
    return {
      title: passing(),
      pose: { position: V(path.at(0)), look: V(path.at(0.3)), fov: 75 },
      frame(dt) {
        if (playing) { dist = Math.min(path.length, dist + 0.25 * speed * dt); if (dist >= path.length) setPlaying(false); }
        const eye = V(path.at(dist)), next = V(path.at(dist + 0.3));
        scene.camera.position.copy(eye);
        if (!free && next.distanceTo(eye) > 0.05) ctx.lookAt(next);
        if (!scrubbing) range.value = path.length ? Math.round((dist / path.length) * 1000) : 0;
        ctx.setTitle(passing());
      },
      looked() { free = true; },
      stop() { removeEventListener('pointerup', lift); removeEventListener('pointercancel', lift); },
      valid: () => scene.lines().some(l => l.company === company && l.points.length > 1),
      refresh: build,
      link: () => ({ mode: 'ride', company }),
    };
  },
};
