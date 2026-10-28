const CACHE='jarkale-v316';const PREFIX='jarkale-v';const FONTS='jarkale-fonts-v1';
const FILES=['./', './index.html','./manifest.webmanifest','./icon-192.png?v=4','./icon-512.png?v=4','./icon-maskable-512.png?v=4','./apple-touch-icon.png?v=4'];
const CORE_FONTS=['./fonts/manrope-latin-400-normal.woff2','./fonts/manrope-latin-500-normal.woff2','./fonts/manrope-latin-600-normal.woff2','./fonts/manrope-latin-700-normal.woff2','./fonts/manrope-latin-800-normal.woff2'];
// v2.18.80: fontit omassa pysyvässä välimuistissaan (ei ladata uudelleen jokaisen version mukana); perusfontti esiladataan
self.addEventListener('install',e=>{e.waitUntil(Promise.all([
  caches.open(CACHE).then(c=>c.addAll(FILES.map(u=>new Request(u,{cache:'reload'})))),
  caches.open(FONTS).then(c=>Promise.all(CORE_FONTS.map(u=>c.match(u).then(h=>h||c.add(u)).catch(()=>{}))))
]).then(()=>self.skipWaiting()));});
// v2.18.80: siivotaan vain tämän sovelluksen vanhat välimuistit. jarkale ja jarkale-pilotti jakavat saman origin-tilan,
// eikä toisen versio saa poistaa toisen välimuistia.
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith(PREFIX)&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;if(/api\.anthropic\.com|googleapis\.com|accounts\.google\.com|gstatic\.com/.test(e.request.url))return;
  const isFont=/\/fonts\/[^/]+\.woff2$/.test(new URL(e.request.url).pathname);
  const store=isFont?FONTS:CACHE;
  e.respondWith(caches.match(e.request,isFont?{cacheName:FONTS}:undefined).then(cached=>{if(cached)return cached;return fetch(e.request).then(resp=>{if(!resp||resp.status!==200)return resp;const cp=resp.clone();caches.open(store).then(c=>c.put(e.request,cp));return resp;}).catch(()=>caches.match('./index.html'));}));});
// Pakkolataus: uusi SW ottaa hallinnan heti ilman odottelua
self.addEventListener('message',e=>{if(e.data==='skipWaiting') self.skipWaiting();});
