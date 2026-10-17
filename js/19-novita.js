/* Atlante di campo - Aggiornamento automatico e «Novità» (v3.7).
   1) All'avvio, con la rete, controlla da solo se sul sito c'è una versione più nuova: se sì mostra la barra «Aggiorna ora».
   2) Dopo un aggiornamento mostra una volta sola le novità delle versioni che non hai ancora visto
      (così la vecchia app «Lago Piccolo» si aggiorna e ti dice che ora si chiama Atlante di campo).
   by Lollo ®2026 · i moduli si caricano nell'ordine dei numeri (vedi index.html) */
'use strict';
var NOVITA=[
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
