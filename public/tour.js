// First-visit tour: one slide per feature, swiped or stepped through. Reopened from the About dialog.
const FIG = '<circle cx="0" cy="-15" r="7" fill="#f5c518" stroke="#1d2733" stroke-width="2"/><path d="M-10 -5h20l-3 11h-4l-1 12h-4l-1-12h-4z" fill="#f5c518" stroke="#1d2733" stroke-width="2" stroke-linejoin="round"/>';
const svg = body => `<svg viewBox="0 0 280 150" fill="none" stroke-linecap="round">${body}</svg>`;
const bar = (x, y, w, h, fill, o = 1) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${h / 2}" fill="${fill}" opacity="${o}"/>`;
const thumb = (x, y) => `<circle cx="${x}" cy="${y}" r="9" fill="#fff" stroke="rgb(0 0 0 / .18)"/>`;
const check = (x, y) => `<path d="M${x} ${y}l4 4 8-9" stroke="var(--ink)" stroke-width="2.4" stroke-linejoin="round"/>`;

// Pictures of the feature, no words in them, so a right-to-left page can mirror them.
const STEPS = [
  ['map', svg(`<path d="M98 64L122 40L180 50" stroke="var(--slate)" stroke-width="2" opacity=".5"/>
    <g stroke-width="5"><line x1="140" y1="94" x2="140" y2="20" stroke="var(--ax-2)"/><line x1="140" y1="94" x2="80" y2="128" stroke="var(--ax-0)"/><line x1="140" y1="94" x2="200" y2="128" stroke="var(--ax-1)"/></g>
    <circle cx="98" cy="64" r="7" fill="#4e79a7"/><circle cx="122" cy="40" r="5" fill="#4e79a7"/><circle cx="180" cy="50" r="9" fill="#4e79a7"/><circle cx="172" cy="108" r="6" fill="#59a14f"/><circle cx="108" cy="104" r="5" fill="#e15759"/><circle cx="208" cy="82" r="4" fill="#f28e2b"/>`)],
  ['ask', svg(`<rect x="48" y="16" width="184" height="58" rx="12" fill="var(--fill-strong)"/>${bar(62, 28, 112, 9, 'var(--ink)', .85)}
    <circle cx="66" cy="54" r="4" fill="var(--ax-0)"/>${bar(76, 51, 50, 6, 'var(--slate)', .6)}<circle cx="142" cy="54" r="4" fill="var(--ax-1)"/>${bar(152, 51, 30, 6, 'var(--slate)', .6)}<circle cx="196" cy="54" r="4" fill="var(--ax-2)"/>
    ${bar(62, 90, 96, 9, 'var(--ink)', .45)}${bar(62, 112, 120, 9, 'var(--ink)', .45)}${bar(62, 134, 78, 9, 'var(--ink)', .45)}`)],
  ['card', svg(`<circle cx="44" cy="56" r="8" fill="#4e79a7"/><circle cx="44" cy="56" r="15" stroke="#4e79a7" stroke-width="2" opacity=".5"/>
    <rect x="76" y="10" width="160" height="132" rx="14" fill="var(--panel)" stroke="var(--hair)"/>${bar(90, 24, 96, 9, 'var(--ink)', .85)}${bar(90, 40, 60, 6, 'var(--slate)', .6)}
    ${[[62, 'var(--ax-0)', 78, '#1f7a45'], [88, 'var(--ax-1)', 40, '#636366'], [114, 'var(--ax-2)', 90, '#1f7a45']].map(([y, c, w, b]) =>
      bar(90, y, 40, 5, 'var(--slate)', .6) + bar(90, y + 11, 96, 5, 'var(--fill-strong)') + bar(90, y + 11, w, 5, c) + bar(194, y + 6, 30, 11, b)).join('')}`)],
  ['filter', svg([[36, 'var(--ax-0)', 100, 190], [76, 'var(--ax-1)', 62, 150], [116, 'var(--ax-2)', 130, 226]].map(([y, c, a, b]) =>
    `<line x1="54" y1="${y}" x2="226" y2="${y}" stroke="var(--fill-strong)" stroke-width="5"/><line x1="${a}" y1="${y}" x2="${b}" y2="${y}" stroke="${c}" stroke-width="5"/>${thumb(a, y)}${thumb(b, y)}`).join(''))],
  ['companies', svg(`${[[24, '#4e79a7', 92, 1], [54, '#f28e2b', 70, 1], [84, '#59a14f', 104, 0], [114, '#e15759', 80, 1]].map(([y, c, w, on]) =>
    `<circle cx="62" cy="${y}" r="6" fill="${c}"/>${bar(78, y - 4, w, 8, 'var(--ink)', .7)}${bar(188, y - 3, 14, 6, 'var(--slate)', .5)}${on ? check(208, y - 1) : ''}`).join('')}`)],
  ['street', svg(`<path d="M60 112L150 82L240 112L150 142Z" fill="var(--fill-strong)"/>
    <path d="M150 50L150 112" stroke="var(--slate)" stroke-width="1.5" stroke-dasharray="3 4" opacity=".6"/><circle cx="150" cy="50" r="8" fill="#4e79a7"/><circle cx="196" cy="70" r="6" fill="#59a14f"/><circle cx="112" cy="78" r="5" fill="#e15759"/>
    <path d="M58 52C80 18 118 16 140 38" stroke="var(--slate)" stroke-width="2" stroke-dasharray="4 5"/><path d="M132 38l9 1-2-9" stroke="var(--slate)" stroke-width="2" stroke-linejoin="round"/>
    <g transform="translate(46 80)">${FIG}</g>`)],
  ['share', svg(`<rect x="40" y="28" width="200" height="38" rx="19" fill="var(--fill-strong)"/>
    <g stroke="var(--signal)" stroke-width="3"><rect x="56" y="40" width="16" height="10" rx="5" transform="rotate(-35 64 45)"/><rect x="66" y="44" width="16" height="10" rx="5" transform="rotate(-35 74 49)"/></g>
    ${bar(94, 43, 110, 8, 'var(--ink)', .6)}<rect x="90" y="92" width="100" height="36" rx="18" fill="var(--fill-strong)"/><rect x="93" y="95" width="47" height="30" rx="15" fill="var(--panel)"/>
    ${bar(104, 106, 25, 8, 'var(--ink)', .8)}${bar(152, 106, 25, 8, 'var(--slate)', .6)}`)],
];

export function createTour(dialog, { tr, rtl, int, onLang }) {
  const track = dialog.querySelector('.tour-track'), dots = dialog.querySelector('.tour-dots');
  const back = dialog.querySelector('#tourBack'), next = dialog.querySelector('#tourNext'), last = STEPS.length - 1;
  const slides = STEPS.map(([k, art]) => {
    const s = document.createElement('section'), h = document.createElement('h2'), p = document.createElement('p');
    s.className = 'slide';
    s.innerHTML = `<div class="tour-art" aria-hidden="true">${art}</div>`; // static markup from this file, no data in it
    h.textContent = tr(`tour.${k}.h`); p.textContent = tr(`tour.${k}.p`);
    s.append(h, p);
    return s;
  });
  const marks = slides.map((s, i) => {
    const b = document.createElement('button');
    b.setAttribute('aria-label', tr('tour.step', { n: int(i + 1), total: int(slides.length) }));
    b.onclick = () => go(i);
    return b;
  });
  track.replaceChildren(...slides);
  dots.replaceChildren(...marks);

  let at = 0;
  const go = i => {
    show(i);
    slides[i].scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', inline: 'start', block: 'nearest' });
  };
  const show = i => {
    at = i;
    marks.forEach((m, j) => m.setAttribute('aria-current', j === i ? 'step' : 'false'));
    slides.forEach((s, j) => { s.inert = j !== i; });
    back.style.visibility = i ? '' : 'hidden';
    next.textContent = tr(i === last ? 'tour.start' : 'tour.next');
  };
  // a swipe: once the track settles, the slide in view is the step (scrollLeft is negative right to left)
  let settle;
  track.addEventListener('scroll', () => {
    clearTimeout(settle);
    settle = setTimeout(() => { const i = Math.round(Math.abs(track.scrollLeft) / track.clientWidth); if (i !== at) show(i); }, 120);
  });

  next.onclick = () => (at === last ? dialog.close() : go(at + 1));
  back.onclick = () => go(at - 1);
  dialog.querySelector('#tourSkip').onclick = () => dialog.close();
  const lang = dialog.querySelector('#tourLang');
  lang.lang = rtl ? 'en' : 'fa'; // names the other language, in that language
  lang.onclick = () => onLang(at);
  dialog.addEventListener('keydown', e => {
    const step = { ArrowRight: rtl ? -1 : 1, ArrowLeft: rtl ? 1 : -1 }[e.key];
    if (step && slides[at + step]) { go(at + step); e.preventDefault(); }
  });
  dialog.addEventListener('close', () => { try { localStorage.setItem('toured', '1'); } catch {} });

  return {
    open(i = 0) { show(i); dialog.showModal(); slides[i].scrollIntoView({ inline: 'start', block: 'nearest' }); next.focus(); },
    seen() { try { return localStorage.getItem('toured') === '1'; } catch { return true; } }, // no storage: don't show it on every visit
  };
}
