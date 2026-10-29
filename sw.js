/* Japón 2026 – offline cache. Everything is saved on first visit; pages and maps then load without signal. */
const VERSION = "6d1ae19fa8";
const CACHE = "jp2026-" + VERSION, FONTS = "jp2026-fonts";
const FILES = ["./","data/stations.json","data/streets-index.json","icons/apple-touch-icon.png","icons/icon-192.png","icons/icon-512.png","icons/icon-maskable-512.png","index.html","manifest.webmanifest","streets/hakone.json","streets/hiroshima.json","streets/kanazawa.json","streets/kobe.json","streets/kyoto.json","streets/miyajima.json","streets/nagano.json","streets/nara.json","streets/nikko.json","streets/osaka.json","streets/shirakawago.json","streets/takayama.json","streets/tokyo.json","train.html","vendor/leaflet.js"];
self.addEventListener("install", e => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    await Promise.all(FILES.map(async f => {
      for (let i = 0; i < 2; i++) { try { const r = await fetch(f, {cache: "reload"}); if (r.ok) { await c.put(f, r); return; } } catch (err) {} }
    }));
    await self.skipWaiting();
  })());
});
self.addEventListener("activate", e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k.startsWith("jp2026-") && k !== CACHE && k !== FONTS) await caches.delete(k);
    await self.clients.claim();
    for (const c of await self.clients.matchAll({type: "window"})) c.postMessage({type: "cached", version: VERSION});
  })());
});
self.addEventListener("fetch", e => {
  const req = e.request; if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin === self.location.origin) {
    e.respondWith((async () => {
      const c = await caches.open(CACHE);
      let hit = null;
      if (req.mode === "navigate") { const last = url.pathname.split("/").pop(); hit = await c.match(last ? last : "./", {ignoreSearch: true}); }
      hit = hit || await c.match(req, {ignoreSearch: true});
      if (hit) return hit;
      try {
        const r = await fetch(req);
        if (r.ok && /\.(json|png|js|css|html|webmanifest)$/.test(url.pathname)) c.put(req, r.clone());
        return r;
      } catch (err) {
        if (req.mode === "navigate") return (await c.match("./")) || Response.error();
        return Response.error();
      }
    })());
  } else if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    e.respondWith((async () => {
      const c = await caches.open(FONTS); const hit = await c.match(req);
      const net = fetch(req).then(r => { if (r.ok || r.type === "opaque") c.put(req, r.clone()); return r; }).catch(() => hit || Response.error());
      return hit || net;
    })());
  }
});
