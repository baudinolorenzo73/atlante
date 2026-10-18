/* Atlante di campo - Collegamento con GPSLogger (v4.2), l'app Android open source che registra il GPS anche a schermo spento.
   Le due app si parlano solo con link e file (nessun codice di GPSLogger è incluso qui):
   1) link gpslogger://properties/<url> -> GPSLogger scarica il profilo «atlante» (gpslogger/atlante.properties), lo attiva e si apre;
      con startonapplaunch=true la registrazione parte da sola
   2) da GPSLogger: Condividi -> «Atlante di campo» (Web Share Target, vedi manifest e sw.js) oppure Importa: il GPX entra nel percorso aperto
   by Lollo ®2026 · i moduli si caricano nell'ordine dei numeri (vedi index.html) */
'use strict';
var GLG={pkg:'com.mendhak.gpslogger',fdroid:'https://f-droid.org/it/packages/com.mendhak.gpslogger/',gh:'https://github.com/mendhak/gpslogger/releases'};
GLG.profileUrl=function(){return new URL('gpslogger/atlante.properties',location.href.split('#')[0].split('?')[0]).href};
// intent: se GPSLogger non è installata, Chrome apre la pagina di F-Droid
GLG.link=function(){var u=GLG.profileUrl();return 'intent://properties/'+u+'#Intent;scheme=gpslogger;package='+GLG.pkg+';S.browser_fallback_url='+encodeURIComponent(GLG.fdroid)+';end'};
GLG.isAndroid=function(){return /Android/i.test(navigator.userAgent)};
GLG.open=function(first){
  if(!isWeb()||location.protocol!=='https:'){alert('Serve l\'app pubblicata su un indirizzo https:// (per esempio GitHub Pages): GPSLogger scarica il profilo da lì.');return}
  if(!GLG.isAndroid()){alert('GPSLogger esiste solo per Android: apri l\'Atlante dal telefono.');return}
  if(navigator.onLine===false){alert('Senza rete il link non può scaricare il profilo.\n\nSe hai già configurato GPSLogger una volta, apri GPSLogger dalla sua icona: con il profilo «atlante» la registrazione parte da sola.');return}
  if(first){SET.glgSetup=Date.now();saveSet()}
  SET.glgLast=Date.now();saveSet();
  location.href=GLG.link();
  setTimeout(function(){if(document.visibilityState==='visible')toast('Se non si è aperto nulla, installa GPSLogger da F-Droid e riprova',5000)},2500);
};
/* v4.4: si tiene solo GPSLogger di mendhak (si comanda dall'Atlante); da GPS Logger di BasicAirData sono state prese le idee per le statistiche delle tracce (vedi 03-gps-tracce.js) */
GLG.card=function(){
  var a=PC.active();
  var h='<h3>GPS a schermo spento: GPSLogger</h3><div class="card"><div class="mut">Il browser sospende il GPS quando spegni lo schermo. <b>GPSLogger</b> (gratuita, open source) registra in sottofondo; poi la traccia torna qui'+(a?' nel percorso «'+esc(a.name)+'»':'')+'.</div>';
  {var ok=!!SET.glgSetup;
    h+='<div class="mut" style="margin-top:6px">Si comanda da qui: un tocco la configura e avvia la registrazione. Si installa da F-Droid o GitHub.</div>'
     +(ok?'':'<div class="row" style="margin-top:8px"><a class="btn s" href="'+GLG.fdroid+'" target="_blank" rel="noopener">⬇️ Installa da F-Droid</a><a class="btn s" href="'+GLG.gh+'" target="_blank" rel="noopener">o da GitHub</a></div>')
     +'<div class="row" style="margin-top:8px">'+(ok?'<button class="btn f" id="glgRec">⏺ Registra con GPSLogger</button><button class="btn s" id="glgSet">⚙️ Riapplica il profilo</button>':'<button class="btn f" id="glgSet">⚙️ Configura GPSLogger per l\'Atlante</button>')+'<button class="btn s" id="glgImp">📥 Importa la traccia</button></div>'
     +'<details style="margin-top:8px"><summary>Come funziona</summary><div class="dc"><ol>'
     +'<li><b>Configura</b> (una volta, con la rete): GPSLogger riceve il profilo «atlante»: GPX, un punto ogni 5 s, solo GPS, scarta letture peggiori di 30 m, un file per ogni uscita. Alla prima apertura concedi la posizione «Consenti sempre» e togli GPSLogger dall\'ottimizzazione della batteria.</li>'
     +'<li><b>Registra</b>: il pulsante apre GPSLogger e la registrazione parte da sola. Senza rete apri GPSLogger dalla sua icona: con il profilo «atlante» parte lo stesso.</li>'
     +'<li>Durante l\'uscita usi l\'Atlante per le schede. In GPSLogger il pulsante <i>Annota</i> salva una nota con la posizione: diventerà un punto nel Catalogo.</li>'
     +'<li><b>Ferma</b> dalla notifica di GPSLogger (Stop).</li>'
     +'<li><b>Riporta la traccia</b>: in GPSLogger tocca ⋮ → <i>Condividi</i>, scegli il file e poi <b>Atlante di campo</b>. In alternativa «Importa la traccia» qui sopra.</li></ol></div></details>';
  }
  h+='<p class="mut" style="margin:8px 0 0">«Atlante di campo» compare tra le app di Condividi solo se l\'Atlante è installato come app. La traccia entra nel percorso aperto; reimportare lo stesso file non crea doppioni (se è cresciuto, la aggiorna).</p></div>';
  return h;
};
GLG.bind=function(){
  if($('#glgSet'))$('#glgSet').onclick=function(){GLG.open(true)};
  if($('#glgRec'))$('#glgRec').onclick=function(){GLG.open(false)};
  if($('#glgImp'))$('#glgImp').onclick=function(){$('#fImp').value='';$('#fImp').click()};
};

/* ---- file ricevuti con «Condividi» (il service worker li mette da parte e riapre l'app con ?shared=1) ---- */
GLG.takeShared=function(){
  if(!/[?&]shared=1/.test(location.search)||!window.caches)return Promise.resolve(0);
  try{history.replaceState(null,'',location.pathname)}catch(e){}
  return caches.open('atl-share').then(function(c){return c.keys().then(function(ks){
    if(!ks.length){toast('Nessun file ricevuto');return 0}
    var done=0,np=0,nt=0,skip=0;
    return Promise.all(ks.map(function(k){return c.match(k).then(function(r){return {k:k,name:decodeURIComponent(r.headers.get('x-name')||'file.gpx')}})})).then(function(L){
      var hasGpx=L.some(function(x){return /\.gpx$/i.test(x.name)});
      var drop=L.filter(function(x){return /\.txt$/i.test(x.name)||(hasGpx&&/\.(kml|kmz)$/i.test(x.name))});
      skip=drop.length;return Promise.all(drop.map(function(x){return c.delete(x.k)})).then(function(){return L.filter(function(x){return drop.indexOf(x)<0}).map(function(x){return x.k})});
    }).then(function(ks){
    return ks.reduce(function(pr,k){return pr.then(function(){return c.match(k).then(function(r){
      var name=decodeURIComponent(r.headers.get('x-name')||'file.gpx');
      return r.blob().then(function(b){var f=new File([b],name,{type:b.type});return importFile(f)}).then(function(res){done++;np+=res.np||0;nt+=res.nt||0}).catch(function(e){toast('«'+name+'»: '+e.message,5000)}).then(function(){return c.delete(k)});
    })})},Promise.resolve()).then(function(){
      return loadPoints().then(loadTracks).then(function(){
        if(done){var a=PC.active();toast('📥 Ricevuti '+done+' file'+(skip?' (altri '+skip+' formati della stessa traccia ignorati)':'')+': '+nt+(nt===1?' traccia, ':' tracce, ')+np+(np===1?' punto':' punti')+(a?' nel percorso «'+a.name+'»':''),5000);go('usc')}
        return done});
    });
  })})});
};
