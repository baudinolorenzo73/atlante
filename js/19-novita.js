/* Atlante di campo - Aggiornamento automatico e «Novità» (v3.7).
   1) All'avvio, con la rete, controlla da solo se sul sito c'è una versione più nuova: se sì mostra la barra «Aggiorna ora».
   2) Dopo un aggiornamento mostra una volta sola le novità delle versioni che non hai ancora visto
      (così la vecchia app «Lago Piccolo» si aggiorna e ti dice che ora si chiama Atlante di campo).
   by Lollo ®2026 · i moduli si caricano nell'ordine dei numeri (vedi index.html) */
'use strict';
var NOVITA=[
 ['4.8','<b>Mappe offline: copia di sicurezza in un file</b>. In ☰ Livelli → ⬇ Mappe offline, ogni area ha il pulsante <b>Esporta</b>: crea un file ZIP nella cartella Download del telefono (lo vedi nel gestore file e lo copi sul PC). Se Chrome svuota la cache o cambi telefono, <b>Importa area da file…</b> rimette tutto a posto con un tocco; il file viene controllato e quello danneggiato o sospetto viene scartato.'],
 ['4.7','<b>Mappe offline a zoom massimo</b>: inquadra sulla mappa una zona piccola, poi <b>☰ Livelli → ⬇ Mappe offline</b> (o Altro → App). Scegli le mappe (satellite, carte della Regione, OpenTopoMap, OpenStreetMap, anche i livelli sovrapposti) e lo zoom fino al massimo di ciascuna: vedi prima quante tessere e quanti MB, poi confermi. Le aree scaricate restano nel telefono, non spariscono con gli aggiornamenti e nemmeno con «Svuota mappe salvate»; ognuna si può rivedere (Vai) o eliminare. Se un server non permette il download di un livello, l\'app lo salta e te lo dice.'],
 ['4.6','<b>Altro a menu a tendina</b>: Esporta e importa, Google Drive, Impostazioni, Riconoscimento piante, App e Memoria si aprono e si chiudono con un tocco (il menu resta aperto mentre lavori). Nuovo menu <b>Riconoscimento piante (Pl@ntNet)</b>: se la chiave c\'è già vedi gli asterischi, e con <b>🔎 Verifica chiave</b> controlli subito che funzioni (e quante identificazioni restano oggi).'],
 ['4.5','<b>Strumenti da campo</b> (in Uscita, anche senza rete): <b>Clinometro</b> per misurare l\'altezza degli alberi col telefono (nella scheda Albero: «📐 Misura con il telefono», il valore si scrive da solo) e la pendenza dei versanti; <b>Sole e luna</b> con alba, tramonto, ora d\'oro, crepuscolo, fase della luna e prossima luna piena; <b>Rientro prima del buio</b>, che ti avvisa quando è ora di iniziare a tornare; <b>Declinazione magnetica</b>, che corregge anche la bussola della mappa verso il nord vero. Sulle tracce nuovo <b>✂️ Dividi alle soste</b>: trova le pause lunghe (anche quando GPSLogger non ha scritto punti perché eri fermo) e separa i tratti, ognuno con le sue statistiche.'],
 ['4.4','Per il GPS a schermo spento resta <b>GPSLogger</b>, l\'unica che si comanda dall\'Atlante. Dalle idee di GPS Logger (BasicAirData) le tracce hanno ora <b>statistiche più giuste</b>: distanza senza i «tremolii» del GPS da fermo, dislivello senza rumore, tempo in movimento, velocità, quote minima e massima, tipo di uscita stimato e <b>profilo altimetrico</b> (Uscita → traccia → 📊 Dati e profilo).'],
 ['4.3','In Uscita puoi scegliere anche <b>GPS Logger di BasicAirData</b> (Google Play) oltre a GPSLogger: la avvii dall\'Atlante, registri a schermo spento e con «Condividi con … → Atlante di campo» la traccia e le annotazioni tornano nel percorso aperto. Se arrivano insieme GPX, KML e TXT della stessa traccia, viene importato solo il GPX.'],
 ['4.2','<b>GPS a schermo spento con GPSLogger</b> (Uscita): un tocco configura l\'app open source GPSLogger con il profilo «atlante» e avvia la registrazione; poi da GPSLogger «Condividi → Atlante di campo» riporta la traccia nel percorso aperto, senza doppioni. Le annotazioni di GPSLogger diventano punti.'],
 ['4.1','<b>Nuovo stile</b>: chiaro ad alto contrasto per il sole e scuro per la sera, scelto in automatico come il telefono (puoi fissarlo in Altro → Impostazioni → Aspetto). Icone a linea uguali, pulsanti più grandi, colore guida verde bosco.'],
 ['4.0','<b>Nuova organizzazione.</b> In basso: <b>Mappa · Uscita · Catalogo · Luogo · Altro</b>. <b>Uscita</b>: registrazione, percorso aperto, tracce e diario. <b>Luogo</b>: capitolo, Esplora e Ricerca e fonti, con la scelta del luogo in alto. Il <b>+</b> apre un menu chiaro (tieni premuto per la foto veloce). Sulla mappa restano 4 pulsanti: legenda, macchina del tempo e avvisi sono in ☰ Livelli. Nel Catalogo i filtri Tutti · Miei · Ricerca · Da verificare. Un solo <b>📤 Esporta</b> per tutto, il percorso, i filtrati o un punto.'],
 ['3.9','Correzioni: il nome delle tracce rinominate o unite ora arriva anche su Google Drive e la traccia unita resta nel suo percorso; i servizi online hanno un tempo massimo e danno un messaggio chiaro se la rete non risponde; codice ripulito dai doppioni.'],
 ['3.8','<b>Dossier del lago più ricco</b>, dal Piano di Gestione 2017: nuova sezione «Rii, canali e livello dell\'acqua» (Rio Freddo, Giacomino, Bui, Grosso, canali Meana e Naviglia, risorgive), tabella dei due laghi, regole utili in campo. Nel Catalogo 10 nuove schede e 5 corrette (il «Rio Giacomo» è il Rio Giacomino); le schede che hai già modificato restano come le hai lasciate.'],
 ['3.7','Aggiornamento automatico: all\'avvio l\'app controlla da sola se c\'è una versione nuova e ti propone «Aggiorna ora». Dopo ogni aggiornamento vedi qui le novità.'],
 ['3.6','L\'app si chiama <b>Atlante di campo</b>: funziona per qualsiasi luogo, a partire dal Lago Piccolo di Avigliana. I tuoi dati, i backup e la cartella su Drive restano gli stessi (la cartella viene rinominata da sola).'],
 ['3.5','<b>Capitoli del Dossier</b>: il Lago Piccolo ha il suo capitolo scritto a mano; per ogni altro luogo l\'app scarica un capitolo (Wikipedia, Wikidata, clima, specie iNaturalist, OpenStreetMap, geologia) che funziona anche senza rete.'],
 ['3.4','<b>Dividi per giorno</b>: separa in un tocco le uscite di giorni diversi (Altro → Percorsi).'],
 ['3.3','<b>Percorsi</b>: ogni uscita con le sue schede, foto e tracce; nuovo, apri, chiudi; esporta in ZIP, PDF con schema ed <b>Excel con le foto</b>.'],
 ['3.2','Procedura guidata per l\'ID client di Google Drive.'],
 ['3.1','<b>Sincronizzazione con Google Drive</b> tra telefono, tablet e PC.'],
 ['3.0','Più luoghi di lavoro e casella di ricerca 🔍.']
];
var NOV={};
NOV.cmp=function(a,b){a=String(a||'0').split('.').map(Number);b=String(b||'0').split('.').map(Number);for(var i=0;i<Math.max(a.length,b.length);i++){var x=a[i]||0,y=b[i]||0;if(x!==y)return x<y?-1:1}return 0};
NOV.show=function(force){
  var seen=SET.seenVer,list=NOVITA.filter(function(n){return NOV.cmp(n[0],VERSION)<=0&&(force||!seen||NOV.cmp(n[0],seen)>0)});
  if(!force&&!seen){list=list.slice(0,4);if(!POINTS.length&&!TRACKS.length)list=[]}   // installazione nuova senza dati: niente popup
  SET.seenVer=VERSION;saveSet();
  if(!list.length)return;
  var h='<p>'+(force?'Le novità delle ultime versioni.':'L\'app è stata aggiornata alla versione <b>'+esc(VERSION)+'</b>. Punti, foto, percorsi e tracce sono al loro posto.')+'</p>'+list.map(function(n){return '<div class="card"><b>Versione '+n[0]+'</b><div style="margin-top:4px">'+n[1]+'</div></div>'}).join('');
  openModal('🆕 Novità',h,[mkBtn('Ho capito','f',closeModal)]);
};
NOV.reload=function(){
  if(REC.on){toast('Prima ferma la registrazione della traccia, poi aggiorna',4000);return}
  if($('#modal').classList.contains('on')){toast('Chiudi la scheda aperta (salva o annulla), poi aggiorna',4000);return}
  var bar=$('#novBar');if(bar)bar.innerHTML='Aggiorno…';
  (window.caches?caches.keys().then(function(ks){return Promise.all(ks.filter(function(k){return k.indexOf('atl-shell')===0}).map(function(k){return caches.delete(k)}))}):Promise.resolve())
    .then(function(){return navigator.serviceWorker?navigator.serviceWorker.getRegistration():null}).then(function(r){return r&&r.update()}).catch(function(){})
    .then(function(){location.reload()});
};
NOV.bar=function(v){
  if($('#novBar'))return;var d=document.createElement('div');d.id='novBar';
  d.innerHTML='🆕 È pronta la versione <b>'+esc(v||'nuova')+'</b> <button class="btn f" id="novGo">Aggiorna ora</button> <button class="btn s" id="novNo">Dopo</button>';
  document.body.appendChild(d);$('#novGo').onclick=NOV.reload;$('#novNo').onclick=function(){d.remove()};
};
NOV.check=function(){
  if(!isWeb()||!isModular()||navigator.onLine===false)return Promise.resolve(null);
  return fetch(new URL('js/version.js',location.href).href,{cache:'no-store'}).then(function(r){return r.ok?r.text():''}).then(function(t){
    var m=/var BUILD='([^']+)'/.exec(t),v=/var VERSION='([^']+)'/.exec(t);
    if(m&&m[1]!==BUILD){NOV.bar(v&&v[1]);return m[1]}return null;
  }).catch(function(){return null});
};
NOV.start=function(){NOV.show(false);setTimeout(NOV.check,4000);document.addEventListener('visibilitychange',function(){if(document.visibilityState==='visible'&&Date.now()-(NOV.last||0)>3600000){NOV.last=Date.now();NOV.check()}});NOV.last=Date.now()};
