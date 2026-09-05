/* ==========================================================================
   Good-Habits — Service Worker
   オフラインでも起動できるよう、アプリ本体をキャッシュする。
   中身を更新したら CACHE_NAME のバージョンを上げること。
   ========================================================================== */

var CACHE_NAME = "good-habits-v1";

var CORE_ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./css/style.css",
  "./js/icons.js",
  "./js/content.js",
  "./js/badges.js",
  "./js/storage.js",
  "./js/logic.js",
  "./js/notifications.js",
  "./js/ui.js",
  "./js/app.js",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/favicon-32.png",
  "./icons/apple-touch-icon.png"
];

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(CORE_ASSETS);
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (key) { return key !== CACHE_NAME; })
            .map(function (key) { return caches.delete(key); })
      );
    }).then(function () {
      return self.clients.claim();
    })
  );
});

// キャッシュ優先、なければネットワーク取得し、成功したものは以後のためにキャッシュへ保存する。
// （Google Fontsなど別オリジンのリソースも同様に扱い、オフライン時の表示崩れを減らす）
self.addEventListener("fetch", function (event) {
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request).then(function (cached) {
      if (cached) return cached;
      return fetch(event.request).then(function (response) {
        if (response && (response.ok || response.type === "opaque")) {
          var copy = response.clone();
          caches.open(CACHE_NAME).then(function (cache) { cache.put(event.request, copy); });
        }
        return response;
      }).catch(function () {
        if (event.request.mode === "navigate") return caches.match("./index.html");
      });
    })
  );
});
