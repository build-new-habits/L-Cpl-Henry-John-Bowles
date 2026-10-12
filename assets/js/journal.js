/* Henry's Reflections: a journal page written word by word, in time with
   Henry's voice when the audio file exists. Without a recording the page
   is shown fully written. The full text is always in the page for screen readers,
   and a typed version is one tap away. */
(function () {
  'use strict';

  var PLAY = '<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false"><path d="M8 5v14l11-7z"/></svg>';
  var PAUSE = '<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false"><path d="M7 5h4v14H7zM13 5h4v14h-4z"/></svg>';
  var SPARK = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M12 3l2 6 6 2-6 2-2 6-2-6-6-2 6-2z"/></svg>';
  var SECONDS_PER_WORD = 0.36;   // writing pace when there is no voice
  var PARA_PAUSE = 0.9;          // extra seconds between paragraphs

  function stillMotion() {
    var m = document.documentElement.dataset.motion;
    if (m === 'reduced') return true;
    if (m === 'full') return false;
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  var count = 0;
  function build(entry) {
    var id = 'journal-' + (++count);
    var wrap = document.createElement('section');
    wrap.className = 'journal' + (entry.voice === 'other' ? ' journal--other' : '');
    wrap.setAttribute('aria-labelledby', id + '-date');

    var page = document.createElement('div');
    page.className = 'journal__page';
    var head = '<p class="journal__date" id="' + id + '-date">' + QS.esc(entry.date) +
      (entry.place ? '<span class="journal__place">' + QS.esc(entry.place) + '</span>' : '') + '</p>';
    var body = '<div class="journal__hand" id="' + id + '-hand">';
    var words = 0;
    entry.paras.forEach(function (p) {
      body += '<p>' + p.split(/\s+/).map(function (w) { words++; return '<span class="w">' + QS.esc(w) + '</span>'; }).join(' ') + '</p>';
    });
    body += '</div>';
    var typed = '<div class="journal__typed" id="' + id + '-typed" hidden>' +
      entry.paras.map(function (p) { return '<p>' + QS.esc(p) + '</p>'; }).join('') + '</div>';
    page.innerHTML = head + body + typed +
      (entry.audio ? '<p class="journal__invite" aria-hidden="true">This page is still blank. Press play above to watch Henry write it.</p>' : '') +
      '<p class="journal__disclosure">' + SPARK + QS.esc(entry.disclosure || 'AI imagined journal, written for Henry from his record and his battalion\'s history') + '</p>';
    if (entry.who) {
      var who = document.createElement('p');
      who.className = 'journal__who';
      who.textContent = entry.who;
      wrap.appendChild(who);
    }
    wrap.appendChild(page);

    var controls = document.createElement('div');
    controls.className = 'journal__controls';
    var playBtn = document.createElement('button');
    playBtn.type = 'button';
    playBtn.className = 'btn btn--dark journal__play';
    var showBtn = document.createElement('button');
    showBtn.type = 'button';
    showBtn.className = 'btn';
    showBtn.textContent = 'Show the whole page';
    var typedBtn = document.createElement('button');
    typedBtn.type = 'button';
    typedBtn.className = 'btn';
    typedBtn.textContent = 'Typed version';
    typedBtn.setAttribute('aria-pressed', 'false');
    typedBtn.setAttribute('aria-controls', id + '-typed');
    var note = document.createElement('p');
    note.className = 'journal__note';
    note.setAttribute('role', 'status');
    controls.appendChild(playBtn);
    controls.appendChild(showBtn);
    controls.appendChild(typedBtn);
    wrap.insertBefore(note, page);
    wrap.insertBefore(controls, note);
    if (entry.basis && entry.basis.length) {
      var LABEL = { record: 'His record', history: 'History', family: 'Family', typical: 'Typical of the time', imagined: 'Imagined', unknown: 'Not recorded' };
      var basis = document.createElement('details');
      basis.className = 'journal__basis';
      basis.innerHTML = '<summary>What\'s real in this entry</summary><ul>' + entry.basis.map(function (b) {
        return '<li class="basis--' + b[0] + '"><span class="basis-kind">' + QS.esc(LABEL[b[0]] || b[0]) + '</span> ' + QS.esc(b[1]) + '</li>';
      }).join('') + '</ul>';
      wrap.appendChild(basis);
    }

    var hand = page.querySelector('.journal__hand');
    var typedEl = page.querySelector('.journal__typed');
    var spans = Array.prototype.slice.call(hand.querySelectorAll('.w'));
    var narrated = !!entry.audio;
    var audio = null, audioOk = false, playing = false, raf = 0, startedAt = 0, offset = 0;

    // Timing for each word: proportional to its length, with a pause at each paragraph end.
    var times = [], t = 0;
    var paraEnds = [];
    var idx = 0;
    entry.paras.forEach(function (p) {
      p.split(/\s+/).forEach(function (w) { times.push(t); t += SECONDS_PER_WORD * Math.max(0.6, Math.min(2, w.length / 5)); idx++; });
      t += PARA_PAUSE; paraEnds.push(idx);
    });
    var natural = t;

    function setLabel() {
      var verb = narrated ? (audioOk || !audio ? 'Hear Henry read it' : 'Watch it written') : 'Watch it written';
      playBtn.innerHTML = (playing ? PAUSE : PLAY) + '<span>' + (playing ? 'Pause' : (offset > 0 && offset < total() ? 'Carry on' : verb)) + '</span>';
    }
    function total() { return audioOk && audio && audio.duration ? audio.duration : natural; }
    var lastShown = -1;
    function reveal(upTo) {
      var scale = total() / natural, newest = -1;
      spans.forEach(function (s, i) { var on = times[i] * scale <= upTo; s.classList.toggle('is-on', on); if (on) newest = i; });
      if (newest > lastShown && newest >= 0 && playing && !stillMotion()) {
        var r = spans[newest].getBoundingClientRect();
        if (r.bottom > window.innerHeight - 60) spans[newest].scrollIntoView({ block: 'center', behavior: 'smooth' });
      }
      lastShown = newest;
    }
    function showAll() { stop(); offset = total(); spans.forEach(function (s) { s.classList.add('is-on'); }); wrap.classList.add('is-written'); setLabel(); }
    function tick() {
      var now = audioOk && audio ? audio.currentTime : offset + (performance.now() - startedAt) / 1000;
      reveal(now);
      if (now >= total()) { playing = false; offset = total(); wrap.classList.add('is-written'); setLabel(); return; }
      raf = requestAnimationFrame(tick);
    }
    function stop() {
      if (!playing) return;
      playing = false;
      cancelAnimationFrame(raf);
      if (audioOk && audio) { audio.pause(); offset = audio.currentTime; }
      else offset += (performance.now() - startedAt) / 1000;
      setLabel();
    }
    function start() {
      if (offset >= total()) { offset = 0; spans.forEach(function (s) { s.classList.remove('is-on'); }); wrap.classList.remove('is-written'); if (audio) audio.currentTime = 0; }
      wrap.classList.add('is-started');
      playing = true; setLabel();
      if (stillMotion() && !(audioOk && audio)) { showAll(); return; }
      if (stillMotion()) spans.forEach(function (s) { s.classList.add('is-on'); });
      startedAt = performance.now();
      if (audioOk && audio) {
        audio.play().then(function () { if (!stillMotion()) raf = requestAnimationFrame(tick); else { audio.onended = function () { playing = false; offset = total(); setLabel(); }; } })
          .catch(function () { audioOk = false; note.textContent = 'Henry\'s voice could not play, so the page is being written without it.'; raf = requestAnimationFrame(tick); });
      } else {
        raf = requestAnimationFrame(tick);
      }
    }

    // Without a working recording the page simply rests fully written, with
    // only the typed-version button. The writing animation is kept for
    // Henry's voice, so it always means "listen".
    function silent() {
      narrated = false; audio = null; audioOk = false;
      wrap.classList.remove('is-narrated', 'is-started');
      spans.forEach(function (s) { s.classList.add('is-on'); });
      wrap.classList.add('is-written', 'is-silent');
      var inv = page.querySelector('.journal__invite');
      if (inv) inv.remove();
      if (playBtn.parentNode) playBtn.remove();
      if (showBtn.parentNode) showBtn.remove();
      note.textContent = '';
    }

    if (narrated) {
      wrap.classList.add('is-narrated');
      audio = new Audio();
      audio.preload = 'metadata';
      audio.addEventListener('loadedmetadata', function () { audioOk = true; note.textContent = ''; setLabel(); });
      audio.addEventListener('error', function () { if (!playing) silent(); });
      audio.src = entry.audio;
    } else {
      silent();
    }

    playBtn.addEventListener('click', function () { playing ? stop() : start(); });
    showBtn.addEventListener('click', showAll);
    typedBtn.addEventListener('click', function () {
      var on = typedBtn.getAttribute('aria-pressed') !== 'true';
      typedBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
      typedEl.hidden = !on;
      wrap.classList.toggle('is-typed', on);
      hand.hidden = on;
      typedBtn.textContent = on ? 'Handwritten version' : 'Typed version';
    });
    setLabel();
    wrap._stop = stop;
    return wrap;
  }

  window.QSJournal = { build: build };
})();
