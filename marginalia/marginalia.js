// Direction 1: Marginalia. Mockup behaviour, no libraries.
(() => {
  const doc = document.documentElement;
  doc.classList.add('js');
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const wide = matchMedia('(min-width: 981px)');
  const calm = matchMedia('(prefers-reduced-motion: reduce)');
  const SVG = 'http://www.w3.org/2000/svg';

  // Both dates in the colophon, from the browser's own calendars
  const now = new Date();
  $$('[data-date="gregorian"]').forEach(el => {
    el.textContent = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }).format(now);
  });
  $$('[data-date="hijri"]').forEach(el => {
    try {
      el.textContent = new Intl.DateTimeFormat('en-GB-u-ca-islamic-umalqura', { day: 'numeric', month: 'long', year: 'numeric' }).format(now);
    } catch (e) { el.remove(); }
  });

  // The running head turns dark over the book scene, and shows the name once the opening has passed
  const book = $('.book'), opening = $('.opening');
  if (book || opening) {
    const headState = () => {
      if (book) {
        const r = book.getBoundingClientRect();
        document.body.classList.toggle('on-night', r.top < 40 && r.bottom > 40);
        // the book turns a few degrees as it crosses the screen
        const t = Math.min(1, Math.max(0, 1 - (r.top + r.height * 0.5) / innerHeight));
        if (!calm.matches) book.style.setProperty('--turn', (26 - t * 16).toFixed(2) + 'deg');
      }
      if (opening) document.body.classList.toggle('past-opening', opening.getBoundingClientRect().bottom < 120);
    };
    addEventListener('scroll', headState, { passive: true });
    headState();
  }

  // ---- 1. The annotated sentence: every marked word is tied to its note by a red line ----
  const sentence = $('.sentence'), marks = $$('.sentence .mark'), svg = $('.ties'), grid = $('.opening__grid');
  const glosses = marks.map((m, i) => $('#g' + (i + 1)));   // note k belongs to word k, whichever margin it sits in
  if (marks.length && grid) {
    const stepEl = $('.opening__step');
    let active = 0, hover = 0, pinned = false;

    // one tie per word: a bar along the word, a faint line out to the note, an inked copy that draws in, a dot at the note
    const make = (tag, cls, attrs = {}) => {
      const e = document.createElementNS(SVG, tag);
      e.setAttribute('class', cls);
      for (const k in attrs) e.setAttribute(k, attrs[k]);
      return e;
    };
    const ties = marks.map((m) => {
      const t = { g: make('g', 'tie'), bar: make('path', 'bar'), base: make('path', 'base'), ink: make('path', 'ink', { pathLength: 1 }), dot: make('circle', 'dot', { r: 2.6 }) };
      t.g.append(t.bar, t.base, t.ink, t.dot);
      svg.append(t.g);
      t.probe = document.createElement('span');   // marks the word's baseline
      t.probe.className = 'bl';
      m.append(t.probe);
      return t;
    });

    // a ruled line with its corners turned a little, as a pen would
    const ruled = (pts, r = 7) => {
      pts = pts.filter((p, i, a) => !i || Math.hypot(p[0] - a[i - 1][0], p[1] - a[i - 1][1]) > .5);
      let d = `M${pts[0][0]} ${pts[0][1]}`;
      for (let i = 1; i < pts.length - 1; i++) {
        const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], [x2, y2] = pts[i + 1];
        const l1 = Math.hypot(x1 - x0, y1 - y0), l2 = Math.hypot(x2 - x1, y2 - y1), rr = Math.min(r, l1 / 2, l2 / 2);
        d += ` L${x1 + (x0 - x1) / l1 * rr} ${y1 + (y0 - y1) / l1 * rr} Q${x1} ${y1} ${x1 + (x2 - x1) / l2 * rr} ${y1 + (y2 - y1) / l2 * rr}`;
      }
      const [xl, yl] = pts[pts.length - 1];
      return `${d} L${xl} ${yl}`;
    };

    // Route each tie so it never crosses the text: a word at the end of its line runs straight out under itself;
    // any other word rises into the space above the first line (or drops below the last) and runs along it to the frame.
    // Outside the frame every tie curves to its note; ties are ordered top to bottom on each side, so they do not cross.
    const draw = () => {
      grid.classList.toggle('has-ties', wide.matches);
      if (!wide.matches) return;
      const G = grid.getBoundingClientRect(), F = sentence.getBoundingClientRect();
      const fs = parseFloat(getComputedStyle(sentence).fontSize);
      const range = document.createRange();
      range.selectNodeContents(sentence);
      const text = [...range.getClientRects()].filter(r => r.width > 1 && r.height > 1);
      const top = Math.min(...text.map(r => r.top)), bottom = Math.max(...text.map(r => r.bottom));
      const routes = marks.map((m, k) => {
        const r = m.getBoundingClientRect(), n = $('.gloss__n', glosses[k]).getBoundingClientRect();
        const right = n.left > F.right - 1;
        // text boxes of neighbouring lines overlap a little, so a box belongs to the line its middle falls in
        const mid = t => (t.top + t.bottom) / 2;
        const line = text.filter(t => mid(t) > r.top && mid(t) < r.bottom);
        const lineL = Math.min(...line.map(t => t.left)), lineR = Math.max(...line.map(t => t.right));
        const base = ties[k].probe.getBoundingClientRect().top;
        let kind = 'up';
        if (right ? lineR - r.right < .8 * fs : r.left - lineL < .3 * fs) kind = 'out';
        else if (r.top - top > 4 && bottom - r.bottom < 4) kind = 'down';
        const above = text.filter(t => mid(t) < r.top);
        // a first-line word rises into the space above the text; a middle-line word into the gap between lines
        const gap = above.length ? (Math.max(...above.map(mid)) + mid(r)) / 2 : null;
        return { k, r, n, right, kind, gap, under: base + .2 * fs, over: r.top + .1 * fs + 1 };
      });
      // stacked channels: the tie that has furthest to run takes the channel furthest from the words
      for (const kind of ['up', 'down']) for (const right of [true, false]) {
        const group = routes.filter(o => o.kind === kind && o.right === right)
          .sort((a, b) => right ? a.r.right - b.r.right : b.r.left - a.r.left);
        group.forEach((o, j) => { o.j = j; o.L = group.length; });
      }
      const X = x => x - G.left, Y = y => y - G.top;
      routes.forEach(o => {
        const t = ties[o.k], dir = o.right ? 1 : -1;
        const edge = o.right ? F.right : F.left;
        const lead = o.right ? o.r.right : o.r.left, tail = o.right ? o.r.left : o.r.right;
        let y, pts;
        if (o.kind === 'out') {
          y = o.under; pts = [[lead, y], [edge, y]];
        } else if (o.kind === 'up') {
          const yc = o.gap ?? F.top + (o.r.top - F.top) * (o.j + 1) / (o.L + 1);
          y = o.over; pts = [[lead, y], [lead, yc], [edge, yc]];
        } else {
          const yc = bottom + (F.bottom - bottom) * (o.L - o.j) / (o.L + 1);
          y = o.under; pts = [[lead, y], [lead, yc], [edge, yc]];
        }
        const y0 = pts[pts.length - 1][1];
        const x1 = o.right ? o.n.left - 6 : o.n.right + 6, y1 = o.n.top + o.n.height * .55, dd = Math.abs(x1 - edge) * .5;
        const d = `${ruled(pts.map(([px, py]) => [X(px), Y(py)]))} C${X(edge + dir * dd)} ${Y(y0)} ${X(x1 - dir * dd)} ${Y(y1)} ${X(x1)} ${Y(y1)}`;
        t.base.setAttribute('d', d);
        t.ink.setAttribute('d', d);
        t.bar.setAttribute('d', `M${X(tail)} ${Y(y)} L${X(lead)} ${Y(y)}`);
        t.dot.setAttribute('cx', X(x1));
        t.dot.setAttribute('cy', Y(y1));
      });
    };

    // notes open, close and turn level; keep the ties on them while they move
    let raf = 0, until = 0;
    const follow = (ms = 900) => {
      until = Math.max(until, performance.now() + ms);
      if (!raf) raf = requestAnimationFrame(function step(now) { draw(); raf = now < until ? requestAnimationFrame(step) : 0; });
    };

    const paint = () => {
      const cur = hover || active;
      marks.forEach((m, k) => {
        m.classList.toggle('is-on', pinned ? k < active || k === cur - 1 : k === cur - 1);
        m.classList.toggle('is-active', k === cur - 1);
      });
      glosses.forEach((g, k) => g.classList.toggle('is-on', k === cur - 1));
      ties.forEach((t, k) => {
        t.g.classList.toggle('is-active', k === cur - 1);
        t.g.classList.toggle('is-done', pinned && k < active && k !== cur - 1);
      });
      if (stepEl) stepEl.textContent = pinned ? (active ? `note ${active} of ${marks.length}` : 'scroll, and the sentence is annotated') : '';
      follow();
    };
    const onScroll = () => {
      if (!pinned) return;
      const r = opening.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, -r.top / (r.height - innerHeight)));
      const i = p < 0.07 ? 0 : Math.min(marks.length, 1 + Math.floor((p - 0.07) / (0.86 / marks.length)));
      if (i !== active) { active = i; paint(); }
    };
    const mode = () => {
      pinned = wide.matches && !calm.matches && innerHeight >= 640;
      doc.classList.toggle('stepped', pinned);
      active = 0; hover = 0;
      onScroll(); paint();
    };
    wide.addEventListener('change', mode); calm.addEventListener('change', mode);
    addEventListener('scroll', onScroll, { passive: true });
    addEventListener('resize', () => follow(100));
    if (document.fonts) document.fonts.ready.then(() => follow(100));
    mode();
    follow(1600);   // the arrival: the name, the sentence and the notes settle into place

    // pointing at a word or at its note brings the pair forward; on a phone, tapping a word opens its note
    const point = (k) => { if (wide.matches) { hover = k; paint(); } };
    marks.forEach((m, k) => {
      m.addEventListener('mouseenter', () => point(k + 1));
      m.addEventListener('mouseleave', () => point(0));
      m.addEventListener('focus', () => point(k + 1));
      m.addEventListener('blur', () => point(0));
      m.addEventListener('click', (e) => {
        e.preventDefault();
        if (wide.matches) return;
        active = k + 1; paint();
        glosses[k].scrollIntoView({ block: 'nearest', behavior: calm.matches ? 'auto' : 'smooth' });
      });
    });
    glosses.forEach((g, k) => {
      g.addEventListener('mouseenter', () => point(k + 1));
      g.addEventListener('mouseleave', () => point(0));
    });
  }

  // ---- 3. Essays: the row you point at sets its first line in the margin ----
  const first = $('.firstline');
  if (first) {
    const text = $('.firstline__text', first), src = $('.firstline__src', first);
    $$('.toc a').forEach(a => {
      const show = () => { text.textContent = a.dataset.first; src.textContent = a.dataset.src; };
      a.addEventListener('mouseenter', show); a.addEventListener('focus', show);
    });
  }

  // ---- The essay page ----
  const body = $('.essay__text');
  if (body) {
    // paragraph numbers, each a permanent link
    const paras = $$(':scope > p, :scope > blockquote > p', body);
    paras.forEach((p, i) => {
      p.id = 'p' + (i + 1);
      const a = document.createElement('a');
      a.className = 'pn'; a.href = '#p' + (i + 1); a.textContent = i + 1;
      a.setAttribute('aria-label', 'Link to paragraph ' + (i + 1));
      p.prepend(a);
    });
    $$('[data-paras]').forEach(el => el.textContent = paras.length);

    // a thin red line from a marked phrase to its note
    const notes = $$('.note', body);
    const svg = document.createElementNS(SVG, 'svg');
    svg.setAttribute('class', 'tie'); svg.setAttribute('aria-hidden', 'true');
    body.append(svg);
    const untie = () => { svg.replaceChildren(); $$('.is-tied', body).forEach(el => el.classList.remove('is-tied')); };
    const tieNote = (ref, note) => {
      untie();
      if (!wide.matches || !note) return;
      ref.classList.add('is-tied'); note.classList.add('is-tied');
      const b = body.getBoundingClientRect();
      const rects = ref.getClientRects(), last = rects[rects.length - 1], n = note.getBoundingClientRect();
      const x1 = last.right - b.left + 3, y1 = last.top - b.top + 3;
      const x2 = n.left - b.left - 6, y2 = n.top - b.top + 11;
      const p = document.createElementNS(SVG, 'path');
      const mx = Math.max(x1 + 20, b.width + 18);
      p.setAttribute('d', `M${x1} ${y1} L${mx} ${y1} L${mx} ${y2} L${x2} ${y2}`);
      svg.append(p);
    };
    $$('.ref', body).forEach(ref => {
      const note = document.getElementById(ref.dataset.note);
      ref.tabIndex = 0;
      ref.addEventListener('mouseenter', () => tieNote(ref, note));
      ref.addEventListener('focus', () => tieNote(ref, note));
      ref.addEventListener('mouseleave', untie);
      ref.addEventListener('blur', untie);
      ref.addEventListener('click', () => { if (!wide.matches && note) note.classList.toggle('is-open'); });
    });
    // on a phone a note is a slip: tap its number and it opens under the line
    $$('.fnm', body).forEach(a => {
      a.addEventListener('click', (e) => {
        if (wide.matches) return;
        e.preventDefault();
        const note = document.getElementById(a.getAttribute('href').slice(1));
        if (note) note.classList.toggle('is-open');
      });
    });
    // unnumbered notes (edition note, related lecture) stay open on a phone
    notes.filter(n => !n.id).forEach(n => n.classList.add('is-open'));

    // the note nearest the reading line is inked; the progress mark moves; the section is named
    const heads = $$('h2, h3', body), where = $('[data-where]'), paraEls = $$('[data-para]');
    let ticking = false;
    const read = () => {
      ticking = false;
      const line = innerHeight * 0.4;
      let best = null, d = Infinity;
      notes.forEach(n => { const t = Math.abs(n.getBoundingClientRect().top - line); if (t < d) { d = t; best = n; } });
      notes.forEach(n => n.classList.toggle('is-near', n === best && d < innerHeight * 0.45));
      let k = 0; paras.forEach((p, i) => { if (p.getBoundingClientRect().top < line) k = i; });
      paraEls.forEach(el => el.textContent = k + 1);
      const b = body.getBoundingClientRect();
      const prog = Math.min(1, Math.max(0, (line - b.top) / b.height));
      doc.style.setProperty('--p', prog.toFixed(4));
      if (where) { let h = null; heads.forEach(x => { if (x.getBoundingClientRect().top < line) h = x; }); where.textContent = h ? h.textContent : 'The opening'; }
    };
    addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(read); } }, { passive: true });
    addEventListener('resize', read);
    read();

    const copy = $('[data-copy]');
    if (copy) copy.addEventListener('click', () => {
      const done = () => { copy.textContent = 'Link copied'; setTimeout(() => copy.textContent = 'Copy link', 1600); };
      navigator.clipboard ? navigator.clipboard.writeText(location.href.split('#')[0]).then(done, done) : done();
    });
  }
})();
