/* 321愛的關懷  Service Worker —— 自動更新版（321 系共用）
   ‧ 每次發佈 VER 都不同 → 瀏覽器偵測到 sw.js 位元組改變就安裝新 SW（註冊時 updateViaCache:'none'）
   ‧ install：skipWaiting；預載用 cache:'reload' 繞過 HTTP 快取（GitHub Pages 會快取 10 分鐘）
   ‧ activate：只清自己前綴（PFX）的舊快取——同一個 github.io 網域的各 App 共用 Cache Storage，不能刪別人的；
     clients.claim 後通知所有頁面（頁面自己判斷空閒才重整）
   ‧ fetch：HTML／JS／JSON／CSS 網路優先（no-cache），離線才用快取；圖片等快取優先；影音與 Range 請求不攔截 */
var PFX = 'care321-';
var VER = '3.8.1-xz1103-xzm1103-rf1105';
var V = PFX + VER;
var SHELL_WAIT = 1000;
var SHELL = ["./", "./index.html", "./manifest.json", "./apple-touch-icon.png", "./favicon.ico", "./icon-32.png", "./icon-192.png", "./icon-512.png", "./icon-192-maskable.png", "./icon-512-maskable.png", "./og-image.png", "./music.json", "./coread.js?v=3.8.1-xz1103-xzm1103-rf1105", "./peerjs.min.js?v=3.8.1-xz1103-xzm1103-rf1105", "./xk321.js?v=3.8.1-xz1103-xzm1103-rf1105", "./xz2.js?v=xz1103-rf1105", "./xzm.js?v=xzm1103"];
self.addEventListener('install', function (e) {
  self.skipWaiting();
  e.waitUntil(caches.open(V).then(function (c) {
    return Promise.all(SHELL.map(function (u) {
      return fetch(new Request(u, { cache: 'reload' })).then(function (r) { if (r && r.ok) return c.put(u, r); })['catch'](function () { });
    }));
  }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k.indexOf(PFX) === 0 && k !== V; }).map(function (k) { return caches['delete'](k); }));
  }).then(function () { return self.clients.claim(); }).then(function () {
    return self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  }).then(function (cs) {
    cs.forEach(function (c) { try { if (c.url.indexOf(self.registration.scope) === 0) c.postMessage({ t: 'sw-updated', v: VER }); } catch (x) { } });
  }));
});
self.addEventListener('message', function (e) { if (e.data === 'skip' || e.data === 'SKIP_WAITING') self.skipWaiting(); });
self.addEventListener('fetch', function (e) {
  var r = e.request; if (r.method !== 'GET') return;
  var u = new URL(r.url); if (u.origin !== self.location.origin) return;
  var p = u.pathname;
  if (r.headers.get('range')) return;   /* 詩歌 mp3：完整請求第一次播放後進快取，Range 請求不攔截 */
  if (/version\.json$/.test(p)) {
    e.respondWith(fetch(p + '?t=' + Date.now(), { cache: 'no-store' })['catch'](function () { return new Response('{}', { headers: { 'Content-Type': 'application/json' } }); }));
    return;
  }
  var nav = r.mode === 'navigate' || /\.html$/.test(p) || /\/$/.test(p);
  var key = u.origin + p + (/\/$/.test(p) ? 'index.html' : '');
  if (nav || /\.(json|js|css)$/.test(p)) {
    /* rf1105：網路優先，但慢網路（超過 1 秒還沒回）就先用快取開，網路那份繼續下載並更新快取；只有導覽請求才可退回首頁 */
    e.respondWith(new Promise(function (resolve) {
      var done = false, tm = null;
      function fromCache() { return caches.match(key).then(function (h) { return h || caches.match(r, { ignoreSearch: true }).then(function (h2) { return h2 || (nav ? caches.match(HOMEkey) : null); }); }); }
      var net = fetch(r.url, { cache: 'no-cache', credentials: 'same-origin' }).then(function (resp) {
        if (resp && resp.ok) { var cp = resp.clone(); caches.open(V).then(function (c) { c.put(key, cp); }); }
        return resp;
      });
      tm = setTimeout(function () { fromCache().then(function (h) { if (h && !done) { done = true; resolve(h); } }); }, SHELL_WAIT);
      net.then(function (resp) { clearTimeout(tm); if (!done) { done = true; resolve(resp); } }, function () {
        clearTimeout(tm); if (done) return;
        fromCache().then(function (h) { done = true; resolve(h || new Response('', { status: 504 })); });
      });
    }));
    return;
  }
  e.respondWith(caches.match(r, { ignoreSearch: true }).then(function (h) {
    return h || fetch(r).then(function (resp) { if (resp && resp.ok) { var cp = resp.clone(); caches.open(V).then(function (c) { c.put(r, cp); }); } return resp; });
  }));
});
