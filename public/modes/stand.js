// Stand mode: stand at one model and look around; the nearest models are listed and one tap away.
import { nearest, compare } from '../space.js';

export const stand = {
  start(ctx, target) {
    const { THREE, scene, getState, el, panel } = ctx, j = target.index, m = getState().models[j];
    function list() {
      const { models, axes } = getState(), from = scene.cubeOf(j);
      const pos = new Map(scene.visible().map(i => [i, scene.cubeOf(i)]));
      const items = nearest(pos, from, 5, j).map(i => {
        const b = el('button', {}, el('strong', { textContent: models[i].name }), el('span', { textContent: compare(axes, from, pos.get(i)) }));
        b.onclick = () => ctx.face(scene.worldOf(i));
        return el('li', {}, b);
      });
      panel.replaceChildren(el('h3', { textContent: 'Nearest models' }), items.length ? el('ol', {}, ...items) : el('p', { textContent: 'No other models on the chart.' }));
      panel.hidden = false;
    }
    list();
    const eye = scene.worldOf(j).clone();
    return {
      title: `Standing at ${m.name}, ${m.company}`,
      pose: { position: eye, look: eye.lengthSq() < 1e-6 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 0, 0), fov: 75 },
      tagTap: i => { ctx.hop(i); return true; },
      valid: () => scene.worldOf(j) != null,
      refresh: () => { scene.camera.position.copy(scene.worldOf(j)); list(); }, // scales follow the companies shown, so the spot moves
      link: () => ({ mode: 'stand', model: m.name }),
    };
  },
};
