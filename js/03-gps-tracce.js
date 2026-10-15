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
    REC.lastFix=Date.now();if(REC.on)recPoint(p);
    oriOnFix(p);updArrow();
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
var REC={on:false,trk:null,line:null,wake:null,last:null,saveN:0,lastFix:0,hiddenAt:0,warned:false};
/* suoni: sequenza di toni [frequenza Hz, durata s] */
function tones(seq,vib){try{var ac=NEAR.ac||(NEAR.ac=new (window.AudioContext||window.webkitAudioContext)());if(ac.state==='suspended')ac.resume();var t=ac.currentTime+0.02;
  seq.forEach(function(s){var o=ac.createOscillator(),g=ac.createGain();o.type='sine';o.frequency.value=s[0];g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(0.35,t+0.02);g.gain.exponentialRampToValueAtTime(0.0001,t+s[1]);o.connect(g);g.connect(ac.destination);o.start(t);o.stop(t+s[1]+0.02);t+=s[1]+0.06})}catch(e){}
  if(vib&&navigator.vibrate&&(!navigator.userActivation||navigator.userActivation.hasBeenActive))try{navigator.vibrate(vib)}catch(e){}}
function sndRecStart(){tones([[660,.12],[990,.16]],[80])}
function sndRecStop(){tones([[988,.18],[784,.18],[523,.38]],[250,120,250,120,500])}
function sndWarn(){tones([[440,.25],[440,.25],[440,.25]],[400,200,400])}
function recBreak(why){if(!REC.on||!REC.trk.pts.length)return;REC.trk.brk=REC.trk.brk||[];var n=REC.trk.pts.length;if(REC.trk.brk[REC.trk.brk.length-1]!==n)REC.trk.brk.push(n);REC.last=null;DB.put('tracks',REC.trk)}
/* modalità tasca: schermo nero, tocchi bloccati, sblocco tenendo premuto */
function pocketOn(){if(!REC.on)return;var p=$('#pocket');p.style.display='flex';updPocket();if(document.documentElement.requestFullscreen)document.documentElement.requestFullscreen().catch(function(){})}
function pocketOff(){$('#pocket').style.display='none';if(document.fullscreenElement&&document.exitFullscreen)document.exitFullscreen().catch(function(){})}
function updPocket(){var e=$('#pkS');if(!e||!REC.on)return;var s=trkStats(REC.trk);e.textContent=fmtDist(s.d)+' · '+fmtDur(s.t)}
(function(){var p=$('#pocket'),t=null,t0=0,iv=null;
  function down(e){e.preventDefault();t0=Date.now();clearInterval(iv);iv=setInterval(function(){var k=Math.min(1,(Date.now()-t0)/2000);$('#pkBar').style.width=(k*100)+'%';if(k>=1){clearInterval(iv);$('#pkBar').style.width='0';pocketOff();toast('Schermo sbloccato')}},50)}
  function up(){clearInterval(iv);$('#pkBar').style.width='0'}
  p.addEventListener('pointerdown',down);p.addEventListener('pointerup',up);p.addEventListener('pointercancel',up);p.addEventListener('pointerleave',up);p.addEventListener('contextmenu',function(e){e.preventDefault()})})();
$('#chipRec').onclick=pocketOn;
/* interruzioni: il browser sospende il GPS a schermo spento o con l'app in secondo piano */
document.addEventListener('visibilitychange',function(){
  if(!REC.on)return;
  if(document.visibilityState==='hidden'){REC.hiddenAt=Date.now();DB.put('tracks',REC.trk);return}
  var gap=Date.now()-Math.max(REC.lastFix||0,REC.hiddenAt?REC.hiddenAt:0);
  if(REC.hiddenAt&&Date.now()-REC.hiddenAt>45000&&Date.now()-(REC.lastFix||0)>45000){
    var gapMs=Date.now()-REC.hiddenAt,split=REC.trk.pts.length,lastT=REC.last?REC.last[3]:REC.hiddenAt;
    recBreak('nascosta');sndWarn();
    askRec('⚠️ Registrazione interrotta per '+fmtDur(gapMs),'Con lo schermo spento o l\'app in secondo piano il browser ha sospeso il GPS. La registrazione è già ripartita: come vuoi salvarla?',
      [['unisci','➕ Unisci alla traccia precedente','stessa traccia; nel GPX il tratto mancante resta un segmento separato'],['nuova','🆕 Nuova traccia','la parte fatta finora viene salvata e da qui ne inizia un\'altra']]).then(function(c){
      if(c==='nuova')recSplit(split,lastT);else toast('Traccia unita alla precedente',3000)});
  }
  REC.hiddenAt=0;
});
/* finestra di scelta (sopra tutto, anche sopra la modalità tasca e le schede aperte) */
function askRec(title,msg,opts){return new Promise(function(res){
  var w=$('#recAsk');$('#raT').textContent=title;$('#raM').textContent=msg;var b=$('#raB');b.innerHTML='';
  opts.forEach(function(o,i){var e=el('<button class="btn'+(i===0?' f':'')+'">'+esc(o[1])+(o[2]?'<small>'+esc(o[2])+'</small>':'')+'</button>');e.onclick=function(){w.style.display='none';res(o[0])};b.appendChild(e)});
  w.style.display='flex';
})}
function recUI(on){$('#bRec').classList.toggle('recon',on);$('#bRec').textContent=on?'⏹':'⏺';if(on&&navigator.wakeLock&&navigator.wakeLock.request&&!REC.wake){navigator.wakeLock.request('screen').then(function(w){REC.wake=w}).catch(function(){})}updRecChip()}
/* divide la traccia in corso: fino a «split» resta la vecchia, il resto diventa una traccia nuova */
function recSplit(split,lastT){
  var old=REC.trk,rest=old.pts.slice(split),now=Date.now();
  old.pts=old.pts.slice(0,split);old.end=lastT||now;old.brk=(old.brk||[]).filter(function(i){return i<split});
  var pOld=old.pts.length>1?DB.put('tracks',old):DB.del('tracks',old.id);
  REC.trk={id:uid(),name:'Traccia '+fmtDate(new Date(now).toISOString()),start:now,end:null,pts:rest,brk:[]};
  REC.last=rest.length?rest[rest.length-1]:null;REC.line.setLatLngs(rest.map(function(p){return [p[0],p[1]]}));
  pOld.then(function(){return DB.put('tracks',REC.trk)}).then(function(){markChange();loadTracks()});
  sndRecStart();updRecChip();toast('🆕 Traccia precedente salvata: ne è iniziata una nuova',4000);
}
/* riprende una traccia rimasta aperta (app chiusa dal sistema durante la registrazione) */
function recResume(t){
  t.end=null;t.brk=t.brk||[];if(t.pts.length&&t.brk[t.brk.length-1]!==t.pts.length)t.brk.push(t.pts.length);
  REC.trk=t;REC.on=true;REC.last=null;REC.lastFix=Date.now();REC.warned=false;
  REC.line=L.polyline(t.pts.map(function(p){return [p[0],p[1]]}),{color:'#ff5252',weight:4}).addTo(gTracks);
  DB.put('tracks',t);startLive();recUI(true);drawTracks();sndRecStart();toast('⏺ Registrazione ripresa sulla stessa traccia',4000);
}
function checkOpenTracks(){
  var open=TRACKS.filter(function(t){return !t.end}).sort(function(a,b){return b.start-a.start});if(!open.length)return Promise.resolve();
  var close=function(t){t.end=t.pts.length?t.pts[t.pts.length-1][3]:t.start;return DB.put('tracks',t)};
  var last=open[0],lt=last.pts.length?last.pts[last.pts.length-1][3]:last.start;
  return Promise.all(open.slice(1).map(close)).then(function(){
    if(Date.now()-lt>12*3600000||REC.on)return close(last);
    sndWarn();
    return askRec('⚠️ La registrazione si è interrotta','L\'app è stata chiusa mentre registravi «'+last.name+'» ('+fmtDist(trkStats(last).d)+', ultimo punto alle '+fmtDate(new Date(lt).toISOString()).slice(-5)+'). Cosa vuoi fare?',
      [['unisci','➕ Riprendi unendo alla traccia precedente','continua la stessa traccia da dove sei ora'],['nuova','🆕 Nuova traccia','salva quella precedente e ne inizia una nuova'],['salva','💾 Salva e basta','salva la traccia precedente senza registrare']]).then(function(c){
      if(c==='unisci')return recResume(last);
      return close(last).then(function(){loadTracks();if(c==='nuova')recStart()});
    });
  }).then(function(){return loadTracks()});
}
setInterval(function(){if(!REC.on||document.visibilityState!=='visible')return;updPocket();var g=Date.now()-(REC.lastFix||REC.trk.start);if(g>90000&&!REC.warned){REC.warned=true;sndWarn();toast('⚠️ Nessuna posizione GPS da '+Math.round(g/1000)+' s: cerca il cielo aperto',6000)}else if(g<90000)REC.warned=false},5000);
function recStart(){
  if(!navigator.geolocation)return toast('GPS non disponibile');
  REC.trk={id:uid(),name:'Traccia '+fmtDate(new Date().toISOString()),start:Date.now(),end:null,pts:[]};
  REC.on=true;REC.last=null;REC.lastFix=Date.now();REC.warned=false;sndRecStart();REC.line=L.polyline([],{color:'#ff5252',weight:4}).addTo(gTracks);
  startLive();$('#bRec').classList.add('recon');$('#bRec').textContent='⏹';
  if(navigator.wakeLock&&navigator.wakeLock.request){navigator.wakeLock.request('screen').then(function(w){REC.wake=w}).catch(function(){})}
  updRecChip();toast('⏺ Registrazione avviata. Tieni l\'app aperta: per metterti il telefono in tasca tocca il riquadro rosso in alto (modalità tasca).',6000);
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
function updRecChip(){var c=$('#chipRec');if(!REC.on){c.style.display='none';return}var s=trkStats(REC.trk);c.style.display='';c.innerHTML='<span class="rec">●</span> '+fmtDist(s.d)+' · '+fmtDur(s.t)+' · 🌙';updPocket()}
setInterval(function(){if(REC.on)updRecChip()},15000);
function recStop(){
  REC.on=false;REC.trk.end=Date.now();sndRecStop();pocketOff();
  if(REC.wake){try{REC.wake.release()}catch(e){}REC.wake=null}
  $('#bRec').classList.remove('recon');$('#bRec').textContent='⏺';$('#chipRec').style.display='none';
  if(REC.trk.pts.length<2){toast('Traccia troppo corta: non salvata');DB.del('tracks',REC.trk.id);loadTracks();return}
  DB.put('tracks',REC.trk).then(function(){markChange();toast('Traccia salvata ('+REC.trk.pts.length+' punti)');loadTracks()});
}
function loadTracks(){return DB.all('tracks').then(function(a){TRACKS=a.sort(function(x,y){return y.start-x.start});drawTracks();if(curPage==='alt')renderAlt()})}
function drawTracks(){gTracks.clearLayers();if(REC.on&&REC.line)gTracks.addLayer(REC.line);if(!showTracks)return;TRACKS.forEach(function(t){if(REC.on&&REC.trk&&t.id===REC.trk.id)return;if(t.pts.length>1)L.polyline(t.pts.map(function(p){return [p[0],p[1]]}),{color:'#ffb74d',weight:3,opacity:.85}).bindPopup(esc(t.name)+'<br>'+fmtDist(trkStats(t).d)).addTo(gTracks)})}
