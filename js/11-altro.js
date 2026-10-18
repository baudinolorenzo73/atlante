/* Atlante di campo - Scheda Altro e menu dei livelli.
   by Lollo ®2026 · i moduli si caricano nell'ordine dei numeri (vedi index.html) */
'use strict';
/* =================== PAGINA ALTRO =================== */
/* ---- unione di tracce ---- */
var TSEL={on:false,ids:{}};
function selTracks(){return TRACKS.filter(function(t){return TSEL.ids[t.id]}).sort(function(a,b){return (a.pts[0]?a.pts[0][3]:a.start)-(b.pts[0]?b.pts[0][3]:b.start)})}
function joinTracks(a,delOld){
  if(a.length<2)return toast('Scegli almeno 2 tracce');
  if(REC.on&&a.some(function(t){return t.id===REC.trk.id}))return toast('Ferma prima la registrazione in corso');
  var pts=[],brk=[],dur=0,names=[],nmerg=0;
  a.forEach(function(t,i){if(i>0&&pts.length)brk.push(pts.length);(t.brk||[]).forEach(function(b){brk.push(pts.length+b)});pts=pts.concat(t.pts.map(function(p){return p.slice()}));dur+=trkStats(t).t;names=names.concat(t.from||[t.name]);nmerg+=(t.merged||1)});
  var t0=a[0].start,t1=a[a.length-1].end||a[a.length-1].start;
  var nm='Unione '+fmtDate(new Date(t0).toISOString())+' – '+fmtDate(new Date(t1).toISOString()).slice(-5);
  var pc=a[0].perc||null;if(a.some(function(t){return (t.perc||null)!==pc}))pc=PC.cur||null;
  var nt={id:uid(),name:nm,start:t0,end:t1,pts:pts,brk:brk,dur:dur,merged:nmerg,from:names,perc:pc,u:new Date().toISOString()};
  var ops=[DB.put('tracks',nt)];if(delOld)a.forEach(function(t){ops.push(DB.del('tracks',t.id));tomb(t.id)});
  Promise.all(ops).then(function(){markChange();TSEL.on=false;TSEL.ids={};tones([[660,.1],[880,.1],[1100,.16]]);toast('🔗 Unite '+a.length+' tracce ('+nmerg+' registrazioni): '+fmtDist(trkStats(nt).d)+(delOld?' (originali eliminate)':' (le originali restano)'),4500);return loadTracks()}).then(function(){flashTrack(nt)});
}

/* stato dei menu a tendina di Altro (resta aperto quando la pagina si ridisegna) */
var ALT_OPEN={};
function altSec(id,title,body){return '<details class="sec" data-sec="'+id+'"'+(ALT_OPEN[id]?' open':'')+'><summary>'+title+'</summary><div class="secb">'+body+'</div></details>'}
/* chiave Pl@ntNet: se c'è già si vedono solo gli asterischi; se non si tocca resta quella salvata */
function pnStars(){return SET.plantnet?'*'.repeat(Math.min(SET.plantnet.length,12)):''}
function pnVal(){var v=($('#sPn').value||'').trim();return /^\*+$/.test(v)?(SET.plantnet||''):v}
function pnVerify(){
  var k=pnVal(),st=$('#pnSt'),btn=$('#bPnV');
  if(!k){st.innerHTML='<span style="color:var(--warn)">Incolla prima la chiave.</span>';return}
  if(navigator.onLine===false){st.innerHTML='<span style="color:var(--warn)">Serve la rete per verificare la chiave.</span>';return}
  st.textContent='Verifico la chiave…';btn.disabled=true;
  var done=function(html){st.innerHTML=html;btn.disabled=false};
  fetchJSON('https://my-api.plantnet.org/v2/quota/daily?api-key='+encodeURIComponent(k),null,15000).then(function(r){
    var left=null;try{var q=r&&(r.identify||r.identification||r);if(q&&q.remaining!=null)left=q.remaining;else if(q&&q.count!=null&&q.limit!=null)left=q.limit-q.count}catch(e){}
    var changed=k!==SET.plantnet;if(changed){SET.plantnet=k;saveSet()}
    $('#sPn').type='text';$('#sPn').value=pnStars();
    done('<span style="color:var(--ok)">✓ Chiave valida'+(changed?' e salvata':'')+'.</span>'+(left!=null?' Identificazioni rimaste oggi: <b>'+left+'</b>.':''));
  }).catch(function(e){
    var m=String(e&&e.message||e),c=(m.match(/HTTP (\d+)/)||[])[1];
    if(c==='401'||c==='403'||c==='404')done('<span style="color:var(--bad)">✗ Chiave non valida o non attiva ('+c+'). Controlla di averla copiata tutta, senza spazi.</span>');
    else if(c==='429')done('<span style="color:var(--warn)">La chiave è valida ma le richieste di oggi sono esaurite (429).</span>');
    else if(c)done('<span style="color:var(--warn)">Pl@ntNet ha risposto con un errore ('+c+'): non riesco a dire se la chiave è valida. Riprova più tardi.</span>');
    else done('<span style="color:var(--warn)">Non riesco a raggiungere Pl@ntNet ('+esc(m)+'). Controlla la rete e riprova.</span>');
  });
}
function renderAlt(){
  var late=SET.changes>0,h='';
  h+=altSec('exp','📦 Esporta e importa'+(late?' <b style="color:var(--warn);font-weight:600">· '+SET.changes+' da salvare</b>':''),
    '<div class="card"><div class="mut">Ultimo backup: '+(SET.lastBackup?fmtDate(new Date(SET.lastBackup).toISOString()):'mai')+'</div>'
    +'<div class="row" style="margin-top:8px"><button class="btn f" id="bZip">📦 Backup completo</button><button class="btn" id="bExp">📤 Esporta…</button><button class="btn" id="bImp">📥 Importa</button></div>'
    +'<div class="mut" style="margin-top:6px"><b>Backup completo</b>: un file ZIP con tutto (dati, foto, audio, schede, GPX, KML, CSV, Excel), da conservare o da passare a un altro telefono o al PC. <b>Esporta</b>: scegli che cosa (tutto, il percorso, i filtrati, un punto) e il formato (PDF, Excel con foto, GPX, KML, GeoJSON, CSV). <b>Importa</b>: backup ZIP di questa app (anche di un compagno: i punti si uniscono senza doppioni) o punti da GPX, KML, GeoJSON.</div></div>');
  h+=altSec('drv','☁️ Google Drive',GD.altCard().replace('<h3>Google Drive</h3>',''));
  h+=altSec('set','⚙️ Impostazioni',
    '<div class="card"><label class="l">Aspetto</label><select id="sTheme"><option value="auto"'+((SET.theme||'auto')==='auto'?' selected':'')+'>automatico (come il telefono)</option><option value="light"'+(SET.theme==='light'?' selected':'')+'>chiaro (per il sole)</option><option value="dark"'+(SET.theme==='dark'?' selected':'')+'>scuro (per la sera)</option></select>'
    +'<label class="l">Compilatore (nome sulle schede)</label><input type="text" id="sComp" value="'+esc(SET.compilatore)+'">'
    +'<label class="l">Secondi di lettura GPS per ogni punto (più lungo = più preciso)</label><select id="sGps">'+[3,5,10,20,30].map(function(n){return '<option'+(n===SET.gpsAvg?' selected':'')+'>'+n+'</option>'}).join('')+'</select>'
    +'<label class="l">Dimensione massima delle foto (lato lungo, pixel)</label><select id="sPh">'+[1280,1600,1920,2560,3200].map(function(n){return '<option'+(n===SET.photoMax?' selected':'')+'>'+n+'</option>'}).join('')+'</select>'
    +'<label class="l">Lingua di Wikipedia</label><select id="sWl"><option value="it"'+(SET.wikiLang==='it'?' selected':'')+'>italiano</option><option value="en"'+(SET.wikiLang==='en'?' selected':'')+'>inglese</option><option value="fr"'+(SET.wikiLang==='fr'?' selected':'')+'>francese</option><option value="pms"'+(SET.wikiLang==='pms'?' selected':'')+'>piemontese</option></select>'
    +'<div class="row" style="margin-top:10px"><button class="btn f" id="bSet">Salva impostazioni</button><button class="btn s" id="bNearSet">🔔 Avvisi «Vicino a te»</button></div></div>');
  h+=altSec('pn','🌿 Riconoscimento piante (Pl@ntNet)',
    '<div class="card"><div class="mut">Serve una chiave gratuita: crea un account su my.plantnet.org e copia la chiave da «Your API key».</div>'
    +'<label class="l">Chiave Pl@ntNet</label><input type="'+(SET.plantnet?'text':'password')+'" id="sPn" value="'+esc(pnStars())+'" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="incolla qui la chiave">'
    +'<div class="mut" id="pnSt" style="margin-top:6px">'+(SET.plantnet?'Chiave salvata. Per cambiarla, tocca il campo e incolla la nuova.':'Nessuna chiave salvata.')+'</div>'
    +'<div class="row" style="margin-top:8px"><button class="btn f" id="bPnV">🔎 Verifica chiave</button><button class="btn" id="bPnS">Salva chiave</button></div></div>');
  h+=altSec('app','📲 App: aggiornamento e installazione','<div class="card"><div id="appSt" class="mut">…</div><div class="row" style="margin-top:10px"><button class="btn f" id="bUpd">🔄 Aggiorna</button><button class="btn" id="bInst">⬇️ Installa tutto</button></div><div class="bar" id="instBar" style="display:none"><i></i></div><div class="log" id="instLog"></div><div class="mut" style="margin-top:8px"><b>Aggiorna</b>: cerca online una versione più recente e la carica. Punti, foto e audio restano dove sono.<br><b>Installa tutto</b>: aggiunge l\'icona alla schermata Home, salva l\'app nel telefono e scarica le mappe dell\'area del luogo per vederle anche senza rete.</div><div class="row" style="margin-top:8px"><button class="btn s" id="bAree">⬇ Mappe offline…</button><button class="btn s r" id="bClrT">Svuota mappe salvate</button></div><div class="mut" style="margin-top:8px"><b>Mappe offline</b>: scarichi un\'area piccola (quella che vedi sulla mappa) con lo zoom fino al massimo; resta nel telefono e non viene cancellata dagli aggiornamenti. <b>Svuota mappe salvate</b> toglie solo le tessere viste o scaricate con «Installa tutto», non le aree offline.</div></div>');
  h+=altSec('mem','💾 Memoria','<div class="card" id="memBox"><span class="mut">calcolo…</span></div>');
  h+='<p class="mut">Atlante di campo v'+VERSION+' · '+BRAND+' · <a href="#" id="novAll">🆕 Novità</a></p>';
  $('#altBody').innerHTML=h;GD.bindAlt();
  $$('#altBody details.sec').forEach(function(d){d.addEventListener('toggle',function(){ALT_OPEN[d.getAttribute('data-sec')]=d.open})});
  $('#novAll').onclick=function(e){e.preventDefault();NOV.show(true)};
  $('#bZip').onclick=function(){exportZip()};$('#bExp').onclick=function(){openExport('all')};
  $('#bImp').onclick=function(){$('#fImp').value='';$('#fImp').click()};
  $('#bNearSet').onclick=openNear;$('#bUpd').onclick=doUpdate;$('#bInst').onclick=installAll;$('#bClrT').onclick=clearTiles;$('#bAree').onclick=openAree;if(inst.busy)$('#bInst').textContent='⏹ Annulla';renderAppSt();
  if($('#sTheme'))$('#sTheme').onchange=function(){SET.theme=this.value;applyTheme();saveSet()};
  $('#sPn').onfocus=function(){if(/^\*+$/.test(this.value))this.select()};
  $('#sPn').oninput=function(){this.type=(!this.value||/^\*+$/.test(this.value))?'text':'password'};
  $('#bPnV').onclick=pnVerify;
  $('#bPnS').onclick=function(){var k=pnVal();SET.plantnet=k;saveSet().then(function(){$('#sPn').type=k?'text':'password';$('#sPn').value=pnStars();$('#pnSt').textContent=k?'Chiave salvata (non ancora verificata: tocca «Verifica chiave»).':'Chiave rimossa.'})};
  $('#bSet').onclick=function(){SET.compilatore=$('#sComp').value.trim();SET.gpsAvg=+$('#sGps').value;SET.photoMax=+$('#sPh').value;SET.wikiLang=$('#sWl').value;if($('#sTheme')){SET.theme=$('#sTheme').value;applyTheme()}saveSet().then(function(){toast('Impostazioni salvate')})};
  var mb=$('#memBox');var txt=DB.ok?'':'<b style="color:var(--bad)">Attenzione: il browser non permette di salvare dati da questa pagina.</b> Succede se apri il file da un\'app di gestione file. Pubblica la pagina (per esempio su GitHub Pages con la tua «Pubblica») e aprila dall\'indirizzo web. Fino ad allora i dati restano solo finché la pagina è aperta: esporta il backup prima di chiudere.<br>';
  if(navigator.storage&&navigator.storage.estimate){navigator.storage.estimate().then(function(e){navigator.storage.persisted?navigator.storage.persisted().then(function(p){mb.innerHTML=txt+'Spazio usato: <b>'+fmtSize(e.usage||0)+'</b> su circa '+fmtSize(e.quota||0)+' disponibili.<br>'+(p?'<span class="ok">Archivio protetto: il browser non lo cancellerà da solo.</span>':'<span class="mut">Archivio non ancora protetto: il browser potrebbe cancellarlo se manca spazio. Fai backup regolari.</span>')}):mb.innerHTML=txt+'Spazio usato: '+fmtSize(e.usage||0)})}else mb.innerHTML=txt||'<span class="mut">Informazioni sulla memoria non disponibili.</span>';
}
/* tema chiaro / scuro: «auto» segue il telefono */
function applyTheme(){var t=SET.theme||'auto';if(t==='auto')document.documentElement.removeAttribute('data-theme');else document.documentElement.setAttribute('data-theme',t);
  var dark=t==='dark'||(t==='auto'&&window.matchMedia&&matchMedia('(prefers-color-scheme: dark)').matches);var m=document.querySelector('meta[name=theme-color]');if(m)m.content=dark?'#14181c':'#f6f7f4'}

/* =================== LIVELLI MAPPA =================== */
function openLayers(){
  var nOn=NS().on;
  var h='<div class="tools"><button class="tool" id="lyLeg"><i>ⓘ</i>Legenda</button><button class="tool'+(TM.on?' on':'')+'" id="lyTm"><i>🕰</i>Macchina del tempo</button><button class="tool'+(nOn?' on':'')+'" id="lyNear"><i>🔔</i>Vicino a te'+(nOn?' · acceso':'')+'</button><button class="tool" id="lyHome"><i>◎</i>Centra sul luogo</button><button class="tool" id="lyOff"><i>⬇</i>Mappe offline</button></div>';
  h+='<h3>Mappa di base</h3>'+BASES.map(function(b){return '<label class="item" style="cursor:pointer"><input type="radio" name="base" value="'+b.id+'" '+(b.id===baseId?'checked':'')+'><span class="tx"><b>'+esc(b.n)+'</b><small>'+esc(b.d)+'</small></span></label>'}).join('');
  var lg='';OVERS.forEach(function(o){if(o.g!==lg){h+='<h3>'+esc(o.g)+'</h3>';lg=o.g}h+='<div class="item"><input type="checkbox" data-ov="'+o.id+'" '+(overOn[o.id]?'checked':'')+'><span class="tx"><b>'+esc(o.n)+'</b></span><input type="range" min="10" max="100" value="'+Math.round(o.op*100)+'" data-op="'+o.id+'" style="width:90px"></div>'});
  h+='<h3>I miei dati</h3><div class="item"><input type="checkbox" id="lyP" '+(showPoints?'checked':'')+'><span class="tx"><b>Punti del catalogo</b><small>il filtro del Catalogo vale anche qui</small></span></div><div class="item"><input type="checkbox" id="lyA" '+(SET.arrowOff?'':'checked')+'><span class="tx"><b>Freccia rossa verso la specie più vicina</b><small>con il GPS acceso</small></span></div><div class="item" style="padding-left:30px"><input type="checkbox" id="lyAm" '+(SET.arrowMine?'':'checked')+'><span class="tx"><b>…anche le osservazioni di iNaturalist</b><small>oltre alle specie del tuo catalogo (serve l\'archivio della zona o Luogo → Esplora)</small></span></div><div class="item"><input type="checkbox" id="lyI" '+(SET.hideInd?'':'checked')+'><span class="tx"><b>Schede con posizione indicativa</b><small>segnaposto tratteggiati, da spostare sul posto</small></span></div><div class="item"><input type="checkbox" id="lyT" '+(showTracks?'checked':'')+'><span class="tx"><b>Tracce</b></span></div>';
  h+='<p class="mut">Per animali, piante, Wikipedia e OpenStreetMap usa <b>Luogo → Esplora</b>.</p>';
  openModal('Livelli della mappa',h,[]);
  $$('input[name=base]').forEach(function(r){r.onchange=function(){setBase(r.value)}});
  $$('[data-ov]').forEach(function(c){c.onchange=function(){setOver(OVERS.filter(function(o){return o.id===c.getAttribute('data-ov')})[0],c.checked)}});
  $$('[data-op]').forEach(function(r){r.oninput=function(){var o=byId(OVERS,r.getAttribute('data-op'));o.op=r.value/100;if(overLayers[o.id])overLayers[o.id].setOpacity(o.op)}});
  $('#lyLeg').onclick=openLegend;$('#lyTm').onclick=function(){closeModal();TM.on?TM.close():TM.open()};$('#lyNear').onclick=openNear;$('#lyHome').onclick=function(){closeModal();map.setView(HOME,PL.isLake()?16:15)};$('#lyOff').onclick=function(){closeModal();openAree()};
  $('#lyA').onchange=function(){SET.arrowOff=!this.checked;saveSet();updArrow(true)};$('#lyAm').onchange=function(){SET.arrowMine=!this.checked;saveSet();updArrow(true)};
  $('#lyI').onchange=function(){SET.hideInd=!this.checked;saveSet();drawPoints()};
  $('#lyP').onchange=function(){showPoints=this.checked;drawPoints()};$('#lyT').onchange=function(){showTracks=this.checked;drawTracks()};
}
