// Ride mode: travel along one company's line, oldest model to newest.
import { makePath } from '../space.js';

const SPEEDS = [0.5, 1, 2, 4];
const month = d => (d ? new Date(d + 'T00:00:00Z').toLocaleDateString(undefined, { month: 'long', year: 'numeric', timeZone: 'UTC' }) : 'release date unknown');

export const ride = {
  start(ctx, target) {
    const { THREE, scene, getState, el, controls } = ctx, company = target.company;
    const V = a => new THREE.Vector3(a[0], a[1], a[2]);
    let line, path, dist = 0, playing = true, speed = 1, free = false;
    function build() { // (re)read the line; positions move when the companies shown change
      const keep = path?.length ? dist / path.length : 0;
      line = scene.lines().find(l => l.company === company);
      path = makePath(line.points.map(p => [p.x, p.y, p.z]));
      dist = keep * path.length;
    }
    build();

    const play = el('button', { textContent: 'Pause' }), slower = el('button', { textContent: 'Slower' }), faster = el('button', { textContent: 'Faster' });
    const rate = el('span', { className: 'rate', textContent: '1×' });
    const range = el('input', { type: 'range', min: 0, max: 1000, step: 1, value: 0, 'aria-label': 'Position along the line' });
    const ahead = el('button', { textContent: 'Look ahead' });
    const setPlaying = on => { playing = on; play.textContent = on ? 'Pause' : 'Play'; };
    play.onclick = () => { if (!playing && dist >= path.length) dist = 0; setPlaying(!playing); };
    const setSpeed = d => { speed = SPEEDS[Math.max(0, Math.min(SPEEDS.length - 1, SPEEDS.indexOf(speed) + d))]; rate.textContent = speed + '×'; };
    slower.onclick = () => setSpeed(-1);
    faster.onclick = () => setSpeed(1);
    range.oninput = () => { dist = (range.value / 1000) * path.length; };
    ahead.onclick = () => { free = false; };
    controls.replaceChildren(el('div', { className: 'ride' }, play, slower, rate, faster, range, ahead));

    const passing = () => { const m = getState().models[line.models[path.reached(dist)]]; return `Now passing: ${m.name}, ${month(m.release)}`; };
    return {
      title: passing(),
      pose: { position: V(path.at(0)), look: V(path.at(0.3)), fov: 75 },
      frame(dt) {
        if (playing) { dist = Math.min(path.length, dist + 0.25 * speed * dt); if (dist >= path.length) setPlaying(false); }
        const eye = V(path.at(dist)), next = V(path.at(dist + 0.3));
        scene.camera.position.copy(eye);
        if (!free && next.distanceTo(eye) > 0.05) ctx.lookAt(next);
        if (document.activeElement !== range) range.value = path.length ? Math.round((dist / path.length) * 1000) : 0;
        ctx.setTitle(passing());
      },
      looked() { free = true; },
      valid: () => scene.lines().some(l => l.company === company && l.points.length > 1),
      refresh: build,
      link: () => ({ mode: 'ride', company }),
    };
  },
};
