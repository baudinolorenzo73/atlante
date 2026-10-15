/* Atlante Lago Piccolo - Punti sulla mappa e nel catalogo, finestra modale, dettaglio del punto.
   by Lollo ®2026 · i moduli si caricano nell'ordine dei numeri (vedi index.html) */
'use strict';
/* =================== PUNTI: CARICAMENTO, MAPPA, LISTA =================== */
function loadPoints(){return DB.all('points').then(function(a){POINTS=a;drawPoints();renderCat();if(curPage==='dos')renderDossier()})}
function pinIcon(c){return L.divIcon({className:'',html:'<div class="pin" style="background:'+c.c+'"><span>'+c.e+'</span></div>',iconSize:[30,30],iconAnchor:[15,30],popupAnchor:[0,-28]})}
function passFilter(p){
  var any=Object.keys(filterCats).some(function(k){return filterCats[k]});
  if(any&&!filterCats[p.cat])return false;
  if(query){var q=query.toLowerCase();var hay=[p.title,p.note,(p.sp&&p.sp.sci),(p.sp&&p.sp.com),(p.tags||[]).join(' '),CAT(p.cat).n].join(' ').toLowerCase();if(hay.indexOf(q)<0)return false}
  return true;
}
function drawPoints(){gPoints.clearLayers();if(!showPoints)return;POINTS.filter(passFilter).forEach(function(p){
  var m=L.marker([p.lat,p.lon],{icon:pinIcon(CAT(p.cat)),title:p.title||''});
  m.on('click',function(){openDetail(p.id)});m.addTo(gPoints)})}
function firstPhoto(p){var m=(p.media||[]).filter(function(x){return x.type==='photo'})[0];return m}
function thumbURL(mid){if(thumbCache[mid])return Promise.resolve(thumbCache[mid]);return DB.get('media',mid).then(function(r){if(!r)return null;thumbCache[mid]=URL.createObjectURL(r.blob);return thumbCache[mid]})}
function renderCatFilter(){var h='';CATS.forEach(function(c){var n=POINTS.filter(function(p){return p.cat===c.id}).length;h+='<span class="cat'+(filterCats[c.id]?' on':'')+'" data-c="'+c.id+'">'+c.e+' '+esc(c.n)+(n?' <b>'+n+'</b>':'')+'</span>'});$('#catFilter').innerHTML=h}
function renderCat(){
  renderCatFilter();
  var list=POINTS.filter(passFilter);
  list.sort(function(a,b){
    if(sortBy==='near'&&here)return dist(here.lat,here.lon,a.lat,a.lon)-dist(here.lat,here.lon,b.lat,b.lon);
    if(sortBy==='az')return (a.title||'').localeCompare(b.title||'');
    if(sortBy==='cat')return CATS.indexOf(CAT(a.cat))-CATS.indexOf(CAT(b.cat))||(b.when||'').localeCompare(a.when||'');
    if(sortBy==='old')return (a.when||'').localeCompare(b.when||'');
    return (b.when||'').localeCompare(a.when||'');
  });
  var nf=0,na=0;POINTS.forEach(function(p){(p.media||[]).forEach(function(m){if(m.type==='photo')nf++;else na++})});
  $('#catCount').textContent=POINTS.length+' punti · '+nf+' foto · '+na+' audio'+(list.length!==POINTS.length?' · '+list.length+' filtrati':'');
  var box=$('#catList');
  if(!POINTS.length){box.innerHTML='<div class="card"><b>Nessun punto ancora.</b><p class="mut">Torna sulla mappa e premi <b>+</b> per catalogare un punto con la tua posizione GPS, oppure tieni premuto sulla mappa nel punto che ti interessa.</p></div>';return}
  box.innerHTML=list.map(function(p){var c=CAT(p.cat);var f=firstPhoto(p);var d=here?' · '+fmtDist(dist(here.lat,here.lon,p.lat,p.lon)):'';
    var sp=p.sp&&(p.sp.com||p.sp.sci)?esc(p.sp.com||'')+(p.sp.sci?' <i>'+esc(p.sp.sci)+'</i>':''):'';
    var nm=(p.media||[]).length;
    return '<div class="item" data-id="'+p.id+'"><div class="th" '+(f?'data-mid="'+f.id+'"':'')+' style="border:2px solid '+c.c+'">'+(f?'':c.e)+'</div><div class="tx"><b>'+esc(p.title||'(senza titolo)')+'</b><small>'+c.e+' '+esc(c.n)+' · '+fmtDate(p.when)+d+(nm?' · 📎'+nm:'')+'</small>'+(sp?'<br><small>'+sp+'</small>':'')+'</div></div>'}).join('')||'<p class="mut">Nessun punto corrisponde al filtro.</p>';
  $$('.th[data-mid]',box).forEach(function(t){thumbURL(t.getAttribute('data-mid')).then(function(u){if(u)t.style.backgroundImage='url("'+u+'")'})});
}

/* =================== MODALE =================== */
var modalClose=null;
function openModal(title,body,foot,onClose){$('#mtitle').textContent=title;var b=$('#mbody');b.innerHTML='';if(typeof body==='string')b.innerHTML=body;else b.appendChild(body);var f=$('#mfoot');f.innerHTML='';(foot||[]).forEach(function(x){f.appendChild(x)});modalClose=onClose||null;$('#modal').classList.add('on');b.scrollTop=0}
function closeModal(){$('#modal').classList.remove('on');var f=modalClose;modalClose=null;if(f)f()}
$('#mclose').onclick=closeModal;
function mkBtn(t,cls,fn){var b=document.createElement('button');b.className='btn '+(cls||'');b.textContent=t;b.onclick=fn;return b}
$('#viewer').onclick=function(){this.classList.remove('on')};
function view(u){var v=$('#viewer');$('img',v).src=u;v.classList.add('on')}

/* =================== DETTAGLIO PUNTO =================== */
var detailURLs=[];
function freeDetail(){detailURLs.forEach(function(u){URL.revokeObjectURL(u)});detailURLs=[]}
function openDetail(id){
  var p=POINTS.filter(function(x){return x.id===id})[0];if(!p)return;
  var c=CAT(p.cat);
  var h='<div class="row" style="margin:8px 0"><span class="cat on" style="border-color:'+c.c+'">'+c.e+' '+esc(c.n)+'</span><span class="mut">'+fmtDate(p.when)+'</span></div>';
  if(p.sp&&(p.sp.sci||p.sp.com))h+='<div class="card"><b>'+esc(p.sp.com||'')+'</b> <i>'+esc(p.sp.sci||'')+'</i>'+(p.sp.src?'<br><small class="mut">fonte nome: '+esc(p.sp.src)+'</small>':'')+(p.sp.tratti?'<p class="mut" style="margin:6px 0 0">'+esc(p.sp.tratti)+'</p>':'')+'</div>';
  if(p.note)h+='<h3>Descrizione e note</h3><div style="white-space:pre-wrap">'+esc(p.note)+'</div>';
  var kv=[];
  Object.keys(p.x||{}).forEach(function(k){if(p.x[k]!==''&&p.x[k]!=null)kv.push([extraLabel(k),p.x[k]])});
  SCHEDA.forEach(function(s){if(p.s&&p.s[s.k])kv.push([s.l,p.s[s.k]])});
  if(kv.length)h+='<h3>Scheda</h3><div class="kv">'+kv.map(function(r){var v=esc(r[1]);if(/^https?:\/\//.test(r[1]))v=v.replace(/(https?:\/\/[^\s<]+)/g,'<a href="$1" target="_blank" rel="noopener">$1</a>');return '<div>'+esc(r[0])+'</div><div style="white-space:pre-wrap">'+v+'</div>'}).join('')+'</div>';
  h+='<h3>Posizione</h3><div class="kv"><div>Coordinate</div><div>'+p.lat.toFixed(6)+', '+p.lon.toFixed(6)+'</div>'+(p.acc?'<div>Precisione</div><div>±'+p.acc+' m'+(p.gpsN?' (media di '+p.gpsN+' letture)':'')+'</div>':'')+(p.alt!=null?'<div>Quota</div><div>'+p.alt+' m'+(p.altSrc?' ('+esc(p.altSrc)+')':'')+'</div>':'')+(here?'<div>Distanza da te</div><div>'+fmtDist(dist(here.lat,here.lon,p.lat,p.lon))+'</div>':'')+'</div>';
  h+='<div class="row" style="margin-top:6px"><a class="btn s" href="geo:'+p.lat+','+p.lon+'?q='+p.lat+','+p.lon+'('+encodeURIComponent(p.title||'punto')+')">Naviga</a><a class="btn s" target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query='+p.lat+','+p.lon+'">Google Maps</a></div>';
  if(p.meteo)h+='<h3>Meteo al momento</h3><div class="mut">'+esc(p.meteo)+'</div>';
  if(p.tags&&p.tags.length)h+='<h3>Tag</h3><div>'+p.tags.map(function(t){return '<span class="cat">#'+esc(t)+'</span>'}).join(' ')+'</div>';
  var photos=(p.media||[]).filter(function(m){return m.type==='photo'}),auds=(p.media||[]).filter(function(m){return m.type==='audio'});
  if(photos.length)h+='<h3>Foto ('+photos.length+')</h3><div class="gal">'+photos.map(function(m){return '<figure><img data-mid="'+m.id+'" alt=""><figcaption>'+esc(m.cap||'')+'</figcaption></figure>'}).join('')+'</div>';
  if(auds.length)h+='<h3>Registrazioni ('+auds.length+')</h3>'+auds.map(function(m){return '<div class="au"><audio controls data-mid="'+m.id+'"></audio></div><div class="mut" style="margin:-2px 0 6px">'+esc(m.cap||'')+'</div>'}).join('');
  h+='<p class="mut" style="margin-top:14px">Compilatore: '+esc(p.comp||'')+' · creato '+fmtDate(p.created)+(p.updated&&p.updated!==p.created?' · modificato '+fmtDate(p.updated):'')+'</p>';
  var foot=[mkBtn('Modifica','f',function(){closeModal();openForm(p)}),mkBtn('Sulla mappa','',function(){closeModal();go('map');map.setView([p.lat,p.lon],Math.max(map.getZoom(),18))}),mkBtn('Scheda stampabile','',function(){printReport([p])}),mkBtn('Condividi','',function(){shareOne(p)}),mkBtn('Elimina','r',function(){if(confirm('Eliminare definitivamente questo punto con foto e audio?'))deletePoint(p).then(closeModal)})];
  openModal(p.title||'(senza titolo)',h,foot,freeDetail);
  $$('[data-mid]',$('#mbody')).forEach(function(n){DB.get('media',n.getAttribute('data-mid')).then(function(r){if(!r)return;var u=URL.createObjectURL(r.blob);detailURLs.push(u);n.src=u;if(n.tagName==='IMG')n.onclick=function(){view(u)}})});
}
function deletePoint(p){var ps=(p.media||[]).map(function(m){delete thumbCache[m.id];return DB.del('media',m.id)});ps.push(DB.del('points',p.id));return Promise.all(ps).then(function(){markChange();toast('Punto eliminato');return loadPoints()})}
