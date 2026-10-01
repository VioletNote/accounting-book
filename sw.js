/* 记账本 Service Worker
   ★★★ 每次改动 index.html / 样式 / 图标后，必须把下面的 VERSION 改掉（例如 v1.0.1），
       否则手机上永远看到旧版本。★★★ */
var VERSION = 'v1.0.0';
var CACHE = 'ledger-' + VERSION;

var ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-180.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-512-maskable.png'
];

self.addEventListener('install', function (e) {
  // 只预缓存，不 skipWaiting：新版停在 waiting，由页面提示用户手动更新
  e.waitUntil(
    caches.open(CACHE).then(function (c) {
      return Promise.all(ASSETS.map(function (u) {
        return c.add(new Request(u, { cache: 'reload' })).catch(function () {});
      }));
    })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        if (k !== CACHE) return caches.delete(k);
      }));
    }).then(function () {
      return self.clients.matchAll({ type: 'window' });
    }).then(function (list) {
      list.forEach(function (client) {
        client.postMessage({ type: 'SW_UPDATED', version: VERSION });
      });
    }).then(function () {
      return self.clients.claim();
    })
  );
});

self.addEventListener('message', function (e) {
  if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url;
  try { url = new URL(req.url); } catch (err) { return; }
  if (url.origin !== self.location.origin) return; // 外链一律不接管

  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then(function (hit) {
      var net = fetch(req).then(function (res) {
        if (res && res.status === 200 && res.type === 'basic') {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(req, copy); });
        }
        return res;
      }).catch(function () { return hit; });

      if (hit) return hit;            // 缓存优先
      return net.then(function (res) {
        return res || caches.match('./index.html');
      });
    })
  );
});
