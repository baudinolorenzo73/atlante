/* Atlante di campo - service worker (uso senza rete). by Lollo ®2026
   - file dell'app: prima la rete (gli aggiornamenti arrivano subito); se la rete manca o è lenta (oltre 3,5 s) usa la copia salvata
   - tessere delle mappe: prima le aree scaricate di proposito («atl-aree», v4.7: mai cancellate né svuotate da sole),
     poi la copia salvata, poi la rete (e le tessere viste restano salvate, fino a 6000)
   L'elenco dei file e il numero di versione arrivano da js/version.js (lo rigenera tools/build.py). */
try{importScripts('js/version.js')}catch(e){}
var B=(typeof BUILD!=='undefined')?BUILD:'single';
var LIST=(typeof ASSETS!=='undefined')?ASSETS:['./'];
var SHELL='atl-shell-'+B,TILES='atl-tiles',AREE='atl-aree',MAXT=6000,SLOW=3500;

self.addEventListener('install',function(e){
  e.waitUntil(caches.open(SHELL).then(function(c){return c.addAll(LIST)}).catch(function(){}).then(function(){return self.skipWaiting()}));
});
self.addEventListener('activate',function(e){
  e.waitUntil(caches.keys().then(function(ks){return Promise.all(ks.filter(function(k){return k.indexOf('atl-shell')===0&&k!==SHELL}).map(function(k){return caches.delete(k)}))}).then(function(){return self.clients.claim()}));
});
function fromCache(req){
  return caches.match(req.url,{ignoreSearch:true,ignoreVary:true}).then(function(m){
    if(m)return m;
    if(req.mode==='navigate')return caches.match(new URL('./',self.registration.scope).href).then(function(x){return x||caches.match(new URL('index.html',self.registration.scope).href)});
    return null;
  });
}
function netFirst(req){
  return new Promise(function(res){
    var done=false;
    function give(r){if(!done&&r){done=true;res(r)}}
    var t=setTimeout(function(){fromCache(req).then(give)},SLOW);
    fetch(req.url,{cache:'no-cache',credentials:'same-origin'}).then(function(r){
      if(r.ok){var c=r.clone();caches.open(SHELL).then(function(ca){ca.put(req.url,c)})}
      clearTimeout(t);if(!done){done=true;res(r)}
    }).catch(function(){clearTimeout(t);fromCache(req).then(function(m){if(!done){done=true;res(m||Response.error())}})});
  });
}
function trim(ca){return ca.keys().then(function(k){if(k.length>MAXT)return Promise.all(k.slice(0,k.length-MAXT).map(function(r){return ca.delete(r)}))})}
// v4.2: file ricevuti con «Condividi» da altre app (per esempio le tracce GPX di GPSLogger)
self.addEventListener('fetch',function(e){
  var r=e.request;
  if(r.method==='POST'&&new URL(r.url).searchParams.has('share-target')){
    e.respondWith(r.formData().then(function(fd){
      var fs=fd.getAll('file').filter(function(f){return f&&f.size});
      return caches.open('atl-share').then(function(c){return Promise.all(fs.map(function(f,i){
        return c.put(new URL('shared/'+Date.now()+'-'+i,self.registration.scope).href,new Response(f,{headers:{'Content-Type':f.type||'application/octet-stream','x-name':encodeURIComponent(f.name||('file'+i+'.gpx'))}}))}))});
    }).catch(function(){}).then(function(){return Response.redirect(new URL('./?shared=1',self.registration.scope).href,303)}));
    return;
  }
  if(r.method!=='GET')return;
  var u=new URL(r.url);
  if(u.origin===self.location.origin){e.respondWith(netFirst(r));return}
  if(r.destination==='image'){
    // 1) aree scaricate di proposito (cache che esiste solo se ne hai scaricata una; qui non si scrive e non si pota mai)
    e.respondWith(caches.match(r.url,{cacheName:AREE,ignoreVary:true}).then(function(hit){
      if(hit)return hit;
      return caches.open(TILES).then(function(ca){
        return ca.match(r.url,{ignoreVary:true}).then(function(m){
          if(m)return m;
          return fetch(r.url,{mode:'cors',credentials:'omit'}).then(function(res){
            if(res.ok){ca.put(r.url,res.clone()).then(function(){if(Math.random()<0.02)trim(ca)})}
            return res;
          }).catch(function(){return fetch(r)});
        });
      });
    }));
  }
});
