/* Atlante di campo - Aggiorna, Installa tutto, mappe senza rete.
   by Lollo ®2026 · i moduli si caricano nell'ordine dei numeri (vedi index.html) */
'use strict';
/* =================== AGGIORNA E INSTALLA TUTTO =================== */
var TILE_CACHE='atl-tiles',SHELL_CACHE='atl-shell-'+BUILD;
function isModular(){return !!document.querySelector('script[src$="version.js"]')}
var OFFZ0=12,OFFZ=16,LAKE_BB=[45.0457,7.3767,45.0677,7.4077]; // sud, ovest, nord, est
var deferredInstall=null,inst={busy:false,abort:{v:false},logs:[],progress:null,controllers:[],task:null};
function cancelInstall(){inst.abort.v=true;inst.controllers.forEach(function(c){c.abort()});ilog('… interruzione richiesta')}
function resetInstallLog(){inst.logs=[];var l=$('#instLog');if(l)l.innerHTML='';ibar(null)}
function syncInstallUI(){var busy=inst.busy;['bUpd','bInst','bMaps','bClrT','bCheckMaps','bRepairMaps'].forEach(function(id){var b=$('#'+id);if(b)b.disabled=busy});var b=$('#bCancelInst');if(b)b.hidden=!busy;var l=$('#instLog');if(l){l.innerHTML='';inst.logs.forEach(function(x){var d=document.createElement('div');d.className=x.cls||'';d.textContent=x.t;l.appendChild(d)})}ibar(inst.progress);$$('[data-offline],#offZoom').forEach(function(e){if(e.getAttribute('data-offline')!=='osm')e.disabled=busy});renderCoverage()}
async function runInstallTask(task,fn){if(inst.busy)return;resetInstallLog();inst.busy=true;inst.task=task;inst.abort.v=false;syncInstallUI();var box=$('#operationBox');if(box)box.scrollIntoView({block:'nearest',behavior:'smooth'});try{await fn()}catch(e){ilog(inst.abort.v?'• Operazione interrotta. I dati già salvati restano disponibili.':'✗ '+e.message,'ko')}finally{inst.busy=false;inst.task=null;inst.controllers=[];syncInstallUI();renderAppSt()}}
async function timedFetch(url,opt){var ctl=new AbortController();inst.controllers.push(ctl);var t=setTimeout(function(){ctl.abort()},15000);try{if(inst.abort.v)throw new Error('Operazione interrotta');var r=await fetch(url,Object.assign({},opt,{signal:ctl.signal}));await r.clone().arrayBuffer();return r}finally{clearTimeout(t);inst.controllers=inst.controllers.filter(function(c){return c!==ctl})}}
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
    var m={name:'Atlante di campo',short_name:'Atlante',description:'Atlante di campo: punti con foto, audio e GPS, percorsi, mappe e capitoli dei luoghi - '+BRAND,start_url:base,scope:new URL('./',base).href,display:'standalone',orientation:'any',background_color:'#f3f5f1',theme_color:'#2f6b3f',lang:'it',icons:[{src:mkIcon(192),sizes:'192x192',type:'image/png',purpose:'any'},{src:mkIcon(512),sizes:'512x512',type:'image/png',purpose:'any'}]};
    var l=document.createElement('link');l.rel='manifest';l.href=URL.createObjectURL(new Blob([JSON.stringify(m)],{type:'application/manifest+json'}));document.head.appendChild(l);
  }catch(e){}
}
function ilog(t,cls){inst.logs.push({t:t,cls:cls});var l=$('#instLog');if(!l)return;var d=document.createElement('div');d.className=cls||'';d.textContent=t;l.appendChild(d)}
function ibar(p){inst.progress=p;var b=$('#instBar');if(!b)return;b.style.display=p==null?'none':'block';if(p!=null)b.firstChild.style.width=Math.round(Math.max(0,Math.min(1,p))*100)+'%'}
async function renderAppSt(){
  var e=$('#appSt');if(!e)return;
  try{
    var reg=(navigator.serviceWorker&&isWeb())?await navigator.serviceWorker.getRegistration(new URL('sw.js',location.href).href):null;
    var keys=window.caches?await caches.open(TILE_CACHE).then(function(c){return c.keys()}):[];
    var ca=window.caches?await caches.open(SHELL_CACHE):null,files=shellFiles(),missing=0;
    if(ca){for(var i=0;i<files.length;i++){if(!(await ca.match(files[i])))missing++}}else missing=files.length;
    e.innerHTML='Versione <b>'+VERSION+'</b> · build '+BUILD+'<br>'+(isStandalone()?'✓ aperta come app installata':'Aperta nel browser')+'<br>'+(reg&&reg.active&&missing===0?'✓ File app pronti senza rete':reg?'• Salvataggio app da completare: usa «Prepara app offline»':'• Uso senza rete da attivare')+'<br>'+keys.length+' tessere in memoria (tutti i luoghi; copertura non garantita).';
  }catch(e2){e.textContent='Versione '+VERSION+' · stato offline non verificabile: '+e2.message}
}
/* tessere da scaricare: si usano gli stessi indirizzi che userebbe Leaflet, così la cache le ritrova */
function tileRange(z,bb){bb=bb||LAKE_BB;var n=Math.pow(2,z);function X(lon){return Math.floor((lon+180)/360*n)}function Y(lat){var r=lat*Math.PI/180;return Math.floor((1-Math.log(Math.tan(r)+1/Math.cos(r))/Math.PI)/2*n)}return {x0:X(bb[1]),x1:X(bb[3]),y0:Y(bb[2]),y1:Y(bb[0])}}
function offlineLayers(ids,plan){
  var maxz=plan?plan.zoom:OFFZ,bb=plan?plan.bb:LAKE_BB,count=0;
  var all=BASES.concat(OVERS.filter(function(o){return !o.custom})).filter(function(b){return b.id!=='osm'&&(!ids||ids.indexOf(b.id)>=0)}).map(function(b){return {id:b.id,n:b.n,tl:b.mk()}});
  return all.map(function(a){var tl=a.tl;tl._map=map;tl._crs=map.options.crs;
    if(tl.wmsParams)tl.wmsParams[parseFloat(tl.wmsParams.version)>=1.3?'crs':'srs']=tl._crs.code;
    var nz=Math.min(maxz,tl.options.maxNativeZoom||maxz),urls=[],levels=[];
    for(var z=OFFZ0;z<=nz;z++){tl._tileZoom=z;tl._globalTileRange={max:{y:Math.pow(2,z)-1}};var r=tileRange(z,bb),zu=[];count+=(r.x1-r.x0+1)*(r.y1-r.y0+1);if(count>6000)throw new Error('Area troppo grande: riduci dettaglio o livelli (massimo 6000 tessere).');for(var x=r.x0;x<=r.x1;x++)for(var y=r.y0;y<=r.y1;y++){var c=L.point(x,y);c.z=z;var u=tl.getTileUrl(c);urls.push(u);zu.push(u)}levels.push({z:z,urls:zu})}
    return {id:a.id,n:a.n,urls:urls,levels:levels}});
}
async function fetchTile(u){var r=await timedFetch(u,{mode:'cors',credentials:'omit'});if(!r.ok)throw new Error('HTTP '+r.status);if(!/^image\//i.test(r.headers.get('content-type')||''))throw new Error('Risposta non cartografica');return r}
async function tilePool(urls,from,ca,st,total){
  var idx=from;
  async function worker(){while(idx<urls.length&&!inst.abort.v){var u=urls[idx++];
    try{if(await ca.match(u,{ignoreVary:true}))st.skip++;else{await ca.put(u,await fetchTile(u));st.ok++}}catch(e){if(inst.abort.v)break;st.err++}
    st.done++;ibar(st.done/total)}}
  await Promise.all([1,2,3].map(worker));
}
async function downloadMaps(){
  if(!isWeb())throw new Error('Apri l’app tramite HTTPS o localhost per usare le mappe salvate.');
  if(!window.caches)throw new Error('Questo browser non può salvare le mappe');
  var ids=$$('[data-offline]:checked').map(function(e){return e.getAttribute('data-offline')});
  if(!ids.length){ilog('• Seleziona almeno un livello in «Mappe senza rete».');return}
  var z=$('#offZoom');OFFZ=z?+z.value:16;
  var plan=selectedOfflinePlan();delete MAP_REPORTS[plan.key];renderCoverage();
  var layers=offlineLayers(ids,plan),total=layers.reduce(function(n,l){return n+l.urls.length},0);
  if(total>6000){ilog('• Area troppo grande: riduci il dettaglio o il numero di livelli (massimo 6000 tessere).','ko');return}
  if(!confirm('Scaricare «'+PL.name()+'»: '+layers.length+' livelli, '+total+' tessere, zoom 12–'+OFFZ+'? La dimensione dipende dalle immagini.'))return;
  var ca=await caches.open(TILE_CACHE),st={done:0,ok:0,skip:0,err:0},bad=[];
  for(var i=0;i<layers.length&&!inst.abort.v;i++){
    var ly=layers[i],before={ok:st.ok,skip:st.skip,err:st.err};ilog('… '+ly.n);
    // Una sola tessera di prova; se il servizio fallisce non si insiste su tutta l’area.
    try{if(await ca.match(ly.urls[0],{ignoreVary:true}))st.skip++;else{await ca.put(ly.urls[0],await fetchTile(ly.urls[0]));st.ok++}st.done++}
    catch(e){if(inst.abort.v)break;for(var j=0;j<ly.urls.length;j++){if(await ca.match(ly.urls[j],{ignoreVary:true}))st.skip++;else st.err++;st.done++}bad.push(ly.n);ilog('• '+ly.n+': non scaricato ('+e.message+'). Riprova con la rete; il servizio può limitare l’accesso.','ko');ibar(st.done/total);continue}
    await tilePool(ly.urls,1,ca,st,total);
    ilog(ly.n+': '+(st.ok-before.ok)+' nuove, '+(st.skip-before.skip)+' presenti, '+(st.err-before.err)+' mancanti.');
  }
  ibar(st.done/total);
  ilog((inst.abort.v?'• Interrotto':st.err?'• Download parziale':'✓ Download completato')+': '+st.ok+' nuove, '+st.skip+' già presenti, '+st.err+' mancanti'+(inst.abort.v?', '+(total-st.done)+' non elaborate':'')+'.',st.err||inst.abort.v?'ko':'ok');
  ilog('Le tessere già presenti riguardano i livelli e gli zoom selezionati. Usa «Verifica copertura» per controllarle. Prima dell’uscita prova la mappa in modalità aereo.');
}
async function registerSW(){
  if(!('serviceWorker' in navigator)||!window.isSecureContext)throw new Error('Per l’uso offline serve HTTPS o localhost e un browser con service worker.');
  try{var reg=await navigator.serviceWorker.register('sw.js');
    await new Promise(function(resolve,reject){var start=Date.now();function check(){if(inst.abort.v)return reject(new Error('Operazione interrotta'));if(reg.active)return resolve();if(Date.now()-start>15000)return reject(new Error('Attivazione non riuscita: riprova dopo aver ricaricato la pagina'));setTimeout(check,100)}check()});
    ilog('✓ Servizio offline attivo','ok');return true;
  }catch(e){throw new Error('Uso offline non attivato: '+e.message+' Verifica che sw.js sia pubblicato accanto a index.html.')}
}
function shellFiles(assets){return ((assets||(typeof ASSETS!=='undefined'&&isModular()?ASSETS:[pageUrl()])).filter(function(a){return a!=='./'})).map(function(a){return new URL(a,location.href).href})}
async function cacheShell(assets,name){
  if(!window.caches)throw new Error('Salvataggio offline non disponibile');
  var files=shellFiles(assets),ca=await caches.open(name||SHELL_CACHE),bad=[],idx=0,done=0;
  async function worker(){while(idx<files.length&&!inst.abort.v){var u=files[idx++];try{var r=await timedFetch(u,{cache:'reload'});if(!r.ok)throw new Error('HTTP '+r.status);var ct=r.headers.get('content-type')||'';if(/\.(js|css|png|webmanifest)$/.test(new URL(u).pathname)&&/text\/html/i.test(ct))throw new Error('Il server ha restituito una pagina HTML');await ca.put(u,r)}catch(e){bad.push(new URL(u).pathname.split('/').pop()+': '+e.message)}done++;ibar(done/files.length)}}
  await Promise.all([1,2,3].map(worker));
  if(inst.abort.v)throw new Error('Operazione interrotta');
  if(bad.length){bad.forEach(function(t){ilog('• '+t,'ko')});throw new Error('App offline incompleta: '+bad.length+' file mancanti su '+files.length+'. Riprova; controlla che lo ZIP sia estratto e tutti i file siano accessibili. Le mappe salvate sono separate.')}
  ilog('✓ App salvata: '+files.length+' file.','ok');return true;
}
function installAll(){return runInstallTask('app',async function(){
  if(!isWeb())throw new Error('Apri l’app tramite HTTPS o localhost per prepararla senza rete.');
  await cacheShell();if(inst.abort.v)return;await registerSW();
  if(navigator.storage&&navigator.storage.persist){var ok=await navigator.storage.persist();ilog(ok?'✓ Memoria persistente concessa. Conserva comunque un backup.':'• Memoria persistente non concessa: conserva backup regolari.')}
  ilog('✓ Preparazione offline completata. Per le carte usa «Scarica mappe selezionate».','ok');
})}
async function installIcon(){
  if(isStandalone())return toast('App già aperta dalla Home');
  if(deferredInstall){var d=deferredInstall;deferredInstall=null;await d.prompt();var c=await d.userChoice;toast(c.outcome==='accepted'?'Installazione richiesta al browser':'Installazione annullata')}
  else toast('Menu del browser → Installa app oppure Aggiungi a schermata Home. Su iPhone: Condividi → Aggiungi a Home.',8000);
}
function doUpdate(){return runInstallTask('update',async function(){
  if(!isWeb())throw new Error('Per aggiornare questa copia locale sostituisci i file con lo ZIP nuovo.');
  if(REC.on)throw new Error('Ferma la registrazione prima di aggiornare.');
  if($('#modal').classList.contains('on'))throw new Error('Salva e chiudi la scheda prima di aggiornare.');
  ilog('Controllo la versione disponibile a questo indirizzo…');
  var url=isModular()?new URL('js/version.js',location.href).href:pageUrl().split('?')[0];
  var r=await timedFetch(url,{cache:'no-store'});if(!r.ok)throw new Error('HTTP '+r.status);var t=await r.text();
  var m=/var BUILD='([^']+)'/.exec(t),v=/var VERSION='([^']+)'/.exec(t);
  if(!m)throw new Error('Versione non riconosciuta');
  if(m[1]===BUILD){ilog('✓ Questa copia è già alla versione '+VERSION+'. Il controllo riguarda solo questo indirizzo.','ok');return}
  var am=/var ASSETS=(\[[\s\S]*?\]);/.exec(t);if(!am)throw new Error('Elenco dei file non riconosciuto');
  var assets=JSON.parse(am[1].replace(/'/g,'"'));
  ilog('Scarico la versione '+(v?v[1]:m[1])+' prima di riavviare…');
  await cacheShell(assets,'atl-shell-'+m[1]);
  if(navigator.serviceWorker){var reg=await navigator.serviceWorker.getRegistration(new URL('sw.js',location.href).href);if(reg)await reg.update()}
  ilog('✓ File scaricati. Riavvio…','ok');setTimeout(function(){location.reload()},1200);
})}
function clearTiles(){
  if(inst.busy||!window.caches)return;
  if(!confirm('Cancellare le mappe salvate per l\'uso senza rete? I tuoi punti non vengono toccati.'))return;
  caches.delete(TILE_CACHE).then(function(){MAP_REPORTS={};renderCoverage();toast('Mappe salvate cancellate');renderAppSt()});
}

/* Copertura delle mappe: la verifica legge solo la memoria locale. */
var OFF_PREF={},MAP_REPORTS={};
function offlinePrefs(){var id=PL.cur;if(!OFF_PREF[id])OFF_PREF[id]={ids:BASES.concat(OVERS).filter(function(o){return o.id!=='osm'&&(o.id===baseId||overOn[o.id])}).map(function(o){return o.id}),zoom:16};return OFF_PREF[id]}
function offlineSignature(p){return JSON.stringify([p.place,p.bb,p.ids,p.zoom])}
function selectedOfflinePlan(){
  var ids=$$('[data-offline]:checked').filter(function(e){return e.getAttribute('data-offline')!=='osm'}).map(function(e){return e.getAttribute('data-offline')});
  var zoom=+($('#offZoom')||{}).value;
  if(!ids.length)throw new Error('Seleziona almeno una carta in «Mappe senza rete».');
  if([15,16,17].indexOf(zoom)<0)throw new Error('Scegli il dettaglio massimo.');
  var p={place:PL.cur,name:PL.name(),bb:LAKE_BB.slice(),ids:ids,zoom:zoom};p.key=offlineSignature(p);return p;
}
function usableTile(r){return !!(r&&r.ok&&/^image\//i.test(r.headers.get('content-type')||''))}
function renderCoverage(){
  var box=$('#offCoverage'),btn=$('#bRepairMaps');if(!box)return;
  var p;try{p=selectedOfflinePlan()}catch(e){box.textContent=e.message;if(btn)btn.disabled=true;return}
  var report=MAP_REPORTS[p.key];
  if(btn)btn.disabled=inst.busy||!report||report.missing===0;
  if(!report){box.innerHTML='<p class="mut">Copertura non verificata per questa selezione. «Verifica copertura» funziona anche senza rete e non scarica dati.</p>';return}
  var ratio=report.total?Math.floor(report.present/report.total*100):0;
  var h='<p><b>'+esc(report.name)+'</b> · '+ratio+'% delle tessere presenti<br>'+report.present+' su '+report.total+' · <b>'+report.missing+' mancanti o non valide</b><br><small>Verifica: '+esc(new Date(report.at).toLocaleString('it-IT'))+'. Zoom 12–'+report.zoom+'.</small></p>';
  h+='<p class="mut">Area: '+report.bb.map(function(n){return n.toFixed(4)}).join(', ')+' (sud, ovest, nord, est). La presenza dei file non garantisce contenuto o aggiornamento delle carte: prova la mappa prima dell’uscita.</p>';
  report.layers.forEach(function(l){h+='<details class="coverage-layer"><summary>'+esc(l.n)+' · '+l.present+'/'+l.total+' presenti'+(l.missing?' · '+l.missing+' mancanti':' · completa')+'</summary><div class="coverage-table"><table><caption>'+esc(l.n)+' · copertura per zoom</caption><thead><tr><th>Zoom</th><th>Presenti</th><th>Attese</th><th>Mancanti</th></tr></thead><tbody>'+l.levels.map(function(z){return '<tr><td>'+z.z+'</td><td>'+z.present+'</td><td>'+z.total+'</td><td>'+z.missing.length+'</td></tr>'}).join('')+'</tbody></table></div></details>'});
  box.innerHTML=h;
}
function bindOfflineControls(){
  var pref=offlinePrefs();$$('[data-offline]').forEach(function(e){e.checked=!e.disabled&&pref.ids.indexOf(e.getAttribute('data-offline'))>=0;e.onchange=function(){pref.ids=$$('[data-offline]:checked').map(function(c){return c.getAttribute('data-offline')});renderCoverage()}});
  $('#offZoom').value=String(pref.zoom);$('#offZoom').onchange=function(){pref.zoom=+this.value;renderCoverage()};
  $('#bCheckMaps').onclick=function(){return runInstallTask('checkMaps',async function(){await verifyOfflineMaps(selectedOfflinePlan())})};
  $('#bRepairMaps').onclick=function(){return runInstallTask('repairMaps',repairOfflineMaps)};
  renderCoverage();
}
async function scanOfflineCoverage(plan){
  if(!isWeb()||!window.caches)throw new Error('Per controllare le mappe apri l’app da HTTPS o localhost con memoria offline disponibile.');
  var layers=offlineLayers(plan.ids,plan),total=layers.reduce(function(n,l){return n+l.urls.length},0),done=0;
  var ca=await caches.open(TILE_CACHE),report={key:plan.key,place:plan.place,name:plan.name,bb:plan.bb.slice(),zoom:plan.zoom,total:total,present:0,missing:0,layers:[],at:Date.now()};
  for(var i=0;i<layers.length;i++){
    var src=layers[i],ly={id:src.id,n:src.n,total:src.urls.length,present:0,missing:0,levels:[]};
    for(var j=0;j<src.levels.length;j++){
      var lvl=src.levels[j],row={z:lvl.z,total:lvl.urls.length,present:0,missing:[]};
      for(var k=0;k<lvl.urls.length;k+=20){
        if(inst.abort.v)throw new Error('Verifica interrotta');
        var batch=lvl.urls.slice(k,k+20);
        var responses=await Promise.all(batch.map(function(u){return ca.match(u,{ignoreVary:true})}));
        if(inst.abort.v)throw new Error('Verifica interrotta');
        responses.forEach(function(r,n){if(usableTile(r))row.present++;else row.missing.push(batch[n])});done+=batch.length;ibar(done/total);
        // Cede il controllo anche durante una verifica completamente locale.
        await new Promise(function(resolve){setTimeout(resolve,0)});
      }
      ly.present+=row.present;ly.missing+=row.missing.length;ly.levels.push(row);
    }
    report.present+=ly.present;report.missing+=ly.missing;report.layers.push(ly);
  }
  if(inst.abort.v)throw new Error('Verifica interrotta');
  return report;
}
async function verifyOfflineMaps(plan){
  delete MAP_REPORTS[plan.key];renderCoverage();ilog('Verifico le mappe di «'+plan.name+'» nella memoria locale…');
  var report=await scanOfflineCoverage(plan);MAP_REPORTS[plan.key]=report;renderCoverage();
  ilog((report.missing?'• Copertura parziale':'✓ Tutte le tessere selezionate sono presenti')+': '+report.present+'/'+report.total+' presenti, '+report.missing+' mancanti o non valide.',report.missing?'':'ok');
  return report;
}
async function repairOfflineMaps(){
  var plan=selectedOfflinePlan();if(!MAP_REPORTS[plan.key])throw new Error('Prima verifica la copertura della selezione attuale.');
  if(navigator.onLine===false)throw new Error('Per riparare le mappe serve la rete. La verifica resta disponibile offline.');
  // Ricontrolla la memoria prima del download: un’altra scheda potrebbe averla modificata.
  var report=await verifyOfflineMaps(plan);
  if(!report.missing){ilog('✓ Non ci sono tessere da riparare.','ok');return}
  if(!confirm('Scaricare solo le '+report.missing+' tessere mancanti o non valide di «'+plan.name+'»? Quelle già valide restano in memoria.')){ilog('• Riparazione annullata.');return}
  delete MAP_REPORTS[plan.key];renderCoverage();
  var ca=await caches.open(TILE_CACHE),downloaded=0,processed=0;
  for(var i=0;i<report.layers.length&&!inst.abort.v;i++){
    var ly=report.layers[i],urls=ly.levels.reduce(function(out,l){return out.concat(l.missing)},[]);
    if(!urls.length)continue;
    ilog('Riparo '+ly.n+' · '+urls.length+' tessere…');
    var idx=0,blocked=false,errors=0,newTiles=0,lastError='';
    // Prova il servizio prima di inviare altre richieste sullo stesso livello.
    async function one(u){
      if(usableTile(await ca.match(u,{ignoreVary:true})))return;
      if(inst.abort.v)throw new Error('Interrotto');
      var r=await fetchTile(u);if(inst.abort.v)throw new Error('Interrotto');await ca.put(u,r);newTiles++;
    }
    try{await one(urls[0]);idx=1;processed++;ibar(processed/report.missing)}
    catch(e){if(inst.abort.v)break;blocked=true;lastError=e.message;processed+=urls.length;ibar(processed/report.missing)}
    if(!blocked){
      async function worker(){while(idx<urls.length&&!inst.abort.v){var u=urls[idx++];try{await one(u)}catch(e){if(inst.abort.v)break;errors++;lastError=e.message}processed++;ibar(processed/report.missing)}}
      await Promise.all([1,2,3].map(worker));
    }
    downloaded+=newTiles;
    ilog(ly.n+': '+newTiles+' scaricate'+(blocked?' · servizio non raggiungibile o accesso negato ('+lastError+'); riprova più tardi.':errors?' · '+errors+' errori ('+lastError+').':'.'),blocked||errors?'ko':'');
  }
  if(inst.abort.v){ilog('• Riparazione interrotta: '+downloaded+' tessere aggiunte. Ripeti la verifica per conoscere la copertura aggiornata.');return}
  var after=await verifyOfflineMaps(plan);
  ilog((after.missing?'• Riparazione parziale':'✓ Riparazione completata')+': '+downloaded+' tessere aggiunte; '+after.missing+' ancora mancanti o non valide.',after.missing?'ko':'ok');
}
