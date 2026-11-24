// Content of the home page. The three sections render from this file:
//   reports    one entry per report; newest first. `href` is the report's own page, `pdf` its paper.
//   posts      one entry per blog post: { title, date: 'YYYY-MM-DD', summary, href }. Empty shows "No posts yet".
//   galleries  one tab per report; each item is one real-robot run shown as a small card:
//              { name, desc, video (card loop), poster, full (video in the enlarged view), fullPoster,
//                badge (text bottom right), stats: [[label, value, sub]], note,
//                narrow: optional { full, fullPoster, note } used instead on narrow screens }.
// Paths are relative to the site root. Numbers of ACE-CaP-0 come from static/js/data.js (the paper's Table 1).
(function () {
  'use strict';
  const A = window.ACE;
  const pct = v => v.toFixed(1) + '%';
  const times = A.tasks.map(t => t.time);

  window.SITE = {
    reports: [{
      id: 'ace-cap-0',
      label: 'ACE-CaP-0',
      date: '2026-11-12',
      title: 'ACE-CaP-0: Real-World Code-as-Policies in the Era of Experience',
      summary: 'A coding agent writes the robot\'s program, asks for a demonstration when it lacks a strategy, and runs a simulated experiment when it needs to compare revisions. The finished program is frozen and runs with no human or coding agent in the loop.',
      href: 'reports/ace-cap-0/',
      pdf: 'static/ACE-CaP-0.pdf',
      cover: 'static/img/ace-cap-0-cover.jpg',
      stats: [
        ['Real-world success', pct(A.overall.success), A.overall.ok + ' of ' + A.overall.n + ' trials'],
        ['Tasks', String(A.tasks.length), 'frozen programs, ' + A.tasks[0].n + ' trials each'],
        ['Mean execution time', Math.min.apply(null, times).toFixed(2) + '–' + Math.max.apply(null, times).toFixed(2), 'minutes per task']
      ]
    }],

    posts: [],

    galleries: [{
      report: 'ace-cap-0',
      label: 'ACE-CaP-0',
      speed: 3,
      note: 'One autonomous real-world execution per task, top-down camera. Percentages are the report\'s success rates over 30 trials of each frozen program. Select a card to watch the run in real time.',
      items: A.tasks.map(t => ({
        name: t.name,
        desc: t.desc + '.',
        video: t.front,
        poster: t.poster,
        full: t.tri || t.front,
        fullPoster: t.tri ? t.triPoster : t.poster,
        badge: pct(t.success),
        stats: [
          ['Success rate', pct(t.success), t.ok + ' of ' + t.n + ' trials'],
          ['Mean execution time', t.time.toFixed(2) + ' min'],
          ['Output tokens in development', t.tokens.toFixed(2) + ' M']
        ],
        note: t.tri
          ? 'Real time. Left to right: top-down camera, left wrist camera, right wrist camera.'
          : 'Real time, top-down camera.',
        // on a phone the three-camera strip is too small to read, so the enlarged view shows the top-down camera alone
        narrow: t.tri ? { full: t.front, fullPoster: t.poster, note: 'Real time, top-down camera.' } : null
      }))
    }]
  };
})();
