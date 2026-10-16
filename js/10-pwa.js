/* Atlante Lago Piccolo - Aggiorna, Installa tutto, mappe senza rete.
   by Lollo ®2026 · i moduli si caricano nell'ordine dei numeri (vedi index.html) */
'use strict';
/* =================== AGGIORNA E INSTALLA TUTTO =================== */
var TILE_CACHE='atl-tiles',SHELL_CACHE='atl-shell-'+BUILD;
function isModular(){return !!document.querySelector('script[src$="version.js"]')}
var OFFZ0=12,OFFZ=17,LAKE_BB=[45.0457,7.3767,45.0677,7.4077]; // sud, ovest, nord, est
var deferredInstall=null,inst={busy:false,abort:{v:false}};
window.addEventListener('beforeinstallprompt',function(e){e.preventDefault();deferredInstall=e});
window.addEventListener('appinstalled',function(){deferredInstall=null;toast('App installata sulla schermata Home');renderAppSt()});
function isStandalone(){return (window.matchMedia&&matchMedia('(display-mode: standalone)').matches)||navigator.standalone===true}
function isWeb(){return /^https?:$/.test(location.protocol)}
function pageUrl(){return location.href.split('#')[0]}
function mkIcon(sz){var c=document.createElement('canvas');c.width=c.height=sz;var g=c.getContext('2d');g.fillStyle='#161a1f';g.fillRect(0,0,sz,sz);
  g.fillStyle='#81c784';g.beginPath();g.moveTo(sz*.1,sz*.72);g.lineTo(sz*.36,sz*.22);g.lineTo(sz*.54,sz*.52);g.lineTo(sz*.68,sz*.34);g.lineTo(sz*.9,sz*.72);g.closePath();g.fill();
  g.fillStyle='#4fc3f7';g.beginPath();g.ellipse(sz*.5,sz*.72,sz*.34,sz*.14,0,0,Math.PI*2);g.fill();return c.toDataURL('image/png')}
function injectManifest(){
  if(!isWeb()||document.querySelector('link[rel=manifest]'))return;
  try{
    var base=pageUrl().split('?')[0];
    var m={name:'Atlante Lago Piccolo',short_name:'Lago Piccolo',description:'Atlante di campo del Lago Piccolo di Avigliana - '+BRAND,start_url:base,scope:new URL('./',base).href,display:'standalone',orientation:'any',background_color:'#161a1f',theme_color:'#161a1f',lang:'it',icons:[{src:mkIcon(192),sizes:'192x192',type:'image/png',purpose:'any'},{src:mkIcon(512),sizes:'512x512',type:'image/png',purpose:'any'}]};
    var l=document.createElement('link');l.rel='manifest';l.href=URL.createObjectURL(new Blob([JSON.stringify(m)],{type:'application/manifest+json'}));document.head.appendChild(l);
  }catch(e){}
}
function ilog(t,cls){var l=$('#instLog');if(!l)return;var d=document.createElement('div');if(cls)d.className=cls;d.textContent=t;l.appendChild(d)}
function ibar(p){var b=$('#instBar');if(!b)return;b.style.display=p==null?'none':'block';if(p!=null)b.firstChild.style.width=Math.round(Math.min(1,p)*100)+'%'}
function renderAppSt(){
  var e=$('#appSt');if(!e)return;
  Promise.all([(navigator.serviceWorker&&isWeb())?navigator.serviceWorker.getRegistration():null,window.caches?caches.open(TILE_CACHE).then(function(c){return c.keys()}).then(function(k){return k.length}):0]).then(function(r){
    e.innerHTML='Versione <b>'+VERSION+'</b> · build '+BUILD+'<br>'+(isStandalone()?'✓ aperta come app installata':'aperta nel browser')+'<br>'+(r[0]?'✓ uso senza rete attivo':'uso senza rete non attivo')+' · '+r[1]+' tessere di mappa salvate'
  }).catch(function(){e.textContent='Versione '+VERSION+' · build '+BUILD});
}
/* tessere da scaricare: si usano gli stessi indirizzi che userebbe Leaflet, così la cache le ritrova */
function tileRange(z){var n=Math.pow(2,z);function X(lon){return Math.floor((lon+180)/360*n)}function Y(lat){var r=lat*Math.PI/180;return Math.floor((1-Math.log(Math.tan(r)+1/Math.cos(r))/Math.PI)/2*n)}return {x0:X(LAKE_BB[1]),x1:X(LAKE_BB[3]),y0:Y(LAKE_BB[2]),y1:Y(LAKE_BB[0])}}
function offlineLayers(){
  var all=BASES.map(function(b){return {n:b.n,tl:b.mk()}}).concat(OVERS.filter(function(o){return !o.custom}).map(function(o){return {n:o.n,tl:o.mk()}}));
  return all.map(function(a){var tl=a.tl;tl._map=map;tl._crs=map.options.crs;
    if(tl.wmsParams)tl.wmsParams[parseFloat(tl.wmsParams.version)>=1.3?'crs':'srs']=tl._crs.code;
    var nz=Math.min(OFFZ,tl.options.maxNativeZoom||OFFZ),urls=[];
    for(var z=OFFZ0;z<=nz;z++){tl._tileZoom=z;tl._globalTileRange={max:{y:Math.pow(2,z)-1}};var r=tileRange(z);for(var x=r.x0;x<=r.x1;x++)for(var y=r.y0;y<=r.y1;y++){var c=L.point(x,y);c.z=z;urls.push(tl.getTileUrl(c))}}
    return {n:a.n,urls:urls}});
}
function fetchTile(u){return fetch(u,{mode:'cors',credentials:'omit'}).then(function(r){if(!r.ok)throw new Error('HTTP '+r.status);return r})}
async function tilePool(urls,from,ca,st,total){
  var idx=from;
  async function worker(){while(idx<urls.length&&!inst.abort.v){var u=urls[idx++];
    try{if(await ca.match(u,{ignoreVary:true}))st.skip++;else{await ca.put(u,await fetchTile(u));st.ok++}}catch(e){st.err++}
    st.done++;if(st.done%8===0)ibar(st.done/total)}}
  await Promise.all([1,2,3,4,5,6].map(worker));
}
async function downloadMaps(){
  if(!window.caches){ilog('✗ Questo browser non può salvare le mappe','ko');return}
  var layers=offlineLayers(),total=0;layers.forEach(function(l){total+=l.urls.length});
  if(!confirm('Scarico le mappe dell\'area di «'+PL.name()+'» (zoom 12–17) per usarle anche senza rete: '+layers.length+' livelli, circa '+total+' tessere, stimo '+Math.round(total*0.02)+'–'+Math.round(total*0.04)+' MB. Meglio con il Wi-Fi. Procedo?')){ilog('• Mappe senza rete saltate');return}
  var ca=await caches.open(TILE_CACHE),st={done:0,ok:0,skip:0,err:0},bad=[];
  for(var i=0;i<layers.length&&!inst.abort.v;i++){
    var ly=layers[i],first=ly.urls[0];
    ilog('… '+ly.n);
    try{if(!(await ca.match(first,{ignoreVary:true})))await ca.put(first,await fetchTile(first));st.done++}
    catch(e){bad.push(ly.n);st.done+=ly.urls.length;ibar(st.done/total);continue}
    await tilePool(ly.urls,1,ca,st,total);
  }
  ibar(1);
  if(inst.abort.v)ilog('• Interrotto: le tessere già scaricate restano salvate');
  if(st.ok+st.skip>0)ilog('✓ Mappe salvate: '+st.ok+' nuove, '+st.skip+' già presenti'+(st.err?', '+st.err+' non scaricate (zone senza dati o rete assente)':''),'ok');else if(!bad.length)ilog('✗ Nessuna tessera scaricata: manca la rete?','ko');
  if(bad.length)ilog('✗ Non scaricabili per l\'uso senza rete (il server non lo permette): '+bad.join(', ')+'. Restano visibili con la rete.','ko');
}
function registerSW(){
  if(!('serviceWorker' in navigator)){ilog('✗ Questo browser non supporta l\'uso senza rete','ko');return Promise.resolve(false)}
  return navigator.serviceWorker.register('sw.js').then(function(){return navigator.serviceWorker.ready}).then(function(){ilog('✓ Uso senza rete attivato','ok');return true})
    .catch(function(e){ilog('✗ Il file sw.js non è accanto alla pagina ('+e.message+'): senza di lui la pagina non si apre senza rete. Pubblica anche sw.js nella stessa cartella.','ko');return false});
}
function cacheShell(){
  if(!window.caches)return Promise.resolve();
  var list=(typeof ASSETS!=='undefined'&&isModular())?ASSETS.map(function(a){return new URL(a,location.href).href}):[pageUrl()];
  return caches.open(SHELL_CACHE).then(function(c){return Promise.all(list.map(function(u){return fetch(u,{cache:'reload'}).then(function(r){if(!r.ok)throw new Error(u.split('/').pop()+': HTTP '+r.status);return c.put(u,r)})}))}).then(function(){ilog('✓ App salvata nel telefono ('+list.length+' file)','ok')}).catch(function(e){ilog('✗ App non salvata del tutto: '+e.message,'ko')});
}
function installAll(){
  if(inst.busy){inst.abort.v=true;ilog('… annullo');return}
  $('#instLog').innerHTML='';
  if(!isWeb()){ilog('✗ La pagina è aperta come file locale. Per installare serve un indirizzo web https:// (per esempio GitHub Pages con la tua «Pubblica»), con accanto il file sw.js.','ko');return}
  inst.busy=true;inst.abort.v=false;$('#bInst').textContent='⏹ Annulla';
  var p1;
  if(isStandalone()){ilog('✓ L\'app è già installata sulla Home','ok');p1=Promise.resolve()}
  else if(deferredInstall){var d=deferredInstall;deferredInstall=null;d.prompt();p1=d.userChoice.then(function(c){ilog(c.outcome==='accepted'?'✓ Icona aggiunta alla schermata Home':'• Icona non aggiunta: puoi ripetere quando vuoi',c.outcome==='accepted'?'ok':'')})}
  else{ilog('• Il browser non propone l\'installazione da solo: dal menu ⋮ di Chrome scegli «Installa app» o «Aggiungi a schermata Home».');p1=Promise.resolve()}
  return p1.then(registerSW).then(cacheShell).then(downloadMaps).then(function(){
    if(navigator.storage&&navigator.storage.persist)return navigator.storage.persist().then(function(ok){ilog(ok?'✓ Archivio protetto: il browser non cancellerà i tuoi dati da solo':'• Archivio non protetto dal browser: fai i backup','')})
  }).catch(function(e){ilog('✗ '+e.message,'ko')}).then(function(){inst.busy=false;var b=$('#bInst');if(b)b.textContent='⬇️ Installa tutto';ilog('Fatto.');renderAppSt()});
}
function doUpdate(){
  var l=$('#instLog');if(l)l.innerHTML='';
  if(!isWeb()){ilog('✗ La pagina è aperta come file locale: per aggiornare sostituisci il file con la versione nuova.','ko');return}
  if(REC.on){ilog('• Prima ferma la registrazione della traccia, poi aggiorna.','ko');return}
  if($('#modal').classList.contains('on')){ilog('• Chiudi la scheda aperta (salva o annulla), poi aggiorna.','ko');return}
  var url=isModular()?new URL('js/version.js',location.href).href:pageUrl().split('?')[0];
  ilog('Controllo se c\'è una versione più recente…');
  return fetch(url,{cache:'no-store'}).then(function(r){if(!r.ok)throw new Error('HTTP '+r.status);return r.text()}).then(function(t){
    var m=/var BUILD='([^']+)'/.exec(t);if(!m)throw new Error('la versione online non è riconosciuta');
    var v=/var VERSION='([^']+)'/.exec(t);
    if(m[1]===BUILD){ilog('✓ Hai già l\'ultima versione ('+VERSION+', build '+BUILD+')','ok');return}
    ilog('Trovata la versione '+(v?v[1]:'nuova')+' (build '+m[1]+'). La scarico…');
    return (window.caches?caches.keys().then(function(ks){return Promise.all(ks.filter(function(k){return k.indexOf('atl-shell')===0}).map(function(k){return caches.delete(k)}))}):Promise.resolve())
      .then(function(){return navigator.serviceWorker?navigator.serviceWorker.getRegistration():null}).then(function(r){return r&&r.update()})
      .then(function(){ilog('✓ Aggiornata. Punti, foto e audio non sono toccati. Riavvio…','ok');setTimeout(function(){location.reload()},1200)});
  }).catch(function(e){ilog('✗ Non riesco a controllare: '+e.message+' (serve la rete)','ko')});
}
function clearTiles(){
  if(!window.caches)return;
  if(!confirm('Cancellare le mappe salvate per l\'uso senza rete? I tuoi punti non vengono toccati.'))return;
  caches.delete(TILE_CACHE).then(function(){toast('Mappe salvate cancellate');renderAppSt()});
}
