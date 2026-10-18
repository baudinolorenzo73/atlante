/* Atlante di campo - Organizzazione delle schede (v4.0): Uscita, Luogo, Esporta unico, filtri del Catalogo.
   Schede in basso: Mappa · Uscita · Catalogo · Luogo · Altro.
   by Lollo ®2026 · i moduli si caricano nell'ordine dei numeri (vedi index.html) */
'use strict';
/* ---- aggiorna la scheda aperta (al posto dei vecchi «se è aperta Altro, ridisegna Altro») ---- */
function refreshPage(){
  if(curPage==='usc')renderUsc();
  else if(curPage==='alt')renderAlt();
  else if(curPage==='luo')renderLuo();
  else if(curPage==='cat')renderCat();
}

/* =================== USCITA: registrazione, percorso, tracce, diario =================== */
function renderUsc(){
  var h='';
  if(REC.on&&REC.trk){var s=trkStats(REC.trk);
    h+='<div class="card hot"><b>⏺ Registrazione in corso</b><div class="mut">'+esc(REC.trk.name||'Traccia')+' · '+fmtDist(s.d)+' · '+fmtDur(s.t)+' · '+REC.trk.pts.length+' punti</div>'
      +'<div class="row" style="margin-top:8px"><button class="btn f" id="uPocket">🕶 Modalità tasca</button><button class="btn r" id="uStop">⏹ Ferma e salva</button></div></div>';
  }else{
    h+='<div class="card"><b>Traccia GPS</b><div class="mut">Registra il percorso che fai a piedi. Con l\'Atlante tieni l\'app aperta (modalità tasca per lo schermo nero); per lo schermo spento usa GPSLogger qui sotto.</div><div class="row" style="margin-top:8px"><button class="btn f" id="uRec">⏺ Registra una traccia</button></div></div>';
  }
  h+=CAMPO.card();
  h+=GLG.card();
  h+=PC.altCard();
  h+='<h3>Diario e riepiloghi</h3><div class="card"><div class="mut">Che cosa hai visto oggi e in totale, giorno per giorno; le note del diario delle stagioni.</div><div class="row" style="margin-top:8px"><button class="btn s" id="uDia">📔 Diario</button><button class="btn s" id="uRiep">📊 Riepilogo del giorno</button></div></div>';
  h+=trkSection();
  $('#uscBody').innerHTML=h;
  var ap=PC.active();$('#uscS').textContent=REC.on?'⏺ registrazione in corso':ap?'Percorso aperto: '+ap.name:'Nessun percorso aperto';
  PC.bindAlt();bindTrk();GLG.bind();CAMPO.bind();
  if($('#uRec'))$('#uRec').onclick=function(){recStart();setTimeout(renderUsc,300)};
  if($('#uStop'))$('#uStop').onclick=function(){if(confirm('Fermare e salvare la traccia?')){recStop();setTimeout(renderUsc,300)}};
  if($('#uPocket'))$('#uPocket').onclick=pocketOn;
  $('#uDia').onclick=function(){openHub('diario',{})};$('#uRiep').onclick=function(){openHub('riep',{})};
}
/* elenco delle tracce (era in Altro) */
function trkSection(){
  var list=TRACKS.filter(function(t){return PC.showT(t)}),h='<h3>Tracce'+(PC.filtering()?' del percorso':'')+' ('+list.length+(list.length!==TRACKS.length?' di '+TRACKS.length:'')+')</h3>';
  if(list.length>1)h+='<div class="row" style="margin-bottom:6px"><button class="btn s'+(TSEL.on?' f':'')+'" id="bTSel">🔗 '+(TSEL.on?'Fine selezione':'Unisci o esporta insieme')+'</button></div>';
  if(TSEL.on)h+='<div class="card tsel"><b id="tsN"></b><div class="mut">Spunta le tracce, poi scegli. L\'ordine è quello cronologico.</div><label style="display:block;margin-top:6px"><input type="checkbox" id="tsDel"> elimina le tracce originali dopo l\'unione</label><div class="row" style="margin-top:8px"><button class="btn s f" id="tsJoin">🔗 Unisci in una traccia</button><button class="btn s" id="tsGpx">📄 Un solo GPX</button><button class="btn s" id="tsAll">Seleziona tutte</button></div></div>';
  h+=list.length?list.map(function(t){var s=trkStats(t);return '<div class="card'+(TSEL.on&&TSEL.ids[t.id]?' tson':'')+'"><div class="row">'+(TSEL.on?'<input type="checkbox" data-ts="'+t.id+'" '+(TSEL.ids[t.id]?'checked':'')+' style="width:22px;height:22px">':'')+'<b style="flex:1">'+esc(t.name)+'</b>'+(t.merged?'<span class="tag">unione di '+t.merged+'</span>':'')+'</div><div class="mut">'+s.type[0]+' '+s.type[1]+' · '+fmtDist(s.d)+' · '+fmtDur(s.t)+(s.mv&&s.mv<s.t-60000?' (in movimento '+fmtDur(s.mv)+')':'')+' · +'+s.up+' / −'+s.dn+' m</div><div class="row" style="margin-top:6px"><button class="btn s" data-tv="'+t.id+'">🗺 Mostra</button><button class="btn s" data-tst="'+t.id+'">📊 Dati e profilo</button><button class="btn s" data-tsos="'+t.id+'">✂️ Dividi alle soste</button><button class="btn s" data-tg="'+t.id+'">GPX</button><button class="btn s" data-tr="'+t.id+'">✏️ Rinomina</button><button class="btn s r" data-td="'+t.id+'">Elimina</button></div></div>'}).join(''):'<p class="mut">Nessuna traccia'+(PC.filtering()?' in questo percorso':'')+'. Avviala con ⏺ qui sopra o sulla mappa.</p>';
  return h;
}
function bindTrk(){
  if($('#bTSel'))$('#bTSel').onclick=function(){TSEL.on=!TSEL.on;TSEL.ids={};renderUsc();if(TSEL.on){var c=$('.tsel');if(c)c.scrollIntoView({block:'center'})}};
  if(TSEL.on){
    var upd=function(){var n=Object.keys(TSEL.ids).filter(function(k){return TSEL.ids[k]}).length;$('#tsN').textContent=n+' tracce selezionate';$('#tsJoin').disabled=n<2;$('#tsGpx').disabled=n<1};
    $$('[data-ts]').forEach(function(c){c.onchange=function(){TSEL.ids[c.getAttribute('data-ts')]=c.checked;c.closest('.card').classList.toggle('tson',c.checked);upd()}});
    $('#tsAll').onclick=function(){TRACKS.filter(PC.showT).forEach(function(t){TSEL.ids[t.id]=true});renderUsc()};
    $('#tsJoin').onclick=function(){joinTracks(selTracks(),$('#tsDel').checked)};
    $('#tsGpx').onclick=function(){var a=selTracks();if(!a.length)return;shareOrDownload(new Blob([toGPX([],a)],{type:'application/gpx+xml'}),'tracce_atlante_'+stamp()+'.gpx')};
    upd();
  }
  $$('[data-tv]').forEach(function(b){b.onclick=function(){var t=byId(TRACKS,b.getAttribute('data-tv'));if(t)flashTrack(t)}});
  $$('[data-tst]').forEach(function(b){b.onclick=function(){var t=byId(TRACKS,b.getAttribute('data-tst'));if(t)openTrkStats(t)}});
  $$('[data-tsos]').forEach(function(b){b.onclick=function(){var t=byId(TRACKS,b.getAttribute('data-tsos'));if(t)SOS.open(t)}});
  $$('[data-tg]').forEach(function(b){b.onclick=function(){var t=byId(TRACKS,b.getAttribute('data-tg'));if(t)shareOrDownload(new Blob([toGPX([],[t])],{type:'application/gpx+xml'}),slug(t.name)+'.gpx')}});
  $$('[data-tr]').forEach(function(b){b.onclick=function(){var t=byId(TRACKS,b.getAttribute('data-tr'));var n=t&&prompt('Nome della traccia',t.name);if(n){t.name=n;t.u=new Date().toISOString();DB.put('tracks',t).then(function(){markChange();return loadTracks()})}}});
  $$('[data-td]').forEach(function(b){b.onclick=function(){if(confirm('Eliminare la traccia?')){var tid=b.getAttribute('data-td');tomb(tid);DB.del('tracks',tid).then(function(){markChange();loadTracks()})}}});
}

/* =================== LUOGO: Capitolo · Esplora · Ricerca e fonti =================== */
var LUO={tab:'cap'};
var LUO_TABS=[['cap','📖','Capitolo'],['exp','🔭','Esplora'],['fon','🗂','Ricerca e fonti']];
function renderLuo(){
  var p=PL.active();
  $('#luoSel').innerHTML=PL.all().map(function(x){return '<option value="'+esc(x.id)+'"'+(x.id===p.id?' selected':'')+'>'+esc(x.name)+'</option>'}).join('');
  $('#luoTabs').innerHTML=LUO_TABS.map(function(t){return '<button data-lt="'+t[0]+'"'+(LUO.tab===t[0]?' class="on"':'')+'>'+t[1]+' '+t[2]+'</button>'}).join('');
  ['cap','exp','fon'].forEach(function(k){$('#'+({cap:'dosBody',exp:'expBody',fon:'fonBody'})[k]).style.display=LUO.tab===k?'':'none'});
  if(LUO.tab==='cap')renderDossier();else if(LUO.tab==='exp'){$('#dosT').textContent=p.name;$('#dosS').textContent='Dati liberi online sull\'area inquadrata nella mappa';renderExp()}else{$('#dosT').textContent=p.name;$('#dosS').textContent='Studi, foto storiche, canti, diario, fonti, mappe del passato';renderFon()}
}
function renderFon(){
  var D={studi:'Articoli scientifici e tesi sul luogo o sulla specie (OpenAlex, accesso gratuito).',foto:'Foto d\'epoca libere da Wikimedia Commons e archivi aperti, vicine al luogo.',canti:'Canti e richiami degli uccelli da ascoltare e confrontare.',diario:'Le tue note giorno per giorno: meteo, fioriture, arrivi e partenze.',riep:'Che cosa hai visto in un giorno e in totale, pronto da copiare.',fonti:'La tua biblioteca: libri, siti, PDF e dispense con le citazioni.',mappe:'Carte storiche e ortofoto del passato sopra la mappa di oggi.',n2k:'Le specie e gli habitat del sito Natura 2000 confrontati con il tuo catalogo.'};
  $('#fonBody').innerHTML='<p class="mut">Strumenti di ricerca per approfondire il luogo e le tue schede. Dalla scheda di ogni punto puoi aprirli già impostati su quel punto.</p>'+HUBT.map(function(x){return '<div class="item" data-hub="'+x[0]+'"><div class="th">'+x[1]+'</div><div class="tx"><b>'+esc(x[2])+'</b><small>'+esc(D[x[0]]||'')+'</small></div><span class="chev">›</span></div>'}).join('')
    +'<div class="item" id="fonTm"><div class="th">🕰</div><div class="tx"><b>Macchina del tempo</b><small>Scorri gli anni delle ortofoto direttamente sulla mappa.</small></div><span class="chev">›</span></div>';
  FON.bindAlt();$('#fonTm').onclick=function(){go('map');if(!TM.on)TM.open()};
}
/* scheda del luogo di lavoro (cerca, centro mappa, archivio, raggio, elimina) */
function openPlace(){
  openModal('Luogo di lavoro',PL.altCard().replace('<h3>Luogo di lavoro</h3>',''),[]);PL.bindAlt();
}

/* =================== ESPORTA: un solo punto di partenza =================== */
var EXF=[
 ['zip','📦','ZIP con foto','Dati, foto, audio, schede stampabili, GPX, KML, GeoJSON, CSV ed Excel. Con «Tutto» è il backup completo da reimportare.'],
 ['pdf','🖨','PDF delle schede','Schede con foto nel formato del corso: dal menu del browser scegli Stampa → Salva come PDF.'],
 ['xlsx','📊','Excel con foto','Foglio .xlsx con le schede, le miniature delle foto e il riepilogo.'],
 ['gpx','🧭','GPX','Punti e tracce per OsmAnd, Garmin e app di navigazione.'],
 ['kml','🌍','KML','Per Google Earth e Google My Maps.'],
 ['geojson','🗺','GeoJSON','Per QGIS e programmi GIS.'],
 ['csv','📄','CSV','Tabella semplice per Excel o Fogli, senza foto (separatore ;).']
];
function expScopes(pt){
  var S=[];if(pt)S.push(['one','Questo punto',pt.title||'(senza titolo)']);
  S.push(['all','Tutto',POINTS.length+' punti · '+TRACKS.length+' tracce']);
  var a=PC.active();if(a){var it=PC.items(a.id);S.push(['perc','Il percorso «'+a.name+'»',it.pts.length+' punti · '+it.trks.length+' tracce'])}
  var fl=POINTS.filter(passFilter).length;if(fl!==POINTS.length)S.push(['filt','Quelli filtrati nel Catalogo',fl+' punti']);
  return S;
}
function expData(sc,pt){
  var byWhen=function(a){return a.slice().sort(function(x,y){return (x.when||'').localeCompare(y.when||'')})};
  if(sc==='one')return {pts:[pt],trks:[],name:slug(pt.title||'punto').toLowerCase()+'_'+stamp(),title:pt.title||'Punto'};
  if(sc==='perc'){var a=PC.active(),it=PC.items(a.id);return {pts:it.pts,trks:it.trks,perc:a,name:PC.fname(a),title:'Percorso '+a.name}}
  if(sc==='filt')return {pts:byWhen(POINTS.filter(passFilter)),trks:[],name:'atlante_selezione_'+stamp(),title:'Selezione Atlante di campo'};
  return {pts:byWhen(POINTS),trks:TRACKS,name:'atlante_di_campo_'+stamp(),title:'Backup Atlante di campo',full:true};
}
function runExport(sc,fmt,pt){
  var d=expData(sc,pt);
  if(fmt==='share')return shareOne(pt);
  if(!d.pts.length&&!(d.trks&&d.trks.length))return toast('Non c\'è niente da esportare');
  if(fmt==='zip'){if(d.perc)return PC.zip(d.perc.id);if(d.full)return exportZip();return exportZip({pts:d.pts,trks:d.trks,name:d.name+'.zip',title:d.title,part:true})}
  if(fmt==='pdf'){if(d.perc)return PC.pdf(d.perc.id);if(!d.pts.length)return toast('Nessun punto da stampare');return printReport(d.pts)}
  if(fmt==='xlsx'){if(d.perc)return PC.excel(d.perc.id);if(!d.pts.length)return toast('Nessun punto');toast('Preparo il file Excel con le foto…',8000);return XLSX.points(d.pts,d.trks,null).then(function(b){return shareOrDownload(b,d.name+'.xlsx',d.title)}).catch(function(e){alert('Errore Excel: '+e.message)})}
  exportText(fmt,d.pts,d.trks,d.name);
}
function openExport(scope,pt){
  var S=expScopes(pt);if(!S.some(function(s){return s[0]===scope}))scope=S[0][0];
  var h='<h3>Che cosa</h3>'+S.map(function(s){return '<label class="item opt"><input type="radio" name="exS" value="'+s[0]+'"'+(s[0]===scope?' checked':'')+'><span class="tx"><b>'+esc(s[1])+'</b><small>'+esc(s[2])+'</small></span></label>'}).join('');
  h+='<h3>Formato</h3>'+(pt?'<div class="item" data-exf="share"><div class="th">📤</div><div class="tx"><b>Condividi</b><small>Testo e foto del punto con WhatsApp, email, Telegram…</small></div><span class="chev">›</span></div>':'')
    +EXF.map(function(f){return '<div class="item" data-exf="'+f[0]+'"><div class="th">'+f[1]+'</div><div class="tx"><b>'+esc(f[2])+'</b><small>'+esc(f[3])+'</small></div><span class="chev">›</span></div>'}).join('');
  openModal('Esporta',h,[]);
  $$('[data-exf]').forEach(function(b){b.onclick=function(){var r=$('input[name=exS]:checked'),sc=r?r.value:scope,f=b.getAttribute('data-exf');if(f==='share'&&sc!=='one')sc='one';closeModal();runExport(sc,f,pt)}});
}

/* =================== CATALOGO: filtri compatti =================== */
var catKind='all';
function kindOk(p){
  if(catKind==='mine')return !p.rk||!!p.note||!!(p.media&&p.media.length);
  if(catKind==='ric')return !!p.rk;
  if(catKind==='ind')return isInd(p)||(p.tags||[]).some(function(t){return /da verificare/i.test(t)});
  return true;
}
function renderCatTools(){
  var base=POINTS.filter(function(p){return typeof PC==='undefined'||PC.show(p)});
  var n={all:base.length,mine:0,ric:0,ind:0},k0=catKind;
  ['mine','ric','ind'].forEach(function(k){catKind=k;n[k]=base.filter(kindOk).length});catKind=k0;
  $('#catKind').innerHTML=[['all','Tutti'],['mine','Miei'],['ric','Ricerca'],['ind','Da verificare']].map(function(k){return '<button data-k="'+k[0]+'"'+(catKind===k[0]?' class="on"':'')+'>'+k[1]+' <b>'+n[k[0]]+'</b></button>'}).join('');
  var nc=Object.keys(filterCats).filter(function(k){return filterCats[k]}).length,open=$('#catFilter').style.display!=='none';
  $('#catTog').textContent=(nc?'Categorie: '+nc:'Categorie')+(open?' ▴':' ▾');$('#catTog').classList.toggle('f',!!nc);
  var a=PC.active();$('#catPc').innerHTML=a?(PC.filtering()?'🥾 solo «'+esc(a.name)+'» · <a href="#" id="catPcAll">mostra tutto</a>':'🥾 «'+esc(a.name)+'» aperto · <a href="#" id="catPcAll">solo il percorso</a>'):'';
  if($('#catPcAll'))$('#catPcAll').onclick=function(e){e.preventDefault();PC.toggleAll()};
}
$('#catKind').onclick=function(e){var b=e.target.closest('button');if(!b)return;catKind=b.getAttribute('data-k');renderCat();drawPoints()};
$('#catTog').onclick=function(){var f=$('#catFilter');f.style.display=f.style.display==='none'?'':'none';renderCatTools()};
$('#catExp').onclick=function(){openExport(POINTS.filter(passFilter).length!==POINTS.length?'filt':'all')};

/* =================== MAPPA: pulsante + e titolo =================== */
$('#topT').parentNode.style.pointerEvents='auto';
$('#topT').onclick=function(){map.setView(HOME,PL.isLake()?16:15)};
$('#luoSel').onchange=function(){var v=this.value;PL.switchTo(v,true).then(function(){toast('Luogo: '+PL.name());if(!NEAR.pack&&!PL.isLake())toast('Archivio non scaricato: tocca ⚙ e «Archivio della zona»',4000);renderLuo()})};
$('#luoSet').onclick=openPlace;
$('#luoTabs').onclick=function(e){var b=e.target.closest('button');if(!b)return;LUO.tab=b.getAttribute('data-lt');renderLuo();$$('#pg-luo .pb').forEach(function(x){x.scrollTop=0})};
