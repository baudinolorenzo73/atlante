/* Atlante di campo - Bussola sulla mappa (nord e direzione di marcia) e freccia rossa verso la specie più vicina.
   by Lollo ®2026 · i moduli si caricano nell'ordine dei numeri (vedi index.html) */
'use strict';
/* =================== BUSSOLA E ORIENTAMENTO =================== */
// map.setBearing(b): b = 360 − direzione verso cui guardi → la direzione di marcia va in alto; l'ago del nord ruota di b.
var ORI={mode:'nord',head:null,src:'',lastSet:0,listening:false,gpsHead:null};
function angDiff(a,b){return ((a-b+540)%360)-180}
function updCompass(){var b=map.getBearing?map.getBearing():0;var n=$('#compN');if(n)n.style.transform='rotate('+b+'deg)';
  var c=$('#compass');if(c){c.classList.toggle('on',ORI.mode==='segui');c.title=ORI.mode==='segui'?'Mappa orientata secondo la tua direzione: tocca per tornare a nord in alto':'Nord in alto: tocca per orientare la mappa secondo la tua direzione'}
  var l=$('#compL');if(l)l.textContent=ORI.mode==='segui'?(ORI.head!=null?Math.round(ORI.head)+'° '+(ORI.src==='gps'?'GPS':''):'…'):'N'}
function onOrient(e){
  var h=null;
  if(e.webkitCompassHeading!=null)h=e.webkitCompassHeading;                 // iPhone
  else if(e.absolute&&e.alpha!=null)h=360-e.alpha;                           // Android (deviceorientationabsolute)
  if(h==null)return;
  var sa=(screen.orientation&&screen.orientation.angle)||window.orientation||0;h=(h+sa+360)%360;
  ORI.head=ORI.head==null?h:(ORI.head+angDiff(h,ORI.head)*0.25+360)%360;ORI.src='bussola';applyHeading();
}
function applyHeading(){
  if(ORI.mode!=='segui'||ORI.head==null)return;var now=Date.now();if(now-ORI.lastSet<120)return;
  var want=(360-ORI.head)%360;if(Math.abs(angDiff(want,map.getBearing()))<2)return;ORI.lastSet=now;map.setBearing(want);
}
function oriListen(on){
  if(on&&!ORI.listening){window.addEventListener('deviceorientationabsolute',onOrient,true);window.addEventListener('deviceorientation',onOrient,true);ORI.listening=true}
  if(!on&&ORI.listening){window.removeEventListener('deviceorientationabsolute',onOrient,true);window.removeEventListener('deviceorientation',onOrient,true);ORI.listening=false}
}
function setOriMode(m){
  ORI.mode=m;
  if(m==='segui'){
    var go2=function(){oriListen(true);if(gpsWatch==null)startLive();toast('🧭 Mappa orientata secondo la direzione in cui guardi (bussola del telefono; camminando usa anche la direzione GPS)',4500);setTimeout(function(){if(ORI.head==null)toast('Bussola non disponibile: la mappa si orienterà con la direzione GPS appena cammini',4500)},2500)};
    if(window.DeviceOrientationEvent&&typeof DeviceOrientationEvent.requestPermission==='function')DeviceOrientationEvent.requestPermission().then(go2).catch(go2);else go2();
    if(here)map.panTo([here.lat,here.lon]);
  }else{oriListen(false);map.setBearing(0)}
  SET.ori=m;saveSet();updCompass();
}
// dalla posizione GPS: centra la mappa e usa la direzione GPS se manca la bussola o se cammini
function oriOnFix(p){
  if(ORI.mode!=='segui')return;
  var c=p.coords;if(c.heading!=null&&!isNaN(c.heading)&&c.speed!=null&&c.speed>1.2&&(ORI.src!=='bussola'||!ORI.listening||ORI.head==null)){ORI.head=c.heading;ORI.src='gps';applyHeading()}
  map.panTo([c.latitude,c.longitude],{animate:true});
}
map.on('rotate',function(){updCompass();updArrow()});
$('#compass').onclick=function(){setOriMode(ORI.mode==='segui'?'nord':'segui')};

/* =================== FRECCIA ROSSA VERSO LA SPECIE PIÙ VICINA =================== */
var ARW={tgt:null,line:null,last:0};
function spCands(){
  var out=[];
  POINTS.forEach(function(p){if(p.lat==null||isInd(p)||!CAT(p.cat).sp)return;out.push({id:'p:'+p.id,src:'mine',t:p.title||(p.sp&&(p.sp.com||p.sp.sci))||CAT(p.cat).n,sub:p.sp?[p.sp.com,p.sp.sci].filter(Boolean).join(' · '):'',lat:p.lat,lon:p.lon,cat:p.cat,pid:p.id})});
  if(!SET.arrowMine){var seen={};(NEAR.pack&&NEAR.pack.items||[]).concat((EXP.inat||[]).map(function(o){return {id:'inat:'+o.url,src:'inat',t:o.t,sub:o.sci||'',lat:o.lat,lon:o.lon,cat:o.save&&o.save.cat||'fauna',url:o.url,img:o.img,save:o.save}})).forEach(function(o){if(o.src!=='inat'||seen[o.id])return;seen[o.id]=1;out.push(o)})}
  return out;
}
function arrowOn(){return !SET.arrowOff&&gpsWatch!=null&&here}
function updArrow(force){
  var a=$('#spArrow'),chip=$('#spChip');
  if(!arrowOn()){a.style.display='none';chip.style.display='none';if(ARW.line){map.removeLayer(ARW.line);ARW.line=null}ARW.tgt=null;return}
  var now=Date.now();
  if(force||now-ARW.last>2500||!ARW.tgt){ARW.last=now;var best=null,bd=1e12;spCands().forEach(function(o){var d=dist(here.lat,here.lon,o.lat,o.lon);if(d<bd&&d>2){bd=d;best=o}});ARW.tgt=best}
  var t=ARW.tgt;if(!t){a.style.display='none';chip.style.display='none';return}
  var d=dist(here.lat,here.lon,t.lat,t.lon),me=map.latLngToContainerPoint([here.lat,here.lon]),to=map.latLngToContainerPoint([t.lat,t.lon]);
  var ang=Math.atan2(to.x-me.x,-(to.y-me.y))*180/Math.PI;
  a.style.display='block';a.style.left=(me.x+Math.sin(ang*Math.PI/180)*36)+'px';a.style.top=(me.y-Math.cos(ang*Math.PI/180)*36)+'px';a.style.transform='translate(-50%,-50%) rotate('+ang+'deg)';
  var ll=[[here.lat,here.lon],[t.lat,t.lon]];if(!ARW.line)ARW.line=L.polyline(ll,{color:'#ff1744',weight:2,dashArray:'6 6',interactive:false}).addTo(map);else ARW.line.setLatLngs(ll);
  chip.style.display='flex';chip.innerHTML='<span style="color:#ff1744;font-size:18px">➤</span><span class="tx"><b>'+esc(t.t)+'</b><small>'+fmtDist(d)+' verso '+dirName(bearing(here.lat,here.lon,t.lat,t.lon))+' · '+esc(SRCN[t.src]||t.src)+'</small></span>';
  chip.onclick=function(){openNearItem(t)};
}
map.on('move zoom',function(){if(arrowOn()&&ARW.tgt)updArrow()});
