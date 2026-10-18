/* Atlante di campo - PERCORSI (v3.3): ogni uscita è un percorso con le sue schede (foto, audio) e le sue tracce.
   Con un percorso aperto, i nuovi punti e le nuove tracce entrano lì da soli; mappa e Catalogo mostrano solo quel percorso
   (interruttore «mostra tutto»). Ogni percorso si esporta in ZIP, PDF (schede con foto + schema del percorso) ed Excel con le foto.
   Contiene anche XLSX: un piccolo scrittore di file Excel .xlsx (con immagini) senza librerie esterne.
   by Lollo ®2026 · i moduli si caricano nell'ordine dei numeri (vedi index.html) */
'use strict';

/* =================== DATI =================== */
var PC={list:[],cur:null,all:false};
PC.load=function(r){if(r&&r.v){PC.list=r.v.list||[];PC.cur=r.v.cur||null;PC.all=!!r.v.all}if(PC.cur&&!PC.get(PC.cur))PC.cur=null};
PC.save=function(ch){if(ch!==false)markChange();return DB.put('kv',{id:'percorsi',v:{list:PC.list,cur:PC.cur,all:PC.all}})};
PC.get=function(id){return byId(PC.list,id)||null};
PC.active=function(){return PC.cur?PC.get(PC.cur):null};
PC.filtering=function(){return !!(PC.cur&&!PC.all)};
PC.show=function(p){return !PC.filtering()||p.perc===PC.cur};
PC.showT=function(t){return !PC.filtering()||t.perc===PC.cur||(REC.on&&REC.trk&&REC.trk.id===t.id)};
PC.newId=function(){return PC.cur||null};
PC.items=function(id){
  var pts=POINTS.filter(function(p){return id?p.perc===id:!p.perc}).sort(function(a,b){return (a.when||'').localeCompare(b.when||'')});
  var trks=TRACKS.filter(function(t){return id?t.perc===id:!t.perc}).sort(function(a,b){return a.start-b.start});
  return {pts:pts,trks:trks};
};
PC.stats=function(id){
  var it=PC.items(id),s={np:it.pts.length,nt:it.trks.length,ph:0,au:0,d:0,up:0,dn:0,t:0,from:null,to:null,cats:{}};
  it.pts.forEach(function(p){(p.media||[]).forEach(function(m){if(m.type==='photo')s.ph++;else s.au++});s.cats[p.cat]=(s.cats[p.cat]||0)+1;
    if(p.when){if(!s.from||p.when<s.from)s.from=p.when;if(!s.to||p.when>s.to)s.to=p.when}});
  it.trks.forEach(function(t){var k=trkStats(t);s.d+=k.d;s.up+=k.up;s.dn+=k.dn;s.t+=k.t;var a=new Date(t.start).toISOString(),b=new Date(t.end||t.start).toISOString();if(!s.from||a<s.from)s.from=a;if(!s.to||b>s.to)s.to=b});
  return s;
};
PC.touch=function(x){x.updated=new Date().toISOString();return x};
PC.refresh=function(){drawPoints();drawTracks();renderCat();PC.badge();refreshPage()};
PC.badge=function(){
  var e=$('#pcBadge');if(!e)return;var p=PC.active();
  if(!p){e.style.display='none';return}
  e.style.display='block';e.innerHTML='🥾 '+esc(p.name)+(PC.all?' · tutto visibile':'');
};

/* =================== AZIONI =================== */
PC.defName=function(){var d=new Date(),b='Uscita '+pad(d.getDate())+'/'+pad(d.getMonth()+1)+'/'+d.getFullYear()+' – '+PL.name(),n=b,i=2;while(PC.list.some(function(x){return x.name===n}))n=b+' ('+(i++)+')';return n};
PC.create=function(){
  var cur=PC.active();
  var n=prompt((cur?'Chiudo il percorso «'+cur.name+'» (resta salvato) e ne apro uno nuovo.\n\n':'')+'Nome del nuovo percorso',PC.defName());
  if(n==null)return;n=n.trim()||PC.defName();
  var now=new Date().toISOString(),p={id:uid(),name:n,created:now,updated:now,pl:PL.cur,note:''};
  PC.list.push(p);PC.cur=p.id;PC.all=false;
  if(REC.on&&REC.trk&&confirm('C\'è una traccia in registrazione: la metto nel nuovo percorso?')){REC.trk.perc=p.id;REC.trk.u=now}
  PC.save().then(function(){PC.refresh();toast('🥾 Percorso «'+n+'» aperto: i nuovi punti e le tracce finiscono qui',4500)});
};
PC.open=function(id){
  PC.cur=id;PC.all=false;PC.save(false).then(function(){PC.refresh();PC.fit(id)});
  var p=PC.get(id);if(p&&p.pl&&p.pl!==PL.cur&&PL.get(p.pl)&&confirm('Il percorso è stato fatto in «'+PL.get(p.pl).name+'». Passo a quel luogo di lavoro?'))PL.switchTo(p.pl);
};
PC.close=function(){var p=PC.active();if(!p)return;PC.cur=null;PC.all=false;PC.save(false).then(function(){PC.refresh();toast('Percorso «'+p.name+'» chiuso e salvato. Ora vedi tutto.')})};
PC.toggleAll=function(){PC.all=!PC.all;PC.save(false).then(PC.refresh)};
PC.fit=function(id){
  var it=PC.items(id),ll=[];it.pts.forEach(function(p){ll.push([p.lat,p.lon])});it.trks.forEach(function(t){t.pts.forEach(function(q,i){if(i%5===0)ll.push([q[0],q[1]])})});
  go('map');if(ll.length===1)map.setView(ll[0],17);else if(ll.length)map.fitBounds(L.latLngBounds(ll),{padding:[40,40]});
};
PC.rename=function(id){var p=PC.get(id),n=p&&prompt('Nome del percorso',p.name);if(!n)return;p.name=n.trim();PC.touch(p);PC.save().then(PC.refresh)};
PC.editNote=function(id){var p=PC.get(id),n=p&&prompt('Note sul percorso (meteo, compagni, scopo dell\'uscita…)',p.note||'');if(n==null)return;p.note=n;PC.touch(p);PC.save().then(PC.refresh)};
PC.setItems=function(pts,trks,id){
  var now=new Date().toISOString(),ops=[];
  pts.forEach(function(p){p.perc=id||null;p.updated=now;ops.push(DB.put('points',p))});
  trks.forEach(function(t){t.perc=id||null;t.u=now;ops.push(DB.put('tracks',t))});
  return Promise.all(ops).then(function(){markChange();return Promise.all([loadPoints(),loadTracks()])}).then(PC.refresh);
};
PC.del=function(id){
  var p=PC.get(id),it=PC.items(id);if(!p)return;
  if(!confirm('Eliminare il percorso «'+p.name+'»?\n\nI suoi '+it.pts.length+' punti e '+it.trks.length+' tracce NON vengono cancellati: restano nel Catalogo, senza percorso.'))return;
  tomb(id);PC.list=PC.list.filter(function(x){return x.id!==id});if(PC.cur===id){PC.cur=null;PC.all=false}
  PC.save().then(function(){return PC.setItems(it.pts,it.trks,null)}).then(function(){toast('Percorso eliminato (punti e tracce conservati)')});
};
// aggiunge a un percorso i punti e le tracce «senza percorso» di un certo giorno
PC.addDay=function(id){
  var it=PC.items(null),days={};
  it.pts.forEach(function(p){var k=ldate(p.when);(days[k]=days[k]||{p:[],t:[]}).p.push(p)});
  it.trks.forEach(function(t){var k=ldate(new Date(t.start).toISOString());(days[k]=days[k]||{p:[],t:[]}).t.push(t)});
  var ks=Object.keys(days).sort().reverse();
  if(!ks.length)return toast('Non ci sono punti o tracce senza percorso');
  var body='<p class="mut">Scegli il giorno: i punti e le tracce <b>senza percorso</b> di quel giorno entrano in «'+esc(PC.get(id).name)+'».</p>'+ks.map(function(k){var d=days[k];return '<div class="card"><div class="row"><span style="flex:1"><b>'+itDay(k)+'</b><br><small class="mut">'+d.p.length+' punti · '+d.t.length+' tracce</small></span><button class="btn f" data-pday="'+k+'">Aggiungi</button></div></div>'}).join('')
    +'<div class="row" style="margin-top:8px"><button class="btn s" id="pcAllUn">Aggiungi tutti quelli senza percorso ('+it.pts.length+' punti, '+it.trks.length+' tracce)</button></div>';
  openModal('Aggiungi al percorso',body,[]);
  $$('[data-pday]').forEach(function(b){b.onclick=function(){var d=days[b.getAttribute('data-pday')];closeModal();PC.setItems(d.p,d.t,id).then(function(){toast('Aggiunti '+nn(d.p.length,'punto','punti')+' e '+nn(d.t.length,'traccia','tracce'))})}});
  $('#pcAllUn').onclick=function(){if(!confirm('Mettere TUTTI i punti e le tracce senza percorso in «'+PC.get(id).name+'»?'))return;closeModal();PC.setItems(it.pts,it.trks,id).then(function(){toast('Aggiunti '+it.pts.length+' punti e '+it.trks.length+' tracce')})};
};
// dalla scheda di un punto: sposta in un altro percorso
PC.detailRow=function(p){var x=p.perc&&PC.get(p.perc);return '<div class="row" style="margin-top:8px"><span class="mut" style="flex:1">🥾 Percorso: <b>'+(x?esc(x.name):'nessuno')+'</b></span><button class="btn s" id="pcMove">Cambia</button></div>'};
PC.bindDetail=function(p){var b=$('#pcMove');if(!b)return;b.onclick=function(){
  var opts=[{id:null,name:'(nessun percorso)'}].concat(PC.list.slice().reverse());
  var s=prompt('In quale percorso? Scrivi il numero:\n\n'+opts.map(function(o,i){return i+') '+o.name+(o.id&&o.id===p.perc?'  ← attuale':'')}).join('\n'),'');
  if(s==null||s==='')return;var o=opts[parseInt(s,10)];if(!o)return toast('Numero non valido');
  closeModal();PC.setItems([p],[],o.id).then(function(){toast('Punto spostato in: '+o.name)});
}};

/* =================== PAGINA «ALTRO» =================== */
function nn(n,a,b){return n+' '+(n===1?a:b)}
PC.statLine=function(s){
  return nn(s.np,'punto','punti')+' · '+s.ph+' foto'+(s.au?' · '+s.au+' audio':'')+' · '+nn(s.nt,'traccia','tracce')+(s.d?' · '+fmtDist(s.d):'')+(s.up?' · ↑'+s.up+' m':'')+(s.from?' · '+fmtDate(s.from).slice(0,10):'');
};
PC.altCard=function(){
  var a=PC.active(),h='<h3>Percorsi</h3><div class="card">';
  if(a){var s=PC.stats(a.id);
    h+='<div><b>🥾 Aperto: '+esc(a.name)+'</b></div><div class="mut">'+PC.statLine(s)+'</div>'+(a.note?'<div style="margin-top:4px">'+esc(a.note)+'</div>':'')
     +'<div class="row" style="margin-top:8px;flex-wrap:wrap"><button class="btn f" id="pcNew">➕ Nuovo percorso</button><button class="btn s" id="pcClose">Chiudi</button><button class="btn s" id="pcAll">'+(PC.all?'Mostra solo il percorso':'Mostra tutto')+'</button></div>'
     +'<div class="row" style="margin-top:6px;flex-wrap:wrap"><button class="btn s" data-pz="'+a.id+'">📦 ZIP</button><button class="btn s" data-pp="'+a.id+'">🖨 PDF</button><button class="btn s" data-px="'+a.id+'">📊 Excel</button><button class="btn s" data-pa="'+a.id+'">📥 Aggiungi punti</button>'+(PC.days(a.id).length>1?'<button class="btn s" data-psp="'+a.id+'">✂️ Dividi per giorno</button>':'')+'<button class="btn s" data-pnote="'+a.id+'">📝 Note</button><button class="btn s" data-pr="'+a.id+'">✏️ Rinomina</button></div>';
  }else{
    h+='<div class="mut">Nessun percorso aperto: i nuovi punti e le tracce non appartengono a nessuna uscita. Apri un percorso per tenere insieme tutte le schede e le foto di un\'uscita.</div><div class="row" style="margin-top:8px"><button class="btn f" id="pcNew">➕ Nuovo percorso</button></div>';
  }
  h+='</div>';
  var others=PC.list.filter(function(x){return x.id!==PC.cur}).slice().reverse();
  if(others.length){h+='<details style="margin:6px 0 4px"><summary><b>Percorsi salvati ('+others.length+')</b></summary>';
    others.forEach(function(x){var s=PC.stats(x.id);
      h+='<div class="card"><div><b>'+esc(x.name)+'</b></div><div class="mut">'+PC.statLine(s)+'</div><div class="row" style="margin-top:6px;flex-wrap:wrap"><button class="btn f" data-po="'+x.id+'">Apri</button><button class="btn s" data-pz="'+x.id+'">📦 ZIP</button><button class="btn s" data-pp="'+x.id+'">🖨 PDF</button><button class="btn s" data-px="'+x.id+'">📊 Excel</button>'+(PC.days(x.id).length>1?'<button class="btn s" data-psp="'+x.id+'">✂️ Dividi per giorno</button>':'')+'<button class="btn s" data-pr="'+x.id+'">✏️</button><button class="btn s" data-pd="'+x.id+'">🗑</button></div></div>'});
    h+='</details>'}
  var un=PC.items(null),ud=PC.days(null);if(un.pts.length||un.trks.length)h+='<div class="card"><div class="mut">Senza percorso: '+nn(un.pts.length,'punto','punti')+' e '+nn(un.trks.length,'traccia','tracce')+' in '+nn(ud.length,'giorno','giorni')+' ('+ud.map(function(k){return k.slice(8,10)+'/'+k.slice(5,7)}).join(', ')+')'+(a?'; con «Aggiungi punti» li metti nel percorso aperto':'')+'.</div><div class="row" style="margin-top:6px"><button class="btn f" id="pcSplitUn">🗂 Crea un percorso per ogni giorno</button></div></div>';
  return h;
};
PC.bindAlt=function(){
  function on(sel,fn){$$(sel).forEach(function(b){b.onclick=function(){fn(b.getAttribute(sel.slice(1,-1)))}})}
  if($('#pcNew'))$('#pcNew').onclick=PC.create;if($('#pcClose'))$('#pcClose').onclick=PC.close;if($('#pcAll'))$('#pcAll').onclick=PC.toggleAll;
  on('[data-po]',PC.open);on('[data-pr]',PC.rename);on('[data-pd]',PC.del);on('[data-pa]',PC.addDay);on('[data-pnote]',PC.editNote);
  on('[data-psp]',PC.splitDays);if($('#pcSplitUn'))$('#pcSplitUn').onclick=function(){PC.splitDays(null)};
  on('[data-pz]',PC.zip);on('[data-pp]',PC.pdf);on('[data-px]',PC.excel);
};

/* =================== ESPORTAZIONI DEL PERCORSO =================== */
PC.fname=function(p){return 'percorso_'+slug(p.name).toLowerCase()+'_'+stamp()};
PC.zip=function(id){var p=PC.get(id),it=PC.items(id);if(!it.pts.length&&!it.trks.length)return toast('Il percorso è vuoto');
  exportZip({pts:it.pts,trks:it.trks,perc:p,name:PC.fname(p)+'.zip',title:'Percorso '+p.name})};
PC.pdf=function(id){var p=PC.get(id),it=PC.items(id);if(!it.pts.length&&!it.trks.length)return toast('Il percorso è vuoto');
  printReport(it.pts,{cover:PC.cover(p,it),title:p.name})};
PC.excel=function(id){var p=PC.get(id),it=PC.items(id);if(!it.pts.length)return toast('Il percorso non ha punti');
  toast('Preparo il file Excel con le foto…',8000);
  XLSX.points(it.pts,it.trks,p).then(function(b){return shareOrDownload(b,PC.fname(p)+'.xlsx','Percorso '+p.name)}).catch(function(e){alert('Errore Excel: '+e.message)})};

// prima pagina del PDF: dati del percorso, schema con traccia e punti numerati, indice delle schede
PC.cover=function(p,it){
  var s=PC.stats(p.id),pl=p.pl&&PL.get(p.pl);
  var rows=[['Luogo',pl?pl.name:PL.name()],['Data',s.from?(fmtDate(s.from)+(s.to&&s.to.slice(0,10)!==s.from.slice(0,10)?' → '+fmtDate(s.to):' → '+fmtDate(s.to).slice(-5))):'—'],['Punti catalogati',s.np+' ('+s.ph+' foto'+(s.au?', '+s.au+' audio':'')+')']];
  if(s.nt)rows.push(['Tracce',s.nt+' · '+fmtDist(s.d)+' · '+fmtDur(s.t)+(s.up?' · dislivello +'+s.up+' / −'+s.dn+' m':'')]);
  var cats=CATS.filter(function(c){return s.cats[c.id]}).map(function(c){return c.n+' '+s.cats[c.id]}).join(' · ');if(cats)rows.push(['Per categoria',cats]);
  if(p.note)rows.push(['Note',p.note]);rows.push(['Compilatore',SET.compilatore||'']);
  var h='<div class="sch"><h1>'+esc(p.name)+'</h1><p>Percorso di campo · Atlante · generato il '+fmtDate(new Date().toISOString())+'</p><table>'+rows.map(function(r){return '<tr><td class="k">'+esc(r[0])+'</td><td>'+esc(r[1]).replace(/\n/g,'<br>')+'</td></tr>'}).join('')+'</table>';
  h+=PC.svg(it,700,440);
  if(it.pts.length)h+='<table style="margin-top:8px"><tr><td class="k">N°</td><td class="k">Scheda</td><td class="k">Categoria</td><td class="k">Ora</td></tr>'+it.pts.map(function(q,i){return '<tr><td>'+(i+1)+'</td><td>'+esc(q.title)+'</td><td>'+esc(CAT(q.cat).n)+'</td><td>'+fmtDate(q.when)+'</td></tr>'}).join('')+'</table>';
  return h+'<p class="ft">'+esc(SET.compilatore||'')+' · '+BRAND+'</p></div>';
};
// schema vettoriale (niente mappe di sfondo: si stampa sempre, anche senza rete)
PC.svg=function(it,W,H){
  var ll=[];it.pts.forEach(function(p){ll.push([p.lat,p.lon])});it.trks.forEach(function(t){t.pts.forEach(function(q){ll.push([q[0],q[1]])})});
  if(!ll.length)return '';
  var la0=Infinity,la1=-Infinity,lo0=Infinity,lo1=-Infinity;ll.forEach(function(a){la0=Math.min(la0,a[0]);la1=Math.max(la1,a[0]);lo0=Math.min(lo0,a[1]);lo1=Math.max(lo1,a[1])});
  var k=Math.cos((la0+la1)/2*Math.PI/180),mx=111320*k,my=110540,wm=Math.max((lo1-lo0)*mx,60),hm=Math.max((la1-la0)*my,60),pad=34;
  var sc=Math.min((W-2*pad)/wm,(H-2*pad)/hm),cx=(lo0+lo1)/2,cy=(la0+la1)/2;
  function X(lo){return (W/2+(lo-cx)*mx*sc).toFixed(1)}function Y(la){return (H/2-(la-cy)*my*sc).toFixed(1)}
  var s='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+W+' '+H+'" style="width:100%;max-width:'+W+'px;border:1px solid #999;background:#fbfaf6;margin-top:8px">';
  it.trks.forEach(function(t){var seg=[],br=t.brk||[];t.pts.forEach(function(q,i){if(i&&br.indexOf(i)>=0){s+='<polyline points="'+seg.join(' ')+'" fill="none" stroke="#e67e22" stroke-width="3" stroke-linejoin="round"/>';seg=[]}seg.push(X(q[1])+','+Y(q[0]))});
    if(seg.length>1)s+='<polyline points="'+seg.join(' ')+'" fill="none" stroke="#e67e22" stroke-width="3" stroke-linejoin="round"/>';
    var a=t.pts[0],b=t.pts[t.pts.length-1];s+='<circle cx="'+X(a[1])+'" cy="'+Y(a[0])+'" r="6" fill="#2e7d32"/><text x="'+X(a[1])+'" y="'+(Y(a[0])-9)+'" font-size="11" text-anchor="middle" fill="#2e7d32">partenza</text><rect x="'+(X(b[1])-5)+'" y="'+(Y(b[0])-5)+'" width="10" height="10" fill="#c62828"/>'});
  it.pts.forEach(function(p,i){var c=CAT(p.cat).c;s+='<circle cx="'+X(p.lon)+'" cy="'+Y(p.lat)+'" r="9" fill="'+c+'" stroke="#fff" stroke-width="1.5"/><text x="'+X(p.lon)+'" y="'+(+Y(p.lat)+4)+'" font-size="10" font-weight="bold" text-anchor="middle" fill="#fff">'+(i+1)+'</text>'});
  // scala e nord
  var steps=[10,20,50,100,200,500,1000,2000,5000],L1=steps.filter(function(v){return v*sc<=W/4}).pop()||10;
  s+='<g font-size="11" fill="#333"><line x1="14" y1="'+(H-14)+'" x2="'+(14+L1*sc).toFixed(1)+'" y2="'+(H-14)+'" stroke="#333" stroke-width="3"/><text x="14" y="'+(H-20)+'">'+(L1>=1000?L1/1000+' km':L1+' m')+'</text>';
  s+='<path d="M'+(W-22)+' 34 l8 -22 l8 22 l-8 -6z" fill="#333"/><text x="'+(W-14)+'" y="48" text-anchor="middle">N</text></g></svg>';
  return s;
};

/* =================== XLSX: SCRITTORE .XLSX (con immagini) =================== */
var XLSX={};
XLSX.x=function(v){return String(v==null?'':v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,'').replace(/[<>&"]/g,function(c){return {'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;'}[c]})};
XLSX.col=function(i){var s='';i++;while(i>0){var m=(i-1)%26;s=String.fromCharCode(65+m)+s;i=Math.floor((i-1)/26)}return s};
/* sheet = {name, widths:[...], rows:[[cell,...]], heights:{rowIndex:pt}, header:bool, images:[{r,c,data:Uint8Array,w,h}]}
   cell: stringa | numero | {v, s, link} ; s = 1 intestazione, 2 testo, 3 collegamento, 4 titolo, 5 coordinate, 6 grassetto */
XLSX.build=function(sheets){
  var enc=new TextEncoder(),files=[],ct=[],wbRels=[],sh=[],img=0,dr=0;
  function add(n,s){files.push({name:n,data:typeof s==='string'?enc.encode(s):s})}
  var NS='xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"';
  var defs='';
  sheets.forEach(function(S,si){
    var n=si+1,rows=S.rows,nc=rows.reduce(function(a,r){return Math.max(a,r.length)},1);
    var x='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<worksheet '+NS+'><sheetPr><pageSetUpPr fitToPage="1"/></sheetPr><dimension ref="A1:'+XLSX.col(nc-1)+Math.max(rows.length,1)+'"/><sheetViews><sheetView workbookViewId="0"'+(si===0?' tabSelected="1"':'')+'>'+(S.header?'<pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/>':'')+'</sheetView></sheetViews><sheetFormatPr defaultRowHeight="15"/>';
    if(S.widths)x+='<cols>'+S.widths.map(function(w,i){return '<col min="'+(i+1)+'" max="'+(i+1)+'" width="'+w+'" customWidth="1"/>'}).join('')+'</cols>';
    x+='<sheetData>';
    rows.forEach(function(r,ri){var ht=S.heights&&S.heights[ri];x+='<row r="'+(ri+1)+'"'+(ht?' ht="'+ht+'" customHeight="1"':'')+'>';
      for(var ci=0;ci<(S.header?nc:r.length);ci++){var c=r[ci],ref=XLSX.col(ci)+(ri+1);if(c==null||c===''){if(S.header)x+='<c r="'+ref+'" s="'+(ri===0?1:2)+'"/>';continue}var o=typeof c==='object'?c:{v:c},st=o.s!=null?o.s:(S.header&&ri===0?1:2);
        if(o.link)x+='<c r="'+ref+'" s="3" t="str"><f>'+XLSX.x('HYPERLINK("'+String(o.link).replace(/"/g,'""')+'","'+String(o.v).replace(/"/g,'""')+'")')+'</f><v>'+XLSX.x(o.v)+'</v></c>';
        else if(typeof o.v==='number'&&isFinite(o.v))x+='<c r="'+ref+'" s="'+st+'"><v>'+o.v+'</v></c>';
        else x+='<c r="'+ref+'" s="'+st+'" t="inlineStr"><is><t xml:space="preserve">'+XLSX.x(o.v)+'</t></is></c>'}
      x+='</row>'});
    x+='</sheetData>';
    if(S.header&&rows.length>1){x+='<autoFilter ref="A1:'+XLSX.col(nc-1)+rows.length+'"/>';defs+='<definedName name="_xlnm._FilterDatabase" localSheetId="'+si+'" hidden="1">\''+XLSX.x(S.name)+'\'!$A$1:$'+XLSX.col(nc-1)+'$'+rows.length+'</definedName>'}
    x+='<pageMargins left="0.4" right="0.4" top="0.5" bottom="0.5" header="0.3" footer="0.3"/><pageSetup paperSize="9" orientation="landscape" fitToWidth="1" fitToHeight="0"/>';
    if(S.images&&S.images.length){
      dr++;x+='<drawing r:id="rId1"/>';
      add('xl/worksheets/_rels/sheet'+n+'.xml.rels','<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing'+dr+'.xml"/></Relationships>');
      var d='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">',dRels='';
      S.images.forEach(function(im,ii){img++;var rid='rId'+(ii+1),cx=Math.round(im.w*9525),cy=Math.round(im.h*9525);
        add('xl/media/image'+img+'.jpeg',im.data);
        dRels+='<Relationship Id="'+rid+'" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/image'+img+'.jpeg"/>';
        d+='<xdr:oneCellAnchor><xdr:from><xdr:col>'+im.c+'</xdr:col><xdr:colOff>38100</xdr:colOff><xdr:row>'+im.r+'</xdr:row><xdr:rowOff>38100</xdr:rowOff></xdr:from><xdr:ext cx="'+cx+'" cy="'+cy+'"/><xdr:pic><xdr:nvPicPr><xdr:cNvPr id="'+(ii+2)+'" name="Foto '+(ii+1)+'"/><xdr:cNvPicPr><a:picLocks noChangeAspect="1"/></xdr:cNvPicPr></xdr:nvPicPr><xdr:blipFill><a:blip r:embed="'+rid+'"/><a:stretch><a:fillRect/></a:stretch></xdr:blipFill><xdr:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="'+cx+'" cy="'+cy+'"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></xdr:spPr></xdr:pic><xdr:clientData/></xdr:oneCellAnchor>'});
      add('xl/drawings/drawing'+dr+'.xml',d+'</xdr:wsDr>');
      add('xl/drawings/_rels/drawing'+dr+'.xml.rels','<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+dRels+'</Relationships>');
      ct.push('<Override PartName="/xl/drawings/drawing'+dr+'.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/>');
    }
    add('xl/worksheets/sheet'+n+'.xml',x+'</worksheet>');
    ct.push('<Override PartName="/xl/worksheets/sheet'+n+'.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>');
    wbRels.push('<Relationship Id="rId'+n+'" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet'+n+'.xml"/>');
    sh.push('<sheet name="'+XLSX.x(S.name.slice(0,31))+'" sheetId="'+n+'" r:id="rId'+n+'"/>');
  });
  var ns=sheets.length;
  wbRels.push('<Relationship Id="rId'+(ns+1)+'" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>');
  add('xl/workbook.xml','<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<workbook '+NS+'><bookViews><workbookView/></bookViews><sheets>'+sh.join('')+'</sheets>'+(defs?'<definedNames>'+defs+'</definedNames>':'')+'</workbook>');
  add('xl/_rels/workbook.xml.rels','<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+wbRels.join('')+'</Relationships>');
  var B='<border><left style="thin"><color rgb="FFBBBBBB"/></left><right style="thin"><color rgb="FFBBBBBB"/></right><top style="thin"><color rgb="FFBBBBBB"/></top><bottom style="thin"><color rgb="FFBBBBBB"/></bottom><diagonal/></border>';
  add('xl/styles.xml','<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="1"><numFmt numFmtId="164" formatCode="0.000000"/></numFmts>'
    +'<fonts count="5"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font><font><u/><sz val="11"/><color rgb="FF0563C1"/><name val="Calibri"/></font><font><b/><sz val="15"/><color rgb="FF1B5E20"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>'
    +'<fills count="4"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF2E7D32"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFEEF3EA"/><bgColor indexed="64"/></patternFill></fill></fills>'
    +'<borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border>'+B+'</borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>'
    +'<cellXfs count="7"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>'
    +'<xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf>'
    +'<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>'
    +'<xf numFmtId="0" fontId="2" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment vertical="top"/></xf>'
    +'<xf numFmtId="0" fontId="3" fillId="0" borderId="0" xfId="0" applyFont="1"/>'
    +'<xf numFmtId="164" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1" applyAlignment="1"><alignment vertical="top"/></xf>'
    +'<xf numFmtId="0" fontId="4" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf></cellXfs>'
    +'<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>');
  add('_rels/.rels','<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>');
  add('docProps/core.xml','<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>Atlante – schede</dc:title><dc:creator>'+XLSX.x(SET.compilatore||'')+' '+BRAND+'</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">'+new Date().toISOString().slice(0,19)+'Z</dcterms:created></cp:coreProperties>');
  files.unshift({name:'[Content_Types].xml',data:enc.encode('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="jpeg" ContentType="image/jpeg"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>'+ct.join('')+'</Types>')});
  return new Blob([zipBlob(files)],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
};
// miniatura JPEG per le celle (la foto originale resta intatta nello ZIP e su Drive)
XLSX.thumb=function(blob,bw,bh){
  return new Promise(function(res){
    var u=URL.createObjectURL(blob),im=new Image();
    im.onload=function(){var k=Math.min(bw/im.naturalWidth,bh/im.naturalHeight,1),w=Math.max(1,Math.round(im.naturalWidth*k*2)),h=Math.max(1,Math.round(im.naturalHeight*k*2));
      var c=document.createElement('canvas');c.width=w;c.height=h;c.getContext('2d').drawImage(im,0,0,w,h);URL.revokeObjectURL(u);
      c.toBlob(function(b){if(!b)return res(null);b.arrayBuffer().then(function(ab){res({data:new Uint8Array(ab),w:Math.round(w/2),h:Math.round(h/2)})})},'image/jpeg',0.82)};
    im.onerror=function(){URL.revokeObjectURL(u);res(null)};im.src=u;
  });
};
XLSX.NPH=3;
XLSX.points=function(pts,trks,perc){
  var xk=[],sk=[];pts.forEach(function(p){Object.keys(p.x||{}).forEach(function(k){if(p.x[k]&&xk.indexOf(k)<0)xk.push(k)});SCHEDA.forEach(function(s){if(p.s&&p.s[s.k]&&sk.indexOf(s.k)<0)sk.push(s.k)})});
  var skL=SCHEDA.filter(function(s){return sk.indexOf(s.k)>=0});
  var head=['N°','Data','Ora','Categoria','Titolo','Nome comune','Nome scientifico','Descrizione / note','Lat','Lon','Precisione (m)','Quota (m)','Mappa'].concat(xk.map(extraLabel)).concat(skL.map(function(s){return s.l})).concat(['Tag','Meteo','Audio','Compilatore']);
  if(!perc)head.push('Percorso');
  var fc=head.length;for(var i=0;i<XLSX.NPH;i++)head.push('Foto '+(i+1));
  var widths=head.map(function(h,i){return i>=fc?24:[5,11,7,14,26,18,22,40,11,11,9,8,12][i]||16});
  var rows=[head],heights={0:30},images=[],jobs=[];
  pts.forEach(function(p,i){
    var d=new Date(p.when),ph=(p.media||[]).filter(function(m){return m.type==='photo'}),au=(p.media||[]).filter(function(m){return m.type==='audio'});
    var r=[i+1,pad(d.getDate())+'/'+pad(d.getMonth()+1)+'/'+d.getFullYear(),pad(d.getHours())+':'+pad(d.getMinutes()),CAT(p.cat).n,{v:p.title,s:6},p.sp&&p.sp.com||'',p.sp&&p.sp.sci||'',[p.note,p.ric?'Dalla ricerca: '+p.ric:'',isInd(p)?'Posizione indicativa':''].filter(Boolean).join('\n'),
      {v:+p.lat.toFixed(6),s:5},{v:+p.lon.toFixed(6),s:5},p.acc!=null?p.acc:'',p.alt!=null?p.alt:'',{v:'Apri mappa',link:'https://www.google.com/maps/search/?api=1&query='+p.lat.toFixed(6)+','+p.lon.toFixed(6)}]
      .concat(xk.map(function(k){return p.x&&p.x[k]||''})).concat(skL.map(function(s){return p.s&&p.s[s.k]||''}))
      .concat([(p.tags||[]).join(', '),p.meteo||'',au.length?au.length+' (nello ZIP)':'',p.comp||'']);
    if(!perc){var pp=p.perc&&PC.get(p.perc);r.push(pp?pp.name:'')}
    rows.push(r);
    var row=i+1;if(ph.length)heights[row]=96;
    ph.slice(0,XLSX.NPH).forEach(function(m,k){jobs.push(DB.get('media',m.id).then(function(rec){if(!rec||!rec.blob)return;return XLSX.thumb(rec.blob,160,120).then(function(t){if(t)images.push({r:row,c:fc+k,data:t.data,w:t.w,h:t.h})})}))});
    if(ph.length>XLSX.NPH)r[7]=(r[7]?r[7]+'\n':'')+'(+'+(ph.length-XLSX.NPH)+' foto nello ZIP)';
  });
  return Promise.all(jobs).then(function(){
    var s=perc?PC.stats(perc.id):null,sum=[[{v:perc?perc.name:'Atlante di campo – tutte le schede',s:4}],[]];
    function kv(k,v){sum.push([{v:k,s:6},v])}
    if(perc){var pl=perc.pl&&PL.get(perc.pl);kv('Luogo',pl?pl.name:PL.name());kv('Dal',s.from?fmtDate(s.from):'');kv('Al',s.to?fmtDate(s.to):'');if(perc.note)kv('Note',perc.note)}
    kv('Punti',pts.length);kv('Foto',pts.reduce(function(a,p){return a+(p.media||[]).filter(function(m){return m.type==='photo'}).length},0));
    var D=0,U=0,T=0;trks.forEach(function(t){var k=trkStats(t);D+=k.d;U+=k.up;T+=k.t});
    kv('Tracce',trks.length);if(trks.length){kv('Distanza (km)',Math.round(D/10)/100);kv('Dislivello positivo (m)',U);kv('Tempo',fmtDur(T))}
    sum.push([]);sum.push([{v:'Per categoria',s:6}]);var cnt={};pts.forEach(function(p){cnt[p.cat]=(cnt[p.cat]||0)+1});CATS.forEach(function(c){if(cnt[c.id])sum.push([c.n,cnt[c.id]])});
    sum.push([]);kv('Compilatore',SET.compilatore||'');kv('Generato il',fmtDate(new Date().toISOString()));sum.push([BRAND]);
    var tr=[['Traccia','Inizio','Fine','Distanza (km)','Tempo','Dislivello + (m)','Dislivello − (m)','Punti GPS']].concat(trks.map(function(t){var k=trkStats(t);return [t.name,fmtDate(new Date(t.start).toISOString()),t.end?fmtDate(new Date(t.end).toISOString()):'',Math.round(k.d/10)/100,fmtDur(k.t),k.up,k.dn,t.pts.length]}));
    var sheets=[{name:'Schede',header:true,widths:widths,rows:rows,heights:heights,images:images},{name:'Riepilogo',widths:[26,60],rows:sum}];
    if(trks.length)sheets.push({name:'Tracce',header:true,widths:[30,17,17,13,12,14,14,11],rows:tr});
    return XLSX.build(sheets);
  });
};

/* =================== DIVIDI PER GIORNO =================== */
function dayOfMs(ms){return ldate(new Date(ms).toISOString())}
// giorni (AAAA-MM-GG, ora locale) toccati da punti e tracce di un percorso (id null = senza percorso)
PC.days=function(id){var it=PC.items(id),d={};it.pts.forEach(function(p){if(p.when)d[ldate(p.when)]=1});it.trks.forEach(function(t){t.pts.forEach(function(q){if(q[3])d[dayOfMs(q[3])]=1})});return Object.keys(d).sort()};
PC.dayName=function(k,plId){var pl=plId&&PL.get(plId),b='Uscita '+k.slice(8,10)+'/'+k.slice(5,7)+'/'+k.slice(0,4)+' – '+(pl?pl.name:PL.name()),n=b,i=2;while(PC.list.some(function(x){return x.name===n}))n=b+' ('+(i++)+')';return n};
// taglia una traccia che passa la mezzanotte in pezzi, uno per giorno
PC.cutTrack=function(t){
  var groups={},order=[];
  t.pts.forEach(function(q,i){var k=dayOfMs(q[3]||t.start);if(!groups[k]){groups[k]={pts:[],brk:[]};order.push(k)}var g=groups[k];if(g.pts.length&&(t.brk||[]).indexOf(i)>=0)g.brk.push(g.pts.length);g.pts.push(q)});
  if(order.length<2)return null;
  return order.map(function(k){var g=groups[k],a=g.pts[0][3]||t.start,b=g.pts[g.pts.length-1][3]||a,dur=0;
    for(var i=1;i<g.pts.length;i++)if(g.brk.indexOf(i)<0)dur+=(g.pts[i][3]||0)-(g.pts[i-1][3]||0);
    var n={id:uid(),name:t.name+' · '+itDay(k),start:a,end:b,pts:g.pts,brk:g.brk,perc:t.perc||null,u:new Date().toISOString()};
    if(t.merged){n.merged=t.merged;n.dur=dur}if(t.imported)n.imported=true;return {k:k,t:n}});
};
PC.splitDays=function(id){
  var src=id?PC.get(id):null,it=PC.items(id),days=PC.days(id);
  if(!days.length)return toast('Niente da dividere');
  if(id&&days.length<2)return toast('Il percorso è già tutto nello stesso giorno');
  var by={};days.forEach(function(k){by[k]={p:[],t:[]}});
  it.pts.forEach(function(p){by[ldate(p.when)].p.push(p)});
  var cut=[];
  it.trks.forEach(function(t){var pcs=PC.cutTrack(t);if(pcs){cut.push(t);pcs.forEach(function(x){by[x.k].t.push(x.t)})}else by[dayOfMs(t.pts.length?(t.pts[0][3]||t.start):t.start)].t.push(t)});
  var msg=(src?'Divido «'+src.name+'» in '+days.length+' percorsi, uno per giorno:':'Creo '+nn(days.length,'percorso','percorsi')+' con i punti e le tracce senza percorso:')+'\n\n'+days.map(function(k){return '• '+itDay(k)+': '+nn(by[k].p.length,'punto','punti')+', '+nn(by[k].t.length,'traccia','tracce')}).join('\n')
    +(cut.length?'\n\n'+nn(cut.length,'traccia passa','tracce passano')+' la mezzanotte: la taglio a mezzanotte (l\'originale viene sostituita dai pezzi).':'')+(src?'\n\nIl primo giorno resta in «'+src.name+'».':'');
  if(!confirm(msg))return;
  var now=new Date().toISOString(),wasCur=id&&PC.cur===id,last=null,ops=[];
  if(REC.on&&REC.trk&&cut.some(function(t){return t.id===REC.trk.id}))return alert('Ferma prima la registrazione in corso, poi dividi.');
  days.forEach(function(k,i){
    var pid;
    if(src&&i===0)pid=src.id;
    else{var np={id:uid(),name:PC.dayName(k,src?src.pl:PL.cur),created:now,updated:now,pl:src?src.pl:PL.cur,note:src?src.note||'':''};PC.list.push(np);pid=np.id}
    last=pid;
    by[k].p.forEach(function(p){p.perc=pid;p.updated=now;ops.push(DB.put('points',p))});
    by[k].t.forEach(function(t){t.perc=pid;t.u=now;ops.push(DB.put('tracks',t))});
  });
  cut.forEach(function(t){tomb(t.id);ops.push(DB.del('tracks',t.id))});
  if(wasCur||(!id&&!PC.cur)){PC.cur=last;PC.all=false}
  ops.push(PC.save());
  Promise.all(ops).then(function(){return Promise.all([loadPoints(),loadTracks()])}).then(function(){PC.refresh();toast('✂️ Fatto: '+nn(days.length,'percorso','percorsi')+(PC.active()?'. Aperto: «'+PC.active().name+'»':''),5000)});
};
