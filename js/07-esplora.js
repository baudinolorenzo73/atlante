/* Atlante Lago Piccolo - Scheda Esplora: meteo, iNaturalist, GBIF, Wikipedia, Wikidata, OpenStreetMap.
   by Lollo ®2026 · i moduli si caricano nell'ordine dei numeri (vedi index.html) */
'use strict';
/* =================== ESPLORA (API gratuite) =================== */
var EXP={wiki:[],wd:[],inat:[],inatSp:[],gbif:[],osm:[],meteo:null,status:{}};
function vb(){var b=map.getBounds();return {s:b.getSouth(),n:b.getNorth(),w:b.getWest(),e:b.getEast(),c:map.getCenter(),r:Math.min(10000,Math.max(500,Math.round(map.distance(b.getSouthWest(),b.getNorthEast())/2)))}}
function xmarker(lat,lon,color,letter,popup,grp){return L.marker([lat,lon],{icon:L.divIcon({className:'',html:'<div class="xdot" style="background:'+color+'">'+letter+'</div>',iconSize:[22,22],iconAnchor:[11,11]})}).bindPopup(popup,{maxWidth:260}).addTo(XL[grp])}
function setStatus(k,t){EXP.status[k]=t;var e=$('#st_'+k);if(e)e.textContent=t}
function saveAsPoint(o){openForm(null,{draft:newDraft(o.lat,o.lon,{cat:o.cat||'curiosita',title:o.title||'',note:'',sp:o.sp||null,s:o.s||{},tags:o.tags||[]})})}
window._atl={save:function(k,i){var o=EXP[k][i];if(!o)return;map.closePopup();saveAsPoint(o.save)}};
function loadWiki(){
  var v=vb();setStatus('wiki','carico…');XL.wiki.clearLayers();var lang=SET.wikiLang||'it';
  var u='https://'+lang+'.wikipedia.org/w/api.php?action=query&format=json&origin=*&generator=geosearch&ggscoord='+v.c.lat.toFixed(5)+'%7C'+v.c.lng.toFixed(5)+'&ggsradius='+v.r+'&ggslimit=50&prop=coordinates%7Cpageimages%7Cextracts%7Cinfo&exintro=1&explaintext=1&exsentences=2&exlimit=20&piprop=thumbnail&pithumbsize=200&pilimit=50&inprop=url';
  fetchJSON(u).then(function(j){var ps=j.query&&j.query.pages?Object.keys(j.query.pages).map(function(k){return j.query.pages[k]}):[];
    EXP.wiki=ps.filter(function(p){return p.coordinates}).map(function(p){var c=p.coordinates[0];return {t:p.title,lat:c.lat,lon:c.lon,ex:p.extract||'',img:p.thumbnail&&p.thumbnail.source,url:p.fullurl,save:{lat:c.lat,lon:c.lon,cat:'storia',title:p.title,s:{sitografia:p.fullurl}}}});
    EXP.wiki.forEach(function(o,i){xmarker(o.lat,o.lon,'#ffffff','W','<b>'+esc(o.t)+'</b>'+(o.img?'<img src="'+esc(o.img)+'">':'')+'<div>'+esc(o.ex)+'</div><a href="'+esc(o.url)+'" target="_blank" rel="noopener">Apri Wikipedia</a> · <a href="#" onclick="_atl.save(\'wiki\','+i+');return false">Salva come punto</a>','wiki')});
    setStatus('wiki',EXP.wiki.length+' voci nel raggio di '+fmtDist(v.r));renderExpList('wiki');
  }).catch(function(e){setStatus('wiki','errore: '+e.message)});
}
function loadWD(){
  var v=vb();setStatus('wd','carico…');XL.wd.clearLayers();
  var q='SELECT ?item ?itemLabel ?coord ?typeLabel ?image ?art WHERE { SERVICE wikibase:around { ?item wdt:P625 ?coord. bd:serviceParam wikibase:center "Point('+v.c.lng.toFixed(5)+' '+v.c.lat.toFixed(5)+')"^^geo:wktLiteral; wikibase:radius "'+(v.r/1000).toFixed(2)+'". } OPTIONAL{?item wdt:P31 ?type} OPTIONAL{?item wdt:P18 ?image} OPTIONAL{?art schema:about ?item; schema:isPartOf <https://it.wikipedia.org/>} SERVICE wikibase:label { bd:serviceParam wikibase:language "it,en". } } LIMIT 400';
  fetchJSON('https://query.wikidata.org/sparql?format=json&query='+encodeURIComponent(q),{headers:{Accept:'application/sparql-results+json'}}).then(function(j){var by={};
    (j.results.bindings||[]).forEach(function(b){var id=b.item.value;var m=/Point\(([-\d.]+) ([-\d.]+)\)/.exec(b.coord.value);if(!m)return;var o=by[id]||(by[id]={t:b.itemLabel?b.itemLabel.value:id,lat:+m[2],lon:+m[1],types:[],img:null,url:id,art:null});if(b.typeLabel&&o.types.indexOf(b.typeLabel.value)<0)o.types.push(b.typeLabel.value);if(b.image)o.img=b.image.value.replace('http://','https://')+'?width=240';if(b.art)o.art=b.art.value});
    EXP.wd=Object.keys(by).map(function(k){var o=by[k];o.save={lat:o.lat,lon:o.lon,cat:'storia',title:o.t,s:{sitografia:[o.url,o.art].filter(Boolean).join('\n')}};return o});
    EXP.wd.forEach(function(o,i){xmarker(o.lat,o.lon,'#80cbc4','D','<b>'+esc(o.t)+'</b><div class="mut">'+esc(o.types.join(', '))+'</div>'+(o.img?'<img src="'+esc(o.img)+'">':'')+'<a href="'+esc(o.url)+'" target="_blank" rel="noopener">Wikidata</a>'+(o.art?' · <a href="'+esc(o.art)+'" target="_blank" rel="noopener">Wikipedia</a>':'')+' · <a href="#" onclick="_atl.save(\'wd\','+i+');return false">Salva come punto</a>','wd')});
    setStatus('wd',EXP.wd.length+' elementi');renderExpList('wd');
  }).catch(function(e){setStatus('wd','errore: '+e.message)});
}
var INAT_GROUPS=[['','Tutti'],['Aves','Uccelli'],['Plantae','Piante'],['Insecta','Insetti'],['Amphibia','Anfibi'],['Reptilia','Rettili'],['Mammalia','Mammiferi'],['Actinopterygii','Pesci'],['Fungi','Funghi'],['Arachnida','Ragni'],['Mollusca','Molluschi']];
function inatBox(){var v=vb();return '&swlat='+v.s.toFixed(5)+'&swlng='+v.w.toFixed(5)+'&nelat='+v.n.toFixed(5)+'&nelng='+v.e.toFixed(5)}
function loadINat(){
  var g=$('#inatG').value,qg=$('#inatQ').checked?'&quality_grade=research':'';setStatus('inat','carico…');XL.inat.clearLayers();
  fetchJSON('https://api.inaturalist.org/v1/observations?per_page=200&order=desc&order_by=observed_on&locale=it&photos=true'+qg+inatBox()+(g?'&iconic_taxa='+g:'')).then(function(j){
    EXP.inat=(j.results||[]).filter(function(o){return o.geojson}).map(function(o){var t=o.taxon||{};var ph=o.photos&&o.photos[0]&&o.photos[0].url;return {t:t.preferred_common_name||t.name||o.species_guess||'?',sci:t.name||'',lat:o.geojson.coordinates[1],lon:o.geojson.coordinates[0],img:ph,url:o.uri,date:o.observed_on,who:o.user&&o.user.login,q:o.quality_grade,ico:t.iconic_taxon_name,
      save:{lat:o.geojson.coordinates[1],lon:o.geojson.coordinates[0],cat:t.iconic_taxon_name==='Plantae'?'flora':t.iconic_taxon_name==='Fungi'?'fungo':'fauna',title:t.preferred_common_name||t.name||'',sp:{com:t.preferred_common_name||'',sci:t.name||'',src:'iNaturalist (osservazione altrui: verifica sul posto)',key:'inat:'+t.id},tags:['da iNaturalist']}}});
    EXP.inat.forEach(function(o,i){xmarker(o.lat,o.lon,o.ico==='Plantae'?'#81c784':o.ico==='Aves'?'#4fc3f7':'#ffd54f','i','<b>'+esc(o.t)+'</b> <i>'+esc(o.sci)+'</i>'+(o.img?'<img src="'+esc(o.img)+'">':'')+'<div class="mut">'+esc(o.date||'')+' · '+esc(o.who||'')+' · '+(o.q==='research'?'grado ricerca':'da confermare')+'</div><a href="'+esc(o.url)+'" target="_blank" rel="noopener">Apri su iNaturalist</a> · <a href="#" onclick="_atl.save(\'inat\','+i+');return false">Salva come punto</a>','inat')});
    setStatus('inat',EXP.inat.length+' osservazioni mostrate su '+(j.total_results||0)+' nell\'area');renderExpList('inat');
  }).catch(function(e){setStatus('inat','errore: '+e.message)});
}
function loadINatSp(){
  var g=$('#inatG').value;setStatus('inatSp','carico…');
  fetchJSON('https://api.inaturalist.org/v1/observations/species_counts?per_page=300&locale=it&quality_grade=research'+inatBox()+(g?'&iconic_taxa='+g:'')).then(function(j){
    EXP.inatSp=(j.results||[]).map(function(r){var t=r.taxon;return {t:t.preferred_common_name||t.name,sci:t.name,n:r.count,img:t.default_photo&&t.default_photo.square_url,ico:t.iconic_taxon_name,url:'https://www.inaturalist.org/taxa/'+t.id}});
    setStatus('inatSp',EXP.inatSp.length+' specie (osservazioni confermate)');renderExpList('inatSp');
  }).catch(function(e){setStatus('inatSp','errore: '+e.message)});
}
var GBIF_G=[[212,'Uccelli','#4fc3f7'],[6,'Piante','#81c784'],[359,'Mammiferi','#ffb74d'],[131,'Anfibi','#ba68c8'],[358,'Rettili','#e57373'],[204,'Pesci','#4db6ac'],[216,'Insetti','#fff176'],[5,'Funghi','#bcaaa4']];
function loadGBIF(){
  var v=vb(),key=+$('#gbifG').value,g=GBIF_G.filter(function(x){return x[0]===key})[0];setStatus('gbif','carico…');XL.gbif.clearLayers();
  fetchJSON('https://api.gbif.org/v1/occurrence/search?taxonKey='+key+'&decimalLatitude='+v.s.toFixed(5)+','+v.n.toFixed(5)+'&decimalLongitude='+v.w.toFixed(5)+','+v.e.toFixed(5)+'&hasCoordinate=true&hasGeospatialIssue=false&limit=300&facet=speciesKey&facetLimit=200&facetMincount=1').then(function(j){
    var seen={};EXP.gbif=[];(j.results||[]).forEach(function(r){if(r.decimalLatitude==null)return;var k=(r.speciesKey||r.scientificName)+'|'+r.decimalLatitude.toFixed(4)+'|'+r.decimalLongitude.toFixed(4);if(seen[k])return;seen[k]=1;
      EXP.gbif.push({t:r.vernacularName||r.species||r.scientificName,sci:r.species||r.scientificName,lat:r.decimalLatitude,lon:r.decimalLongitude,date:(r.eventDate||'').slice(0,10),url:'https://www.gbif.org/occurrence/'+r.key,acc:r.coordinateUncertaintyInMeters,save:{lat:r.decimalLatitude,lon:r.decimalLongitude,cat:key===6?'flora':key===5?'fungo':'fauna',title:r.species||r.scientificName,sp:{com:'',sci:r.species||r.scientificName,src:'GBIF (dato altrui: verifica sul posto)'},tags:['da GBIF']}})});
    EXP.gbif.forEach(function(o,i){xmarker(o.lat,o.lon,g[2],'G','<b>'+esc(o.sci)+'</b><div class="mut">'+esc(o.date)+(o.acc?' · ±'+Math.round(o.acc)+' m':'')+'</div><a href="'+esc(o.url)+'" target="_blank" rel="noopener">Scheda GBIF</a> · <a href="#" onclick="_atl.save(\'gbif\','+i+');return false">Salva come punto</a>','gbif')});
    var nsp=(j.facets&&j.facets[0]&&j.facets[0].counts||[]).length;
    setStatus('gbif',EXP.gbif.length+' punti su '+(j.count||0)+' record · '+nsp+' specie ('+g[1]+')');renderExpList('gbif');
  }).catch(function(e){setStatus('gbif','errore: '+e.message)});
}
function loadOSM(){
  var v=vb();if(map.getZoom()<13)return setStatus('osm','avvicinati di più (zoom ≥ 13)');setStatus('osm','carico…');XL.osm.clearLayers();
  var bb=v.s.toFixed(5)+','+v.w.toFixed(5)+','+v.n.toFixed(5)+','+v.e.toFixed(5);
  var q='[out:json][timeout:25];(nwr["tourism"~"viewpoint|information|picnic_site|artwork|attraction"]('+bb+');nwr["historic"]('+bb+');nwr["natural"~"tree|stone|rock|spring|peak|cave_entrance|wetland"]["name"]('+bb+');nwr["natural"~"stone|spring|peak"]('+bb+');nwr["amenity"~"drinking_water|shelter|bench|place_of_worship|parking|toilets"]('+bb+');nwr["leisure"~"bird_hide|picnic_table"]('+bb+'););out center tags 400;';
  fetch('https://overpass-api.de/api/interpreter',{method:'POST',body:'data='+encodeURIComponent(q),headers:{'Content-Type':'application/x-www-form-urlencoded'}}).then(function(r){if(!r.ok)throw new Error('HTTP '+r.status);return r.json()}).then(function(j){
    var IT={viewpoint:'punto panoramico',information:'informazioni',picnic_site:'area picnic',artwork:'opera d\'arte',attraction:'attrazione',drinking_water:'acqua potabile',shelter:'riparo',bench:'panchina',place_of_worship:'luogo di culto',parking:'parcheggio',toilets:'servizi igienici',bird_hide:'capanno birdwatching',picnic_table:'tavolo picnic',tree:'albero',stone:'masso',rock:'roccia',spring:'sorgente',peak:'cima',cave_entrance:'grotta',wetland:'zona umida'};
    EXP.osm=(j.elements||[]).map(function(e){var t=e.tags||{};var la=e.lat||(e.center&&e.center.lat),lo=e.lon||(e.center&&e.center.lon);var kind=t.tourism||t.amenity||t.leisure||t.natural||(t.historic?'storico: '+t.historic:'');
      var cat=t.historic||t.amenity==='place_of_worship'?'storia':t.natural?(t.natural==='spring'?'acqua':t.natural==='tree'?'albero':'geo'):t.tourism==='viewpoint'?'panorama':'sentiero';
      return {t:t.name||IT[kind]||kind,kind:IT[kind]||kind,lat:la,lon:lo,url:'https://www.openstreetmap.org/'+e.type+'/'+e.id,tags:t,save:{lat:la,lon:lo,cat:cat,title:t.name||IT[kind]||kind,s:{sitografia:'https://www.openstreetmap.org/'+e.type+'/'+e.id}}}}).filter(function(o){return o.lat});
    EXP.osm.forEach(function(o,i){var extra=['description','inscription','wikipedia','species','start_date','heritage'].filter(function(k){return o.tags[k]}).map(function(k){return '<div class="mut">'+k+': '+esc(o.tags[k])+'</div>'}).join('');xmarker(o.lat,o.lon,'#cfd8dc','O','<b>'+esc(o.t)+'</b><div class="mut">'+esc(o.kind)+'</div>'+extra+'<a href="'+esc(o.url)+'" target="_blank" rel="noopener">OpenStreetMap</a> · <a href="#" onclick="_atl.save(\'osm\','+i+');return false">Salva come punto</a>','osm')});
    setStatus('osm',EXP.osm.length+' elementi');renderExpList('osm');
  }).catch(function(e){setStatus('osm','errore: '+e.message)});
}
function loadMeteo(){
  setStatus('meteo','carico…');
  fetchJSON('https://api.open-meteo.com/v1/forecast?latitude='+HOME[0]+'&longitude='+HOME[1]+'&current=temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m,wind_direction_10m,cloud_cover&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,sunrise,sunset&timezone=Europe%2FRome&forecast_days=5').then(function(j){
    var c=j.current,d=j.daily,gg=['dom','lun','mar','mer','gio','ven','sab'];
    var h='<div class="card"><b>Ora al lago:</b> '+esc(WMO[c.weather_code]||'')+', '+Math.round(c.temperature_2m)+' °C · umidità '+c.relative_humidity_2m+'% · vento '+Math.round(c.wind_speed_10m)+' km/h · nuvole '+c.cloud_cover+'%</div><table class="tbl"><tr><th>Giorno</th><th>Tempo</th><th>°C</th><th>Pioggia</th><th>Sole</th></tr>';
    d.time.forEach(function(t,i){var dt=new Date(t+'T12:00');h+='<tr><td>'+gg[dt.getDay()]+' '+dt.getDate()+'</td><td>'+esc(WMO[d.weather_code[i]]||'')+'</td><td>'+Math.round(d.temperature_2m_min[i])+' / '+Math.round(d.temperature_2m_max[i])+'</td><td>'+d.precipitation_sum[i]+' mm'+(d.precipitation_probability_max?' ('+d.precipitation_probability_max[i]+'%)':'')+'</td><td>'+d.sunrise[i].slice(11)+' – '+d.sunset[i].slice(11)+'</td></tr>'});
    EXP.meteo=h+'</table><p class="mut">Fonte: Open-Meteo. Alba e tramonto sono utili per uccelli e pipistrelli.</p>';setStatus('meteo','aggiornato '+fmtDate(new Date().toISOString()).slice(-5));var b=$('#meteoBox');if(b)b.innerHTML=EXP.meteo;
  }).catch(function(e){setStatus('meteo','errore: '+e.message)});
}
function renderExpList(k){var box=$('#lst_'+k);if(!box)return;var a=EXP[k]||[];
  if(k==='inatSp'){box.innerHTML=a.length?'<div class="sug" style="max-height:340px">'+a.map(function(s){return '<div>'+(s.img?'<img src="'+esc(s.img)+'" alt="">':'')+'<span style="flex:1"><b>'+esc(s.t)+'</b> <i>'+esc(s.sci)+'</i><br><small>'+s.n+' osservazioni · <a href="'+esc(s.url)+'" target="_blank" rel="noopener">scheda</a></small></span></div>'}).join('')+'</div>':'';return}
  box.innerHTML=a.length?'<div class="sug" style="max-height:300px">'+a.map(function(o,i){return '<div data-i="'+i+'">'+(o.img?'<img src="'+esc(o.img)+'" alt="">':'')+'<span style="flex:1"><b>'+esc(o.t)+'</b>'+(o.sci&&o.sci!==o.t?' <i>'+esc(o.sci)+'</i>':'')+'<br><small>'+esc(o.kind||o.date||o.types&&o.types.join(', ')||o.ex&&o.ex.slice(0,90)||'')+(here?' · '+fmtDist(dist(here.lat,here.lon,o.lat,o.lon)):'')+'</small></span></div>'}).join('')+'</div>':'';
  $$('div[data-i]',box).forEach(function(d){d.onclick=function(){var o=a[+d.getAttribute('data-i')];go('map');map.setView([o.lat,o.lon],Math.max(map.getZoom(),17));XL[k].eachLayer(function(m){var ll=m.getLatLng();if(Math.abs(ll.lat-o.lat)<1e-7&&Math.abs(ll.lng-o.lon)<1e-7)m.openPopup()})}});
}
function renderExp(){
  var src=function(k,title,desc,controls,btn){return '<div class="card"><div class="row"><b style="flex:1">'+title+'</b><label class="mut"><input type="checkbox" data-xl="'+k+'" '+(map.hasLayer(XL[k])?'checked':'')+'> sulla mappa</label></div><div class="mut">'+desc+'</div>'+(controls||'')+'<div class="row" style="margin-top:6px"><button class="btn s f" id="ld_'+k+'">'+(btn||'Carica nell\'area visibile')+'</button><button class="btn s" data-clr="'+k+'">Pulisci</button><span class="mut" id="st_'+k+'">'+esc(EXP.status[k]||'')+'</span></div><div id="lst_'+k+'"></div></div>'};
  var h='<p class="mut">Ogni fonte usa la parte di mappa che stai inquadrando: prima sposta e ingrandisci la mappa sul lago, poi torna qui e premi «Carica». Dai risultati puoi <b>salvare un punto nel tuo catalogo</b>, che poi completerai e verificherai sul posto.</p>';
  h+='<h3>Meteo</h3><div class="card"><div class="row"><button class="btn s f" id="ld_meteo">Aggiorna meteo</button><span class="mut" id="st_meteo">'+esc(EXP.status.meteo||'')+'</span></div><div id="meteoBox">'+(EXP.meteo||'')+'</div></div>';
  h+='<h3>Natura</h3>';
  h+=src('inat','🐦 iNaturalist – osservazioni con foto','Osservazioni di naturalisti con foto e nomi in italiano.','<div class="row" style="margin-top:6px"><select id="inatG" style="width:auto">'+INAT_GROUPS.map(function(g){return '<option value="'+g[0]+'">'+g[1]+'</option>'}).join('')+'</select><label class="mut"><input type="checkbox" id="inatQ" checked> solo confermate (grado ricerca)</label></div>');
  h+='<div class="card"><b>📋 iNaturalist – elenco specie dell\'area</b><div class="mut">Checklist di tutte le specie confermate nell\'area inquadrata, con numero di osservazioni (usa il gruppo scelto sopra).</div><div class="row" style="margin-top:6px"><button class="btn s f" id="ld_inatSp">Crea elenco specie</button><span class="mut" id="st_inatSp">'+esc(EXP.status.inatSp||'')+'</span></div><div id="lst_inatSp"></div></div>';
  h+=src('gbif','🌍 GBIF – banca dati mondiale della biodiversità','Record di musei, atlanti, eBird, iNaturalist e altri progetti (per l\'area del lago sono più di 11.000).','<div class="row" style="margin-top:6px"><select id="gbifG" style="width:auto">'+GBIF_G.map(function(g){return '<option value="'+g[0]+'">'+g[1]+'</option>'}).join('')+'</select></div>');
  h+='<h3>Storia, cultura, luoghi</h3>';
  h+=src('wiki','📖 Wikipedia – voci geolocalizzate','Chiese, borgate, monumenti, laghi e luoghi con una voce di Wikipedia. Lingua impostabile in Altro → Impostazioni.');
  h+=src('wd','🗃️ Wikidata – elementi con coordinate','Banca dati collegata a Wikipedia: include beni culturali, edifici, alberi monumentali e altro, spesso con foto.');
  h+=src('osm','🗺️ OpenStreetMap – punti utili','Panorami, sorgenti, massi, capanni per birdwatching, fontanelle, panchine, aree picnic, edifici storici.');
  $('#expBody').innerHTML=h;
  $('#ld_meteo').onclick=loadMeteo;$('#ld_wiki').onclick=loadWiki;$('#ld_wd').onclick=loadWD;$('#ld_inat').onclick=loadINat;$('#ld_inatSp').onclick=loadINatSp;$('#ld_gbif').onclick=loadGBIF;$('#ld_osm').onclick=loadOSM;
  $$('[data-clr]').forEach(function(b){b.onclick=function(){var k=b.getAttribute('data-clr');XL[k].clearLayers();EXP[k]=[];setStatus(k,'');renderExpList(k)}});
  $$('[data-xl]').forEach(function(c){c.onchange=function(){var k=c.getAttribute('data-xl');if(c.checked)XL[k].addTo(map);else map.removeLayer(XL[k])}});
  ['wiki','wd','inat','inatSp','gbif','osm'].forEach(renderExpList);
  if(!EXP.meteo&&!EXP.status.meteo)loadMeteo();
}
