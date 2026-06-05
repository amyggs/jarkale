const CACHE='jarkale-v80';const FILES=['./', './index.html','./manifest.webmanifest','./icon-192.png','./icon-512.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;if(e.request.url.includes('api.anthropic.com'))return;e.respondWith(caches.match(e.request).then(cached=>{if(cached)return cached;return fetch(e.request).then(resp=>{if(!resp||resp.status!==200)return resp;caches.open(CACHE).then(c=>c.put(e.request,resp.clone()));return resp;}).catch(()=>caches.match('./index.html'));}));});
// Pakkolataus: uusi SW ottaa hallinnan heti ilman odottelua
self.addEventListener('message',e=>{if(e.data==='skipWaiting') self.skipWaiting();});
