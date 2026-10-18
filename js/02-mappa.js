/* Atlante di campo - Mappa Leaflet, mappe di base, livelli sovrapposti e legenda.
   by Lollo ®2026 · i moduli si caricano nell'ordine dei numeri (vedi index.html) */
'use strict';
/* =================== MAPPA =================== */
var map=L.map('map',{center:HOME,zoom:16,minZoom:8,maxZoom:MAXZ,zoomSnap:0.5,zoomControl:false,rotate:true,bearing:0,touchRotate:false,shiftKeyRotate:false,rotateControl:false});
L.control.scale({imperial:false,position:'bottomleft'}).addTo(map);
var PIE='https://geomap.reteunitaria.piemonte.it/mapproxy/service?';
var FOR='https://geomap.reteunitaria.piemonte.it/ws/vtmonfor/rp-01/cartaforwms/wms_vtmonfor_cartafor?';
var HAB='https://geomap.reteunitaria.piemonte.it/ws/gsareprot/rp-01/cartahabitatwms/wms_cartahabitat?';
var GEO='https://sinacloud.isprambiente.it/arcgisgeo/services/geo/SGI_ISPRA_geologia100K/MapServer/WMSServer';
function wms(url,layers,opt,attr){return L.tileLayer.wms(url,Object.assign({layers:layers,format:'image/png',transparent:true,version:'1.3.0',maxZoom:MAXZ,attribution:attr||''},opt||{}))}
var BASES=[
 {id:'sat',n:'Satellite (Esri)',d:'la più nitida per canneti, boschi, sponde',mk:function(){return L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',{maxNativeZoom:19,maxZoom:MAXZ,attribution:'Esri, Maxar, Earthstar Geographics'})}},
 {id:'c10',n:'Carta 1:10.000 Regione Piemonte',d:'topografica ufficiale, edizione 2026',mk:function(){return wms(PIE,'regp_basecarto10bn_2026',{transparent:false,maxNativeZoom:18},'© Regione Piemonte')}},
 {id:'c25',n:'Carta 1:25.000 a colori',d:'Regione Piemonte, 2020',mk:function(){return wms(PIE,'regp_basecarto25col_2020',{transparent:false,maxNativeZoom:18},'© Regione Piemonte')}},
 {id:'bdtre',n:'Sfondo BDTRE a colori',d:'Regione Piemonte',mk:function(){return wms(PIE,'regp_sfondo_bdtre',{transparent:false,maxNativeZoom:18},'© Regione Piemonte')}},
 {id:'topo',n:'OpenTopoMap',d:'curve di livello',mk:function(){return L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',{subdomains:'abc',maxNativeZoom:17,maxZoom:MAXZ,attribution:'© OpenTopoMap, © OpenStreetMap'})}},
 {id:'osm',n:'OpenStreetMap',d:'sentieri, strade, edifici',mk:function(){return L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxNativeZoom:19,maxZoom:MAXZ,attribution:'© OpenStreetMap'})}}
];
var OVERS=[
 {id:'hill',g:'Terreno e rocce',n:'Rilievo ombreggiato',op:.5,mk:function(){return L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Elevation/World_Hillshade/MapServer/tile/{z}/{y}/{x}',{maxNativeZoom:16,maxZoom:MAXZ,attribution:'Esri'})}},
 {id:'geo',g:'Terreno e rocce',n:'Geologia 1:100.000 (ISPRA)',op:.6,mk:function(){return wms(GEO,'1',{maxNativeZoom:15},'ISPRA Carta Geologica 1:100.000')}},
 {id:'tec',g:'Terreno e rocce',n:'Faglie e pieghe (ISPRA)',op:.9,mk:function(){return wms(GEO,'2',{maxNativeZoom:15},'ISPRA')}},
 {id:'for',g:'Vegetazione',n:'Carta forestale (PFT 2000)',op:.7,mk:function(){return wms(FOR,'CartaForAltre',{maxNativeZoom:19},'Regione Piemonte – IPLA')}},
 {id:'hab',g:'Vegetazione',n:'Habitat Natura 2000',op:.7,mk:function(){return wms(HAB,'pl_carta_habitat,ln_carta_habitat,pt_carta_habitat',{maxNativeZoom:19},'Regione Piemonte – Carta habitat')}}
];
var baseLayer=null,baseId='sat',overOn={},overLayers={};
function setBase(id){var b=byId(BASES,id)||BASES[0];if(baseLayer)map.removeLayer(baseLayer);baseLayer=b.mk().addTo(map);baseLayer.setZIndex(1);baseId=b.id;DB.put('kv',{id:'mapstate',v:{base:baseId,over:overOn}})}
function setOver(o,on){overOn[o.id]=on;if(on){if(!overLayers[o.id])overLayers[o.id]=o.mk();overLayers[o.id].setOpacity(o.op).addTo(map).setZIndex(10+OVERS.indexOf(o))}else if(overLayers[o.id])map.removeLayer(overLayers[o.id]);DB.put('kv',{id:'mapstate',v:{base:baseId,over:overOn}})}
var HOMEMK=L.circleMarker(HOME,{radius:4,color:'#fff',weight:1,fillColor:'#4fc3f7',fillOpacity:.7,interactive:false}).addTo(map);

/* =================== LEGENDA DELLE MAPPE =================== */
// t = come leggere la mappa; w = legende ufficiali dei servizi WMS [indirizzo, livello, etichetta]; u = pagina ufficiale
var LEGINFO={
 sat:{t:'Fotografia da satellite o aereo: non ha simboli, si legge dai colori. L\'acqua è scura (blu o verde bottiglia); i canneti sono fasce più chiare e giallo-verdi lungo la riva; i boschi sono verde scuro e granulosi; prati e coltivi verde chiaro uniforme; edifici e strade grigi o rossastri. Le immagini possono avere anni diversi da una zona all\'altra.'},
 c10:{t:'Carta tecnica ufficiale della Regione Piemonte (scala 1:10.000) con i simboli convenzionali: curve di livello, idrografia, strade e sentieri, edifici, toponimi. Sotto, se il servizio la fornisce, compare la legenda ufficiale.',w:[[PIE,'regp_basecarto10bn_2026','Legenda 1:10.000']]},
 c25:{t:'Carta topografica a colori 1:25.000 della Regione Piemonte (2020): curve di livello, boschi, acque, strade e sentieri, edifici. Sotto, se il servizio la fornisce, compare la legenda ufficiale.',w:[[PIE,'regp_basecarto25col_2020','Legenda 1:25.000']]},
 bdtre:{t:'Sfondo cartografico a colori ricavato dalla Base Dati Territoriale di Riferimento degli Enti (BDTRE) del Piemonte: edifici, strade, acque, aree verdi. Sotto, se il servizio la fornisce, compare la legenda ufficiale.',w:[[PIE,'regp_sfondo_bdtre','Legenda BDTRE']]},
 topo:{t:'OpenTopoMap: le curve di livello sono linee marroni (ogni 10 m, più spesse ogni 50 m, con la quota scritta); i sentieri sono tratteggiati; boschi e prati in verde, acque in azzurro, rilievo ombreggiato.',u:['https://opentopomap.org/about','Legenda ufficiale di OpenTopoMap']},
 osm:{t:'OpenStreetMap: strade e sentieri con colori e tratteggi diversi per tipo, edifici in grigio o rosa, boschi e parchi in verde, acque in azzurro. Ogni simbolo è spiegato nella pagina ufficiale.',u:['https://wiki.openstreetmap.org/wiki/Map_features','Elenco ufficiale dei simboli di OpenStreetMap']},
 hill:{t:'Rilievo ombreggiato: nessun colore, solo luci e ombre come se il sole venisse da nord-ovest. Le pendici in ombra sono scure, quelle in luce chiare. Va usato sopra un\'altra mappa, regolando la trasparenza con il cursore: fa risaltare le morene, i terrazzi e i dossi attorno ai laghi.'},
 geo:{t:'Carta Geologica d\'Italia 1:100.000 (ISPRA). Ogni colore è una formazione geologica (depositi glaciali e morenici, alluvioni, versanti, roccia in posto). Attorno ai laghi di Avigliana prevalgono i depositi dell\'anfiteatro morenico di Rivoli-Avigliana. Sotto c\'è la legenda ufficiale del servizio: è lunga, scorrila per trovare il tuo colore.',w:[[GEO,'1','Legenda geologia']]},
 tec:{t:'Elementi tettonici della stessa carta ISPRA: linee di faglia e assi di piega, con la simbologia della legenda sotto (le linee tratteggiate indicano di norma elementi presunti o coperti).',w:[[GEO,'2','Legenda faglie e pieghe']]},
 for:{t:'Carta forestale del Piemonte (IPLA, Piano Forestale Territoriale 2000): ogni colore è una categoria forestale (per esempio castagneto, querceto, robinieto, boscaglie pioniere e d\'invasione, impianti di arboricoltura). Sotto c\'è la legenda ufficiale.',w:[[FOR,'CartaForAltre','Legenda carta forestale']]},
 hab:{t:'Carta degli habitat della Regione Piemonte (Natura 2000). Ogni area ha un codice a 4 cifre: per esempio 3150 laghi eutrofici naturali con vegetazione galleggiante o sommersa, 91E0* foreste alluvionali con ontano e salice, 9260 castagneti. L\'asterisco indica un habitat prioritario. Poligoni, linee e punti sono tre livelli distinti. Sotto c\'è la legenda ufficiale.',w:[[HAB,'pl_carta_habitat','Aree (poligoni)'],[HAB,'ln_carta_habitat','Elementi lineari'],[HAB,'pt_carta_habitat','Elementi puntuali']]}
};
function wmsBase(u){return u+(u.indexOf('?')<0?'?':'')}
function legGraphicUrl(b,layer){return wmsBase(b)+'service=WMS&version=1.3.0&request=GetLegendGraphic&sld_version=1.1.0&format=image/png&layer='+encodeURIComponent(layer)}
var CAPS={};
function capsLegendUrl(b,layer){
  var p=CAPS[b]||(CAPS[b]=fetch(wmsBase(b)+'service=WMS&version=1.3.0&request=GetCapabilities').then(function(r){if(!r.ok)throw new Error('HTTP '+r.status);return r.text()}).then(function(t){return new DOMParser().parseFromString(t,'text/xml')}));
  return p.then(function(x){var ls=x.getElementsByTagName('Layer');
    for(var i=0;i<ls.length;i++){var n=null;for(var c=ls[i].firstChild;c;c=c.nextSibling){if(c.nodeName==='Name'||/:Name$/.test(c.nodeName)){n=c;break}}
      if(!n||n.textContent.trim()!==layer)continue;
      var lus=ls[i].getElementsByTagName('LegendURL');
      for(var j=0;j<lus.length;j++){var q=lus[j].parentNode.parentNode;if(q!==ls[i])continue;var r=lus[j].getElementsByTagName('OnlineResource')[0];if(r)return r.getAttribute('xlink:href')||r.getAttributeNS('http://www.w3.org/1999/xlink','href')}}
    return null});
}
function fillLegendImg(box,b,layer,label){
  var d=el('<div class="lgimg"><div class="mut">'+esc(label)+'</div><div class="lgw"><span class="mut">carico la legenda…</span></div></div>');box.appendChild(d);
  var w=$('.lgw',d);
  function fail(){w.innerHTML='<span class="mut">Legenda ufficiale non scaricabile ora (serve la rete, oppure il servizio non la offre). Vale la descrizione qui sopra.</span>'}
  function show(u,next){var im=new Image();im.alt=label;im.onload=function(){w.innerHTML='';w.appendChild(im)};im.onerror=next;im.src=u}
  show(legGraphicUrl(b,layer),function(){
    capsLegendUrl(b,layer).then(function(u){if(!u)return fail();show(u,fail)}).catch(fail)});
}
function openLegend(){
  var cur={};cur[baseId]=1;OVERS.forEach(function(o){if(overOn[o.id])cur[o.id]=1});
  var h='<p class="mut">Le mappe attive adesso sono aperte; le altre si aprono toccandole. Le legende ufficiali si scaricano dai servizi della Regione Piemonte e dell\'ISPRA, quindi serve la rete.</p>';
  function sec(id,tit,tag){var i=LEGINFO[id];return '<details class="lg" data-lg="'+id+'" '+(cur[id]?'open':'')+'><summary><b>'+esc(tit)+'</b> <span class="tag">'+tag+(cur[id]?' · attiva':'')+'</span></summary><div class="lgb"><p>'+esc(i.t)+'</p>'+(i.u?'<p><a href="'+esc(i.u[0])+'" target="_blank" rel="noopener">'+esc(i.u[1])+'</a></p>':'')+'<div class="lgi"></div></div></details>'}
  h+='<h3>Mappe di base</h3>'+BASES.map(function(b){return sec(b.id,b.n,'base')}).join('');
  var g='';OVERS.forEach(function(o){if(o.g!==g){h+='<h3>'+esc(o.g)+' (livelli sovrapposti)</h3>';g=o.g}h+=sec(o.id,o.n,'livello')});
  h+='<h3>I miei dati</h3><div class="card">'+CATS.map(function(c){return '<div class="lgrow"><span class="lgdot" style="background:'+c.c+'">'+c.e+'</span> '+esc(c.n)+'</div>'}).join('')+'<div class="lgrow"><span class="lgdot" style="background:#81c784;opacity:.62;border-style:dashed">🌿</span> bordo tratteggiato: posizione indicativa (scheda della ricerca da spostare sul posto)</div><div class="lgrow"><span style="color:#ff1744;font-size:20px;width:22px;text-align:center">➤</span> freccia rossa: direzione della specie trovata più vicina (linea tratteggiata)</div><div class="lgrow"><span class="lgdot" style="background:#1f252c;color:#ff1744">N</span> bussola in alto a sinistra: l\'ago rosso indica il nord; toccala per orientare la mappa secondo la tua direzione</div><div class="lgrow"><span class="lgln" style="background:#ffb74d"></span> traccia GPS registrata</div><div class="lgrow"><span class="lgdot" style="background:#2196f3;border:2px solid #fff"></span> la mia posizione (il cerchio chiaro è la precisione)</div><div class="lgrow"><span class="lgdot" style="background:#4fc3f7;width:10px;height:10px;border:1px solid #fff"></span> centro del lago</div></div>';
  h+='<h3>Simboli di Luogo → Esplora</h3><div class="card">'+[['#ffffff','W','Wikipedia: voci con coordinate'],['#80cbc4','D','Wikidata: luoghi e beni culturali'],['#81c784','i','iNaturalist: piante'],['#4fc3f7','i','iNaturalist: uccelli'],['#ffd54f','i','iNaturalist: altri gruppi'],['#cfd8dc','O','OpenStreetMap: panorami, sorgenti, massi, capanni']].map(function(r){return '<div class="lgrow"><span class="xdot" style="background:'+r[0]+'">'+r[1]+'</span> '+r[2]+'</div>'}).join('')+'<div class="lgrow"><span class="xdot" style="background:#4fc3f7">G</span> GBIF: il colore indica il gruppo ('+GBIF_G.map(function(x){return '<span style="color:'+x[2]+'">●</span> '+x[1]}).join(', ')+')</div></div>';
  openModal('Legenda delle mappe',h,[]);
  $$('details.lg').forEach(function(d){
    var id=d.getAttribute('data-lg'),done=false;
    function load(){if(done)return;done=true;var w=LEGINFO[id].w;if(w)w.forEach(function(x){fillLegendImg($('.lgi',d),x[0],x[1],x[2])})}
    if(d.open)load();d.addEventListener('toggle',function(){if(d.open)load()});
  });
}

var gPoints=L.layerGroup().addTo(map),gTracks=L.layerGroup().addTo(map);
var XL={}; // livelli esplorazione
['wiki','wd','inat','gbif','osm'].forEach(function(k){XL[k]=L.layerGroup().addTo(map)});
var showPoints=true,showTracks=true;

/* =================== STATO =================== */
var POINTS=[],TRACKS=[],filterCats={},query='',sortBy='new';
var thumbCache={};
var here=null; // ultima posizione nota {lat,lon,acc}
