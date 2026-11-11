(function () {
  'use strict';
  const D = window.ACE;
  const $ = (s, r) => (r || document).querySelector(s);
  const el = (tag, attrs, kids) => {
    const n = document.createElement(tag);
    for (const k in attrs || {}) {
      if (k === 'class') n.className = attrs[k];
      else if (k === 'text') n.textContent = attrs[k];
      else if (k === 'html') n.innerHTML = attrs[k];
      else if (attrs[k] !== null && attrs[k] !== undefined) n.setAttribute(k, attrs[k]);
    }
    (kids || []).forEach(c => c && n.appendChild(c));
    return n;
  };
  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const pct = v => v.toFixed(1) + '%';

  /* ---------- video wall ---------- */
  const wall = $('#wall');
  const toggle = $('#wall-toggle');
  let wallPaused = still, wallSeen = false;
  const wallVideos = [];
  D.tasks.forEach(t => {
    const v = el('video', { poster: t.poster, preload: 'none', playsinline: '', loop: '', 'aria-hidden': 'true', tabindex: '-1' });
    v.muted = true;
    v.defaultPlaybackRate = t.wallSpeed;
    v.src = t.front;
    wallVideos.push(v);
    const tile = el('button', { class: 'tile', type: 'button', 'aria-label': t.name + ', ' + pct(t.success) + ' success. Watch in real time.' }, [
      v,
      el('span', { class: 'tile-speed', text: t.wallSpeed + '×' }),
      el('span', { class: 'tile-label' }, [
        el('span', { class: 'tile-name', text: t.name }),
        el('span', { class: 'tile-rate', text: pct(t.success) })
      ])
    ]);
    tile.addEventListener('click', () => { select(t.key, true); $('#tasks').scrollIntoView(); });
    wall.appendChild(tile);
  });
  const wallSync = () => {
    const run = wallSeen && !wallPaused;
    wallVideos.forEach(v => {
      if (run) { v.playbackRate = v.defaultPlaybackRate; const p = v.play(); if (p) p.catch(() => {}); }
      else v.pause();
    });
    toggle.textContent = wallPaused ? 'Play videos' : 'Pause videos';
    toggle.setAttribute('aria-pressed', String(wallPaused));
  };
  toggle.addEventListener('click', () => { wallPaused = !wallPaused; wallSync(); });
  new IntersectionObserver(es => { wallSeen = es[0].isIntersecting; wallSync(); }, { threshold: 0.05 }).observe(wall);
  wallSync();

  /* ---------- task explorer ---------- */
  const picker = $('#picker');
  const tabs = {};
  let taskVideo = null;
  D.tasks.forEach(t => {
    const b = el('button', { type: 'button', role: 'tab', 'aria-selected': 'false', 'aria-controls': 'task-panel', text: t.name });
    b.addEventListener('click', () => select(t.key, true));
    tabs[t.key] = b;
    picker.appendChild(b);
  });
  function select(key, play) {
    const t = D.tasks.find(x => x.key === key);
    for (const k in tabs) tabs[k].setAttribute('aria-selected', String(k === key));
    const box = $('#task-video');
    box.textContent = '';
    box.className = 'task-video' + (t.tri ? '' : ' single');
    taskVideo = el('video', { controls: '', playsinline: '', loop: '', preload: 'metadata', poster: t.tri ? t.triPoster : t.poster,
      'aria-label': t.name + ': real-world execution, real time' });
    taskVideo.muted = true;
    taskVideo.src = t.tri || t.front;
    box.appendChild(taskVideo);
    if (play && !still) { const p = taskVideo.play(); if (p) p.catch(() => {}); }
    $('#task-name').textContent = t.name;
    $('#task-desc').textContent = t.desc + '.';
    const stats = $('#task-stats');
    stats.textContent = '';
    [['Success rate', pct(t.success), t.ok + ' of ' + t.n + ' trials'],
     ['Mean execution time', t.time.toFixed(2) + ' min', '30 evaluation trials'],
     ['Output tokens', t.tokens.toFixed(2) + ' M', 'all model calls in development']].forEach(r => {
      stats.appendChild(el('div', {}, [el('dt', { text: r[0] }), el('dd', { text: r[1] }, [el('small', { text: r[2] })])]));
    });
    const story = $('#task-story');
    story.textContent = '';
    story.style.setProperty('--n', t.story.length);
    t.story.forEach(s => story.appendChild(el('figure', {}, [
      el('img', { src: s.img, alt: t.name + ': ' + s.caption, loading: 'lazy', width: 600, height: 400 }),
      el('figcaption', { text: s.caption })
    ])));
    $('#task-note').textContent = (t.tri
      ? 'Video: one autonomous real-world execution in real time. Left to right: top-down camera, left wrist camera, right wrist camera.'
      : 'Video: one autonomous real-world execution in real time, top-down camera.')
      + ' Numbers are from the paper\'s 30-trial evaluation of the frozen program.';
  }
  select(D.tasks[0].key, false);
  new IntersectionObserver(es => { if (!es[0].isIntersecting && taskVideo) taskVideo.pause(); }).observe($('#task-video'));

  /* ---------- results table ---------- */
  const SCALE = {
    success: { max: 100, grid: 25, ticks: [[0, '0'], [50, '50'], [100, '100%']] },
    time: { max: 2.5, grid: 0.5, ticks: [[0, '0'], [1, '1'], [2, '2 min']] },
    tokens: { max: 2.5, grid: 0.5, ticks: [[0, '0'], [1, '1'], [2, '2 M']] }
  };
  const track = (kind, marks) => {
    const s = SCALE[kind];
    const tr = el('div', { class: 'tc-track', style: 'background-size:' + (100 * s.grid / s.max) + '% 100%' });
    marks.forEach(m => tr.appendChild(m));
    return tr;
  };
  const axis = kind => {
    const s = SCALE[kind];
    const a = el('div', { class: 'tc-axis', 'aria-hidden': 'true' });
    s.ticks.forEach(tk => {
      const x = 100 * tk[0] / s.max;
      a.appendChild(el('span', { text: tk[1], style: 'left:' + x + '%;transform:' + (x === 0 ? 'none' : x === 100 ? 'translateX(-100%)' : 'translateX(-50%)') }));
    });
    return a;
  };
  const cell = (label, tr, val, sub) => el('div', { class: 'tc-cell', role: 'cell', 'data-label': label }, [
    tr, el('span', { class: 'tc-val', html: val + (sub ? ' <small>' + sub + '</small>' : '') })
  ]);
  const w = (v, kind) => 'width:' + (100 * v / SCALE[kind].max) + '%';
  const table = $('#results-table');
  table.setAttribute('role', 'table');
  table.setAttribute('aria-label', 'Per-task success rate, mean execution time and output tokens used in development');
  table.appendChild(el('div', { class: 'tc-row tc-head', role: 'row' }, [
    el('div', { class: 'tc-h', role: 'columnheader', text: 'Task' }),
    el('div', { class: 'tc-h', role: 'columnheader', html: 'Success rate <small>30 trials per task</small>' }),
    el('div', { class: 'tc-h', role: 'columnheader', html: 'Mean execution time <small>minutes</small>' }),
    el('div', { class: 'tc-h', role: 'columnheader', html: 'Output tokens <small>millions, during development</small>' })
  ]));
  table.appendChild(el('div', { class: 'tc-row tc-axisrow', 'aria-hidden': 'true' }, [
    el('div'),
    el('div', { class: 'tc-cell' }, [axis('success'), el('span')]),
    el('div', { class: 'tc-cell' }, [axis('time'), el('span')]),
    el('div', { class: 'tc-cell' }, [axis('tokens'), el('span')])
  ]));
  const row = t => el('div', { class: 'tc-row tc-data', role: 'row' }, [
    el('div', { class: 'tc-task', role: 'rowheader', html: t.name + ' <small>' + t.desc + '</small>' }),
    cell('Success', track('success', [el('div', { class: 'tc-bar', style: w(t.success, 'success') })]), pct(t.success), t.ok + '/' + t.n),
    cell('Time', track('time', [el('div', { class: 'tc-bar', style: w(t.time, 'time') })]), t.time.toFixed(2) + ' min'),
    cell('Tokens', track('tokens', [el('div', { class: 'tc-bar tok', style: w(t.tokens, 'tokens') })]), t.tokens.toFixed(2) + ' M')
  ]);
  D.tasks.forEach(t => table.appendChild(row(t)));
  table.appendChild(el('div', { class: 'tc-row tc-data tc-total', role: 'row' }, [
    el('div', { class: 'tc-task', role: 'rowheader', html: 'All eight tasks <small>240 trials</small>' }),
    cell('Success', track('success', [el('div', { class: 'tc-bar', style: w(D.overall.success, 'success') })]), pct(D.overall.success), D.overall.ok + '/' + D.overall.n),
    el('div', { role: 'cell' }), el('div', { role: 'cell' })
  ]));

  /* ---------- demonstration trajectory (two small charts sharing the time axis) ---------- */
  (function teach() {
    const host = $('#teach-chart');
    const data = D.teach;
    const NS = 'http://www.w3.org/2000/svg';
    const W = 860, L = 44, R = 14, T = 50, H1 = 118, GAP = 40, H2 = 84, B = 34;
    const H = T + H1 + GAP + H2 + B;
    const tMax = 49;
    const sx = t => L + (W - L - R) * t / tMax;
    const y1 = z => T + H1 - H1 * z / 22;
    const y2 = g => T + H1 + GAP + H2 - H2 * g / 110;
    const s = (tag, a, txt) => { const n = document.createElementNS(NS, tag); for (const k in a) n.setAttribute(k, a[k]); if (txt !== undefined) n.textContent = txt; return n; };
    const svg = s('svg', { viewBox: '0 0 ' + W + ' ' + H, 'aria-hidden': 'true' });
    const phases = [[3, 9, 'Grasp'], [9, 24.5, 'Lift and carry'], [24.5, 35.6, 'Push into socket'], [35.6, 38.6, 'Release'], [38.6, 45.6, 'Press top']];
    phases.forEach((p, i) => {
      if (i % 2 === 0) {
        svg.appendChild(s('rect', { x: sx(p[0]), y: T, width: sx(p[1]) - sx(p[0]), height: H1, fill: '#f1f4f9' }));
        svg.appendChild(s('rect', { x: sx(p[0]), y: T + H1 + GAP, width: sx(p[1]) - sx(p[0]), height: H2, fill: '#f1f4f9' }));
      }
      svg.appendChild(s('text', { x: (sx(p[0]) + sx(p[1])) / 2, y: T - 9, 'text-anchor': 'middle', class: 'phase' }, p[2]));
    });
    const panel = (y0, h, ticks, ys, title) => {
      ticks.forEach(v => {
        svg.appendChild(s('line', { x1: L, x2: W - R, y1: ys(v), y2: ys(v), stroke: '#d7dde8', 'stroke-width': 1 }));
        svg.appendChild(s('text', { x: L - 8, y: ys(v) + 4, 'text-anchor': 'end' }, String(v)));
      });
      svg.appendChild(s('text', { x: L, y: y0 - (y0 === T ? 30 : 12), class: 'lab' }, title));
    };
    panel(T, H1, [0, 10, 20], y1, 'Left fingertip height (cm)');
    panel(T + H1 + GAP, H2, [0, 50, 100], y2, 'Gripper opening (mm)');
    const path = (ys, i) => data.map((d, k) => (k ? 'L' : 'M') + sx(d[0]).toFixed(1) + ' ' + ys(d[i]).toFixed(1)).join('');
    svg.appendChild(s('path', { d: path(y1, 1), fill: 'none', stroke: '#2443d0', 'stroke-width': 2, 'stroke-linejoin': 'round' }));
    svg.appendChild(s('path', { d: path(y2, 2), fill: 'none', stroke: '#2443d0', 'stroke-width': 2, 'stroke-linejoin': 'round' }));
    for (let t = 0; t <= 45; t += 5) svg.appendChild(s('text', { x: sx(t), y: H - B + 18, 'text-anchor': 'middle' }, String(t)));
    svg.appendChild(s('text', { x: W - R, y: H - 2, 'text-anchor': 'end' }, 'Time (s)'));
    const cross = s('line', { y1: T, y2: H - B, stroke: '#0e1a3a', 'stroke-width': 1, visibility: 'hidden' });
    const d1 = s('circle', { r: 4.5, fill: '#2443d0', stroke: '#fff', 'stroke-width': 2, visibility: 'hidden' });
    const d2 = s('circle', { r: 4.5, fill: '#2443d0', stroke: '#fff', 'stroke-width': 2, visibility: 'hidden' });
    svg.appendChild(cross); svg.appendChild(d1); svg.appendChild(d2);
    host.appendChild(svg);
    const tip = el('div', { class: 'tip' });
    host.appendChild(tip);
    const show = ev => {
      const r = svg.getBoundingClientRect();
      const t = ((ev.clientX - r.left) / r.width * W - L) / (W - L - R) * tMax;
      let best = data[0];
      for (const d of data) if (Math.abs(d[0] - t) < Math.abs(best[0] - t)) best = d;
      const px = sx(best[0]);
      cross.setAttribute('x1', px); cross.setAttribute('x2', px);
      d1.setAttribute('cx', px); d1.setAttribute('cy', y1(best[1]));
      d2.setAttribute('cx', px); d2.setAttribute('cy', y2(best[2]));
      [cross, d1, d2].forEach(n => n.setAttribute('visibility', 'visible'));
      tip.innerHTML = '<b>' + best[0].toFixed(1) + ' s</b><br>height <b>' + best[1].toFixed(1) + ' cm</b><br>gripper <b>' + Math.round(best[2]) + ' mm</b>';
      tip.style.left = (svg.offsetLeft + Math.min(Math.max(px / W * r.width, 60), r.width - 60)) + 'px';
      tip.style.top = (svg.offsetTop + T / H * r.height - 6) + 'px';
      tip.classList.add('on');
    };
    const hide = () => { [cross, d1, d2].forEach(n => n.setAttribute('visibility', 'hidden')); tip.classList.remove('on'); };
    svg.addEventListener('pointermove', show);
    svg.addEventListener('pointerdown', show);
    svg.addEventListener('pointerleave', hide);
  })();

  /* ---------- code colouring ---------- */
  const esc = t => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const RE = /("""[\s\S]*?"""|'(?:\\.|[^'\\\n])*'|"(?:\\.|[^"\\\n])*")|(#.*$)|\b(def|return|if|not|for|in|else|elif|None|True|False|and|or)\b|\b(\d+(?:\.\d+)?)\b/gm;
  document.querySelectorAll('pre.code code').forEach(c => {
    const src = c.textContent;
    let out = '', last = 0, m;
    RE.lastIndex = 0;
    while ((m = RE.exec(src))) {
      out += esc(src.slice(last, m.index));
      const cls = m[1] ? 's' : m[2] ? 'c' : m[3] ? 'k' : 'n';
      out += '<span class="' + cls + '">' + esc(m[0]) + '</span>';
      last = m.index + m[0].length;
    }
    c.innerHTML = out + esc(src.slice(last));
  });

  /* ---------- nav highlight, BibTeX copy ---------- */
  const links = {};
  document.querySelectorAll('.nav nav a').forEach(a => { links[a.getAttribute('href').slice(1)] = a; });
  const spy = new IntersectionObserver(es => {
    es.forEach(e => { if (e.isIntersecting) for (const k in links) links[k].classList.toggle('on', k === e.target.id); });
  }, { rootMargin: '-45% 0px -50% 0px' });
  Object.keys(links).forEach(id => spy.observe(document.getElementById(id)));

  const copy = $('#copy-bib');
  copy.addEventListener('click', () => {
    const text = $('#bibtex').textContent;
    const done = () => { copy.textContent = 'Copied'; setTimeout(() => { copy.textContent = 'Copy BibTeX'; }, 1800); };
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(done);
    else {
      const ta = el('textarea', { style: 'position:fixed;opacity:0' });
      ta.value = text; document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); done(); } catch (e) { /* selection stays for manual copy */ }
      ta.remove();
    }
  });
})();
