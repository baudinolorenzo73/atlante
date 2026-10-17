/* Atlante di campo - Scheda Dossier: ricerca con fonti, checklist, calendario, catalogo alberi.
   by Lollo ®2026 · i moduli si caricano nell'ordine dei numeri (vedi index.html) */
'use strict';
/* =================== DOSSIER =================== */
var SRC=[
 ['Wikipedia – Laghi di Avigliana','https://it.wikipedia.org/wiki/Laghi_di_Avigliana'],
 ['Regione Piemonte – Piano di Gestione ZSC/ZPS IT1110007 «Laghi di Avigliana»','https://www.regione.piemonte.it/giscartografia/Parchi/Piani/IT1110007_PdG_Relazione_DEF.pdf'],
 ['Regione Piemonte – Piano di Tutela delle Acque, scheda L7 Avigliana Piccolo','https://www.regione.piemonte.it/web/sites/default/files/media/documenti/2018-11/l7_avigliana_piccolo.pdf'],
 ['Regione Piemonte – «Paesaggi, leggende e miti di Avigliana»','https://paesaggiopiemonte.regione.piemonte.it/cms/documentazione/pubblicazioni/36-paesaggi-leggende-e-miti-di-avigliana/file.html'],
 ['CAI UGET – depliant Parco naturale dei Laghi di Avigliana','https://tam.caiuget.it/storage/2021/11/DepliantA3_Avigliana.pdf'],
 ['FAI – Monte Moncuni','https://fondoambiente.it/luoghi/monte-moncuni'],
 ['Belis, Finsinger, Ammann (2008), Palaeogeography Palaeoclimatology Palaeoecology 264','https://boris.unibe.ch/30448'],
 ['Finsinger et al. (2003), XVI INQUA Congress – record tardoglaciale','https://gsa.confex.com/gsa/inqu/webprogram/Paper55579.html'],
 ['Tephrabase – Lago Piccolo di Avigliana (Laacher See Tephra)','https://www.tephrabase.org/cgi-bin/tbase_euro_teph1.pl?site=688'],
 ['European Pollen Database – sito LAVPICCO','https://pollen.vinc.cc/sites/LAVPICCO'],
 ['Sacra Natura – pannello «La pesca nei laghi di Avigliana»','https://www.meridiani.info/sacranatura/pannelli/avigliana_low_Parte5.pdf'],
 ['Turismo Torino – San Bartolomeo ritrovata','https://turismotorino.org/en/experiences/events/san-bartolomeo-ritrovata-avigliana'],
 ['Mole24 – Il fantasma del lago di Avigliana','https://mole24.it/2019/01/23/il-fantasma-del-lago-di-avigliana/'],
 ['CorriereNerd – Avigliana tra laghi maledetti, principi fantasma e masche','https://www.corrierenerd.it/avigliana/'],
 ['Gulliver – Lago Piccolo, anello da Sada','https://www.gulliver.it/itinerari/avigliana-lago-piccolo-anello-da-sada/2021/11/13/264488/'],
 ['Lakes.it – Lago Piccolo, area naturale e attrezzata','https://www.lakes.it/laghi-di-avigliana/lago-piccolo-di-avigliana-area-naturale-area-attrezzata-spiaggia/'],
 ['Wikipedia (en) – Lakes of Avigliana Natural Park','https://en.wikipedia.org/wiki/Lakes_of_Avigliana_Natural_Park'],
 ['Corso GEA Giaveno – dispensa «Folclore locale» (S. Berto), nel tuo Drive','https://drive.google.com/file/d/1J1Y1Y6z9u16Ps9k7eTz7fmiiVeqUC8Qn/view'],
 ['Laboratorio Alte Valli – Laghi di Avigliana','https://www.laboratorioaltevalli.it/natura-ed-escursionismo/laghi-di-avigliana'],
 ["Piemonteis – Il priorato di San Bartolomeo, antica dipendenza dei monaci clusini", "https://www.piemonteis.org/?p=6398"],
 ["Archeocarta – Avigliana (TO), Chiesa di San Bartolomeo", "https://archeocarta.org/avigliana-to-chiesa-di-san-bartolomeo/"],
 ["DireFareMole – #AviglianaSegreta: la borgata di San Bartolomeo e i colori del Medioevo", "https://direfaremole.com/2017/03/25/il-piemonte-inaspettato-la-borgata-di-san-bartolomeo-ad-avigliana-e-i-colori-del-medioevo/"],
 ["Mole24 – Torbiera di Trana: l'antico lago glaciale che racconta la preistoria", "https://mole24.it/2025/12/04/torbiera-di-trana/"],
 ["A3 Associazione Archeologica Aviglianese – Note e articoli", "https://associazione-archeologica-aviglianese.webnode.it/archeologia-aviglianese/"],
 ["komoot – Giovanni Valetti Memorial", "https://www.komoot.com/highlight/5462690"],
 ["komoot – Giro del Lago Piccolo (pista ciclabile lungolago)", "https://www.komoot.com/smarttour/40392735"],
 ["Geocaching GC5006B – Moncuni (descrizione)", "https://www.geocaching.com/geocache/GC5006B"],
 ["UET CAI Torino – Moncuni, giro ad anello (2023)", "https://www.uetcaitorino.it/public/file/2023-04-02-moncuni-giro-ad-anello.pdf"],
 ["GeoNames – località del comune di Avigliana", "https://www.geonames.org/search.html?q=avigliana&country=IT"]
];
function S(){return Array.prototype.slice.call(arguments).map(function(n){return '<sup><a href="#src'+n+'">['+n+']</a></sup>'}).join('')}
var CHECKLIST=[
 ['Uccelli acquatici','Svasso maggiore','Podiceps cristatus','nidifica; «danza dello specchio» a fine inverno–inizio primavera, nidi galleggianti, piccoli trasportati sul dorso'],
 ['Uccelli acquatici','Tuffetto','Tachybaptus ruficollis',''],
 ['Uccelli acquatici','Folaga','Fulica atra',''],
 ['Uccelli acquatici','Gallinella d\'acqua','Gallinula chloropus',''],
 ['Uccelli acquatici','Germano reale','Anas platyrhynchos','la specie di gran lunga più numerosa'],
 ['Uccelli acquatici','Moriglione','Aythya ferina','svernante'],
 ['Uccelli acquatici','Moretta','Aythya fuligula','svernante'],
 ['Uccelli acquatici','Moretta tabaccata','Aythya nyroca','di passo, Allegato I'],
 ['Uccelli acquatici','Alzavola','Anas crecca','svernante'],
 ['Uccelli acquatici','Fischione','Mareca penelope','svernante'],
 ['Uccelli acquatici','Mestolone','Spatula clypeata','svernante'],
 ['Uccelli acquatici','Strolaga mezzana','Gavia arctica','svernante, Allegato I'],
 ['Uccelli acquatici','Strolaga minore','Gavia stellata','svernante, Allegato I'],
 ['Uccelli acquatici','Cormorano','Phalacrocorax carbo',''],
 ['Aironi e simili','Airone cenerino','Ardea cinerea','garzaia nel parco'],
 ['Aironi e simili','Airone bianco maggiore','Ardea alba','svernante, Allegato I'],
 ['Aironi e simili','Airone rosso','Ardea purpurea','di passo, Allegato I'],
 ['Aironi e simili','Garzetta','Egretta garzetta','di passo, Allegato I'],
 ['Aironi e simili','Nitticora','Nycticorax nycticorax','di passo, Allegato I'],
 ['Aironi e simili','Tarabuso','Botaurus stellaris','citato per il parco'],
 ['Canneto','Porciglione','Rallus aquaticus','nidificante delle zone palustri'],
 ['Canneto','Cannaiola comune','Acrocephalus scirpaceus','nidificante nel canneto'],
 ['Canneto','Migliarino di palude','Emberiza schoeniclus','nidificante nel canneto'],
 ['Rapaci','Falco di palude','Circus aeruginosus','di passo, Allegato I'],
 ['Rapaci','Nibbio bruno','Milvus migrans',''],
 ['Rapaci','Poiana','Buteo buteo',''],
 ['Rapaci','Falco pescatore','Pandion haliaetus','di passo, Allegato I'],
 ['Rapaci','Falco pellegrino','Falco peregrinus','Allegato I'],
 ['Bosco','Picchio rosso minore','Dryobates minor',''],
 ['Bosco','Rampichino comune','Certhia brachydactyla',''],
 ['Bosco','Rigogolo','Oriolus oriolus',''],
 ['Bosco','Ghiandaia','Garrulus glandarius',''],
 ['Bosco','Martin pescatore','Alcedo atthis','tipico delle sponde (da cercare)'],
 ['Anfibi','Tritone crestato italiano','Triturus carnifex','Allegati II e IV'],
 ['Anfibi','Rospo smeraldino','Bufotes viridis',''],
 ['Anfibi','Raganella italiana','Hyla intermedia',''],
 ['Anfibi','Rana agile','Rana dalmatina',''],
 ['Anfibi','Rana di Lessona','Pelophylax lessonae',''],
 ['Rettili','Ramarro occidentale','Lacerta bilineata',''],
 ['Rettili','Lucertola muraiola','Podarcis muralis',''],
 ['Rettili','Biacco','Hierophis viridiflavus',''],
 ['Rettili','Saettone','Zamenis longissimus',''],
 ['Mammiferi','Vespertilio di Daubenton','Myotis daubentonii','pipistrello che caccia a filo d\'acqua'],
 ['Mammiferi','Barbastello','Barbastella barbastellus','Allegati II e IV'],
 ['Mammiferi','Moscardino','Muscardinus avellanarius',''],
 ['Mammiferi','Capriolo','Capreolus capreolus',''],
 ['Mammiferi','Volpe','Vulpes vulpes',''],
 ['Mammiferi','Tasso','Meles meles',''],
 ['Mammiferi','Scoiattolo rosso','Sciurus vulgaris',''],
 ['Mammiferi','Faina','Martes foina',''],
 ['Pesci','Tinca','Tinca tinca','citata già in un documento del 1820'],
 ['Pesci','Anguilla','Anguilla anguilla','citata in un documento del 1820'],
 ['Pesci','Luccio','Esox lucius',''],
 ['Pesci','Pesce persico','Perca fluviatilis',''],
 ['Pesci','Scardola','Scardinius erythrophthalmus',''],
 ['Pesci','Carpa','Cyprinus carpio',''],
 ['Pesci','Persico trota (black bass)','Micropterus salmoides','alloctono'],
 ['Pesci','Persico sole','Lepomis gibbosus','alloctono'],
 ['Pesci','Siluro','Silurus glanis','alloctono, ben insediato'],
 ['Invertebrati','Gambero di fiume','Austropotamobius pallipes','nei rii che alimentano il Lago Piccolo; Allegato II'],
 ['Invertebrati','Cervo volante','Lucanus cervus','Allegato II'],
 ['Invertebrati','Licena delle paludi','Lycaena dispar','Allegati II e IV'],
 ['Invertebrati','Zerynthia (polissena)','Zerynthia polyxena','Allegato IV'],
 ['Invertebrati','Falena dell\'edera','Euplagia quadripunctaria','Allegato II'],
 ['Invertebrati','Vertigo di Moulins','Vertigo moulinsiana','minuscolo mollusco, Allegato II'],
 ['Piante acquatiche','Erba vescica meridionale','Utricularia australis','rara, pianta carnivora acquatica'],
 ['Piante acquatiche','Brasca di Berchtold','Potamogeton berchtoldii','rara'],
 ['Piante delle sponde','Cannuccia di palude','Phragmites australis','forma il canneto'],
 ['Piante delle sponde','Tifa (mazza sorda)','Typha latifolia',''],
 ['Piante delle sponde','Ontano nero','Alnus glutinosa','alneti ripari (habitat 91E0*)'],
 ['Piante delle sponde','Salice bianco','Salix alba',''],
 ['Bosco','Farnia','Quercus robur','querco-carpineti'],
 ['Bosco','Roverella','Quercus pubescens','versanti asciutti'],
 ['Bosco','Castagno','Castanea sativa',''],
 ['Bosco','Carpino bianco','Carpinus betulus',''],
 ['Bosco','Frassino maggiore','Fraxinus excelsior',''],
 ['Bosco','Robinia','Robinia pseudoacacia','alloctona'],
 ['Rarità del sito','Dittamo','Dictamnus albus','rara'],
 ['Rarità del sito','Euforbia di Torino','Euphorbia taurinensis','rara'],
 ['Rarità del sito','Nido d\'uccello','Neottia nidus-avis','orchidea senza clorofilla'],
 ['Rarità del sito','Falasco','Cladium mariscus','paludi alcaline, soprattutto Mareschi']
];
CHK_SPECIES=CHECKLIST.map(function(r){return {g:r[0],it:r[1],sci:r[2],note:r[3]}});
function seenSci(){var s={};POINTS.forEach(function(p){if(p.rk&&!p.note&&!(p.media&&p.media.length))return;if(p.sp&&p.sp.sci)s[p.sp.sci.toLowerCase().split(' ').slice(0,2).join(' ')]=(s[p.sp.sci.toLowerCase().split(' ').slice(0,2).join(' ')]||0)+1});return s}
/* =================== SCHEDE DELLA RICERCA =================== */
// Le schede di data/schede_ricerca.js entrano nel Catalogo una sola volta (non sovrascrivono mai le tue modifiche).
function ricPoint(o,now){return {id:'ric-'+o.k,rk:o.k,cat:o.cat,title:o.t,sp:o.sp?{com:o.sp.com||'',sci:o.sp.sci||'',src:'ricerca'}:null,x:o.x||{},s:o.s||{},note:'',ric:o.ric,match:o.m||null,tags:o.tags||['ricerca'],when:now,lat:o.lat,lon:o.lon,acc:null,posSrc:o.ps||'',alt:null,altSrc:'',gpsN:0,meteo:'',comp:'Ricerca da fonti web (da verificare)',created:now,updated:now,media:[]}}
function seedResearch(force){
  if(typeof SCHEDE_RICERCA==='undefined')return Promise.resolve(0);
  var done=SET.ricDone||{},have={},now=new Date().toISOString(),add=[];
  POINTS.forEach(function(p){if(p.rk)have[p.rk]=1});
  SCHEDE_RICERCA.items.forEach(function(o){if(have[o.k])return;if(done[o.k]&&!force)return;add.push(ricPoint(o,now))});
  if(!add.length)return Promise.resolve(0);
  return Promise.all(add.map(function(p){return DB.put('points',p)})).then(function(){
    add.forEach(function(p){done[p.rk]=1});SET.ricDone=done;SET.ricV=SCHEDE_RICERCA.v;return saveSet()}).then(function(){markChange();return loadPoints()}).then(function(){return add.length});
}
function ricStats(){var n=0,ind=0;POINTS.forEach(function(p){if(p.rk){n++;if(isInd(p))ind++}});return {n:n,ind:ind,tot:typeof SCHEDE_RICERCA!=='undefined'?SCHEDE_RICERCA.items.length:0}}
function renderLakeDossier(){
  var seen=seenSci();var nseen=0;CHK_SPECIES.forEach(function(s){if(seen[s.sci.toLowerCase()]||CHECK[s.sci])nseen++});
  var h=CAP.head();
  h+='<div class="card"><b>Lago Piccolo di Avigliana</b> (Lago di Trana, anticamente Lago di San Bartolomeo)<div class="mut">Superficie 61 ha · profondità massima 12 m · quota circa 356 m · Parco naturale dal 1980 · ZSC e ZPS IT1110007</div></div>';
  var rs=ricStats();h+='<div class="card"><b>📚 Schede della ricerca nel Catalogo: '+rs.n+' su '+rs.tot+'</b><div class="mut">Flora, fauna, rocce, acque, storia, folclore, curiosità e sentieri, ognuna con le sue fonti. Hanno il tag «ricerca»: ampliale con le tue note, foto e audio. '+(rs.ind?rs.ind+' hanno ancora una <b style="color:var(--warn)">posizione indicativa</b> (segnaposto tratteggiato): spostale quando sei sul posto.':'')+'</div><div class="row" style="margin-top:8px"><button class="btn s f" id="ricShow">Mostra nel Catalogo</button>'+(rs.n<rs.tot?'<button class="btn s" id="ricAdd">Ripristina le '+(rs.tot-rs.n)+' mancanti</button>':'')+'</div></div>';
  h+='<details open><summary>Carta d\'identità</summary><div class="dc"><ul>'+
   '<li>È il più piccolo e più alto (circa 356 m) dei due laghi: il Lago Grande, 91 ha e 28 m di profondità, sta a circa 352 m. Il Lago Piccolo misura 61,09 ha con profondità massima di 12 m.'+S(1)+'</li>'+
   '<li>Nomi: «Lago di Trana»; anticamente «Lago di San Bartolomeo», dalla borgata e dal priorato sulla sponda sud. Sulle sue acque si affaccia anche la borgata Sada.'+S(1,16)+'</li>'+
   '<li>È alimentato da piccoli rii (il principale è il Rio Freddo) e defluisce nel Lago Grande con un canale che taglia l\'istmo tra i due laghi.'+S(1)+'</li>'+
   '<li>La Regione lo classifica come lago «caldo dimittico», cioè con due rimescolamenti delle acque all\'anno. ARPA lo campiona con una stazione al centro del lago.'+S(3)+'</li>'+
   '<li>La balneazione è vietata. È l\'ambiente più naturale del parco: prati, una fascia di boschi e il canneto.'+S(1,5)+'</li>'+
   '<li>Il Parco naturale dei Laghi di Avigliana copre circa 400 ha, è stato istituito nel 1980 e dal 2012 è gestito dall\'Ente Aree protette delle Alpi Cozie. Fa parte della rete Natura 2000 come IT1110007.'+S(2,5,17)+'</li></ul></div></details>';
  h+='<details><summary>Origine e geologia</summary><div class="dc"><ul>'+
   '<li>I laghi sono conche intermoreniche dell\'<b>anfiteatro morenico di Rivoli-Avigliana</b>, costruito da una lingua meridionale del ghiacciaio pleistocenico della Valle di Susa.'+S(1,3)+'</li>'+
   '<li>Sono riconoscibili tre cerchie moreniche: la prima separa la torbiera di Trana dal Lago Piccolo, la seconda chiude il Lago Piccolo a valle, la terza sbarra il Lago Grande.'+S(3)+'</li>'+
   '<li>Probabilmente i bacini erano quattro: la <b>torbiera di Trana</b> e la <b>palude dei Mareschi</b> sono due laghi poi colmati da detriti scesi dai versanti.'+S(5)+'</li>'+
   '<li>Nei boschi morenici si trovano grandi <b>massi erratici</b>, trasportati dal ghiacciaio.'+S(5)+'</li>'+
   '<li>Il rilievo principale del bacino è il <b>Moncuni</b> (Monte Cuneo, 642 m), fatto di <b>lherzoliti</b> (rocce del mantello terrestre) di oltre 130 milioni di anni, poi inglobate nella morena destra dell\'anfiteatro.'+S(3,6)+'</li>'+
   '<li>Sopra Avigliana affiorano <b>serpentiniti</b>, con una vegetazione rupestre tutelata (habitat 8220).'+S(2)+'</li>'+
   '<li><b>Che cosa cercare sul campo:</b> massi isolati di roccia diversa da quella sottostante (erratici); dossi allungati e arcuati (cordoni morenici); rocce verdi scure e lucide (serpentiniti); i bordi torbosi delle zone umide.</li></ul></div></details>';
  h+='<details><summary>Un archivio di 20.000 anni sotto il fondo</summary><div class="dc"><ul>'+
   '<li>I sedimenti del Lago Piccolo sono stati carotati e studiati da ricercatori delle Università di Berna e Londra. Il record pollinico del sito (LAVPICCO) copre circa gli ultimi 20.000 anni.'+S(10,8)+'</li>'+
   '<li>Gli isotopi dell\'ossigeno dei carbonati mostrano il brusco riscaldamento del <b>Bølling</b>, il ritorno al freddo del <b>Dryas recente</b> e l\'<b>oscillazione di Gerzensee</b>, con un andamento molto simile alle carote di ghiaccio della Groenlandia.'+S(8)+'</li>'+
   '<li>La vegetazione cambia con il clima: nel Bølling arrivano prima le <b>betulle</b>, poi i <b>pini</b>; nell\'Allerød si espande la <b>quercia</b>, che arretra nel Dryas recente.'+S(8,7)+'</li>'+
   '<li>A 7,68 m di profondità nella carota c\'è una traccia di <b>cenere vulcanica del Laacher See</b>, vulcano dell\'Eifel in Germania a circa 600 km di distanza, esploso circa 13.000 anni fa.'+S(9)+'</li></ul></div></details>';
  h+='<details><summary>Acque e habitat</summary><div class="dc"><ul>'+
   '<li><b>3150</b> – laghi eutrofici con vegetazione sommersa e galleggiante: è l\'habitat del lago stesso.'+S(2)+'</li>'+
   '<li><b>91E0*</b> (prioritario) – boschi ripari di ontani e frassini, con salici e pioppi, che circondano il lago.'+S(2)+'</li>'+
   '<li>Nel sito ci sono anche: paludi a falasco (7210*), fossi e canali (3260), prati da sfalcio (6510), rupi serpentinitiche (8220), querco-carpineti (9160), castagneti (9260).'+S(2)+'</li>'+
   '<li>Le torbiere storiche (7110*, 7140, 7150) sono scomparse per bonifiche ed estrazione della torba.'+S(2)+'</li>'+
   '<li>Minacce indicate dal Piano di Gestione: eutrofizzazione e inquinamento, prelievi idrici, bonifiche e drenaggi, modifiche delle sponde, pesci alloctoni, pressione turistica, espansione urbana.'+S(2)+'</li></ul></div></details>';
  h+='<details><summary>Flora</summary><div class="dc"><ul>'+
   '<li>Attorno al lago: canneto di cannuccia di palude, carici e tife; poi una fascia di salici, pioppi e ontani.'+S(2,5)+'</li>'+
   '<li>Sulle colline a ovest del lago: cedui di querce, castagno, carpino e frassino. Sul Montecapretto, più asciutto, roverella con frassino, robinia, olmo e ciliegio.'+S(5)+'</li>'+
   '<li>Rarità acquatiche: <i>Utricularia australis</i> (erba vescica, una pianta carnivora che cattura minuscoli animali in vescicole sommerse) e <i>Potamogeton berchtoldii</i>.'+S(2)+'</li>'+
   '<li>Altre rarità del sito: dittamo (<i>Dictamnus albus</i>), euforbia di Torino (<i>Euphorbia taurinensis</i>), l\'orchidea nido d\'uccello (<i>Neottia nidus-avis</i>).'+S(2)+'</li>'+
   '<li>Specie scomparse, non più ritrovate dalla prima metà del Novecento: <i>Drosera anglica</i>, <i>Hydrocharis morsus-ranae</i>, <i>Samolus valerandi</i>. Ritrovarle sarebbe una scoperta da segnalare al parco.'+S(2)+'</li>'+
   '<li>Per gli alberi hai nell\'app anche il <b>catalogo del corso</b> (144 specie e varietà dal PDF «Gli alberi – riconoscimento vegetale»): compare tra i suggerimenti quando scrivi una specie.</li></ul></div></details>';
  h+='<details><summary>Fauna</summary><div class="dc"><ul>'+
   '<li><b>Uccelli:</b> il sito conta oltre 160 specie (circa 60 nidificanti, una quarantina svernanti, una cinquantina di passo); è il terzo sito del Piemonte per lo svernamento degli acquatici.'+S(2)+'</li>'+
   '<li>Il <b>svasso maggiore</b> nidifica sui laghi: a fine inverno e inizio primavera esegue la «danza dello specchio»; poi si vedono i nidi galleggianti e i piccoli trasportati sul dorso.'+S(5,19)+'</li>'+
   '<li>Svernano moriglioni, morette, alzavole, fischioni e mestoloni; di passo strolaghe, aironi, falco pescatore e altre specie di Allegato I.'+S(2,5)+'</li>'+
   '<li><b>Anfibi:</b> il sito è particolarmente importante; ci sono tritone crestato italiano, rospo smeraldino, raganella italiana, rana agile e rana di Lessona.'+S(2)+'</li>'+
   '<li><b>Pipistrelli:</b> 12 specie, tra cui il vespertilio di Daubenton (caccia a filo d\'acqua al tramonto) e il barbastello.'+S(2)+'</li>'+
   '<li>Il raro <b>gambero di fiume</b> vive nei rii che alimentano il Lago Piccolo.'+S(5)+'</li>'+
   '<li><b>Pesci:</b> il popolamento è alterato da eutrofizzazione e immissioni; oggi ci sono specie come carpa, tinca, scardola e persico, insieme ad alloctone come persico trota, persico sole e siluro.'+S(1,2)+'</li>'+
   '<li>Apri la <b>checklist</b> qui sotto per spuntare le specie che trovi: le osservazioni del tuo catalogo vengono riconosciute da sole.</li></ul></div></details>';
  h+='<details><summary>Storia</summary><div class="dc"><ul>'+
   '<li><b>Circa 6.000 anni di pesca:</b> negli scavi della torbiera di Trana sono stati trovati ami e pagaie.'+S(11)+'</li>'+
   '<li>Sempre dalla torbiera di Trana proviene una <b>forma di fusione per spilloni</b> di epoca preromana, decorata con un cigno stilizzato e un simbolo solare.'+S(4)+'</li>'+
   '<li>Nel Medioevo è documentata la riscossione di tributi per il diritto di pesca. Un documento del 1820 descrive i laghi ricchi di tinche e anguille.'+S(11)+'</li>'+
   '<li><b>Priorato di San Bartolomeo:</b> chiesa romanica sulla sponda del Lago Piccolo, all\'esterno spoglia, con un ciclo di affreschi tardogotici all\'interno. Dipese dalla Sacra di San Michele fino al XVII secolo, poi fu abbandonata. Oggi si visita solo in date di apertura straordinaria.'+S(12)+'</li>'+
   '<li>La pesca professionale finì intorno al 1960, per il degrado causato da scarichi e motori. Il Parco (1980) e gli interventi dei comuni hanno migliorato le acque.'+S(11)+'</li>'+
   '<li>Contesto vicino: il borgo medievale di Avigliana, legato ai Savoia (qui nacquero il beato Umberto III e il Conte Rosso); il castello distrutto dal generale Catinat nel 1691; il <b>dinamitificio Nobel</b> (1872–1965) ai margini dei Mareschi, il più grande d\'Europa, oggi in parte ecomuseo.'+S(5,2)+'</li></ul></div></details>';
  h+='<details><summary>Folclore e leggende</summary><div class="dc"><ul>'+
   '<li><b>Gli «Occhi del Diavolo».</b> Così erano chiamati i due laghi. Si raccontava che il livello di uno potesse abbassarsi all\'improvviso senza che l\'altro salisse, per poi tornare normale.'+S(4)+'</li>'+
   '<li><b>Il borgo sprofondato.</b> Un pellegrino vestito di bianco chiede aiuto in un borgo ricco ma avaro: solo una vecchia vedova lo accoglie. Al mattino il pellegrino è sparito, il borgo è sprofondato e al suo posto ci sono due laghi blu «come i suoi occhi». In alcune versioni il pellegrino è Cristo e la casa della vedova si salva proprio tra il Lago Piccolo e il Lago Grande. Detto popolare: «Vijan-a vilan-a / per sua buntà a l\'è sprufundà».'+S(4,14)+'</li>'+
   '<li><b>La fata del lago.</b> Una creatura vestita di bianco vive sul fondo; solo le persone molto sensibili la percepiscono leggendo le increspature dell\'acqua. Sarebbe lei a cambiare i colori del lago, dall\'azzurro al rosato al blu cobalto.'+S(4)+'</li>'+
   '<li><b>I maiali «pesci».</b> Per mangiare carne in Quaresima, nel Medioevo si sarebbero gettati maiali nel lago per poi ripescarli come «pesci».'+S(14)+'</li>'+
   '<li><b>Il principe fantasma.</b> Il 21 dicembre 1368 Filippo II d\'Acaja, condannato per tradimento contro il cugino Amedeo VI (il Conte Verde), fu annegato nel Lago Grande gelato. Secondo una versione si salvò e morì in Portogallo nel 1418; secondo l\'altra il suo spirito riemerge ancora dalle acque.'+S(4,13)+'</li>'+
   '<li><b>Le masche del Moncuni.</b> Sulla sella tra il Forte di Avigliana e il Moncuni c\'è il «Bal d\'le Masche», il ballo delle streghe (negli statuti medievali «susmaschi»). L\'aria calda che fa «ballare» l\'erba al sole, la <i>carcaveja</i>, veniva letta come un sabba. Le masche avrebbero rubato bambini lasciando un mattone nella culla.'+S(4)+'</li>'+
   '<li><b>Il cigno e il sole.</b> Il cigno e il simbolo solare della forma di fusione di Trana richiamano il mito di Cicno, re dei Liguri trasformato in cigno mentre piangeva Fetonte, figlio del Sole (Eneide, libro X).'+S(4)+'</li>'+
   '<li>Inquadramento generale (dispensa del corso): le masche erano il tema principale delle <i>vijà</i>, le veglie invernali nelle stalle; la loro «fisica» era la capacità di fare sortilegi e trasformarsi in animali.'+S(18)+'</li>'+
   '<li><b>Ricerca sul campo:</b> chiedi agli anziani di Trana, Sada e San Bartolomeo nomi di luoghi, storie e detti in piemontese, e registrali con l\'audio dell\'app (con il loro consenso).</li></ul></div></details>';
  h+='<details><summary>Curiosità</summary><div class="dc"><ul>'+
   '<li>Il Lago Piccolo sta più in alto del Grande e gli versa le sue acque.'+S(1)+'</li>'+
   '<li>Nel fango del fondo c\'è cenere di un vulcano tedesco, con un\'età di circa 13.000 anni.'+S(9)+'</li>'+
   '<li>Dalla sponda est si vede la Sacra di San Michele specchiarsi nel lago, uno dei punti più fotografati.'+S(16)+'</li>'+
   '<li>La palude dei Mareschi, vicina al Lago Grande, è indicata come la palude più occidentale d\'Italia.'+S(17)+'</li>'+
   '<li>Nel 2016 Legambiente e il Touring Club hanno messo il Lago Grande al terzo posto tra i laghi più belli e puliti d\'Italia.'+S(1)+'</li></ul></div></details>';
  h+='<details><summary>Sentieri e servizi</summary><div class="dc"><ul>'+
   '<li><b>Anello del Lago Piccolo</b> da Sada: circa un\'ora a passo normale. Meglio in senso orario, che è il verso più segnalato. Il lato ovest corre nel bosco a filo d\'acqua; il lato est segue la strada provinciale asfaltata. In stagione ci sono 4–5 tratti fangosi brevi.'+S(15)+'</li>'+
   '<li><b>Area attrezzata</b> vicino al parcheggio: prato, spiaggetta (non balneabile), bar chiosco e wifi.'+S(16)+'</li>'+
   '<li>Da qui si sale nei boschi verso San Bernardino di Trana e il Moncuni (anello Lago Piccolo – Pera Luvera – Monte Cuneo).'+S(16)+'</li></ul></div></details>';
  h+='<details><summary>Calendario delle osservazioni</summary><div class="dc"><table class="tbl">'+
   '<tr><td><b>Dic–feb</b></td><td>Massimo degli uccelli svernanti: anatre tuffatrici, strolaghe, airone bianco maggiore. Rami spogli, buona visibilità sulle sponde.</td></tr>'+
   '<tr><td><b>Feb–apr</b></td><td>«Danza dello specchio» degli svassi; prime deposizioni della rana agile; canti degli anfibi la sera.</td></tr>'+
   '<tr><td><b>Mag–giu</b></td><td>Nidi galleggianti e piccoli di svasso sul dorso dei genitori; canneto in canto (cannaiole); libellule; fioriture del sottobosco.</td></tr>'+
   '<tr><td><b>Lug–ago</b></td><td>Pipistrelli che cacciano sull\'acqua al tramonto; insetti; vegetazione acquatica al massimo.</td></tr>'+
   '<tr><td><b>Set–nov</b></td><td>Passo migratorio (aironi, rapaci, falco pescatore); arrivo degli svernanti; funghi; colori del bosco.</td></tr></table><p class="mut">Il calendario è un\'indicazione generale ricavata dalle fonti: registra nell\'app le date reali delle tue osservazioni.</p></div></details>';
  h+='<details><summary>Checklist specie da cercare ('+nseen+'/'+CHK_SPECIES.length+')</summary><div class="dc"><p class="mut">Specie citate dalle fonti per il lago e il sito Natura 2000. ✓ verde = presente nel tuo catalogo; puoi anche spuntarle a mano. Il pulsante + crea un\'osservazione con la specie già compilata.</p>';
  var lastG='';CHK_SPECIES.forEach(function(s,i){if(s.g!==lastG){h+='<h3>'+esc(s.g)+'</h3>';lastG=s.g}var n=seen[s.sci.toLowerCase()];h+='<div class="ck"><input type="checkbox" data-ck="'+esc(s.sci)+'" '+(n||CHECK[s.sci]?'checked':'')+(n?' disabled':'')+'><div class="nm">'+(n?'<span class="ok">✓ </span>':'')+'<b>'+esc(s.it)+'</b> <i>'+esc(s.sci)+'</i>'+(s.note?'<br><i>'+esc(s.note)+'</i>':'')+(n?' <span class="ok">· '+n+' oss.</span>':'')+'</div><button class="btn s" data-add="'+i+'">+</button></div>'});
  h+='</div></details>';
  h+='<details><summary>Strumenti gratuiti consigliati</summary><div class="dc"><ul>'+
   '<li><b>Merlin Bird ID</b> (Cornell Lab): riconosce gli uccelli da foto e dal canto, funziona anche offline scaricando il pacchetto Europa.</li>'+
   '<li><b>BirdNET</b>: riconosce i canti dalle registrazioni. Puoi riascoltare gli audio salvati in questa app.</li>'+
   '<li><b>iNaturalist</b>: pubblica le tue osservazioni migliori. Diventano dati scientifici e compaiono poi nella scheda Esplora.</li>'+
   '<li><b>Pl@ntNet</b>: identificazione delle piante. Con una chiave gratuita funziona dentro questa app (Altro → Impostazioni).</li>'+
   '<li><b>Wikimedia Commons</b>: foto storiche e libere del lago e di San Bartolomeo da usare nelle schede, citando l\'autore.</li>'+
   '<li><b>Geoportale Piemonte</b>: carte storiche e attuali; i livelli principali sono già nella mappa.</li>'+
   '<li><b>Ente Aree protette Alpi Cozie</b> (sede del parco in via Monte Pirchiriano 54, Avigliana): per i dati sulle specie, le visite a San Bartolomeo e per segnalare ritrovamenti importanti.</li></ul></div></details>';
  h+='<details><summary>Fonti ('+SRC.length+')</summary><div class="dc"><ol>'+SRC.map(function(s,i){return '<li id="src'+(i+1)+'"><a href="'+s[1]+'" target="_blank" rel="noopener">'+esc(s[0])+'</a></li>'}).join('')+'</ol></div></details>';
  h+='<details><summary>Catalogo alberi del corso ('+ALBERI.length+')</summary><div class="dc"><input type="search" id="alQ" placeholder="cerca genere, specie o famiglia"><div id="alL" style="margin-top:8px"></div></div></details>';
  var keep=$$('#dosBody details').map(function(d){return d.open});
  h+=CAP.lakeExtra();
  $('#dosBody').innerHTML=h;CAP.bindHead();
  $('#ricShow').onclick=function(){query='ricerca';$('#q').value='ricerca';go('cat')};
  if($('#ricAdd'))$('#ricAdd').onclick=function(){seedResearch(true).then(function(n){toast(n===1?'1 scheda ripristinata':n+' schede ripristinate');renderDossier()})};
  if(keep.length)$$('#dosBody details').forEach(function(d,i){if(keep[i]!=null)d.open=keep[i]});
  $$('[data-ck]').forEach(function(c){c.onchange=function(){CHECK[c.getAttribute('data-ck')]=c.checked;saveCheck()}});
  $$('[data-add]').forEach(function(b){b.onclick=function(){var s=CHK_SPECIES[+b.getAttribute('data-add')];var gen=s.sci.split(' ')[0];var cat=['Alnus','Salix','Quercus','Castanea','Carpinus','Fraxinus','Robinia'].indexOf(gen)>=0?'albero':/^(Piante|Rarità)/.test(s.g)?'flora':'fauna';
    var c=here||{lat:map.getCenter().lat,lon:map.getCenter().lng};openForm(null,{draft:newDraft(c.lat,c.lon,{cat:cat,title:s.it,sp:{com:s.it,sci:s.sci,src:'checklist del lago',tratti:s.note}})});toast('Posizione provvisoria: aggiornala dal GPS o sceglila sulla mappa',4000)}});
  var al=$('#alQ');al.oninput=function(){var q=al.value.toLowerCase().trim();var r=q?ALBERI.filter(function(a){return (a[0]+' '+a[1]).toLowerCase().indexOf(q)>=0}).slice(0,40):[];$('#alL').innerHTML=r.map(function(a){return '<div class="card"><b><i>'+esc(a[0])+'</i></b> <span class="mut">'+esc(a[1])+' · '+esc(a[2])+(a[3]?' · classe '+esc(a[3]):'')+(a[4]?' · '+esc(a[4]):'')+' · pag. '+a[6]+'</span><div class="mut">'+esc(a[5])+'</div></div>'}).join('')||(q?'<p class="mut">Nessun risultato</p>':'')};
}
