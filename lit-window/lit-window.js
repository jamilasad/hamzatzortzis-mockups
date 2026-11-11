// Direction 2: The Lit Window. Mockup behaviour, no libraries.
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const calm = matchMedia('(prefers-reduced-motion: reduce)');
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

  // Light that keeps time: the window takes its colour from the visitor's own hour
  const now = new Date(), h = now.getHours() + now.getMinutes() / 60;
  const hours = [
    [5, 8, 'dawn light', '#F6DCD2', '#EFA98A'],
    [8, 11, 'morning light', '#FBF1D4', '#F3C877'],
    [11, 15, 'noon light', '#FFFBEA', '#F6DC9C'],
    [15, 18, 'afternoon light', '#F7E8C9', '#F0B462'],
    [18, 21, 'evening light', '#F3CFA8', '#E5914F'],
  ];
  const slot = hours.find(([a, b]) => h >= a && h < b) || [0, 0, 'lamplight', '#F7E8C9', '#F0B462'];
  const time = new Intl.DateTimeFormat([], { hour: '2-digit', minute: '2-digit' }).format(now);
  const win = $('.window');
  if (win) win.style.background = `linear-gradient(${slot[3]}, ${slot[4]})`;
  $$('[data-clock]').forEach(el => el.textContent = `${time} where you are: ${slot[2]}`);
  $$('[data-clock-foot]').forEach(el => el.textContent = `The window was lit for ${time}, your local time.`);

  // Scroll progress for the pinned scenes and for the light on the page
  const scenes = $$('[data-scene]'), passes = $$('[data-pass]'), wash = $('.read');
  let ticking = false;
  const frame = () => {
    ticking = false;
    const vh = innerHeight;
    scenes.forEach(el => {
      const r = el.getBoundingClientRect();
      if (r.bottom < -vh || r.top > vh * 2) return;
      const p = calm.matches ? 1 : clamp(-r.top / Math.max(1, r.height - vh));
      el.style.setProperty('--p', p.toFixed(4));
      if (el.dataset.scene === 'passage' && !calm.matches) {
        const z = clamp((p - 0.3) / 0.66);
        el.style.setProperty('--zoom', (1 + z * z * z * 17).toFixed(3));
        el.style.setProperty('--side', (1 - clamp((p - 0.16) / 0.18)).toFixed(3));
        el.style.setProperty('--flash', clamp((p - 0.8) / 0.17).toFixed(3));
      }
    });
    passes.forEach(el => {
      const r = el.getBoundingClientRect();
      el.style.setProperty('--v', clamp((vh - r.top) / (vh + r.height)).toFixed(4));
    });
    if (wash) wash.style.setProperty('--gone', clamp(scrollY / 460).toFixed(3));
    spotByScroll();
  };
  const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(frame); } };

  // The hall: the spotlight follows the pointer; without one, it follows the row nearest the middle
  const hall = $('.hall'), rows = $$('.hall li a');
  const light = (row) => {
    rows.forEach(r => r.classList.toggle('is-lit', r === row));
    const b = hall.getBoundingClientRect(), r = row.getBoundingClientRect();
    hall.style.setProperty('--sy', (r.top + r.height / 2 - b.top) + 'px');
  };
  let pointer = false;
  function spotByScroll() {
    if (!hall || pointer) return;
    const mid = innerHeight * 0.5; let best = null, d = Infinity;
    rows.forEach(r => { const t = Math.abs(r.getBoundingClientRect().top + 20 - mid); if (t < d) { d = t; best = r; } });
    if (best) light(best);
  }
  if (hall) {
    hall.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse') return;
      pointer = true;
      const b = hall.getBoundingClientRect();
      hall.style.setProperty('--sx', (e.clientX - b.left) + 'px');
      hall.style.setProperty('--sy', (e.clientY - b.top) + 'px');
    });
    hall.addEventListener('pointerleave', () => { pointer = false; });
    rows.forEach(r => {
      r.addEventListener('mouseenter', () => rows.forEach(x => x.classList.toggle('is-lit', x === r)));
      r.addEventListener('focus', () => light(r));
    });
  }

  // The essay: daylight or lamplight
  const lamp = $('[data-lamp]');
  if (lamp) lamp.addEventListener('click', () => {
    const on = document.body.classList.toggle('lamplit');
    lamp.textContent = on ? 'Daylight' : 'Lamplight';
    lamp.setAttribute('aria-pressed', on);
  });

  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll);
  frame();
})();
