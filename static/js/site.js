(function () {
  'use strict';
  const S = window.SITE;
  const $ = (s, r) => (r || document).querySelector(s);
  const el = (tag, attrs, kids) => {
    const n = document.createElement(tag);
    for (const k in attrs || {}) {
      if (k === 'class') n.className = attrs[k];
      else if (k === 'text') n.textContent = attrs[k];
      else if (attrs[k] !== null && attrs[k] !== undefined) n.setAttribute(k, attrs[k]);
    }
    (kids || []).forEach(c => c && n.appendChild(c));
    return n;
  };
  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const play = v => { const p = v.play(); if (p) p.catch(() => {}); };
  const month = d => new Date(d + 'T00:00:00').toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
  const day = d => new Date(d + 'T00:00:00').toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

  /* ---------- hero video: plays while the hero is on screen ---------- */
  const hero = $('#hero-video');
  if (still) hero.preload = 'none';
  else {
    hero.src = 'static/videos/hero/hero.mp4';
    new IntersectionObserver(es => { if (es[0].isIntersecting) play(hero); else hero.pause(); }, { threshold: 0.05 }).observe(hero);
  }

  /* ---------- reports ---------- */
  const reports = $('#reports');
  S.reports.forEach(r => {
    const stats = el('dl', { class: 'report-stats' });
    (r.stats || []).forEach(s => stats.appendChild(el('div', {}, [
      el('dt', { text: s[0] }), el('dd', { text: s[1] }, [s[2] && el('small', { text: s[2] })])
    ])));
    reports.appendChild(el('article', { class: 'report-card' }, [
      el('a', { class: 'report-cover', href: r.href, tabindex: '-1', 'aria-hidden': 'true' }, [
        el('img', { src: r.cover, alt: '', loading: 'lazy', width: 720, height: 932 })
      ]),
      el('div', {}, [
        el('p', { class: 'report-meta' }, [el('span', { class: 'tag', text: r.label }), el('time', { datetime: r.date, text: month(r.date) })]),
        el('h3', { class: 'report-title' }, [el('a', { href: r.href, text: r.title })]),
        el('p', { class: 'report-summary', text: r.summary }),
        stats,
        el('div', { class: 'report-actions' }, [
          el('a', { class: 'pill pill-quiet', href: r.href, text: 'Read the report' }),
          r.pdf && el('a', { class: 'pill pill-quiet', href: r.pdf, text: 'Paper (PDF)' }),
          el('a', { class: 'pill pill-quiet', href: r.href + '#cite', text: 'BibTeX' })
        ])
      ])
    ]));
  });

  /* ---------- blog ---------- */
  const posts = $('#posts');
  if (!S.posts.length) posts.appendChild(el('p', { class: 'empty', text: 'No posts yet.' }));
  else {
    posts.className = 'posts';
    S.posts.forEach(p => posts.appendChild(el('a', { class: 'post-card', href: p.href }, [
      el('time', { datetime: p.date, text: day(p.date) }), el('h3', { text: p.title }), el('p', { text: p.summary })
    ])));
  }

  /* ---------- gallery: one tab per report, small looping cards, enlarged view on click ---------- */
  const tabsBox = $('#gallery-tabs'), cards = $('#gallery-cards'), note = $('#gallery-note'), toggle = $('#gallery-toggle');
  const reportOf = id => S.reports.find(r => r.id === id);
  let vids = [], paused = still, seen = false, current = null;
  const sync = () => {
    const run = seen && !paused && !lb.open;
    vids.forEach(v => { if (run) { v.playbackRate = current.speed || 1; play(v); } else v.pause(); });
    toggle.textContent = paused ? 'Play videos' : 'Pause videos';
    toggle.setAttribute('aria-pressed', String(paused));
  };
  const show = g => {
    current = g;
    [].forEach.call(tabsBox.children, b => b.setAttribute('aria-selected', String(b.dataset.report === g.report)));
    cards.textContent = '';
    cards.setAttribute('aria-label', g.label);
    vids = g.items.map(it => {
      const v = el('video', { poster: it.poster, preload: 'none', playsinline: '', loop: '', 'aria-hidden': 'true', tabindex: '-1' });
      v.muted = true;
      v.defaultPlaybackRate = g.speed || 1;
      v.src = it.video;
      const card = el('button', { class: 'card', type: 'button', 'aria-label': it.name + (it.badge ? ', ' + it.badge + ' success' : '') + '. Watch in real time.' }, [
        v,
        el('span', { class: 'chip chip-name', text: it.name }),
        g.speed && g.speed !== 1 ? el('span', { class: 'chip chip-speed', text: g.speed + '×' }) : null,
        it.badge ? el('span', { class: 'chip chip-rate', text: it.badge }) : null
      ]);
      card.addEventListener('click', () => open(g, it));
      cards.appendChild(card);
      return v;
    });
    note.textContent = g.note + (g.speed && g.speed !== 1 ? ' Cards play at ' + g.speed + '× speed.' : '');
    sync();
  };
  S.galleries.forEach(g => {
    const b = el('button', { type: 'button', role: 'tab', 'aria-selected': 'false', 'aria-controls': 'gallery-cards', 'data-report': g.report, text: g.label });
    b.addEventListener('click', () => show(g));
    tabsBox.appendChild(b);
  });
  toggle.addEventListener('click', () => { paused = !paused; sync(); });
  new IntersectionObserver(es => { seen = es[0].isIntersecting; sync(); }, { threshold: 0.05 }).observe(cards);

  /* ---------- enlarged view ---------- */
  const lb = $('#lightbox');
  function open(g, it) {
    const r = reportOf(g.report);
    $('#lb-title').textContent = it.name;
    $('#lb-desc').textContent = it.desc || '';
    const box = $('#lb-video');
    box.textContent = '';
    const f = (it.narrow && window.matchMedia('(max-width: 700px)').matches) ? it.narrow : it;
    const v = el('video', { controls: '', playsinline: '', loop: '', preload: 'metadata', poster: f.fullPoster, 'aria-label': it.name + ': real-world execution' });
    v.muted = true;
    v.src = f.full;
    box.appendChild(v);
    const stats = $('#lb-stats');
    stats.textContent = '';
    (it.stats || []).forEach(s => stats.appendChild(el('div', {}, [
      el('dt', { text: s[0] }), el('dd', { text: s[1] }, [s[2] && el('small', { text: s[2] })])
    ])));
    $('#lb-note').textContent = f.note || '';
    const link = $('#lb-link');
    link.hidden = !r;
    if (r) { link.href = r.href + '#tasks'; link.textContent = 'Read ' + r.label; }
    lb.showModal();
    sync();
    if (!still) play(v);
  }
  $('#lb-close').addEventListener('click', () => lb.close());
  lb.addEventListener('click', e => { if (e.target === lb) lb.close(); });
  // the close event arrives after the fact; skip it if another card was opened meanwhile
  lb.addEventListener('close', () => { if (!lb.open) { $('#lb-video').textContent = ''; sync(); } });

  if (S.galleries.length) show(S.galleries[0]);

  /* ---------- nav highlight ---------- */
  const spy = new IntersectionObserver(es => {
    es.forEach(e => $('.nav-links a[href="#' + e.target.id + '"]').classList.toggle('on', e.isIntersecting));
  }, { rootMargin: '-40% 0px -55% 0px' });
  document.querySelectorAll('.nav-links a').forEach(a => spy.observe($(a.getAttribute('href'))));
})();
