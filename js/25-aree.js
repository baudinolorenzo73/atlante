/* Atlante di campo - Mappe offline (v4.7): scarica un'area piccola con lo zoom fino al massimo.
   Usa lib/scarica-area.js. Le tessere scaricate stanno nella cache «atl-aree»: il service worker le serve
   senza rete e NON le cancella né all'aggiornamento dell'app né con «Svuota mappe salvate».
   by Lollo ®2026 · i moduli si caricano nell'ordine dei numeri (vedi index.html) */
'use strict';
var AREE_CACHE='atl-aree';
// Peso medio di una tessera (KB), solo per l'anteprima prima del download
var AREE_KB={sat:30,c10:40,c25:40,bdtre:40,topo:30,osm:18,hill:20,geo:15,tec:8,'for':15,hab:15};
var AREE={ui:null};

/* I livelli sono quelli della mappa (BASES e OVERS di 02-mappa.js): gli indirizzi si costruiscono con
   lo stesso Leaflet che poi li richiede, così la cache li ritrova uguali (sottodomini e WMS compresi). */
function areeRegistra(){
  ScaricaArea.azzeraLivelli();
  function add(def,gruppo){
    var tl=def.mk();tl._map=map;tl._crs=map.options.crs;
    if(tl.wmsParams){tl._wmsVersion=parseFloat(tl.wmsParams.version);tl.wmsParams[tl._wmsVersion>=1.3?'crs':'srs']=tl._crs.code}
    ScaricaArea.registraLivello(def.id,{nome:def.n,gruppo:gruppo,zMax:tl.options.maxNativeZoom||19,kbPerTile:AREE_KB[def.id]||25,
      urlFn:function(z,x,y){tl._tileZoom=z;tl._globalTileRange={max:{y:Math.pow(2,z)-1}};var c=L.point(x,y);c.z=z;return tl.getTileUrl(c)}});
  }
  BASES.forEach(function(b){add(b,'Mappe di base')});
  OVERS.forEach(function(o){if(!o.custom)add(o,'Livelli sovrapposti')});
}

/* Apre la finestra «Mappe offline». L'area è quella che vedi sulla mappa in questo momento. */
function openAree(){
  if(typeof ScaricaArea==='undefined'){toast('Mappe offline non disponibili (manca lib/scarica-area.js)');return}
  if(curPage!=='map')go('map');
  if(AREE.ui){AREE.ui.distruggi();AREE.ui=null}
  areeRegistra();
  var box=document.createElement('div');
  var sel=[baseId];OVERS.forEach(function(o){if(overOn[o.id]&&!o.custom)sel.push(o.id)});
  AREE.ui=ScaricaArea.monta(map,{contenitore:box,fissaArea:true,nomeCache:AREE_CACHE,selezione:sel,file:(typeof AreaFile!=='undefined'?AreaFile:null),nomePredefinito:PL.name()+' · '+fmtDate(new Date().toISOString())});
  openModal('Mappe offline',box,[],function(){if(AREE.ui){AREE.ui.distruggi();AREE.ui=null}if(typeof renderAppSt==='function')renderAppSt()});
}
