/* Atlante Lago Piccolo - Avvisi «Vicino a te» e archivio della zona.
   by Lollo ®2026 · i moduli si caricano nell'ordine dei numeri (vedi index.html) */
'use strict';
/* =================== VICINO A TE (avvisi di prossimità) =================== */
var AVI_BB=[45.030,7.340,45.090,7.450];   // zona dei Laghi di Avigliana (sud, ovest, nord, est)
var PACK_BB=[45.035,7.350,45.085,7.440];  // area dell'archivio scaricato
var NGROUPS=[['nat','🌿 Piante e funghi',['flora','albero','fungo']],['fau','🦆 Animali',['fauna']],['geo','🪨 Rocce e acqua',['geo','acqua']],['sto','⛪ Storia, arte, folclore',['storia','folclore']],['cur','💡 Curiosità e panorami',['curiosita','panorama']],['ser','🥾 Sentieri, servizi, altro',['sentiero','criticita','altro']]];
var NSRC=[['mine','I miei punti'],['wiki','Wikipedia e Wikidata'],['osm','OpenStreetMap'],['inat','iNaturalist']];
var NEAR_DEF={on:false,r:50,grp:{nat:1,fau:1,geo:1,sto:1,cur:1,ser:1},src:{mine:1,wiki:1,osm:1,inat:1},vib:1,snd:1,voice:0,notif:0,zone:1,awake:1};
var NEAR={pack:null,st:{},last:0,hits:[],wake:null,ac:null,inZone:null,barT:null,busy:false};
var SRCN={mine:'il tuo catalogo',wiki:'Wikipedia',wd:'Wikidata',osm:'OpenStreetMap',inat:'iNaturalist'};
var DIRS=['nord','nord-est','est','sud-est','sud','sud-ovest','ovest','nord-ovest'];
function NS(){if(!SET.near)SET.near={};var n=SET.near;for(var k in NEAR_DEF)if(n[k]===undefined)n[k]=JSON.parse(JSON.stringify(NEAR_DEF[k]));return n}
function inBB(b,lat,lon){return lat>=b[0]&&lat<=b[2]&&lon>=b[1]&&lon<=b[3]}
function bearing(a,b,c,d){var r=Math.PI/180,y=Math.sin((d-b)*r)*Math.cos(c*r),x=Math.cos(a*r)*Math.sin(c*r)-Math.sin(a*r)*Math.cos(c*r)*Math.cos((d-b)*r);return (Math.atan2(y,x)/r+360)%360}
function dirName(deg){return DIRS[Math.round(deg/45)%8]}
function dirTo(o){return here?dirName(bearing(here.lat,here.lon,o.lat,o.lon)):''}
function grpOf(cat){for(var i=0;i<NGROUPS.length;i++)if(NGROUPS[i][2].indexOf(cat)>=0)return NGROUPS[i][0];return 'ser'}
function nameKey(o){return String(o.t||'').toLowerCase().replace(/[^a-zàèéìòù0-9]+/g,'')+'|'+(+o.lat).toFixed(3)+'|'+(+o.lon).toFixed(3)}
function classify(s){s=(s||'').toLowerCase();
  if(/chiesa|cappella|santuario|abbazia|priorato|monastero|convento|castello|torre|monumento|lapide|palazzo|villa|ponte|museo|archeolog|pilone|cimitero|fortificazion|campanile|edicola|affresc|statua|memoriale|ricetto|mulino|sacra/.test(s))return 'storia';
  if(/lago|laghi|fiume|torrente|sorgente|cascata|stagno|palude|torbiera|canale|\brio\b|fontana|fontanile|bealera|emissario/.test(s))return 'acqua';
  if(/montagna|monte|collina|rilievo|roccia|masso|grotta|morena|vetta|cava|miniera|erratico/.test(s))return 'geo';
  if(/albero/.test(s))return 'albero';
  if(/parco|riserva|area protetta|zona speciale|sito di interesse|zona di protezione|oasi/.test(s))return 'curiosita';
  if(/comune|frazione|centro abitato|località|stazione|scuola|strada|\bvia\b|piazza|quartiere|azienda|ospedale|albergo|hotel|ristorante|impianto|club|società|edificio residenziale/.test(s))return 'altro';
  return 'curiosita'}
/* elenco di ciò che può far scattare un avviso */
function nearCands(){
  var n=NS(),out=[],seen={};
  function add(o){var sk=o.src==='wd'?'wiki':o.src;if(!n.src[sk])return;var k2=nameKey(o);if(seen[o.id]||seen[k2])return;seen[o.id]=seen[k2]=1;if(n.grp[grpOf(o.cat)])out.push(o)}
  POINTS.forEach(function(p){if(p.lat==null||isInd(p))return;var spn=p.sp?[p.sp.com,p.sp.sci].filter(Boolean).join(' · '):'';add({id:'p:'+p.id,src:'mine',t:p.title||spn||CAT(p.cat).n,sub:spn||CAT(p.cat).n,lat:p.lat,lon:p.lon,cat:p.cat,pid:p.id})});
  (NEAR.pack&&NEAR.pack.items||[]).forEach(add);
  [['wiki','wiki'],['wd','wd'],['osm','osm'],['inat','inat']].forEach(function(k){(EXP[k[0]]||[]).forEach(function(o){if(o.lat==null)return;add({id:k[0]+':'+o.url,src:k[0],t:o.t,sub:o.kind||(o.types&&o.types.join(', '))||o.sci||'',lat:o.lat,lon:o.lon,cat:o.save&&o.save.cat||'curiosita',url:o.url,img:o.img,save:o.save})})});
  return out;
}
function updNearBtn(){var b=$('#bNear');if(!b)return;var n=NS();b.classList.toggle('on',!!n.on);b.title=n.on?'Vicino a te: avvisi accesi':'Vicino a te: avvisi spenti'}
function nearCheck(force){
  var n=NS();if(!n.on||!here)return;
  var now=Date.now();if(!force&&now-NEAR.last<3000)return;NEAR.last=now;
  var z=inBB(AVI_BB,here.lat,here.lon);
  if(z!==NEAR.inZone){var first=NEAR.inZone===null;NEAR.inZone=z;if(n.zone&&!(first&&z))toast(z?'🔔 Sei nella zona «'+PL.name()+'»: avvisi attivi':'🔔 Fuori dalla zona «'+PL.name()+'»: avvisi in pausa',4000)}
  if(n.zone&&!z)return;
  if(here.acc>75)return;
  var R=n.r,hits=[];
  nearCands().forEach(function(o){var d=dist(here.lat,here.lon,o.lat,o.lon),s=NEAR.st[o.id];
    if(d<=R){if(!s||s.armed){NEAR.st[o.id]={armed:false,t:now};hits.push({o:o,d:d})}}
    else if(s&&!s.armed&&d>R*2)s.armed=true});
  if(hits.length){hits.sort(function(a,b){return a.d-b.d});nearAlert(hits)}
}
function beep(){try{var ac=NEAR.ac||(NEAR.ac=new (window.AudioContext||window.webkitAudioContext)());if(ac.state==='suspended')ac.resume();
  [0,0.22].forEach(function(t0){var o=ac.createOscillator(),g=ac.createGain(),t=ac.currentTime+t0;o.type='sine';o.frequency.value=t0?1175:880;g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(0.3,t+0.02);g.gain.exponentialRampToValueAtTime(0.0001,t+0.18);o.connect(g);g.connect(ac.destination);o.start(t);o.stop(t+0.2)})}catch(e){}}
function altre(k){return k===1?'e un\'altra cosa':'e altre '+k+' cose'}
function nearAlert(hits){
  var n=NS(),h0=hits[0],o=h0.o,dir=dirTo(o);
  NEAR.hits=hits;showNearBar(hits);
  if(n.vib&&navigator.vibrate)try{navigator.vibrate([180,90,180])}catch(e){}
  if(n.snd)beep();
  if(n.voice&&window.speechSynthesis&&window.SpeechSynthesisUtterance){try{var u=new SpeechSynthesisUtterance((h0.d<10?'Qui vicino':'A '+Math.round(h0.d)+' metri verso '+dir)+': '+o.t+(hits.length>1?'. E '+altre(hits.length-1).slice(2)+'.':''));u.lang='it-IT';speechSynthesis.cancel();speechSynthesis.speak(u)}catch(e){}}
  if(n.notif&&document.visibilityState==='hidden'&&window.Notification&&Notification.permission==='granted'&&navigator.serviceWorker){navigator.serviceWorker.getRegistration().then(function(r){if(r)r.showNotification('Vicino a te: '+o.t,{body:fmtDist(h0.d)+' verso '+dir+(hits.length>1?' · '+altre(hits.length-1):''),tag:'atl-near',renotify:true})}).catch(function(){})}
}
function showNearBar(hits){
  var b=$('#nearBar'),h0=hits[0],o=h0.o,c=CAT(o.cat);
  b.innerHTML='<span class="lgdot" style="background:'+c.c+'">'+c.e+'</span><span class="tx"><b>'+esc(o.t)+'</b><small>'+(h0.d<10?'qui vicino':fmtDist(h0.d)+' verso '+dirTo(o))+' · '+esc(SRCN[o.src]||o.src)+(hits.length>1?' · '+altre(hits.length-1):'')+'</small></span><button class="x" id="nbX" title="Chiudi">✕</button>';
  b.style.display='flex';
  b.onclick=function(e){if(e.target.id==='nbX'){b.style.display='none';e.stopPropagation();return}b.style.display='none';if(hits.length>1)openNear();else openNearItem(o)};
  clearTimeout(NEAR.barT);NEAR.barT=setTimeout(function(){b.style.display='none'},90000);
}
function openNearItem(o){
  if(o.src==='mine'){openDetail(o.pid);return}
  var d=here?dist(here.lat,here.lon,o.lat,o.lon):null;
  var h=(o.img?'<img src="'+esc(o.img)+'" style="max-width:100%;border-radius:10px;margin-top:6px" alt="">':'')+'<p><b>'+esc(o.t)+'</b>'+(o.sub&&o.sub!==o.t?'<br><span class="mut">'+esc(o.sub)+'</span>':'')+'</p><p class="mut">Fonte: '+esc(SRCN[o.src]||o.src)+(d!=null?' · '+fmtDist(d)+' verso '+dirTo(o):'')+'</p>'+(o.url?'<p><a href="'+esc(o.url)+'" target="_blank" rel="noopener">Apri la scheda della fonte</a></p>':'')+'<p class="mut">È un dato raccolto da altri: verificalo sul posto prima di catalogarlo.</p>';
  var bM=el('<button class="btn">Mostra sulla mappa</button>');bM.onclick=function(){closeModal();flashPoint(o.lat,o.lon,o.t,o.pid)};
  var bS=el('<button class="btn f">Salva come punto</button>');bS.onclick=function(){saveAsPoint(o.save||{lat:o.lat,lon:o.lon,cat:o.cat,title:o.t,s:o.url?{sitografia:o.url}:{},tags:['da '+(SRCN[o.src]||o.src)]})};
  openModal('Vicino a te',h,[bM,bS]);
}
function nearWake(){var n=NS();
  if(n.on&&n.awake&&gpsWatch!=null&&navigator.wakeLock&&!NEAR.wake&&document.visibilityState==='visible'){NEAR.wake='…';navigator.wakeLock.request('screen').then(function(w){NEAR.wake=w;w.addEventListener('release',function(){NEAR.wake=null})}).catch(function(){NEAR.wake=null})}
  else if(!(n.on&&n.awake&&gpsWatch!=null)&&NEAR.wake&&NEAR.wake.release){NEAR.wake.release();NEAR.wake=null}}
document.addEventListener('visibilitychange',function(){if(document.visibilityState==='visible')nearWake()});
function nearSet(on){var n=NS();n.on=on;NEAR.st={};NEAR.inZone=null;
  if(on){try{if(!NEAR.ac)NEAR.ac=new (window.AudioContext||window.webkitAudioContext)()}catch(e){}
    if(n.notif&&window.Notification&&Notification.permission==='default')Notification.requestPermission();
    if(gpsWatch==null)startLive();toast('🔔 Avvisi accesi: entro '+n.r+' m')}
  else{$('#nearBar').style.display='none';toast('Avvisi spenti')}
  saveSet();updNearBtn();nearWake();if(on)setTimeout(function(){nearCheck(true)},300)}
function openNear(){
  var n=NS(),R4=Math.max(n.r*4,300),list=[];
  if(here)nearCands().forEach(function(o){var d=dist(here.lat,here.lon,o.lat,o.lon);if(d<=R4)list.push({o:o,d:d})});
  list.sort(function(a,b){return a.d-b.d});list=list.slice(0,80);
  var st=!here?'GPS spento o in attesa della posizione.':(inBB(AVI_BB,here.lat,here.lon)?'✓ Sei nella zona «'+PL.name()+'»':'Sei fuori dalla zona «'+PL.name()+'»'+(n.zone?': avvisi in pausa':''))+(here?' · GPS ±'+Math.round(here.acc)+' m'+(here.acc>75?' (troppo impreciso: gli avvisi aspettano)':''):'');
  var pk=NEAR.pack?'Archivio della zona: <b>'+NEAR.pack.items.length+'</b> luoghi e osservazioni, scaricato il '+fmtDate(NEAR.pack.when)+'. Funziona anche senza rete.':'<b>Archivio della zona non ancora scaricato.</b> Per ora gli avvisi usano i tuoi punti e ciò che carichi in Esplora. Scaricalo una volta con la rete: poi funziona anche senza.';
  var h='<div class="card"><div class="row"><b style="flex:1">Avvisi «Vicino a te» '+(n.on?'<span class="ok">accesi</span>':'<span class="mut">spenti</span>')+'</b><button class="btn '+(n.on?'r':'f')+'" id="nOn">'+(n.on?'Spegni':'Accendi')+'</button></div><div class="mut" style="margin-top:6px">'+st+'</div></div>';
  h+='<div class="card"><div class="mut">'+pk+'</div><div class="row" style="margin-top:8px"><button class="btn s f" id="nPack">⬇️ '+(NEAR.pack?'Aggiorna':'Scarica')+' l\'archivio della zona</button></div><div class="log" id="nLog"></div></div>';
  h+='<h3>Intorno a te, entro '+fmtDist(R4)+' ('+list.length+')</h3>';
  h+=list.length?list.map(function(x,i){var o=x.o,c=CAT(o.cat);return '<div class="item" data-ni="'+i+'"><span class="lgdot" style="background:'+c.c+'">'+c.e+'</span><span class="tx"><b>'+esc(o.t)+'</b><small>'+(x.d<10?'qui vicino':fmtDist(x.d)+' verso '+dirTo(o))+' · '+esc(SRCN[o.src]||o.src)+(o.sub&&o.sub!==o.t?' · '+esc(o.sub):'')+'</small></span>'+(x.d<=n.r?'<span class="tag" style="color:var(--acc)">nel raggio</span>':'')+'</div>'}).join(''):'<p class="mut">'+(here?'Niente qui intorno con i filtri scelti.':'Accendi il GPS (⌖) o gli avvisi per vedere cosa c\'è intorno.')+'</p>';
  h+='<h3>Impostazioni avvisi</h3><div class="card">';
  h+='<label class="l">Avvisami quando sono entro</label><select id="nR">'+[10,25,50,100,200,500].map(function(r){return '<option value="'+r+'"'+(r===n.r?' selected':'')+'>'+r+' m</option>'}).join('')+'</select>';
  h+='<label class="l">Cosa segnalare</label><div class="row">'+NGROUPS.map(function(g){return '<label><input type="checkbox" data-ng="'+g[0]+'" '+(n.grp[g[0]]?'checked':'')+'> '+g[1]+'</label>'}).join('')+'</div>';
  h+='<label class="l">Fonti</label><div class="row">'+NSRC.map(function(g){return '<label><input type="checkbox" data-ns="'+g[0]+'" '+(n.src[g[0]]?'checked':'')+'> '+g[1]+'</label>'}).join('')+'</div>';
  h+='<label class="l">Come avvisarmi</label><div class="row">'+[['vib','vibrazione'],['snd','suono'],['voice','voce che legge il nome'],['notif','notifica di sistema']].map(function(g){return '<label><input type="checkbox" data-nf="'+g[0]+'" '+(n[g[0]]?'checked':'')+'> '+g[1]+'</label>'}).join('')+'</div>';
  h+='<label class="l">Quando</label><div class="row">'+[['zone','solo nella zona dei Laghi di Avigliana'],['awake','tieni lo schermo acceso']].map(function(g){return '<label><input type="checkbox" data-nf="'+g[0]+'" '+(n[g[0]]?'checked':'')+'> '+g[1]+'</label>'}).join('')+'</div>';
  h+='<div class="row" style="margin-top:8px"><button class="btn s" id="nTest">Prova l\'avviso</button></div>';
  h+='<p class="mut">Ogni cosa viene segnalata una volta; si riattiva quando te ne allontani oltre il doppio del raggio. Il browser legge il GPS solo con l\'app aperta: per questo conviene «tieni lo schermo acceso». La notifica di sistema serve se passi un attimo a un\'altra app e richiede «Installa tutto» (file sw.js).</p></div>';
  openModal('Vicino a te',h,[]);
  $('#nOn').onclick=function(){nearSet(!n.on);openNear()};
  $('#nPack').onclick=downloadPack;
  $$('[data-ni]').forEach(function(d){d.onclick=function(){openNearItem(list[+d.getAttribute('data-ni')].o)}});
  $('#nR').onchange=function(){n.r=+this.value;NEAR.st={};saveSet();nearCheck(true)};
  $$('[data-ng]').forEach(function(c){c.onchange=function(){n.grp[c.getAttribute('data-ng')]=c.checked?1:0;saveSet()}});
  $$('[data-ns]').forEach(function(c){c.onchange=function(){n.src[c.getAttribute('data-ns')]=c.checked?1:0;saveSet()}});
  $$('[data-nf]').forEach(function(c){c.onchange=function(){var k=c.getAttribute('data-nf');n[k]=c.checked?1:0;saveSet();
    if(k==='notif'&&c.checked&&window.Notification&&Notification.permission!=='granted')Notification.requestPermission().then(function(p){if(p!=='granted')toast('Notifiche non permesse dal browser')});
    if(k==='awake')nearWake();if(k==='zone'){NEAR.inZone=null;nearCheck(true)}}});
  $('#nTest').onclick=function(){var o={id:'test',src:'mine',t:'Prova: Priorato di San Bartolomeo',cat:'storia',lat:HOME[0],lon:HOME[1]};var d=here?dist(here.lat,here.lon,o.lat,o.lon):35;closeModal();var sv=here;if(!here)here={lat:HOME[0]-0.0003,lon:HOME[1],acc:5};nearAlert([{o:o,d:d}]);here=sv;$('#nearBar').onclick=function(e){$('#nearBar').style.display='none'}};
}
/* --- archivio della zona: scaricato una volta, salvato nel telefono --- */
function packBox(){var b=PACK_BB;return '&swlat='+b[0]+'&swlng='+b[1]+'&nelat='+b[2]+'&nelng='+b[3]}
function inPack(o){return o.lat!=null&&inBB(PACK_BB,o.lat,o.lon)}
function packWD(){
  var c=[(PACK_BB[0]+PACK_BB[2])/2,(PACK_BB[1]+PACK_BB[3])/2];
  var q='SELECT ?item ?itemLabel ?coord ?typeLabel ?image ?art WHERE { SERVICE wikibase:around { ?item wdt:P625 ?coord. bd:serviceParam wikibase:center "Point('+c[1].toFixed(5)+' '+c[0].toFixed(5)+')"^^geo:wktLiteral; wikibase:radius "4.5". } OPTIONAL{?item wdt:P31 ?type} OPTIONAL{?item wdt:P18 ?image} OPTIONAL{?art schema:about ?item; schema:isPartOf <https://it.wikipedia.org/>} SERVICE wikibase:label { bd:serviceParam wikibase:language "it,en". } } LIMIT 4000';
  return fetchJSON('https://query.wikidata.org/sparql?format=json&query='+encodeURIComponent(q),{headers:{Accept:'application/sparql-results+json'}}).then(function(j){var by={};
    (j.results.bindings||[]).forEach(function(b){var id=b.item.value;var m=/Point\(([-\d.]+) ([-\d.]+)\)/.exec(b.coord.value);if(!m)return;var o=by[id]||(by[id]={t:b.itemLabel?b.itemLabel.value:id,lat:+m[2],lon:+m[1],types:[],img:null,url:id,art:null});if(b.typeLabel&&o.types.indexOf(b.typeLabel.value)<0)o.types.push(b.typeLabel.value);if(b.image&&!o.img)o.img=b.image.value.replace('http://','https://')+'?width=320';if(b.art)o.art=b.art.value});
    return Object.keys(by).map(function(k){var o=by[k],ty=o.types.join(', ');if(/^Q\d+$/.test(o.t)||/entity\/Q/.test(o.t))return null;var cat=classify(o.t+' '+ty);
      return {id:'wd:'+o.url,src:'wd',t:o.t,sub:ty,lat:o.lat,lon:o.lon,cat:cat,url:o.art||o.url,img:o.img,save:{lat:o.lat,lon:o.lon,cat:cat,title:o.t,s:{sitografia:[o.url,o.art].filter(Boolean).join('\n')}}}}).filter(function(o){return o&&inPack(o)});
  });
}
function packWiki(){
  var c=[(PACK_BB[0]+PACK_BB[2])/2,(PACK_BB[1]+PACK_BB[3])/2],lang=SET.wikiLang||'it';
  return fetchJSON('https://'+lang+'.wikipedia.org/w/api.php?action=query&format=json&origin=*&list=geosearch&gscoord='+c[0].toFixed(5)+'%7C'+c[1].toFixed(5)+'&gsradius=5000&gslimit=500').then(function(j){
    return ((j.query&&j.query.geosearch)||[]).map(function(g){var u='https://'+lang+'.wikipedia.org/?curid='+g.pageid,cat=classify(g.title);return {id:'wiki:'+u,src:'wiki',t:g.title,sub:'voce di Wikipedia',lat:g.lat,lon:g.lon,cat:cat,url:u,save:{lat:g.lat,lon:g.lon,cat:cat,title:g.title,s:{sitografia:u}}}}).filter(inPack)});
}
function packOSM(){
  var b=PACK_BB,bb=b.join(',');
  var q='[out:json][timeout:60];(nwr["tourism"~"viewpoint|artwork|attraction"]('+bb+');nwr["tourism"="information"]["information"="board"]('+bb+');nwr["historic"]('+bb+');nwr["natural"~"tree|stone|rock|spring|peak|cave_entrance|wetland"]["name"]('+bb+');nwr["natural"~"stone|spring|peak|cave_entrance"]('+bb+');nwr["natural"="tree"]["denotation"~"natural_monument|landmark"]('+bb+');nwr["amenity"~"drinking_water|shelter|place_of_worship"]('+bb+');nwr["leisure"="bird_hide"]('+bb+'););out center tags 2000;';
  var IT={viewpoint:'punto panoramico',information:'pannello informativo',artwork:'opera d\'arte',attraction:'attrazione',drinking_water:'acqua potabile',shelter:'riparo',place_of_worship:'luogo di culto',bird_hide:'capanno birdwatching',tree:'albero',stone:'masso',rock:'roccia',spring:'sorgente',peak:'cima',cave_entrance:'grotta',wetland:'zona umida'};
  return overpass(q,80000).then(function(j){
    return (j.elements||[]).map(function(e){var t=e.tags||{},la=e.lat||(e.center&&e.center.lat),lo=e.lon||(e.center&&e.center.lon);
      var kind=t.historic?'storico: '+t.historic:(t.tourism||t.amenity||t.leisure||t.natural||'');var kn=IT[kind]||kind;
      var cat=t.historic||t.amenity==='place_of_worship'?'storia':t.natural?(t.natural==='spring'||t.natural==='wetland'?'acqua':t.natural==='tree'?'albero':'geo'):t.tourism==='viewpoint'?'panorama':t.tourism==='information'||t.tourism==='artwork'||t.tourism==='attraction'?'curiosita':'sentiero';
      var u='https://www.openstreetmap.org/'+e.type+'/'+e.id;var sub=[kn,t.species||t['species:it'],t.description,t.inscription].filter(Boolean).join(' · ');
      return {id:'osm:'+u,src:'osm',t:t.name||kn,sub:sub,lat:la,lon:lo,cat:cat,url:u,save:{lat:la,lon:lo,cat:cat,title:t.name||kn,s:{sitografia:u}}}}).filter(inPack)});
}
function sleep(ms){return new Promise(function(r){setTimeout(r,ms)})}
async function packINat(){
  var out=[],seen={};
  for(var pg=1;pg<=5;pg++){
    var j=await fetchJSON('https://api.inaturalist.org/v1/observations?per_page=200&page='+pg+'&order=desc&order_by=observed_on&locale=it&quality_grade=research'+packBox());
    (j.results||[]).forEach(function(o){if(!o.geojson||o.obscured||(o.positional_accuracy&&o.positional_accuracy>50))return;var t=o.taxon||{},la=o.geojson.coordinates[1],lo=o.geojson.coordinates[0];
      var k=(t.id||o.species_guess)+'|'+la.toFixed(4)+'|'+lo.toFixed(4);if(seen[k])return;seen[k]=1;
      var cat=t.iconic_taxon_name==='Plantae'?'flora':t.iconic_taxon_name==='Fungi'?'fungo':'fauna',nm=t.preferred_common_name||t.name||o.species_guess||'?';
      var ph=o.photos&&o.photos[0]&&o.photos[0].url;
      out.push({id:'inat:'+o.uri,src:'inat',t:nm,sub:(t.name&&t.name!==nm?t.name+' · ':'')+'osservato qui'+(o.observed_on?' il '+o.observed_on.split('-').reverse().join('/'):''),lat:la,lon:lo,cat:cat,url:o.uri,img:ph&&ph.replace('square','small'),save:{lat:la,lon:lo,cat:cat,title:nm,sp:{com:t.preferred_common_name||'',sci:t.name||'',src:'iNaturalist (osservazione altrui: verifica sul posto)',key:'inat:'+t.id},tags:['da iNaturalist']}})});
    if(!j.results||j.results.length<200)break;
    await sleep(1100);
  }
  return out.filter(inPack);
}
async function downloadPack(){
  if(NEAR.busy)return;
  if(!confirm('Scarico l\'archivio della zona «'+PL.name()+'» (area di circa '+Math.round((PACK_BB[2]-PACK_BB[0])*111)+' × '+Math.round((PACK_BB[3]-PACK_BB[1])*111*Math.cos(HOME[0]*Math.PI/180))+' km) da Wikidata, Wikipedia, OpenStreetMap e iNaturalist? Servono circa 1–3 MB di rete.'))return;
  NEAR.busy=true;
  var lg=$('#nLog'),btn=$('#nPack');function log(t,c){lg=$('#nLog');if(!lg)return;var d=document.createElement('div');if(c)d.className=c;d.textContent=t;lg.appendChild(d)}
  if(lg)lg.innerHTML='';if(btn)btn.disabled=true;
  var items=[],ok=0,failed=[];
  var steps=[['wd','Wikidata (beni culturali, luoghi)',packWD],['wiki','Wikipedia',packWiki],['osm','OpenStreetMap (massi, sorgenti, panorami…)',packOSM],['inat','iNaturalist (piante e animali osservati)',packINat]];
  for(var i=0;i<steps.length;i++){var s=steps[i];log('… '+s[1]);
    try{var a=await s[2]();items=items.concat(a);ok++;log('✓ '+s[1]+': '+a.length,'ok')}catch(e){failed.push(s[0]);log('✗ '+s[1]+': '+e.message,'ko')}}
  if(!ok){log('✗ Nessuna fonte raggiungibile: serve la rete. L\'archivio precedente resta com\'è.','ko');NEAR.busy=false;if(btn)btn.disabled=false;return}
  if(NEAR.pack)items=items.concat(NEAR.pack.items.filter(function(o){return failed.indexOf(o.src)>=0}));
  var seen={},clean=[];items.forEach(function(o){var k=nameKey(o);if(seen[o.id]||seen[k])return;seen[o.id]=seen[k]=1;clean.push(o)});
  NEAR.pack={when:new Date().toISOString(),items:clean};
  await DB.put('kv',{id:PL.packKey(),v:NEAR.pack});
  log('✓ Archivio salvato nel telefono: '+clean.length+' luoghi e osservazioni.','ok');
  var fx=PL.isLake()?await fixIndicative():0;if(fx)log('✓ Posizioni indicative corrette dall\'archivio: '+fx+' schede della ricerca','ok');
  NEAR.busy=false;if(btn)btn.disabled=false;NEAR.st={};nearCheck(true);
}
/* sposta le schede della ricerca con posizione indicativa sul luogo omonimo trovato nell'archivio (Wikidata, Wikipedia, OSM) */
function normTxt(s){return String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim()}
async function fixIndicative(){
  if(!NEAR.pack)return 0;var n=0,its=NEAR.pack.items.filter(function(o){return o.src!=='inat'});
  for(var i=0;i<POINTS.length;i++){var p=POINTS[i];if(!isInd(p)||!p.match||!p.match.length)continue;
    var best=null,bd=1e9;
    its.forEach(function(o){var t=normTxt(o.t);if(!p.match.some(function(m){return t.indexOf(normTxt(m))>=0}))return;var d=dist(p.lat,p.lon,o.lat,o.lon);if(d<bd&&d<6000){bd=d;best=o}});
    if(best){p.lat=best.lat;p.lon=best.lon;p.posSrc='da '+(SRCN[best.src]||best.src)+': «'+best.t+'» (verifica sul posto)';p.updated=new Date().toISOString();await DB.put('points',p);n++}}
  if(n){markChange();await loadPoints()}
  return n;
}
