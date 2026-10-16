/* Atlante Lago Piccolo - Navigazione tra le schede e avvio dell'app.
   by Lollo ®2026 · i moduli si caricano nell'ordine dei numeri (vedi index.html) */
'use strict';
/* =================== NAVIGAZIONE =================== */
var curPage='map';
function go(p,silent){curPage=p;$$('nav#nav button').forEach(function(b){b.classList.toggle('on',b.getAttribute('data-p')===p)});$$('.page').forEach(function(s){s.classList.remove('on')});
  if(p!=='map'){$('#pg-'+p).classList.add('on');if(p==='cat')renderCat();if(p==='exp')renderExp();if(p==='dos')renderDossier();if(p==='alt')renderAlt()}
  else setTimeout(function(){map.invalidateSize()},50)}
$$('nav#nav button').forEach(function(b){b.onclick=function(){if(picking)pickEnd(false);go(b.getAttribute('data-p'))}});
$('#bLayers').onclick=openLayers;
$('#bLeg').onclick=openLegend;
$('#bNear').onclick=openNear;
$('#bHome').onclick=function(){map.setView(HOME,16)};
$('#bGps').onclick=function(){if(gpsWatch!=null){if(here&&map.getCenter().distanceTo([here.lat,here.lon])>30){map.setView([here.lat,here.lon]);return}stopLive()}else startLive()};
$('#bRec').onclick=function(){if(REC.on){if(confirm('Fermare e salvare la traccia?'))recStop()}else recStart()};
$('#catFilter').onclick=function(e){var c=e.target.closest('.cat');if(!c)return;var id=c.getAttribute('data-c');filterCats[id]=!filterCats[id];renderCat();drawPoints()};
$('#q').oninput=debounce(function(){query=$('#q').value.trim();renderCat();drawPoints()},250);
$('#sort').onchange=function(){sortBy=this.value;if(sortBy==='near'&&!here)toast('Attiva il GPS (⌖ sulla mappa) per ordinare per distanza');renderCat()};
$('#catList').onclick=function(e){var it=e.target.closest('.item');if(it)openDetail(it.getAttribute('data-id'))};
document.addEventListener('visibilitychange',function(){if(document.visibilityState==='visible'&&REC.on&&navigator.wakeLock&&!REC.wake){navigator.wakeLock.request('screen').then(function(w){REC.wake=w}).catch(function(){})}});
window.addEventListener('beforeunload',function(e){if(REC.on){DB.put('tracks',REC.trk);e.preventDefault();e.returnValue=''}});

/* =================== AVVIO =================== */
injectManifest();
if(isWeb()&&isModular()&&'serviceWorker' in navigator)navigator.serviceWorker.register('sw.js').catch(function(){});
DB.open().then(function(ok){
  if(!ok)toast('Attenzione: questo browser non permette di salvare i dati (vedi Altro → Memoria)',6000);
  return Promise.all([DB.get('kv','settings'),DB.get('kv','mapstate'),DB.get('kv','checklist'),DB.get('kv','zonepack'),DB.get('kv','customlayers'),DB.get('kv','places')]);
}).then(function(r){
  if(r[0]&&r[0].v)Object.assign(SET,r[0].v);
  var ms=r[1]&&r[1].v;if(ms){baseId=ms.base||baseId;overOn=ms.over||{}}
  if(r[2]&&r[2].v)CHECK=r[2].v;
  PL.load(r[5]);if(PL.isLake()&&r[3]&&r[3].v)NEAR.pack=r[3].v;PL.apply({view:!PL.isLake()});
  if(r[4]&&r[4].v)FON.cl=r[4].v;FON.regLayers();FON.load();
  updNearBtn();
  setBase(baseId);OVERS.forEach(function(o){if(overOn[o.id])setOver(o,true)});
  if(navigator.storage&&navigator.storage.persist)navigator.storage.persist().catch(function(){});
  updBackupDot();
  return Promise.all([loadPoints(),loadTracks()]);
}).then(function(){
  // traccia rimasta aperta (pagina chiusa durante la registrazione)
  return checkOpenTracks();
}).then(function(){
  if(!/[?&]noseed/.test(location.search))return seedResearch(false).then(function(n){if(n)toast('📚 Aggiunte al Catalogo '+n+' schede dalla ricerca (tag «ricerca»)',5000)});
}).catch(function(e){console.error(e);toast('Errore di avvio: '+e.message,6000)});
window._atlTest={PL:PL,openSearch:openSearch,searchLocal:searchLocal,parseCoords:parseCoords,dayText:dayText,totText:totText,dayData:dayData,totData:totData,FON:FON,TM:TM,HUB:HUB,HUBR:HUBR,openHub:openHub,hubGo:hubGo,wmsCaps:wmsCaps,studiGo:studiGo,fotoGo:fotoGo,cantiGo:cantiGo,libText:libText,diarioRows:diarioRows,FON:FON,TM:TM,HUB:HUB,HUBR:HUBR,openHub:openHub,hubGo:hubGo,wmsCaps:wmsCaps,studiGo:studiGo,fotoGo:fotoGo,cantiGo:cantiGo,libText:libText,diarioRows:diarioRows,TSEL:TSEL,joinTracks:joinTracks,trkStats:trkStats,flashPoint:flashPoint,HL:HL,PMK:function(){return PMK},VW:VW,view:view,vGo:vGo,askRec:askRec,recSplit:recSplit,checkOpenTracks:checkOpenTracks,ORI:ORI,setOriMode:setOriMode,updArrow:updArrow,spCands:spCands,ARW:ARW,quickCapture:quickCapture,QC:QC,recBreak:recBreak,pocketOn:pocketOn,gpxTracks:gpxTracks,importFile:importFile,seedResearch:seedResearch,ricStats:ricStats,fixIndicative:fixIndicative,NEAR:NEAR,NS:NS,nearCheck:nearCheck,nearCands:nearCands,nearSet:nearSet,openNear:openNear,downloadPack:downloadPack,here:function(){return here},map:map,offlineLayers:offlineLayers,doUpdate:doUpdate,openLegend:openLegend,BUILD:function(){return BUILD},DB:DB,POINTS:function(){return POINTS},TRACKS:function(){return TRACKS},exportZip:exportZip,zipBlob:zipBlob,unzip:unzip,toGPX:toGPX,toKML:toKML,toCSV:toCSV,toGeoJSON:toGeoJSON,reportHTML:reportHTML,importData:importData,exifGPS:exifGPS,loadPoints:loadPoints,loadTracks:loadTracks,openForm:openForm,newDraft:newDraft,saveDraft:saveDraft,mediaName:mediaName,draft:function(){return draft},addPhotos:addPhotos,recStart:recStart,recStop:recStop,REC:REC};
