// Direction 3: In Question. Mockup behaviour, no libraries.
// Each pinned question reports how far it has been scrolled; the CSS does the rest.
(() => {
  const pins = [...document.querySelectorAll('.pin')];
  if (!pins.length) return;
  const wide = matchMedia('(min-width: 861px)');
  const calm = matchMedia('(prefers-reduced-motion: reduce)');
  let ticking = false;
  const frame = () => {
    ticking = false;
    const head = 52, vh = innerHeight - head;
    pins.forEach(el => {
      if (!wide.matches || calm.matches) { el.style.removeProperty('--p'); return; }
      const r = el.getBoundingClientRect();
      if (r.bottom < -vh || r.top > vh * 2) return;
      const p = Math.min(1, Math.max(0, (head - r.top) / Math.max(1, r.height - vh)));
      el.style.setProperty('--p', p.toFixed(4));
    });
  };
  const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(frame); } };
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll);
  wide.addEventListener('change', frame);
  frame();
})();
