/* Chapter pages and the scene player.
   Address: chapter.html#4 (chapter introduction) or chapter.html#4-2 (scene 2). */
(function () {
  'use strict';
  var e = QS.esc;
  var view = document.getElementById('view');
  var progressEl = document.getElementById('chapter-progress');
  var main = document.getElementById('main');
  var chapters = null, cache = {};
  var noteAccepted = {};
  var HIST = {};

  function parseHash() {
    var h = (location.hash || '').replace('#', '');
    var m = h.match(/^(\d+)(?:-(\d+))?$/);
    if (m) return { c: +m[1], s: m[2] ? +m[2] : 0 };
    var q = parseInt(new URLSearchParams(location.search).get('c'), 10);
    return { c: q || 1, s: 0 };
  }

  function loadScenes(n) {
    if (cache[n] !== undefined) return Promise.resolve(cache[n]);
    var file = 'content/chapter-' + (n < 10 ? '0' : '') + n + '.json';
    return fetch(file, { cache: 'no-cache' }).then(function (r) { return r.ok ? r.json() : null; })
      .catch(function () { return null; }).then(function (d) { cache[n] = d; return d; });
  }

  function badge(kind) { return QS.badge(kind); }

  function stopJournals() { view.querySelectorAll('.journal').forEach(function (j) { if (j._stop) j._stop(); }); }

  function setProgress(ch, s, total) {
    if (!s) { progressEl.textContent = ''; return; }
    progressEl.innerHTML = '<span class="cp-label">Chapter ' + ch.n + ', scene ' + s + ' of ' + total + '</span>' +
      '<span class="cp-bar" aria-hidden="true"><span style="width:' + (100 * s / total) + '%"></span></span>';
  }

  function focusMain() { main.focus({ preventScroll: true }); window.scrollTo(0, 0); }

  /* ---------- Chapter introduction ---------- */
  function renderIntro(ch, scenes) {
    var total = chapters.length;
    document.title = 'Chapter ' + ch.n + ', ' + ch.title + ': The Quiet Soldier';
    setProgress(ch, 0);
    var st = QS.chapterState(ch.n);
    var html = '<div class="chapter-intro">' +
      '<p class="kicker">Chapter ' + ch.n + ' of ' + total + '</p>' +
      '<h1>' + e(ch.title) + '</h1>' +
      '<ul class="facts" aria-label="About this chapter">' +
        '<li><strong>Where:</strong> ' + e(ch.place) + '</li>' +
        '<li><strong>When:</strong> ' + e(ch.when) + '</li>' +
        '<li><strong>Time to allow:</strong> about ' + ch.minutes + ' minutes</li>' +
      '</ul>' +
      '<p class="lede">' + e(ch.teaser) + '</p>';
    if (scenes) {
      html += '<div class="intro-actions">' +
        '<a class="btn btn--primary" href="#' + ch.n + '-' + (st.scene && !st.done ? st.scene : 1) + '">' +
        (st.scene && !st.done ? 'Carry on from scene ' + st.scene : (st.done ? 'Visit this chapter again' : 'Begin the chapter')) + '</a>' +
        '<p class="intro-scenes">' + scenes.scenes.length + ' scenes: ' + scenes.scenes.map(function (s) { return e(s.title); }).join(', ') + '.</p></div>';
    }
    if (ch.record) {
      html += '<section class="record" aria-labelledby="record-title">' + badge('archival') +
        '<h2 id="record-title">From his army record</h2>' +
        '<table><caption>' + e(ch.record.source) + '</caption>' +
        '<thead><tr><th scope="col">Date</th><th scope="col">Entry</th></tr></thead><tbody>' +
        ch.record.entries.map(function (r) { return '<tr><th scope="row">' + e(r.date) + '</th><td>' + e(r.entry) + '</td></tr>'; }).join('') +
        '</tbody></table></section>';
    }
    if (!scenes) {
      html += '<div class="pending" role="note"><p><strong>This chapter is still being researched.</strong> Its scenes will appear here once the research is complete.</p></div>';
    }
    html += '</div>';
    var prev = chapters[ch.n - 2], next = chapters[ch.n];
    html += '<nav class="chapter-nav" aria-label="Chapters">' +
      (prev ? '<a class="btn" href="chapter.html#' + prev.n + '">Previous: ' + e(prev.title) + '</a>' : '<a class="btn" href="index.html">Back to the welcome</a>') +
      '<a class="btn btn--dark" href="journey.html">Journey map</a>' +
      (next ? '<a class="btn" href="chapter.html#' + next.n + '">Next: ' + e(next.title) + '</a>' : '') + '</nav>';
    view.innerHTML = html;
  }

  /* ---------- Content note ---------- */
  function renderNote(ch, data, s) {
    setProgress(ch, s, data.scenes.length);
    view.innerHTML = '<div class="content-note" role="region" aria-labelledby="note-title">' +
      '<p class="kicker">Chapter ' + ch.n + ': ' + e(ch.title) + '</p>' +
      '<h1 id="note-title">Before you go on</h1>' +
      '<p>' + e(data.contentNote) + '</p>' +
      '<p class="muted">You can pause, skip or leave at any point. Your place is saved.</p>' +
      '<div class="note-actions">' +
        '<button type="button" class="btn btn--khaki" id="note-go">Continue gently</button>' +
        '<button type="button" class="btn" id="note-summary">Read a short summary instead</button>' +
        '<a class="btn btn--link" href="journey.html">Back to the journey map</a>' +
      '</div><div id="summary" hidden><p class="summary">' + e(data.summary) + '</p>' +
      '<a class="btn" href="#' + ch.n + '-' + (s + 1 <= data.scenes.length ? data.scenes.length : s) + '">Go to the last scene</a></div></div>';
    document.getElementById('note-go').addEventListener('click', function () { noteAccepted[ch.n] = true; render(); });
    document.getElementById('note-summary').addEventListener('click', function () {
      var sum = document.getElementById('summary'); sum.hidden = false; sum.querySelector('.summary').setAttribute('tabindex', '-1'); sum.querySelector('.summary').focus();
    });
  }

  /* ---------- Scene parts ---------- */
  function contextCards(list) {
    if (!list || !list.length) return '';
    return '<div class="context">' + list.map(function (c) {
      return '<div class="context-card">' + badge(c.badge) + '<p>' + e(c.text) + '</p>' + sourceLine(c) + '</div>';
    }).join('') + '</div>';
  }

  function mapFigure(m, sceneId) {
    var html = '<div class="map-scene"><figure class="map-figure">' +
      '<div class="map-frame">' +
      '<img src="' + e(m.src) + '" width="' + m.width + '" height="' + m.height + '" alt="' + e(m.alt) + '">';
    m.spots.forEach(function (sp, i) {
      html += '<button type="button" class="spot" style="left:' + sp.x + '%;top:' + sp.y + '%" data-i="' + i + '" aria-expanded="false" aria-controls="' + sceneId + '-panel">' +
        '<span aria-hidden="true">' + (i + 1) + '</span><span class="visually-hidden">Marker ' + (i + 1) + ': ' + e(sp.label) + '</span></button>';
    });
    html += '</div><figcaption>' + badge(m.badge) + '<span>' + e(m.caption) + '</span>' +
      '<button type="button" class="btn map-zoom-btn" data-zoom="' + e(m.src) + '" data-alt="' + e(m.alt) + '">' + e(m.zoomLabel || 'Enlarge the map') + '</button></figcaption></figure>' +
      '<div class="spot-panel" id="' + sceneId + '-panel" aria-live="polite">' +
      '<p class="spot-hint">Choose a numbered marker on the map. One story opens at a time.</p>' +
      '<ol class="spot-list">' + m.spots.map(function (sp, i) { return '<li><button type="button" class="spot-link" data-i="' + i + '">' + (i + 1) + '. ' + e(sp.label) + '</button></li>'; }).join('') + '</ol>' +
      '</div></div>';
    return html;
  }

  function openZoom(src, alt, opener, label) {
    var d = document.createElement('dialog');
    d.className = 'zoom';
    d.setAttribute('aria-label', label || 'Enlarged map');
    var level = 1;
    d.innerHTML = '<div class="zoom-bar"><div class="zoom-tools">' +
      '<button type="button" class="btn" data-z="-1" aria-label="Zoom out">−</button>' +
      '<span class="zoom-level" aria-live="polite">100%</span>' +
      '<button type="button" class="btn" data-z="1" aria-label="Zoom in">+</button></div>' +
      '<a class="btn" href="' + e(src) + '" target="_blank" rel="noopener">Open full size<span class="visually-hidden"> (opens in a new tab)</span></a>' +
      '<button type="button" class="btn btn--dark" data-close>Close</button></div>' +
      '<div class="zoom-pane" tabindex="0" aria-label="' + (label ? 'Picture' : 'Map') + '. Scroll or use the arrow keys to move around."><img src="' + e(src) + '" alt="' + e(alt) + '"></div>' +
      '<p class="zoom-hint">Scroll, drag or use the arrow keys to move around.</p>';
    document.body.appendChild(d);
    var img = d.querySelector('img'), pane = d.querySelector('.zoom-pane'), lab = d.querySelector('.zoom-level');
    function set(l) {
      var cx = (pane.scrollLeft + pane.clientWidth / 2) / pane.scrollWidth, cy = (pane.scrollTop + pane.clientHeight / 2) / pane.scrollHeight;
      level = Math.max(1, Math.min(4, l)); img.style.width = (level * 100) + '%'; lab.textContent = Math.round(level * 100) + '%';
      pane.scrollLeft = cx * pane.scrollWidth - pane.clientWidth / 2; pane.scrollTop = cy * pane.scrollHeight - pane.clientHeight / 2;
    }
    d.querySelectorAll('[data-z]').forEach(function (b) { b.addEventListener('click', function () { set(level + (+b.dataset.z) * 0.5); }); });
    // drag to pan with a mouse; touch uses native scrolling
    var drag = null;
    pane.addEventListener('pointerdown', function (ev) { if (ev.pointerType !== 'mouse') return; drag = { x: ev.clientX, y: ev.clientY, l: pane.scrollLeft, t: pane.scrollTop }; pane.classList.add('is-panning'); });
    window.addEventListener('pointermove', function (ev) { if (!drag) return; pane.scrollLeft = drag.l - (ev.clientX - drag.x); pane.scrollTop = drag.t - (ev.clientY - drag.y); });
    window.addEventListener('pointerup', function () { drag = null; pane.classList.remove('is-panning'); });
    d.querySelector('[data-close]').addEventListener('click', function () { d.close(); });
    d.addEventListener('close', function () { d.remove(); if (opener) opener.focus(); });
    d.showModal();
    set(1.5);
  }

  function wireMap(root, m) {
    var zb = root.querySelector('.map-zoom-btn');
    if (zb) zb.addEventListener('click', function () { openZoom(zb.dataset.zoom, zb.dataset.alt, zb, m.zoomLabel ? 'Enlarged picture' : null); });
    var panel = root.querySelector('.spot-panel');
    var btns = root.querySelectorAll('.spot');
    function open(i) {
      var sp = m.spots[i];
      btns.forEach(function (b) { var on = +b.dataset.i === i; b.setAttribute('aria-expanded', on ? 'true' : 'false'); b.classList.toggle('is-open', on); });
      btns[i].classList.add('is-seen');
      panel.innerHTML = '<div class="spot-story">' + badge(sp.badge || 'archival') +
        '<h3 tabindex="-1">' + e(sp.title) + '</h3><p>' + e(sp.body) + '</p>' +
        (sp.source ? '<p class="source">Source: ' + e(sp.source) + '</p>' : '') +
        '<div class="spot-nav">' +
        (i > 0 ? '<button type="button" class="btn" data-go="' + (i - 1) + '">Previous marker</button>' : '') +
        (i < m.spots.length - 1 ? '<button type="button" class="btn btn--dark" data-go="' + (i + 1) + '">Next marker</button>' : '<p class="muted">That was the last marker.</p>') +
        '</div></div>';
      panel.querySelectorAll('[data-go]').forEach(function (b) { b.addEventListener('click', function () { open(+b.dataset.go); }); });
      panel.querySelector('h3').focus({ preventScroll: window.innerWidth > 900 });
    }
    btns.forEach(function (b) { b.addEventListener('click', function () { open(+b.dataset.i); }); });
    root.querySelectorAll('.spot-link').forEach(function (b) { b.addEventListener('click', function () { open(+b.dataset.i); }); });
  }

  function timeline(sc) {
    return '<section class="timeline-wrap" aria-labelledby="tl-title"><h2 id="tl-title" class="sub">The day, hour by hour</h2>' +
      '<ol class="timeline">' + sc.events.map(function (ev) {
        return '<li><span class="t-time">' + e(ev.time) + '</span><div><h3>' + e(ev.title) + '</h3><p>' + e(ev.body) + '</p></div></li>';
      }).join('') + '</ol><p class="source">' + badge('unit') + ' Source: ' + e(sc.source) + '</p></section>';
  }

  function recordCard(sc) {
    return '<section class="army-record" aria-labelledby="ar-title">' + badge('archival') +
      '<h2 id="ar-title" class="sub">His casualty record</h2>' +
      '<p class="ar-meta">29774 L/Cpl H. Bowles. Somerset Light Infantry, then Wiltshire Regiment.</p>' +
      '<table><thead><tr><th scope="col">Date</th><th scope="col">Entry</th></tr></thead><tbody>' +
      sc.record.map(function (r) { return '<tr><th scope="row">' + e(r.date) + '</th><td>' + e(r.entry) + '</td></tr>'; }).join('') +
      '</tbody></table><p class="source">' + e(sc.recordSource) + '</p></section>' +
      (sc.context ? contextCards(sc.context) : '') +
      (sc.family ? '<blockquote class="family-quote">' + badge('family') + '<p>' + e(sc.family.text) + '</p><footer>' + e(sc.family.source) + '</footer></blockquote>' : '');
  }

  function rollcall(sc) {
    return '<div class="stats">' + sc.stats.map(function (s) { return '<p class="stat"><span class="stat-n">' + e(s.n) + '</span><span class="stat-l">' + e(s.label) + '</span></p>'; }).join('') + '</div>' +
      '<section class="roll" aria-labelledby="roll-title"><h2 id="roll-title" class="sub">' + e(sc.namesHeading || 'Some of the names') + '</h2>' + badge('archival') +
      '<p class="muted">' + e(sc.namesNote) + (sc.names.some(function (n) { return n.memorial; }) ? ' Names marked <span class="memorial-mark">Thiepval</span> have no known grave and are named on the Thiepval Memorial.' : '') + '</p>' +
      '<ul class="names">' + sc.names.map(function (n) {
        return '<li>' + (n.rank ? '<span class="rank">' + e(n.rank) + '</span> ' : '') + e(n.name) + (n.memorial ? ' <span class="memorial-mark">Thiepval</span>' : '') + '</li>';
      }).join('') + '</ul></section>';
  }

  function sourceLine(c) {
    if (!c.source) return '';
    return '<p class="source"><span>Source: ' + (c.url ? '<a href="' + e(c.url) + '" target="_blank" rel="noopener">' + e(c.source) + '<span class="visually-hidden"> (opens in a new tab)</span></a>' : e(c.source)) + '</span></p>';
  }

  function factCards(sc) {
    return '<div class="fact-grid">' + sc.cards.map(function (c) {
      return '<details class="fact-card"><summary><span class="fact-title">' + e(c.title) + '</span></summary>' +
        '<div class="fact-body">' + badge(c.badge || 'unit') + '<p>' + e(c.body) + '</p>' + sourceLine(c) + '</div></details>';
    }).join('') + '</div>';
  }

  function skipLink() {
    return '<button type="button" class="btn" data-skip>Skip this activity</button>';
  }

  function choiceBlock(sc, ch, s, total) {
    return '<section class="challenge" aria-labelledby="ch-q">' +
      '<div class="challenge-head"><p class="kicker">Optional challenge, about 3 minutes, no wrong answers</p>' + skipLink(ch, s, total) + '</div>' +
      '<h2 id="ch-q" class="sub">' + e(sc.question) + '</h2>' +
      '<div class="choice-grid">' + sc.options.map(function (o, i) {
        return '<button type="button" class="choice-card" data-i="' + i + '" aria-pressed="false"><span class="choice-title">' + e(o.label) + '</span><span>' + e(o.body) + '</span></button>';
      }).join('') + '</div>' +
      '<div class="challenge-result" aria-live="polite"></div></section>';
  }

  function wireChoice(root, sc) {
    var out = root.querySelector('.challenge-result');
    root.querySelectorAll('.choice-card').forEach(function (b) {
      b.addEventListener('click', function () {
        root.querySelectorAll('.choice-card').forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
        var o = sc.options[+b.dataset.i];
        out.innerHTML = '<div class="result-card"><h3>' + e(o.label) + '</h3><p>' + e(o.outcome) + '</p></div>' +
          '<div class="result-card result-card--henry">' + badge('archival') + '<h3>What Henry did</h3><p>' + e(sc.reveal) + '</p>' + sourceLine(sc.revealSource || {}) + '</div>';
      });
    });
  }

  function kitBlock(sc, ch, s, total) {
    function chip(it, i) { return '<li><button type="button" class="kit-chip" data-i="' + i + '">' + e(it.label) + '</button></li>'; }
    return '<section class="challenge challenge--kit" aria-labelledby="kit-q">' +
      '<div class="challenge-head"><p class="kicker">Optional game, about 5 minutes</p>' + skipLink(ch, s, total) + '</div>' +
      '<h2 id="kit-q" class="sub">' + e(sc.question) + '</h2><p class="muted">' + e(sc.hint) + '</p>' +
      '<div class="kit-zones">' +
        '<div class="kit-zone" data-zone="out"><h3 id="kz-out">' + e(sc.zoneOut || 'Leave behind') + '</h3><ul class="kit-list" aria-labelledby="kz-out">' + sc.items.map(chip).join('') + '</ul></div>' +
        '<div class="kit-zone kit-zone--pack" data-zone="in"><h3 id="kz-in">' + e(sc.zoneIn || 'Henry\'s kit for the attack') + '</h3><ul class="kit-list" aria-labelledby="kz-in"></ul><p class="kit-empty">Drag items here, or tap them</p></div>' +
      '</div>' +
      '<p class="visually-hidden" aria-live="polite" id="kit-live"></p>' +
      '<div class="note-actions"><button type="button" class="btn btn--dark" id="kit-check">' + e(sc.checkLabel || 'Check my kit') + '</button>' +
      '<button type="button" class="btn" id="kit-reset">Start again</button></div>' +
      '<div class="challenge-result" aria-live="polite"></div></section>';
  }

  function wireKit(root, sc) {
    var zones = { out: root.querySelector('[data-zone="out"] .kit-list'), "in": root.querySelector('[data-zone="in"] .kit-list') };
    var live = root.querySelector('#kit-live'), out = root.querySelector('.challenge-result'), packEmpty = root.querySelector('.kit-empty');
    function where(btn) { return btn.closest('.kit-zone').dataset.zone; }
    function refresh() { packEmpty.hidden = zones['in'].children.length > 0; }
    function move(btn, to, focus) {
      to = to || (where(btn) === 'out' ? 'in' : 'out');
      zones[to].appendChild(btn.parentNode);
      btn.classList.remove('is-right', 'is-wrong'); var v = btn.parentNode.querySelector('.kit-verdict'); if (v) v.remove();
      live.textContent = sc.items[+btn.dataset.i].label + (to === 'in' ? ' packed.' : ' left behind.');
      refresh(); if (focus) btn.focus();
    }
    // Pointer dragging, with tap or Enter as the alternative.
    root.querySelectorAll('.kit-chip').forEach(function (btn) {
      var startX = 0, startY = 0, ghost = null, dragging = false;
      btn.addEventListener('pointerdown', function (ev) {
        if (ev.button !== 0) return;
        startX = ev.clientX; startY = ev.clientY; dragging = false;
        btn.setPointerCapture(ev.pointerId);
      });
      btn.addEventListener('pointermove', function (ev) {
        if (!btn.hasPointerCapture(ev.pointerId)) return;
        if (!dragging && Math.hypot(ev.clientX - startX, ev.clientY - startY) > 8) {
          dragging = true;
          ghost = btn.cloneNode(true); ghost.className = 'kit-chip kit-ghost'; ghost.setAttribute('aria-hidden', 'true');
          document.body.appendChild(ghost); btn.classList.add('is-lifted');
        }
        if (dragging) {
          ghost.style.left = ev.clientX + 'px'; ghost.style.top = ev.clientY + 'px';
          root.querySelectorAll('.kit-zone').forEach(function (z) {
            var r = z.getBoundingClientRect();
            z.classList.toggle('is-over', ev.clientX > r.left && ev.clientX < r.right && ev.clientY > r.top && ev.clientY < r.bottom);
          });
        }
      });
      function end(ev, cancelled) {
        if (!dragging) return;
        var target = null;
        root.querySelectorAll('.kit-zone').forEach(function (z) { if (z.classList.contains('is-over')) target = z.dataset.zone; z.classList.remove('is-over'); });
        ghost.remove(); ghost = null; btn.classList.remove('is-lifted');
        if (!cancelled && target && target !== where(btn)) move(btn, target);
        btn._dragged = true; setTimeout(function () { btn._dragged = false; }, 0);
        dragging = false;
      }
      btn.addEventListener('pointerup', function (ev) { end(ev, false); });
      btn.addEventListener('pointercancel', function (ev) { end(ev, true); });
      btn.addEventListener('click', function () { if (!btn._dragged) move(btn, null, true); });
    });
    root.querySelector('#kit-check').addEventListener('click', function () {
      var right = 0;
      root.querySelectorAll('.kit-chip').forEach(function (btn) {
        var it = sc.items[+btn.dataset.i], packed = where(btn) === 'in', ok = packed === it.carried;
        if (ok) right++;
        btn.classList.toggle('is-right', ok); btn.classList.toggle('is-wrong', !ok);
        var v = btn.parentNode.querySelector('.kit-verdict');
        if (!v) { v = document.createElement('p'); v.className = 'kit-verdict'; btn.parentNode.appendChild(v); }
        v.textContent = (ok ? 'Right. ' : (it.carried ? (sc.yesWrong || 'He probably carried this. ') : (sc.noWrong || 'Not carried. '))) + it.note;
      });
      out.innerHTML = '<div class="result-card">' + badge('unit') + '<h3>You got ' + right + ' of ' + sc.items.length + ' right</h3><p>' + e(sc.summary) + '</p>' + sourceLine(sc.source) + '</div>';
    });
    root.querySelector('#kit-reset').addEventListener('click', function () {
      Array.prototype.slice.call(zones['in'].children).forEach(function (li) { zones.out.appendChild(li); });
      root.querySelectorAll('.kit-verdict').forEach(function (v) { v.remove(); });
      root.querySelectorAll('.kit-chip').forEach(function (b) { b.classList.remove('is-right', 'is-wrong'); });
      out.innerHTML = ''; refresh(); live.textContent = 'Everything unpacked.';
    });
    refresh();
  }

  /* ---------- Photographs (with slots until the files arrive) ---------- */
  function photoBlock(sc, key, heading) {
    key = key || 'photos';
    var list = sc[key];
    if (!list || !list.length) return '';
    var hid = 'ph-' + sc.id + '-' + key;
    return '<section class="photos" aria-labelledby="' + hid + '"><h2 class="sub" id="' + hid + '">' + e(heading || sc.photosHeading || 'Photographs from the time') + '</h2>' +
      '<div class="photo-grid">' + list.map(function (p, i) {
        var credit = p.credit || ('Image: IWM (' + p.cat + ')');
        var dir = p.dir || 'iwm';
        return '<figure class="photo" data-list="' + key + '" data-i="' + i + '"><div class="photo-frame">' +
          '<img src="' + e(p.src || ('assets/img/' + dir + '/' + p.file)) + '" alt="' + e(p.alt) + '" loading="lazy" data-photo>' +
          '</div><figcaption><span>' + e(p.caption) + '</span>' +
          '<span class="photo-credit">' + e(credit) + (p.url ? ' <a href="' + e(p.url) + '" target="_blank" rel="noopener">See it at IWM<span class="visually-hidden"> (opens in a new tab)</span></a>' : '') + '</span></figcaption></figure>';
      }).join('') + '</div></section>';
  }

  function wirePhotos(root, sc) {
    root.querySelectorAll('img[data-photo]').forEach(function (img) {
      var fig = img.closest('.photo'), p = sc[fig.dataset.list][+fig.dataset.i];
      function slot() {
        img.closest('.photo-frame').outerHTML = '<div class="photo-slot"><svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true" focusable="false"><path d="M4 7h3l2-2h6l2 2h3v12H4z"/><circle cx="12" cy="13" r="3.5"/></svg>' +
          '<span class="photo-slot__title">Photograph to come</span><span class="photo-slot__cat">' + e(p.slot || ('IWM ' + p.cat)) + '</span></div>';
      }
      function ready() {
        var b = document.createElement('button');
        b.type = 'button'; b.className = 'btn photo-zoom'; b.textContent = 'Enlarge';
        b.setAttribute('aria-label', 'Enlarge the photograph: ' + p.caption);
        b.addEventListener('click', function () { openZoom(img.src, p.alt, b, 'Enlarged photograph'); });
        fig.querySelector('figcaption').appendChild(b);
      }
      if (img.complete) { if (img.naturalWidth) ready(); else slot(); }
      else { img.addEventListener('load', ready); img.addEventListener('error', slot); }
    });
  }

  /* ---------- Ask the historian links ---------- */
  function asksBlock(sc) {
    if (!sc.asks || !sc.asks.length) return '';
    return '<section class="asks" aria-labelledby="ask-' + sc.id + '"><h2 class="sub" id="ask-' + sc.id + '">Ask the historian</h2>' +
      '<p class="muted">Questions this scene raises, answered with sources. Choose one to open it.</p>' +
      sc.asks.map(function (a) {
        var q = HIST[a.id];
        if (!q) return '<p><a href="historian.html#' + e(a.id) + '">' + e(a.q) + '</a></p>';
        return '<details class="qa-inline"><summary>' + e(q.q) + '</summary><div class="qa-inline__body">' +
          q.a.map(function (p) { return '<p>' + e(p) + '</p>'; }).join('') +
          (q.confidence ? '<p class="qa-sure"><strong>How sure are we?</strong> ' + e(q.confidence) + '</p>' : '') +
          '<div class="qa-src">' + q.sources.map(sourceLine).join('') + '</div></div></details>';
      }).join('') + '</section>';
  }

  /* ---------- Panels, stories and voices ---------- */
  function panelCards(list) {
    return '<div class="context">' + list.map(function (c) {
      return '<div class="context-card">' + badge(c.badge || 'unit') + (c.title ? '<h3>' + e(c.title) + '</h3>' : '') + '<p>' + e(c.text) + '</p>' + sourceLine(c) + '</div>';
    }).join('') + '</div>';
  }

  function storiesBlock(sc) {
    return '<ol class="stories">' + sc.stories.map(function (st) {
      return '<li class="story">' + badge(st.badge || 'archival') + '<h2 class="story__title">' + e(st.title) + '</h2>' +
        (st.quote ? '<blockquote class="story__quote"><p>“' + e(st.quote) + '”</p>' + (st.who ? '<footer>' + e(st.who) + '</footer>' : '') + '</blockquote>' : '') +
        (st.body ? '<p>' + e(st.body) + '</p>' : '') + sourceLine(st) + '</li>';
    }).join('') + '</ol>';
  }

  function voicesBlock(sc) {
    return '<section class="voices" aria-labelledby="v-' + sc.id + '"><h2 class="sub" id="v-' + sc.id + '">' + e(sc.voicesHeading || 'In their own words') + '</h2>' +
      (sc.voicesNote ? '<p class="muted">' + e(sc.voicesNote) + '</p>' : '') +
      '<div class="voice-grid">' + sc.voices.map(function (v) {
        return '<figure class="voice">' + badge(v.badge || 'archival') +
          (v.quote ? '<blockquote><p>“' + e(v.quote) + '”</p></blockquote>' : '') +
          (v.text ? '<p>' + e(v.text) + '</p>' : '') +
          '<figcaption><strong>' + e(v.who) + '</strong>' + sourceLine(v) + (v.caution ? '<span class="voice__caution">' + e(v.caution) + '</span>' : '') + '</figcaption></figure>';
      }).join('') + '</div></section>';
  }

  /* ---------- Debate ---------- */
  function debateBlock(sc) {
    function side(d, cls) {
      return '<section class="debate__side ' + cls + '" aria-labelledby="' + cls + '-t"><h3 id="' + cls + '-t">' + e(d.title) + '</h3><ul>' +
        d.points.map(function (p) { return '<li>' + e(p) + '</li>'; }).join('') + '</ul></section>';
    }
    return '<section class="debate" aria-labelledby="deb-' + sc.id + '"><h2 class="sub" id="deb-' + sc.id + '">' + e(sc.question) + '</h2>' +
      '<div class="debate__sides">' + side(sc.against, 'debate--against') + side(sc['for'], 'debate--for') + '</div>' +
      '<div class="debate__you"><p class="debate__ask" id="dy-' + sc.id + '">' + e(sc.ask) + '</p><div class="note-actions" role="group" aria-labelledby="dy-' + sc.id + '">' +
      sc.answers.map(function (a, i) { return '<button type="button" class="btn" data-a="' + i + '" aria-pressed="false">' + e(a.label) + '</button>'; }).join('') +
      '</div><div class="challenge-result" aria-live="polite"></div></div>' +
      (sc.sources ? '<div class="debate__sources">' + sc.sources.map(sourceLine).join('') + '</div>' : '') + '</section>';
  }
  function wireDebate(root, sc) {
    var out = root.querySelector('.debate__you .challenge-result');
    root.querySelectorAll('[data-a]').forEach(function (b) {
      b.addEventListener('click', function () {
        root.querySelectorAll('[data-a]').forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
        out.innerHTML = '<div class="result-card"><p>' + e(sc.answers[+b.dataset.a].reply) + '</p></div>';
      });
    });
  }

  /* ---------- Activities ---------- */
  function activityHead(sc, ch, s, total, minutes) {
    return '<div class="challenge-head"><p class="kicker">Optional activity, about ' + (sc.minutes || minutes) + ' minutes</p>' + skipLink(ch, s, total) + '</div>' +
      '<h2 id="act-' + sc.id + '" class="sub">' + e(sc.question) + '</h2>' + (sc.hint ? '<p class="muted">' + e(sc.hint) + '</p>' : '');
  }
  function shuffled(n, seed) {   // a fixed shuffle, so the page is the same every visit but never starts solved
    var a = []; for (var i = 0; i < n; i++) a.push(i);
    var x = seed || 7;
    for (var j = n - 1; j > 0; j--) { x = (x * 9301 + 49297) % 233280; var k = Math.floor(x / 233280 * (j + 1)); var t = a[j]; a[j] = a[k]; a[k] = t; }
    if (a.every(function (v, i) { return v === i; })) a.reverse();
    return a;
  }
  function resultCard(title, body, src) {
    return '<div class="result-card">' + '<h3>' + e(title) + '</h3>' + (body ? '<p>' + e(body) + '</p>' : '') + (src ? sourceLine(src) : '') + '</div>';
  }

  // Put things in order (a day in the line)
  function orderBlock(sc, ch, s, total) {
    var order = shuffled(sc.steps.length, sc.seed);
    return '<section class="challenge" aria-labelledby="act-' + sc.id + '">' + activityHead(sc, ch, s, total, 5) +
      '<ol class="order-list">' + order.map(function (i) {
        return '<li data-i="' + i + '"><span class="order-label">' + e(sc.steps[i].label) + '</span>' +
          '<span class="order-btns"><button type="button" class="btn order-up" aria-label="Move earlier: ' + e(sc.steps[i].label) + '">↑ Earlier</button>' +
          '<button type="button" class="btn order-down" aria-label="Move later: ' + e(sc.steps[i].label) + '">↓ Later</button></span></li>';
      }).join('') + '</ol><p class="visually-hidden" aria-live="polite" data-live></p>' +
      '<div class="note-actions"><button type="button" class="btn btn--dark" data-check>Check my order</button></div>' +
      '<div class="challenge-result" aria-live="polite"></div></section>';
  }
  function wireOrder(root, sc) {
    var list = root.querySelector('.order-list'), live = root.querySelector('[data-live]'), out = root.querySelector('.challenge-result');
    function pos(li) { return Array.prototype.indexOf.call(list.children, li); }
    list.addEventListener('click', function (ev) {
      var b = ev.target.closest('button'); if (!b) return;
      var li = b.closest('li'), up = b.classList.contains('order-up');
      if (up && li.previousElementSibling) list.insertBefore(li, li.previousElementSibling);
      else if (!up && li.nextElementSibling) list.insertBefore(li.nextElementSibling, li);
      else { live.textContent = 'Already ' + (up ? 'first.' : 'last.'); return; }
      li.classList.remove('is-right', 'is-wrong');
      live.textContent = sc.steps[+li.dataset.i].label + ', now number ' + (pos(li) + 1) + ' of ' + list.children.length + '.';
      b.focus();
    });
    root.querySelector('[data-check]').addEventListener('click', function () {
      var right = 0;
      Array.prototype.forEach.call(list.children, function (li, p) { var ok = +li.dataset.i === p; if (ok) right++; li.classList.toggle('is-right', ok); li.classList.toggle('is-wrong', !ok); });
      out.innerHTML = resultCard(right === sc.steps.length ? 'All ' + right + ' in the right place' : right + ' of ' + sc.steps.length + ' in the right place',
        sc.summary, sc.source) + '<ol class="order-answer">' + sc.steps.map(function (st) { return '<li><strong>' + e(st.label) + '.</strong> ' + e(st.note) + '</li>'; }).join('') + '</ol>';
    });
  }

  // Gas drill: choose each step in turn, calmly or against the clock
  function drillBlock(sc, ch, s, total) {
    var order = shuffled(sc.steps.length, sc.seed);
    return '<section class="challenge" aria-labelledby="act-' + sc.id + '">' + activityHead(sc, ch, s, total, 3) +
      '<div class="drill-mode" role="group" aria-label="How do you want to try it?">' +
        '<button type="button" class="btn" data-mode="calm" aria-pressed="true">Take your time</button>' +
        '<button type="button" class="btn" data-mode="clock" aria-pressed="false">Against the clock</button></div>' +
      '<p class="drill-clock" aria-hidden="true" hidden>0.0 seconds</p>' +
      '<div class="drill-grid">' + order.map(function (i) { return '<button type="button" class="drill-step" data-i="' + i + '">' + e(sc.steps[i].label) + '</button>'; }).join('') + '</div>' +
      '<h3 class="drill-done-h">Done so far</h3><ol class="drill-done"></ol>' +
      '<p class="drill-msg" role="status"></p>' +
      '<div class="note-actions"><button type="button" class="btn" data-reset>Start again</button></div>' +
      '<div class="challenge-result" aria-live="polite"></div></section>';
  }
  function wireDrill(root, sc) {
    var next = 0, mode = 'calm', t0 = 0, raf = 0;
    var clock = root.querySelector('.drill-clock'), done = root.querySelector('.drill-done'), msg = root.querySelector('.drill-msg'), out = root.querySelector('.challenge-result');
    function tick() { clock.textContent = ((performance.now() - t0) / 1000).toFixed(1) + ' seconds'; raf = requestAnimationFrame(tick); }
    function reset() {
      next = 0; cancelAnimationFrame(raf); t0 = 0; done.innerHTML = ''; msg.textContent = ''; out.innerHTML = '';
      clock.textContent = '0.0 seconds';
      root.querySelectorAll('.drill-step').forEach(function (b) { b.disabled = false; b.classList.remove('is-done'); });
    }
    root.querySelectorAll('[data-mode]').forEach(function (b) {
      b.addEventListener('click', function () {
        mode = b.dataset.mode;
        root.querySelectorAll('[data-mode]').forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
        clock.hidden = mode !== 'clock'; reset();
        msg.textContent = mode === 'clock' ? 'The clock starts when you choose the first step. There is no penalty for being slow.' : 'No clock. Take as long as you like.';
      });
    });
    root.querySelector('[data-reset]').addEventListener('click', reset);
    root.querySelectorAll('.drill-step').forEach(function (b) {
      b.addEventListener('click', function () {
        var i = +b.dataset.i;
        if (mode === 'clock' && !t0) { t0 = performance.now(); raf = requestAnimationFrame(tick); }
        if (i !== next) { msg.textContent = 'Not yet. ' + sc.steps[next].hint; return; }
        b.disabled = true; b.classList.add('is-done');
        var li = document.createElement('li'); li.textContent = sc.steps[i].label; done.appendChild(li);
        msg.textContent = 'Yes: ' + sc.steps[i].label + '.';
        next++;
        if (next === sc.steps.length) {
          cancelAnimationFrame(raf);
          var secs = t0 ? (performance.now() - t0) / 1000 : 0;
          out.innerHTML = resultCard(mode === 'clock' ? 'Done in ' + secs.toFixed(1) + ' seconds' : 'Helmet on',
            (mode === 'clock' ? (secs <= sc.target ? sc.fast : sc.slow) + ' ' : '') + sc.summary, sc.source);
          var first = root.querySelector('[data-reset]'); first.focus();
        } else {
          var nb = root.querySelector('.drill-step:not([disabled])'); if (document.activeElement === b && nb) nb.focus();
        }
      });
    });
  }

  // Match the slang
  function matchBlock(sc, ch, s, total) {
    var meanings = sc.pairs.map(function (p, i) { return { i: i, m: p.meaning }; }).sort(function (a, b) { return a.m.localeCompare(b.m); });
    return '<section class="challenge" aria-labelledby="act-' + sc.id + '">' + activityHead(sc, ch, s, total, 5) +
      '<div class="match-grid">' + sc.pairs.map(function (p, i) {
        return '<div class="match-row" data-i="' + i + '"><label for="m-' + sc.id + '-' + i + '" class="match-term">' + e(p.term) + '</label>' +
          '<select id="m-' + sc.id + '-' + i + '"><option value="">Choose a meaning</option>' +
          meanings.map(function (m) { return '<option value="' + m.i + '">' + e(m.m) + '</option>'; }).join('') + '</select>' +
          '<p class="match-verdict" hidden></p></div>';
      }).join('') + '</div>' +
      '<div class="note-actions"><button type="button" class="btn btn--dark" data-check>Check my answers</button></div>' +
      '<div class="challenge-result" aria-live="polite"></div></section>';
  }
  function wireMatch(root, sc) {
    root.querySelector('[data-check]').addEventListener('click', function () {
      var right = 0;
      root.querySelectorAll('.match-row').forEach(function (row) {
        var i = +row.dataset.i, v = row.querySelector('select').value, ok = v !== '' && +v === i, p = sc.pairs[i];
        if (ok) right++;
        row.classList.toggle('is-right', ok); row.classList.toggle('is-wrong', !ok);
        var vd = row.querySelector('.match-verdict'); vd.hidden = false;
        vd.textContent = (ok ? 'Right. ' : 'It means: ' + p.meaning + '. ') + p.note;
      });
      root.querySelector('.challenge-result').innerHTML = resultCard('You matched ' + right + ' of ' + sc.pairs.length, sc.summary, sc.source);
    });
  }

  // Be the censor
  function censorBlock(sc, ch, s, total) {
    var n = 0;
    return '<section class="challenge" aria-labelledby="act-' + sc.id + '">' + activityHead(sc, ch, s, total, 5) +
      '<div class="letter"><p class="letter__head">' + e(sc.letterHead) + '</p>' +
      sc.letter.map(function (para) {
        return '<p>' + para.map(function (seg) { return '<button type="button" class="cut" data-i="' + (n++) + '" aria-pressed="false">' + e(seg.t) + '</button>'; }).join(' ') + '</p>';
      }).join('') + '<p class="letter__sign">' + e(sc.letterSign) + '</p></div>' +
      '<p class="muted">Lines you black out stay readable to screen readers and are announced as pressed.</p>' +
      '<div class="note-actions"><button type="button" class="btn btn--dark" data-check>Pass the letter</button><button type="button" class="btn" data-reset>Start again</button></div>' +
      '<div class="challenge-result" aria-live="polite"></div></section>';
  }
  function wireCensor(root, sc) {
    var segs = []; sc.letter.forEach(function (p) { p.forEach(function (x) { segs.push(x); }); });
    var out = root.querySelector('.challenge-result');
    root.querySelectorAll('.cut').forEach(function (b) {
      b.addEventListener('click', function () { b.setAttribute('aria-pressed', b.getAttribute('aria-pressed') === 'true' ? 'false' : 'true'); b.classList.remove('is-right', 'is-wrong'); });
    });
    root.querySelector('[data-reset]').addEventListener('click', function () {
      root.querySelectorAll('.cut').forEach(function (b) { b.setAttribute('aria-pressed', 'false'); b.classList.remove('is-right', 'is-wrong'); });
      out.innerHTML = '';
    });
    root.querySelector('[data-check]').addEventListener('click', function () {
      var missed = [], over = 0, caught = 0;
      root.querySelectorAll('.cut').forEach(function (b) {
        var sg = segs[+b.dataset.i], on = b.getAttribute('aria-pressed') === 'true';
        if (sg.cut && on) { caught++; b.classList.add('is-right'); }
        else if (sg.cut && !on) { missed.push(sg); b.classList.add('is-wrong'); }
        else if (!sg.cut && on) { over++; b.classList.add('is-wrong'); }
      });
      var need = segs.filter(function (x) { return x.cut; }).length;
      out.innerHTML = resultCard('You caught ' + caught + ' of ' + need,
        (over ? 'You also blacked out ' + over + ' harmless line' + (over > 1 ? 's' : '') + '. Censors did that too, which is why some letters arrived looking like lace. ' : '') + sc.summary, sc.source) +
        '<ul class="censor-why">' + segs.filter(function (x) { return x.cut; }).map(function (x) { return '<li><strong>“' + e(x.t) + '”</strong> ' + e(x.why) + '</li>'; }).join('') + '</ul>';
    });
  }

  // Field Service Post Card
  function postcardBlock(sc, ch, s, total) {
    return '<section class="challenge" aria-labelledby="act-' + sc.id + '">' + activityHead(sc, ch, s, total, 3) +
      '<div class="scenario" role="group" aria-label="Choose a moment">' + sc.scenarios.map(function (x, i) {
        return '<button type="button" class="btn" data-sc="' + i + '" aria-pressed="' + (i === 0) + '">' + e(x.label) + '</button>'; }).join('') + '</div>' +
      '<p class="scenario-text" aria-live="polite">' + e(sc.scenarios[0].text) + '</p>' +
      '<fieldset class="fspc"><legend>' + e(sc.cardTitle) + '</legend><p class="fspc__warn">' + e(sc.warning) + '</p>' +
      sc.lines.map(function (l, i) {
        return '<div class="fspc__line"><input type="checkbox" id="fs-' + i + '" data-l="' + i + '"><label for="fs-' + i + '">' + e(l.t) + '</label></div>';
      }).join('') + '</fieldset>' +
      '<div class="note-actions"><button type="button" class="btn btn--dark" data-send>Send the card</button></div>' +
      '<div class="challenge-result" aria-live="polite"></div></section>';
  }
  function wirePostcard(root, sc) {
    var cur = 0, out = root.querySelector('.challenge-result');
    root.querySelectorAll('[data-sc]').forEach(function (b) {
      b.addEventListener('click', function () {
        cur = +b.dataset.sc;
        root.querySelectorAll('[data-sc]').forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
        root.querySelector('.scenario-text').textContent = sc.scenarios[cur].text;
        root.querySelectorAll('[data-l]').forEach(function (c) { c.checked = false; }); out.innerHTML = '';
      });
    });
    root.querySelector('[data-send]').addEventListener('click', function () {
      var kept = [], card = '';
      root.querySelectorAll('[data-l]').forEach(function (c) {
        var i = +c.dataset.l; if (c.checked) kept.push(i);
        card += '<li' + (c.checked ? '' : ' class="struck"') + '>' + (c.checked ? '' : '<span class="visually-hidden">Crossed out: </span>') + e(sc.lines[i].t) + '</li>';
      });
      var want = sc.scenarios[cur].keep, ok = kept.length === want.length && want.every(function (w) { return kept.indexOf(w) > -1; });
      out.innerHTML = '<div class="fspc-sent"><p class="kicker">What Mother would read</p><ul>' + card + '</ul></div>' +
        resultCard(ok ? 'That is how a soldier might have sent it' : 'A soldier in that spot might have kept different lines',
          sc.scenarios[cur].answer + ' ' + sc.summary, sc.source);
    });
  }

  // True, myth or complicated; or "Was Henry there?"
  function sortBlock(sc, ch, s, total) {
    return '<section class="challenge" aria-labelledby="act-' + sc.id + '">' + activityHead(sc, ch, s, total, 5) +
      '<ol class="sort-list">' + sc.items.map(function (it, i) {
        return '<li class="sort-item" data-i="' + i + '"><p class="sort-text" id="st-' + sc.id + '-' + i + '">' + e(it.text) + '</p>' +
          '<div class="note-actions" role="group" aria-labelledby="st-' + sc.id + '-' + i + '">' + sc.choices.map(function (c, j) {
            return '<button type="button" class="btn" data-c="' + j + '" aria-pressed="false">' + e(c) + '</button>'; }).join('') + '</div>' +
          '<div class="sort-result" aria-live="polite"></div></li>';
      }).join('') + '</ol></section>';
  }
  function wireSort(root, sc) {
    root.querySelectorAll('.sort-item').forEach(function (li) {
      var it = sc.items[+li.dataset.i];
      li.querySelectorAll('[data-c]').forEach(function (b) {
        b.addEventListener('click', function () {
          li.querySelectorAll('[data-c]').forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
          var ok = +b.dataset.c === it.answer;
          li.classList.toggle('is-right', ok); li.classList.toggle('is-wrong', !ok);
          li.querySelector('.sort-result').innerHTML = '<p><strong>' + (ok ? 'Yes. ' : 'The answer is: ' + e(sc.choices[it.answer]) + '. ') + '</strong>' + e(it.explain) + '</p>' + sourceLine(it);
        });
      });
    });
  }

  /* ---------- Your memories (kept on this device, for this visitor) ---------- */
  function memoriesBlock(sc) {
    var saved = (QS.profile().memories || {});
    return '<section class="memories" aria-labelledby="mem-' + sc.id + '"><h2 class="sub" id="mem-' + sc.id + '">' + e(sc.memHeading) + '</h2>' +
      '<p>' + e(sc.memIntro) + '</p>' +
      sc.prompts.map(function (pr, i) {
        var id = 'mem-' + sc.id + '-' + i;
        return '<div class="mem-field"><label for="' + id + '">' + e(pr.label) + '</label>' + (pr.hint ? '<p class="muted" id="' + id + '-h">' + e(pr.hint) + '</p>' : '') +
          '<textarea id="' + id + '" data-key="' + e(pr.key) + '" rows="5"' + (pr.hint ? ' aria-describedby="' + id + '-h"' : '') + '>' + e(saved[pr.key] || '') + '</textarea></div>';
      }).join('') +
      '<p class="mem-status" role="status"></p>' +
      '<div class="note-actions"><button type="button" class="btn btn--dark" data-mem-save>Save my memories</button>' +
      '<button type="button" class="btn" data-mem-copy>Copy them</button>' +
      '<button type="button" class="btn" data-mem-download>Download as a text file</button></div>' +
      '<p class="muted">' + e(sc.memPrivacy) + '</p></section>';
  }
  function wireMemories(root, sc) {
    var status = root.querySelector('.mem-status'), timer = 0;
    function collect() { var m = {}; root.querySelectorAll('textarea').forEach(function (t) { m[t.dataset.key] = t.value; }); return m; }
    function asText() {
      var m = collect();
      return 'Memories of Henry John Bowles\n\n' + sc.prompts.map(function (pr) { return pr.label + '\n' + (m[pr.key] || '').trim() + '\n'; }).join('\n');
    }
    function save(say) {
      QS.profile().memories = Object.assign(QS.profile().memories || {}, collect());
      var ok = QS.save();
      if (say) status.textContent = ok ? 'Saved on this device.' : 'This browser cannot keep them after you close it. Copy or download them to keep them safe.';
    }
    root.querySelectorAll('textarea').forEach(function (t) {
      t.addEventListener('input', function () { clearTimeout(timer); timer = setTimeout(function () { save(false); }, 800); });
    });
    root.querySelector('[data-mem-save]').addEventListener('click', function () { save(true); });
    root.querySelector('[data-mem-copy]').addEventListener('click', function () {
      save(false);
      var txt = asText();
      (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(function () { status.textContent = 'Copied. You can paste them into an email or a message.'; })
        .catch(function () { status.textContent = 'Copying is not allowed here. Use Download instead.'; });
    });
    root.querySelector('[data-mem-download]').addEventListener('click', function () {
      save(false);
      var a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([asText()], { type: 'text/plain' }));
      a.download = 'memories-of-henry-bowles.txt';
      document.body.appendChild(a); a.click(); a.remove();
      status.textContent = 'Downloaded as memories-of-henry-bowles.txt.';
    });
  }

  var ACTIVITIES = { kit: [kitBlock, wireKit], choice: [choiceBlock, wireChoice], order: [orderBlock, wireOrder], drill: [drillBlock, wireDrill], match: [matchBlock, wireMatch],
    censor: [censorBlock, wireCensor], postcard: [postcardBlock, wirePostcard], sort: [sortBlock, wireSort] };

  /* ---------- Scene ---------- */
  function renderScene(ch, data, s) {
    var sc = data.scenes[s - 1];
    var total = data.scenes.length;
    document.title = sc.title + ', chapter ' + ch.n + ': The Quiet Soldier';
    setProgress(ch, s, total);
    QS.setChapterState(ch.n, { scene: s });

    var html = '<article class="scene scene--' + sc.type + '" aria-labelledby="scene-title">' +
      '<header class="scene-head"><p class="kicker">Scene ' + s + ' of ' + total + '</p>' +
      '<h1 id="scene-title">' + e(sc.title) + '</h1>' +
      (sc.intro ? '<p class="lede">' + e(sc.intro) + '</p>' : '') + '</header>' +
      '<div class="scene-body">';

    // Henry's journal leads every scene; the records sit underneath.
    var hasJournal = sc.entries && sc.entries.length;
    var lead = hasJournal ? '<div class="journal-lead" data-journals></div>' : '';
    function behind(inner, label, open) {
      return '<details class="behind"' + (open ? ' open' : '') + '><summary><span class="behind-title">' + e(label) + '</span>' +
        '<span class="behind-hint">The records and history behind this page</span></summary><div class="behind-body">' + inner + '</div></details>';
    }
    var leadHead = hasJournal && sc.entriesHeading ? '<h2 class="sub">' + e(sc.entriesHeading) + '</h2>' : '';
    // Optional games come first in a scene; each can be skipped.
    var acts = (ACTIVITIES[sc.type] ? [sc] : []).concat((sc.activities || []).map(function (a, i) { return Object.assign({ id: sc.id + '-a' + i }, a); }));
    acts.forEach(function (a, i) { html += '<div class="act-slot" data-act="' + i + '">' + ACTIVITIES[a.type][0](a, ch, s, total) + '</div>'; });
    if (ACTIVITIES[sc.type]) html += leadHead + lead;
    else if (sc.type === 'voices') html += voicesBlock(sc) + leadHead + lead;
    else {
      html += leadHead + lead;
      if (sc.type === 'map') html += mapFigure(sc.map, sc.id);
      if (sc.type === 'record') html += '<div class="record-row">' + recordCard(sc) + '</div>';
      if (sc.type === 'rollcall') html += rollcall(sc);
      if (sc.type === 'stories') html += storiesBlock(sc);
      if (sc.type === 'debate') html += debateBlock(sc);
      if (sc.type === 'memories') html += memoriesBlock(sc);
      if (sc.type === 'timeline') html += behind(timeline(sc), 'What the history says', false);
      if (sc.type === 'reflection' && sc.context && sc.context.length) html += behind(contextCards(sc.context), 'What the records say', false);
      if (sc.type === 'cards') html += behind(factCards(sc), 'Life in the line, from the records', false);
    }
    if (sc.panels && sc.panels.length) html += behind(panelCards(sc.panels), sc.panelsTitle || 'What the history says', false);
    html += photoBlock(sc) + photoBlock(sc, 'visitPhotos', sc.visitHeading || 'From the family\'s visit, August 2026') + asksBlock(sc);
    html += '</div>';

    var last = s === total;
    html += '<nav class="scene-nav" aria-label="Scenes">' +
      (s > 1 ? '<a class="btn" href="#' + ch.n + '-' + (s - 1) + '">Previous scene</a>' : '<a class="btn" href="#' + ch.n + '">Chapter introduction</a>') +
      '<ol class="dots" aria-label="All scenes">' + data.scenes.map(function (x, i) {
        return '<li><a href="#' + ch.n + '-' + (i + 1) + '"' + (i + 1 === s ? ' aria-current="step"' : '') + '><span class="visually-hidden">Scene ' + (i + 1) + ': ' + e(x.title) + '</span></a></li>';
      }).join('') + '</ol>' +
      (last ? '<button type="button" class="btn btn--primary" id="finish">Finish the chapter</button>'
            : '<a class="btn btn--dark" href="#' + ch.n + '-' + (s + 1) + '">Next scene</a>') +
      '</nav></article>';
    view.innerHTML = html;

    var slot = view.querySelector('[data-journals]');
    (sc.entries || []).forEach(function (en) { slot.appendChild(QSJournal.build(en)); });
    if (sc.type === 'map') wireMap(view.querySelector('.map-scene'), sc.map);
    acts.forEach(function (a, i) { ACTIVITIES[a.type][1](view.querySelector('.act-slot[data-act="' + i + '"] .challenge'), a); });
    view.querySelectorAll('[data-skip]').forEach(function (b) {
      b.addEventListener('click', function () {
        var t = b.closest('.act-slot').nextElementSibling;
        if (!t) t = view.querySelector('.scene-nav .btn--dark, #finish');
        if (t.matches('.journal-lead')) t = t.querySelector('.journal button') || t;
        if (!t.matches('a, button, summary, [tabindex]')) t.setAttribute('tabindex', '-1');
        t.focus(); t.scrollIntoView({ block: 'start', behavior: 'auto' });
      });
    });
    if (sc.type === 'debate') wireDebate(view.querySelector('.debate'), sc);
    if (sc.type === 'memories') wireMemories(view.querySelector('.memories'), sc);
    if (sc.photos || sc.visitPhotos) wirePhotos(view, sc);
    var fin = document.getElementById('finish');
    if (fin) fin.addEventListener('click', function () {
      QS.setChapterState(ch.n, { done: true, scene: 0 });
      var next = chapters[ch.n];
      view.innerHTML = '<div class="chapter-end"><p class="kicker">Chapter ' + ch.n + ' finished</p><h1>Thank you for walking with him</h1>' +
        '<p class="lede">Your place is saved. You can come back to any scene from the journey map.</p>' +
        '<div class="note-actions"><a class="btn btn--primary" href="journey.html">Back to the journey map</a>' +
        (next ? '<a class="btn" href="chapter.html#' + next.n + '">Chapter ' + next.n + ': ' + e(next.title) + '</a>' : '') + '</div></div>';
      setProgress(ch, 0); focusMain();
    });
  }

  function render() {
    stopJournals();
    var r = parseHash();
    var ch = chapters.filter(function (c) { return c.n === r.c; })[0] || chapters[0];
    loadScenes(ch.n).then(function (data) {
      if (!data || !r.s) { renderIntro(ch, data); focusMain(); return; }
      var s = Math.max(1, Math.min(r.s, data.scenes.length));
      var sc = data.scenes[s - 1];
      var notesOn = QS.profile().settings.notes !== false;
      if (sc.contentNote && notesOn && !noteAccepted[ch.n] && data.contentNote) renderNote(ch, data, s);
      else renderScene(ch, data, s);
      focusMain();
    });
  }

  var hist = fetch('content/historian.json', { cache: 'no-cache' }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; })
    .then(function (h) { if (h) h.groups.forEach(function (g) { g.items.forEach(function (it) { HIST[it.id] = it; }); }); });
  Promise.all([QS.loadChapters(), hist]).then(function (res) {
    var d = res[0];
    chapters = d.chapters;
    render();
    window.addEventListener('hashchange', render);
  }).catch(function (err) {
    view.innerHTML = '<h1>This chapter could not be loaded</h1><p role="alert">' + e(err.message) + ' Refresh the page to try again, or <a href="journey.html">go back to the journey map</a>.</p>';
  });
})();
