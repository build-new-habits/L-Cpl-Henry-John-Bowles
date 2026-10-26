/* The Quiet Soldier: offline support.
   Pages, styles, scripts and text: network first, so updates arrive; the saved copy is used when offline.
   Photos and recordings: saved copy first (they rarely change), refreshed in the background. */
var VERSION = '20261026b';
var SHELL = 'qs-shell-' + VERSION;
var MEDIA = 'qs-media';
var CORE = [
  './', 'index.html', 'chapter.html', 'journey.html', 'historian.html',
  'about.html', 'making.html', 'sources.html',
  'assets/css/exhibit.css', 'assets/css/chapter.css', 'assets/css/about.css',
  'assets/js/exhibit.js', 'assets/js/chapter.js', 'assets/js/journal.js',
  'manifest.webmanifest', 'offline-files.json',
  'assets/icons/icon-192.png', 'assets/icons/icon-512.png'
];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(SHELL).then(function (c) {
    return fetch('offline-files.json', { cache: 'no-cache' }).then(function (r) { return r.json(); })
      .then(function (list) { return c.addAll(CORE.concat(list.text || [])); })
      .catch(function () { return c.addAll(CORE); });
  }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k.indexOf('qs-shell-') === 0 && k !== SHELL; })
      .map(function (k) { return caches.delete(k); }));
  }).then(clearSavedAudio).then(function () { return self.clients.claim(); }));
});

/* Recordings were renamed in October 2026 so each one plays with the right
   journal entry. Drop any saved copies so the corrected files are fetched. */
function clearSavedAudio() {
  return caches.keys().then(function (keys) {
    return Promise.all(keys.map(function (k) {
      return caches.open(k).then(function (c) {
        return c.keys().then(function (reqs) {
          return Promise.all(reqs.filter(function (r) { return /\.(mp3|m4a)$/i.test(new URL(r.url).pathname); })
            .map(function (r) { return c.delete(r); }));
        });
      });
    }));
  }).catch(function () {});
}

function isMedia(url) { return /\.(jpe?g|png|gif|webp|svg|mp3|m4a)$/i.test(url.pathname); }

function fromCache(req) {
  return caches.match(req, { ignoreSearch: true }).then(function (hit) {
    if (hit || req.mode !== 'navigate') return hit;
    return caches.match('index.html');
  });
}

// Recordings: browsers ask for byte ranges, so answer from a saved copy with the part asked for.
function ranged(req, res) {
  var range = req.headers.get('range');
  if (!range || !res) return res;
  return res.arrayBuffer().then(function (buf) {
    var m = /bytes=(\d*)-(\d*)/.exec(range) || [];
    var start = m[1] ? parseInt(m[1], 10) : 0;
    var end = m[2] ? parseInt(m[2], 10) : buf.byteLength - 1;
    end = Math.min(end, buf.byteLength - 1);
    return new Response(buf.slice(start, end + 1), {
      status: 206, statusText: 'Partial Content',
      headers: { 'Content-Type': res.headers.get('Content-Type') || 'audio/mpeg',
                 'Content-Range': 'bytes ' + start + '-' + end + '/' + buf.byteLength,
                 'Content-Length': String(end - start + 1), 'Accept-Ranges': 'bytes' }
    });
  });
}

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (/\.(mp3|m4a)$/i.test(url.pathname)) {
    e.respondWith(caches.match(url.pathname, { ignoreSearch: true }).then(function (hit) {
      if (hit) return ranged(req, hit);
      return fetch(req);
    }));
    return;
  }

  if (isMedia(url)) {
    e.respondWith(caches.open(MEDIA).then(function (c) {
      return c.match(req, { ignoreSearch: true }).then(function (hit) {
        var net = fetch(req).then(function (res) {
          if (res.ok) c.put(req, res.clone());
          return res;
        }).catch(function () { return hit; });
        if (hit) { e.waitUntil(net.catch(function () {})); return hit; }
        return net;
      });
    }));
    return;
  }

  e.respondWith(fetch(req).then(function (res) {
    if (res.ok) { var copy = res.clone(); caches.open(SHELL).then(function (c) { c.put(req, copy); }); }
    return res;
  }).catch(function () {
    return fromCache(req).then(function (hit) { return hit || new Response('You are offline, and this page has not been saved yet.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } }); });
  }));
});
