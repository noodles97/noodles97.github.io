/* 해외 직구 계산기 service worker: 앱 껍데기는 캐시 우선(백그라운드 갱신), 환율 API는 항상 네트워크 */
var CACHE='dic-v1';
var ASSETS=['./','./index.html','./manifest.webmanifest','./icons/icon-192.png','./icons/icon-512.png','./icons/icon-512-maskable.png','./icons/apple-touch-icon.png'];

self.addEventListener('install',function(e){
  e.waitUntil(caches.open(CACHE).then(function(c){return c.addAll(ASSETS);}).then(function(){return self.skipWaiting();}));
});
self.addEventListener('activate',function(e){
  e.waitUntil(caches.keys().then(function(keys){
    return Promise.all(keys.filter(function(k){return k!==CACHE;}).map(function(k){return caches.delete(k);}));
  }).then(function(){return self.clients.claim();}));
});
self.addEventListener('fetch',function(e){
  var req=e.request;
  if(req.method!=='GET')return;
  var url=new URL(req.url);
  var sameOrigin=url.origin===self.location.origin;
  var font=url.hostname==='fonts.googleapis.com'||url.hostname==='fonts.gstatic.com';
  if(!sameOrigin&&!font)return;            /* 환율 API 등은 그대로 네트워크로 */
  e.respondWith(caches.open(CACHE).then(function(c){
    return c.match(req,{ignoreSearch:sameOrigin}).then(function(cached){
      var fresh=fetch(req).then(function(res){if(res&&res.ok)c.put(req,res.clone());return res;}).catch(function(){return cached;});
      if(cached){fresh.catch(function(){});return cached;}
      return fresh.then(function(res){return res||(req.mode==='navigate'?c.match('./index.html'):undefined);});
    });
  }));
});
