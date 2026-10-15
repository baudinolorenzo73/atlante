/* Atlante Lago Piccolo - GPS (posizione dal vivo, fix mediato) e registrazione delle tracce.
   by Lollo ®2026 · i moduli si caricano nell'ordine dei numeri (vedi index.html) */
'use strict';
/* =================== GPS =================== */
var gpsWatch=null,gpsMarker=null,gpsCircle=null,gpsFollowFirst=true;
function startLive(){
  if(!navigator.geolocation){toast('GPS non disponibile su questo dispositivo');return}
  if(gpsWatch!=null)return;
  gpsFollowFirst=true;
  gpsWatch=navigator.geolocation.watchPosition(function(p){
    here={lat:p.coords.latitude,lon:p.coords.longitude,acc:p.coords.accuracy,alt:p.coords.altitude};
    var ll=[here.lat,here.lon];
    if(!gpsMarker){gpsMarker=L.circleMarker(ll,{radius:8,color:'#fff',weight:2,fillColor:'#2196f3',fillOpacity:1}).addTo(map);gpsCircle=L.circle(ll,{radius:here.acc,color:'#2196f3',weight:1,fillOpacity:.08,interactive:false}).addTo(map)}
    else{gpsMarker.setLatLng(ll);gpsCircle.setLatLng(ll).setRadius(here.acc)}
    var c=$('#chipGps');c.style.display='';c.textContent='GPS ±'+Math.round(here.acc)+' m';
    if(gpsFollowFirst){map.setView(ll,Math.max(map.getZoom(),17));gpsFollowFirst=false}
    if(REC.on)recPoint(p);
    nearCheck();if(!NEAR.wake)nearWake();
  },function(e){if(e.code===1){toast('GPS: permesso negato');var r=REC.on;REC.on=false;stopLive();REC.on=r}else if(e.code===2)toast('GPS: segnale assente, continuo a cercare…')},{enableHighAccuracy:true,maximumAge:2000});
  $('#bGps').classList.add('on');
}
function stopLive(){if(REC.on)return toast('Ferma prima la registrazione della traccia');if(gpsWatch!=null)navigator.geolocation.clearWatch(gpsWatch);gpsWatch=null;$('#bGps').classList.remove('on');$('#chipGps').style.display='none';if(gpsMarker){map.removeLayer(gpsMarker);map.removeLayer(gpsCircle);gpsMarker=gpsCircle=null}nearWake()}
// fix mediato: raccoglie letture per N secondi e fa la media pesata sulla precisione
function getFix(sec,onProgress){return new Promise(function(res,rej){
  if(!navigator.geolocation)return rej(new Error('GPS non disponibile'));
  var reads=[],t0=Date.now(),wid,done=false;
  var tick=setInterval(function(){if(reads.length&&(Date.now()-t0)/1000>=sec)finish()},400);
  function finish(){if(done)return;done=true;clearInterval(tick);navigator.geolocation.clearWatch(wid);clearTimeout(tm);if(!reads.length)return rej(new Error('nessuna posizione ricevuta'));
    var best=Math.min.apply(null,reads.map(function(r){return r.acc}));
    var use=reads.filter(function(r){return r.acc<=best*2.5});
    var sw=0,la=0,lo=0,al=0,aw=0;use.forEach(function(r){var w=1/(r.acc*r.acc);sw+=w;la+=r.lat*w;lo+=r.lon*w;if(r.alt!=null){al+=r.alt*w;aw+=w}});
    res({lat:la/sw,lon:lo/sw,acc:Math.max(1,Math.round(best*10)/10),alt:aw?Math.round(al/aw):null,n:use.length})}
  var tm=setTimeout(finish,Math.max(2,sec)*1000+15000);
  wid=navigator.geolocation.watchPosition(function(p){
    reads.push({lat:p.coords.latitude,lon:p.coords.longitude,acc:p.coords.accuracy,alt:p.coords.altitude});
    if(onProgress)onProgress(reads.length,p.coords.accuracy,(Date.now()-t0)/1000);
    if((Date.now()-t0)/1000>=sec||p.coords.accuracy<=3)finish();
  },function(e){if(reads.length)finish();else{done=true;clearInterval(tick);navigator.geolocation.clearWatch(wid);clearTimeout(tm);rej(e)}},{enableHighAccuracy:true,maximumAge:0,timeout:30000});
})}

/* =================== TRACCE =================== */
var REC={on:false,trk:null,line:null,wake:null,last:null,saveN:0};
function recStart(){
  if(!navigator.geolocation)return toast('GPS non disponibile');
  REC.trk={id:uid(),name:'Traccia '+fmtDate(new Date().toISOString()),start:Date.now(),end:null,pts:[]};
  REC.on=true;REC.last=null;REC.line=L.polyline([],{color:'#ff5252',weight:4}).addTo(gTracks);
  startLive();$('#bRec').classList.add('recon');$('#bRec').textContent='⏹';
  if(navigator.wakeLock&&navigator.wakeLock.request){navigator.wakeLock.request('screen').then(function(w){REC.wake=w}).catch(function(){})}
  updRecChip();toast('Registrazione avviata. Tieni lo schermo acceso: col telefono bloccato il browser può fermare il GPS.',5000);
}
function recPoint(p){
  var c=p.coords;if(c.accuracy>35)return;
  var pt=[+c.latitude.toFixed(7),+c.longitude.toFixed(7),c.altitude!=null?Math.round(c.altitude*10)/10:null,Date.now(),Math.round(c.accuracy)];
  if(REC.last){var d=dist(REC.last[0],REC.last[1],pt[0],pt[1]);if(d<Math.max(3,c.accuracy/2))return;var dt=(pt[3]-REC.last[3])/1000;if(dt>0&&d/dt>12)return}
  REC.trk.pts.push(pt);REC.last=pt;REC.line.addLatLng([pt[0],pt[1]]);
  if(++REC.saveN%5===0)DB.put('tracks',REC.trk);
  updRecChip();
}
function trkStats(t){var d=0,up=0,dn=0,pa=null;for(var i=1;i<t.pts.length;i++){var a=t.pts[i-1],b=t.pts[i];d+=dist(a[0],a[1],b[0],b[1]);if(a[2]!=null&&b[2]!=null){var h=b[2]-a[2];if(Math.abs(h)>=2){if(h>0)up+=h;else dn-=h}}}return {d:d,up:Math.round(up),dn:Math.round(dn),t:((t.end||Date.now())-t.start)}}
function updRecChip(){var c=$('#chipRec');if(!REC.on){c.style.display='none';return}var s=trkStats(REC.trk);c.style.display='';c.innerHTML='<span class="rec">●</span> '+fmtDist(s.d)+' · '+fmtDur(s.t)}
setInterval(function(){if(REC.on)updRecChip()},15000);
function recStop(){
  REC.on=false;REC.trk.end=Date.now();
  if(REC.wake){try{REC.wake.release()}catch(e){}REC.wake=null}
  $('#bRec').classList.remove('recon');$('#bRec').textContent='⏺';$('#chipRec').style.display='none';
  if(REC.trk.pts.length<2){toast('Traccia troppo corta: non salvata');DB.del('tracks',REC.trk.id);loadTracks();return}
  DB.put('tracks',REC.trk).then(function(){markChange();toast('Traccia salvata ('+REC.trk.pts.length+' punti)');loadTracks()});
}
function loadTracks(){return DB.all('tracks').then(function(a){TRACKS=a.sort(function(x,y){return y.start-x.start});drawTracks();if(curPage==='alt')renderAlt()})}
function drawTracks(){gTracks.clearLayers();if(REC.on&&REC.line)gTracks.addLayer(REC.line);if(!showTracks)return;TRACKS.forEach(function(t){if(REC.on&&REC.trk&&t.id===REC.trk.id)return;if(t.pts.length>1)L.polyline(t.pts.map(function(p){return [p[0],p[1]]}),{color:'#ffb74d',weight:3,opacity:.85}).bindPopup(esc(t.name)+'<br>'+fmtDist(trkStats(t).d)).addTo(gTracks)})}
