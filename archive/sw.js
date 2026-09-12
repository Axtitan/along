// FIX 5: v4 — cache-first for OSM tiles, network-first for app shell
const CACHE='along-mvp-v4';
const TILE_CACHE='along-tiles-v1';
const ASSETS=['./','./index.html','./styles.css','./app.js','./manifest.webmanifest','./vendor/fallback-map.js'];
self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)))});
self.addEventListener('activate',e=>e.waitUntil(Promise.all([
  // Remove old app caches (keep tile cache separately)
  caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE&&k!==TILE_CACHE).map(k=>caches.delete(k)))),
  self.clients.claim()
])));
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  const u=new URL(e.request.url);
  // Skip API calls — never cache
  if(u.pathname.startsWith('/api/'))return;
  // FIX 5: Cache-first for OSM tiles — tile URLs are immutable ({z}/{x}/{y}.png)
  if(u.hostname==='tile.openstreetmap.org'){
    e.respondWith(caches.match(e.request).then(hit=>hit||fetch(e.request).then(r=>{
      if(r.ok){const copy=r.clone();caches.open(TILE_CACHE).then(c=>c.put(e.request,copy))}
      return r;
    })));
    return;
  }
  // Network-first for app shell — picks up updates immediately, falls back to cache offline
  e.respondWith(fetch(e.request).then(r=>{
    const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return r;
  }).catch(()=>caches.match(e.request)));
});
