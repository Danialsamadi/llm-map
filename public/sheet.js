// Phone bottom sheet with resting heights ("detents"). It follows the finger 1:1, a flick throws it to the detent
// its momentum points at, it stretches past the ends, and it can be grabbed again mid-motion.
import { spring, project, rubberband, tracker } from './spring.js';

// detents(): visible heights in px, smallest first. grip: selector for parts that always drag the sheet
// (elsewhere the sheet drags only until it is fully open, then its content scrolls).
export function createSheet(el, { detents, grip, enabled = () => true, onMove = () => {}, onDismiss = null }) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let h = 0, index = 0, anim = null, drag = null, swallowClick = false, cached = null, builtTop = 0;
  // detents can be costly to measure (a layout), so measure once per gesture or settle, never per frame
  const heights = (fresh = false) => (fresh || !cached ? (cached = detents()) : cached);

  function set(v) { // per frame of a drag: only the transform changes (cheap for the compositor)
    h = v;
    const t = Math.max(...heights());
    if (t !== builtTop) { builtTop = t; el.style.height = t + 'px'; }
    el.style.transform = `translateY(${t - v}px)`;
    onMove(v);
  }
  function settle(i, velocity = 0, then, instant = false) {
    const ds = heights(true);
    index = Math.max(0, Math.min(ds.length - 1, i));
    el.dataset.detent = index === ds.length - 1 ? 'top' : String(index);
    goTo(ds[index], velocity, then, instant);
  }
  function goTo(to, velocity = 0, then, instant = false) {
    anim?.stop();
    if (instant || reduced.matches) { set(to); then?.(); return; }
    set(h); // place it at its current height now, not one frame late
    // bounce only when a flick carried momentum; otherwise arrive calmly
    anim = spring({ from: h, to, velocity, damping: Math.abs(velocity) > 400 ? 0.8 : 1, response: 0.35, onUpdate: set, onDone: then });
  }

  el.addEventListener('pointerdown', e => {
    swallowClick = false; // a new gesture: touch drags never send the click we were waiting to swallow
    if (!enabled() || e.button > 0) return;
    const onGrip = !!e.target.closest(grip);
    if (el.dataset.detent === 'top' && !onGrip) return; // fully open: the content scrolls instead
    if (!onGrip && e.target.closest('input[type=search], input[type=range], select')) return;
    anim?.stop(); // grabbed mid-motion: carry on from where it is
    heights(true);
    drag = { id: e.pointerId, y: e.clientY, h0: h, moved: false, track: tracker() };
    drag.track.add(h, e.timeStamp);
  });
  el.addEventListener('pointermove', e => {
    if (!drag || e.pointerId !== drag.id) return;
    const dy = drag.y - e.clientY;
    if (!drag.moved) {
      if (Math.abs(dy) < 8) return; // a little give before deciding it's a drag, so taps still work
      drag.moved = true;
      try { el.setPointerCapture(e.pointerId); } catch {} // best effort: keep tracking even off the sheet
    }
    const ds = heights(), lo = onDismiss ? 0 : ds[0], hi = ds.at(-1), raw = drag.h0 + dy;
    set(raw > hi ? hi + rubberband(raw - hi, innerHeight) : raw < lo ? lo - rubberband(lo - raw, innerHeight) : raw);
    drag.track.add(h, e.timeStamp);
  });
  const end = e => {
    if (!drag || e.pointerId !== drag.id) return;
    const { moved, track } = drag;
    drag = null;
    if (!moved) return;
    swallowClick = true; // the click after a drag isn't a tap
    track.add(h, e.timeStamp); // the release itself: a finger that stopped before lifting has no momentum
    const v = track.velocity(), aim = h + project(v), ds = heights();
    if (onDismiss && aim < ds[0] * 0.5) return goTo(0, v, onDismiss);
    let best = 0;
    ds.forEach((d, i) => { if (Math.abs(d - aim) < Math.abs(ds[best] - aim)) best = i; });
    settle(best, v);
  };
  el.addEventListener('pointerup', end);
  el.addEventListener('pointercancel', end);
  el.addEventListener('click', e => { if (swallowClick) { swallowClick = false; e.stopPropagation(); e.preventDefault(); } }, true);

  return {
    open: (i, { instant = false } = {}) => settle(i, 0, undefined, instant),
    cycle: () => settle(index === heights(true).length - 1 ? 0 : index + 1),
    close: then => goTo(0, 0, then),
    index: () => index,
    layout: () => { if (enabled()) { anim?.stop(); set(heights(true)[index]); } },
    reset: () => { anim?.stop(); h = 0; cached = null; builtTop = 0; el.style.height = el.style.transform = ''; delete el.dataset.detent; },
  };
}
