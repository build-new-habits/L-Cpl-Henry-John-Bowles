/* The Quiet Soldier: shared behaviour
   - visitor profiles (Mum, Graeme, Guest), each with its own settings and progress
   - settings dialog, applied to <html> as data attributes
   - progress saving
   Everything is stored in localStorage when available, and kept in memory otherwise. */
(function () {
  'use strict';

  var KEY = 'quiet-soldier:v1';
  var VISITORS = { mum: 'Mum', graeme: 'Graeme', guest: 'Guest' };
  var DEFAULTS = {
    tint: 'auto', font: 'standard', size: '100', spacing: 'normal',
    motion: 'system', captions: true, notes: true
  };

  var memory = null;
  function load() {
    if (memory) return memory;
    var data = null;
    try { data = JSON.parse(window.localStorage.getItem(KEY)); } catch (e) { data = null; }
    if (!data || typeof data !== 'object') data = {};
    if (!VISITORS[data.visitor]) data.visitor = 'mum';
    data.profiles = data.profiles || {};
    Object.keys(VISITORS).forEach(function (id) {
      var p = data.profiles[id] = data.profiles[id] || {};
      p.settings = Object.assign({}, DEFAULTS, p.settings || {});
      p.progress = p.progress || { chapters: {}, last: null };
      p.progress.chapters = p.progress.chapters || {};
    });
    memory = data;
    return data;
  }
  function save() {
    try { window.localStorage.setItem(KEY, JSON.stringify(memory)); return true; } catch (e) { return false; }
  }
  function profile() { var d = load(); return d.profiles[d.visitor]; }

  /* Settings */
  function applySettings(s) {
    var root = document.documentElement;
    root.dataset.tint = s.tint;
    root.dataset.font = s.font;
    root.dataset.size = s.size;
    root.dataset.spacing = s.spacing;
    root.dataset.motion = s.motion;
    root.dataset.captions = s.captions ? 'on' : 'off';
  }

  /* Icons (decorative; buttons carry their own labels) */
  var ICONS = {
    map: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2-6-2z"/><path d="M9 4v14"/><path d="M15 6v14"/></svg>',
    settings: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true" focusable="false"><path d="M4 6h9"/><path d="M19 6h1"/><circle cx="16" cy="6" r="2.5"/><path d="M4 12h3"/><path d="M13 12h7"/><circle cx="10" cy="12" r="2.5"/><path d="M4 18h11"/><circle cx="18" cy="18" r="2.5"/></svg>',
    close: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true" focusable="false"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    tick: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true" focusable="false"><path d="M5 12l5 5 9-10"/></svg>',
    archival: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true" focusable="false"><rect x="3" y="4" width="18" height="16" rx="1"/><path d="M7 4v16M17 4v16M3 9h4M3 15h4M17 9h4M17 15h4"/></svg>',
    family: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/></svg>',
    unit: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true" focusable="false"><circle cx="9" cy="8" r="3"/><path d="M3 20c0-3 3-5 6-5s6 2 6 5"/><circle cx="17" cy="9" r="2.5"/><path d="M16 15c3 0 5 2 5 5"/></svg>',
    ai: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M12 3l2 6 6 2-6 2-2 6-2-6-6-2 6-2z"/></svg>'
  };
  var BADGES = {
    archival: 'Archival', family: 'Family record', unit: 'Typical of his unit', ai: 'AI reconstruction'
  };
  function badge(kind) {
    return '<span class="badge badge--' + kind + '">' + ICONS[kind] + BADGES[kind] + '</span>';
  }

  /* Settings dialog */
  function radioGroup(name, legend, hint, options, current) {
    var html = '<fieldset><legend>' + legend + '</legend>';
    if (hint) html += '<p class="hint">' + hint + '</p>';
    html += '<div class="choice-row">';
    options.forEach(function (o) {
      html += '<label class="choice">' + (o.swatch ? '<span class="swatch" style="background:' + o.swatch + '" aria-hidden="true"></span>' : '') +
        '<input type="radio" name="' + name + '" value="' + o.value + '"' + (String(current) === o.value ? ' checked' : '') + '>' + o.label + '</label>';
    });
    return html + '</div></fieldset>';
  }

  function buildSettings() {
    var s = profile().settings;
    var d = document.createElement('dialog');
    d.className = 'settings';
    d.id = 'settings';
    d.setAttribute('aria-labelledby', 'settings-title');
    d.innerHTML =
      '<div class="settings__head"><h2 id="settings-title">Settings</h2>' +
      '<button type="button" class="icon-btn" data-close aria-label="Close settings">' + ICONS.close + '</button></div>' +
      '<form class="settings__body" method="dialog">' +
      radioGroup('size', 'Text size', 'Make all the words on every page bigger.', [
        { value: '100', label: 'Standard' }, { value: '125', label: 'Larger' }, { value: '150', label: 'Large' },
        { value: '175', label: 'Very large' }, { value: '200', label: 'Largest' }], s.size) +
      radioGroup('font', 'Lettering', 'Lexend is designed to make reading easier, including for people with dyslexia.', [
        { value: 'standard', label: 'Old-style headings' }, { value: 'plain', label: 'Plain headings' },
        { value: 'lexend', label: 'Lexend' }], s.font) +
      radioGroup('tint', 'Page colour', 'A tinted page can make reading more comfortable.', [
        { value: 'auto', label: 'Same as my device' }, { value: 'paper', label: 'Paper', swatch: '#F3EDE2' }, { value: 'blue', label: 'Blue', swatch: '#DCE8F0' },
        { value: 'yellow', label: 'Yellow', swatch: '#F7F0C6' }, { value: 'green', label: 'Green', swatch: '#E1EDD9' },
        { value: 'rose', label: 'Rose', swatch: '#F2E1DE' }, { value: 'night', label: 'Night', swatch: '#16140F' }], s.tint) +
      radioGroup('spacing', 'Line spacing', '', [
        { value: 'normal', label: 'Standard' }, { value: 'wide', label: 'Wider' }], s.spacing) +
      radioGroup('motion', 'Movement', 'Choose whether maps and scenes move or simply change.', [
        { value: 'system', label: 'Same as my device' }, { value: 'reduced', label: 'Keep still' },
        { value: 'full', label: 'Allow movement' }], s.motion) +
      '<fieldset><legend>Sound and care</legend>' +
      '<label class="toggle"><input type="checkbox" name="captions"' + (s.captions ? ' checked' : '') + '>Show captions when Henry speaks</label>' +
      '<label class="toggle"><input type="checkbox" name="notes"' + (s.notes ? ' checked' : '') + '>Show a note before difficult scenes</label>' +
      '<p class="hint">Nothing ever plays by itself. You choose when to listen.</p></fieldset>' +
      '</form>' +
      '<div class="settings__foot"><p class="settings__status" role="status" aria-live="polite"></p>' +
      '<div class="choice-row"><button type="button" class="btn" data-reset>Reset settings</button>' +
      '<button type="button" class="btn btn--dark" data-close>Done</button></div></div>';
    document.body.appendChild(d);

    var status = d.querySelector('.settings__status');
    var form = d.querySelector('form');
    function announce(msg) { status.textContent = ''; window.setTimeout(function () { status.textContent = msg; }, 50); }

    form.addEventListener('change', function (e) {
      var t = e.target, s = profile().settings;
      if (t.type === 'checkbox') s[t.name] = t.checked; else s[t.name] = t.value;
      applySettings(s);
      announce(save() ? 'Saved for ' + VISITORS[load().visitor] + '.' : 'Applied. This browser cannot keep settings after you close it.');
    });
    d.querySelector('[data-reset]').addEventListener('click', function () {
      profile().settings = Object.assign({}, DEFAULTS);
      applySettings(profile().settings);
      save();
      var fresh = profile().settings;
      form.querySelectorAll('input').forEach(function (i) {
        if (i.type === 'checkbox') i.checked = !!fresh[i.name]; else i.checked = String(fresh[i.name]) === i.value;
      });
      announce('Settings reset to standard.');
    });
    d.querySelectorAll('[data-close]').forEach(function (b) { b.addEventListener('click', function () { d.close(); }); });
    d.addEventListener('click', function (e) { if (e.target === d) d.close(); });
    return d;
  }

  /* Menu: everything in the exhibition, from the top-left button */
  var MENU_ICON = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true" focusable="false"><path d="M4 7h16M4 12h16M4 17h16"/></svg>';
  function menuList(items) {
    var here = location.pathname.split('/').pop() + location.hash;
    return '<ul class="menu__list">' + items.map(function (it) {
      var cur = it.href === here || (it.href === 'index.html' && here === '');
      return '<li><a href="' + esc(it.href) + '"' + (cur ? ' aria-current="page"' : '') + '><span class="menu__t">' + esc(it.t) + '</span>' +
        (it.m ? '<span class="menu__m">' + esc(it.m) + '</span>' : '') + '</a></li>';
    }).join('') + '</ul>';
  }
  function buildMenu(data) {
    var d = document.createElement('dialog');
    d.className = 'menu';
    d.setAttribute('aria-labelledby', 'menu-title');
    var html = '<div class="menu__head"><h2 id="menu-title">Menu</h2>' +
      '<button type="button" class="icon-btn" data-close aria-label="Close the menu">' + ICONS.close + '</button></div><nav class="menu__body" aria-labelledby="menu-title">';
    if (!data) html += '<p>The menu could not be loaded. <a href="journey.html">Go to the journey map</a>.</p>';
    else data.sections.forEach(function (sec, i) {
      html += '<section aria-labelledby="ms-' + i + '"><h3 id="ms-' + i + '">' + esc(sec.title) + '</h3>' +
        (sec.collapsed ? '<details><summary>' + esc(sec.collapsed) + '</summary>' + menuList(sec.items) + '</details>' : menuList(sec.items)) + '</section>';
    });
    d.innerHTML = html + '</nav>';
    document.body.appendChild(d);
    d.querySelector('[data-close]').addEventListener('click', function () { d.close(); });
    d.addEventListener('click', function (e) {
      if (e.target === d) d.close();
      var a = e.target.closest('a');
      if (a) d.close();   // same-page hash links change the scene, so close behind them
    });
    return d;
  }
  var menuData = null;
  function openMenu(btn) {
    var go = function (data) {
      var d = buildMenu(data);
      d.addEventListener('close', function () { d.remove(); btn.setAttribute('aria-expanded', 'false'); if (document.body.contains(btn)) btn.focus(); });
      d.showModal(); btn.setAttribute('aria-expanded', 'true');
    };
    if (menuData) return go(menuData);
    fetch('content/menu.json', { cache: 'no-cache' }).then(function (r) { return r.ok ? r.json() : null; })
      .catch(function () { return null; }).then(function (m) { menuData = m; go(m); });
  }
  function addMenuButton() {
    var left = document.querySelector('.site-header__left');
    if (!left) return;
    var old = left.querySelector('a[data-icon="map"]'); if (old) old.remove();
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'menu-btn';
    b.setAttribute('aria-haspopup', 'dialog'); b.setAttribute('aria-expanded', 'false');
    b.innerHTML = MENU_ICON + '<span>Menu</span>';
    b.addEventListener('click', function () { openMenu(b); });
    left.insertBefore(b, left.firstChild);
  }

  function wireHeader() {
    var opener = null, dialog = null;
    addMenuButton();
    document.querySelectorAll('[data-open-settings]').forEach(function (b) {
      b.innerHTML = ICONS.settings;
      b.setAttribute('aria-label', 'Settings');
      b.setAttribute('aria-haspopup', 'dialog');
      b.addEventListener('click', function () {
        if (dialog) dialog.remove();
        dialog = buildSettings();
        opener = b;
        dialog.addEventListener('close', function () { if (opener) opener.focus(); });
        dialog.showModal();
      });
    });
    document.querySelectorAll('[data-icon]').forEach(function (el) { el.insertAdjacentHTML('afterbegin', ICONS[el.dataset.icon]); });
    document.querySelectorAll('[data-badge]').forEach(function (el) { el.outerHTML = badge(el.dataset.badge); });
    var chip = document.querySelector('[data-visitor-chip]');
    if (chip) chip.textContent = 'Visiting as ' + VISITORS[load().visitor];
    var saved = document.querySelector('[data-saved-note]');
    if (saved) saved.innerHTML = ICONS.tick + 'Progress saved';
  }

  /* Progress */
  function chapterState(n) { return profile().progress.chapters[n] || { scene: 0, done: false }; }
  function setChapterState(n, patch) {
    var p = profile().progress;
    p.chapters[n] = Object.assign({}, chapterState(n), patch);
    p.last = n;
    save();
  }

  function loadChapters() {
    return fetch('content/chapters.json', { cache: 'no-cache' }).then(function (r) {
      if (!r.ok) throw new Error('Could not load the chapter list (' + r.status + ').');
      return r.json();
    });
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  }

  if (!document.documentElement.lang) document.documentElement.lang = 'en-GB';
  applySettings(profile().settings);
  document.addEventListener('DOMContentLoaded', wireHeader);

  window.QS = {
    VISITORS: VISITORS, load: load, save: save, profile: profile, applySettings: applySettings,
    badge: badge, icons: ICONS, chapterState: chapterState, setChapterState: setChapterState,
    loadChapters: loadChapters, esc: esc,
    setVisitor: function (id) { if (VISITORS[id]) { load().visitor = id; applySettings(profile().settings); save(); } }
  };
})();
