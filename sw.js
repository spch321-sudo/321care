/* 321愛的關懷 · Service Worker
   每次更新內容，請把 CACHE 版號往上跳一號（例如 v1.4.0 → v1.4.1），
   長輩的手機才會拿到新版本。 */
const CACHE = "care321-v2.2.0";

const SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./apple-touch-icon.png",
  "./favicon.ico",
  "./icon-32.png",
  "./icon-180.png",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-192-maskable.png",
  "./icon-512-maskable.png",
  "./og-image.png"
];

/* 安裝：把外殼先存起來，之後沒有網路也打得開 */
self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(SHELL).catch(() => c.add("./index.html")))
      .then(() => self.skipWaiting())
  );
});

/* 啟用：刪掉舊版本的快取 */
self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* 取用策略
   · 網頁本身（HTML）：先連網拿最新的，連不上再用快取 —— 才不會一直看到舊版
   · 其他靜態檔：先用快取，快就好，背景再補 */
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  const isDoc = req.mode === "navigate" ||
                (req.headers.get("accept") || "").includes("text/html");

  if (isDoc) {
    e.respondWith(
      fetch(req)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put("./index.html", copy));
          return res;
        })
        .catch(() => caches.match("./index.html").then(r => r || caches.match("./")))
    );
    return;
  }

  e.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(res => {
      if (res && res.status === 200 && res.type === "basic") {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy));
      }
      return res;
    }).catch(() => hit))
  );
});

/* 讓 App 裡的「強制更新」按鈕可以立即換版 */
self.addEventListener("message", e => {
  if (e.data === "skipWaiting") self.skipWaiting();
});
