const CACHE='purr-rush-v7-0';
const FILES=['./','./index.html','./style.css','./app.js','./engine.js','./art.js','./sound.js','./manifest.webmanifest','./icon.svg','./apple-touch-icon.png','./cinco-moods.png','./moona-moods-striped.png','./blaze-moods.png','./cozy-room.png'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES))));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('purr-rush-')&&k!==CACHE).map(k=>caches.delete(k))))));
self.addEventListener('fetch',event=>{if(event.request.method!=='GET'||new URL(event.request.url).origin!==self.location.origin)return;event.respondWith(fetch(event.request).catch(()=>caches.match(event.request)));});
