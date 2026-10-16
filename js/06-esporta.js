/* Atlante Lago Piccolo - Condivisione, esportazioni (GPX, KML, GeoJSON, CSV, schede stampabili), ZIP e importazione.
   by Lollo ®2026 · i moduli si caricano nell'ordine dei numeri (vedi index.html) */
'use strict';
/* =================== CONDIVISIONE / DOWNLOAD =================== */
function download(blob,name){var u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download=name;document.body.appendChild(a);a.click();setTimeout(function(){URL.revokeObjectURL(u);a.remove()},4000)}
function shareOrDownload(blob,name,title){
  try{var f=new File([blob],name,{type:blob.type||'application/octet-stream'});if(navigator.canShare&&navigator.canShare({files:[f]}))return navigator.share({files:[f],title:title||name}).catch(function(e){if(e.name!=='AbortError')download(blob,name)})}catch(e){}
  download(blob,name);return Promise.resolve();
}
function shareOne(p){var t=(p.title||'')+'\n'+CAT(p.cat).n+(p.sp&&p.sp.sci?' – '+p.sp.sci:'')+'\n'+(p.note||'')+'\nhttps://www.google.com/maps/search/?api=1&query='+p.lat+','+p.lon;
  var ph=firstPhoto(p);
  (ph?DB.get('media',ph.id):Promise.resolve(null)).then(function(r){var files=[];if(r){files.push(new File([r.blob],slug(p.title)+'.jpg',{type:'image/jpeg'}))}
    if(navigator.share){var data={title:p.title,text:t};if(files.length&&navigator.canShare&&navigator.canShare({files:files}))data.files=files;navigator.share(data).catch(function(){})}
    else{navigator.clipboard&&navigator.clipboard.writeText(t);toast('Testo copiato negli appunti')}})}

/* =================== FORMATI DI ESPORTAZIONE =================== */
function xesc(s){return String(s==null?'':s).replace(/[<>&'"]/g,function(c){return {'<':'&lt;','>':'&gt;','&':'&amp;',"'":'&apos;','"':'&quot;'}[c]})}
function pointDesc(p){var a=[CAT(p.cat).n];if(p.sp&&(p.sp.com||p.sp.sci))a.push((p.sp.com||'')+(p.sp.sci?' ('+p.sp.sci+')':''));Object.keys(p.x||{}).forEach(function(k){if(p.x[k])a.push(extraLabel(k)+': '+p.x[k])});SCHEDA.forEach(function(s){if(p.s&&p.s[s.k])a.push(s.l+': '+p.s[s.k])});if(p.note)a.push(p.note);if(p.ric)a.push('Dalla ricerca: '+p.ric);if(isInd(p))a.push('Posizione indicativa, da verificare');if(p.tags&&p.tags.length)a.push('Tag: '+p.tags.join(', '));if(p.meteo)a.push('Meteo: '+p.meteo);return a.join('\n')}
function toGPX(points,tracks){
  var s='<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1" creator="Atlante Lago Piccolo '+BRAND+'" xmlns="http://www.topografix.com/GPX/1/1">\n<metadata><name>Atlante Lago Piccolo di Avigliana</name><time>'+new Date().toISOString()+'</time></metadata>\n';
  points.forEach(function(p){s+='<wpt lat="'+p.lat.toFixed(7)+'" lon="'+p.lon.toFixed(7)+'">'+(p.alt!=null?'<ele>'+p.alt+'</ele>':'')+'<time>'+xesc(p.when)+'</time><name>'+xesc(p.title)+'</name><desc>'+xesc(pointDesc(p))+'</desc><type>'+xesc(CAT(p.cat).n)+'</type></wpt>\n'});
  (tracks||[]).forEach(function(t){s+='<trk><name>'+xesc(t.name)+'</name><trkseg>\n';t.pts.forEach(function(q,qi){if(qi&&t.brk&&t.brk.indexOf(qi)>=0)s+='</trkseg><trkseg>\n';s+='<trkpt lat="'+q[0]+'" lon="'+q[1]+'">'+(q[2]!=null?'<ele>'+q[2]+'</ele>':'')+'<time>'+new Date(q[3]).toISOString()+'</time></trkpt>\n'});s+='</trkseg></trk>\n'});
  return s+'</gpx>\n';
}
function kmlColor(hex){var h=hex.replace('#','');return 'ff'+h.slice(4,6)+h.slice(2,4)+h.slice(0,2)}
function toKML(points,tracks,mediaName){
  var s='<?xml version="1.0" encoding="UTF-8"?>\n<kml xmlns="http://www.opengis.net/kml/2.2"><Document><name>Atlante Lago Piccolo di Avigliana</name>\n';
  CATS.forEach(function(c){s+='<Style id="c_'+c.id+'"><IconStyle><color>'+kmlColor(c.c)+'</color><Icon><href>http://maps.google.com/mapfiles/kml/paddle/wht-blank.png</href></Icon></IconStyle></Style>\n'});
  s+='<Style id="trk"><LineStyle><color>ff4db7ff</color><width>4</width></LineStyle></Style>\n';
  CATS.forEach(function(c){var ps=points.filter(function(p){return p.cat===c.id});if(!ps.length)return;s+='<Folder><name>'+xesc(c.n)+'</name>\n';
    ps.forEach(function(p){var imgs='';if(mediaName)(p.media||[]).filter(function(m){return m.type==='photo'}).forEach(function(m){imgs+='<img src="'+mediaName(p,m)+'" width="300"><br>'});
      s+='<Placemark><name>'+xesc(p.title)+'</name><styleUrl>#c_'+c.id+'</styleUrl><TimeStamp><when>'+xesc(p.when)+'</when></TimeStamp><description><![CDATA['+esc(pointDesc(p)).replace(/\n/g,'<br>')+(imgs?'<br>'+imgs:'')+']]></description><Point><coordinates>'+p.lon.toFixed(7)+','+p.lat.toFixed(7)+(p.alt!=null?','+p.alt:'')+'</coordinates></Point></Placemark>\n'});
    s+='</Folder>\n'});
  if(tracks&&tracks.length){s+='<Folder><name>Tracce</name>\n';tracks.forEach(function(t){s+='<Placemark><name>'+xesc(t.name)+'</name><styleUrl>#trk</styleUrl><LineString><tessellate>1</tessellate><coordinates>'+t.pts.map(function(q){return q[1]+','+q[0]+(q[2]!=null?','+q[2]:'')}).join(' ')+'</coordinates></LineString></Placemark>\n'});s+='</Folder>\n'}
  return s+'</Document></kml>\n';
}
function toGeoJSON(points,tracks,mediaName){
  var f=points.map(function(p){var pr={id:p.id,titolo:p.title,categoria:CAT(p.cat).n,data:p.when,specie_scientifica:p.sp&&p.sp.sci||'',nome_comune:p.sp&&p.sp.com||'',note:p.note,ricerca:p.ric||'',origine_posizione:p.posSrc||'',tag:(p.tags||[]).join(', '),precisione_m:p.acc,quota_m:p.alt,meteo:p.meteo,compilatore:p.comp,colore:CAT(p.cat).c};
    Object.keys(p.x||{}).forEach(function(k){pr[k]=p.x[k]});SCHEDA.forEach(function(s){if(p.s&&p.s[s.k])pr[s.k]=p.s[s.k]});
    if(mediaName)pr.media=(p.media||[]).map(function(m){return {file:mediaName(p,m),tipo:m.type,didascalia:m.cap}});
    return {type:'Feature',geometry:{type:'Point',coordinates:[+p.lon.toFixed(7),+p.lat.toFixed(7)].concat(p.alt!=null?[p.alt]:[])},properties:pr}});
  (tracks||[]).forEach(function(t){f.push({type:'Feature',geometry:{type:'LineString',coordinates:t.pts.map(function(q){return [q[1],q[0]].concat(q[2]!=null?[q[2]]:[])})},properties:{nome:t.name,inizio:new Date(t.start).toISOString(),fine:t.end?new Date(t.end).toISOString():null}})});
  return JSON.stringify({type:'FeatureCollection',features:f},null,1);
}
function toCSV(points){
  var xk=[];Object.keys(EXTRA).forEach(function(c){EXTRA[c].forEach(function(f){if(xk.indexOf(f.k)<0)xk.push(f.k)})});
  var head=['id','data','categoria','titolo','nome_comune','specie_scientifica','lat','lon','precisione_m','quota_m','note','ricerca','origine_posizione','tag','n_foto','n_audio','meteo','compilatore'].concat(xk).concat(SCHEDA.map(function(s){return s.k}));
  function q(v){v=v==null?'':String(v);return /[;"\n\r]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v}
  var rows=[head.join(';')];
  points.forEach(function(p){var ph=(p.media||[]).filter(function(m){return m.type==='photo'}).length;
    var r=[p.id,fmtDate(p.when),CAT(p.cat).n,p.title,p.sp&&p.sp.com,p.sp&&p.sp.sci,p.lat.toFixed(7).replace('.',','),p.lon.toFixed(7).replace('.',','),p.acc,p.alt,p.note,p.ric||'',p.posSrc||'',(p.tags||[]).join(', '),ph,(p.media||[]).length-ph,p.meteo,p.comp].concat(xk.map(function(k){return p.x&&p.x[k]})).concat(SCHEDA.map(function(s){return p.s&&p.s[s.k]}));
    rows.push(r.map(q).join(';'))});
  return '﻿'+rows.join('\r\n');
}
/* ---- report HTML (stampabile / PDF) ---- */
function reportHTML(points,imgSrc,audSrc){
  var cnt={};points.forEach(function(p){cnt[p.cat]=(cnt[p.cat]||0)+1});
  var css='body{font:13px/1.45 Georgia,serif;color:#111;margin:18px}h1{font-size:22px;margin:0}h2{font-size:17px;margin:0 0 6px;border-bottom:2px solid #333}table{border-collapse:collapse;width:100%;margin:6px 0}td{border:1px solid #999;padding:4px 6px;vertical-align:top}td.k{width:28%;background:#f1f1f1;font-weight:bold}.sch{page-break-after:always;margin-bottom:22px}.ph{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}.ph figure{margin:0}.ph img{width:100%;height:150px;object-fit:cover;border:1px solid #999}.ph figcaption{font-size:11px}.ft{font-size:11px;color:#555;margin-top:10px}@media print{body{margin:8mm}}';
  var h='<!doctype html><html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Atlante Lago Piccolo – schede</title><style>'+css+'</style></head><body>';
  h+='<div class="sch"><h1>Atlante del Lago Piccolo di Avigliana</h1><p>Schede di campo · '+points.length+' punti · generato il '+fmtDate(new Date().toISOString())+'</p><table>'+CATS.filter(function(c){return cnt[c.id]}).map(function(c){return '<tr><td class="k">'+esc(c.n)+'</td><td>'+cnt[c.id]+'</td></tr>'}).join('')+'</table><p class="ft">'+esc(SET.compilatore)+' · '+BRAND+'</p></div>';
  points.forEach(function(p,i){var c=CAT(p.cat);var rows=[['N°',(i+1)],['Categoria',c.n],['Data e ora',fmtDate(p.when)],['Geolocalizzazione',p.lat.toFixed(6)+', '+p.lon.toFixed(6)+(p.acc?' (±'+p.acc+' m)':'')+' – https://www.google.com/maps/search/?api=1&query='+p.lat.toFixed(6)+','+p.lon.toFixed(6)]];
    if(p.alt!=null)rows.push(['Quota',p.alt+' m']);
    if(p.sp&&(p.sp.com||p.sp.sci))rows.push(['Specie',(p.sp.com||'')+(p.sp.sci?' – '+p.sp.sci:'')]);
    Object.keys(p.x||{}).forEach(function(k){if(p.x[k])rows.push([extraLabel(k),p.x[k]])});
    rows.push(['Descrizione',p.note||'']);if(p.ric)rows.push(['Dalla ricerca',p.ric]);if(p.posSrc)rows.push(['Origine posizione',p.posSrc]);
    SCHEDA.forEach(function(s){if(p.s&&p.s[s.k])rows.push([s.l,p.s[s.k]])});
    if(p.meteo)rows.push(['Meteo',p.meteo]);if(p.tags&&p.tags.length)rows.push(['Tag',p.tags.join(', ')]);rows.push(['Compilatore',p.comp||'']);
    h+='<div class="sch"><h2>'+esc(p.title)+'</h2><table>'+rows.map(function(r){var v=esc(r[1]).replace(/\n/g,'<br>').replace(/(https?:\/\/[^\s<]+)/g,'<a href="$1">$1</a>');return '<tr><td class="k">'+esc(r[0])+'</td><td>'+v+'</td></tr>'}).join('')+'</table>';
    var ph=(p.media||[]).filter(function(m){return m.type==='photo'});if(ph.length)h+='<div class="ph">'+ph.map(function(m){return '<figure><img src="'+imgSrc(p,m)+'" alt=""><figcaption>'+esc(m.cap||'')+'</figcaption></figure>'}).join('')+'</div>';
    var au=(p.media||[]).filter(function(m){return m.type==='audio'});if(au.length)h+='<p><b>Audio:</b></p>'+au.map(function(m){return '<div>'+(audSrc?'<audio controls src="'+audSrc(p,m)+'"></audio> ':'🎙️ ')+esc(m.cap||'registrazione')+'</div>'}).join('');
    h+='</div>'});
  return h+'<p class="ft">'+BRAND+'</p></body></html>';
}
function blobToDataURL(b){return new Promise(function(res){var r=new FileReader();r.onload=function(){res(r.result)};r.readAsDataURL(b)})}
function printReport(points){
  toast('Preparo le schede…');
  var map2={};var jobs=[];points.forEach(function(p){(p.media||[]).forEach(function(m){if(m.type==='photo')jobs.push(DB.get('media',m.id).then(function(r){if(r)return blobToDataURL(r.blob).then(function(u){map2[m.id]=u})}))})});
  Promise.all(jobs).then(function(){var html=reportHTML(points,function(p,m){return map2[m.id]||''},null);
    var w=window.open('','_blank');if(w){w.document.open();w.document.write(html+'<script>setTimeout(function(){print()},600)<\/script>');w.document.close()}else shareOrDownload(new Blob([html],{type:'text/html'}),'schede_lago_piccolo_'+stamp()+'.html')});
}

/* =================== ZIP (scrittura e lettura senza librerie) =================== */
var CRC=(function(){var t=new Uint32Array(256);for(var n=0;n<256;n++){var c=n;for(var k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[n]=c>>>0}return t})();
function crc32(u){var c=0xFFFFFFFF;for(var i=0;i<u.length;i++)c=CRC[(c^u[i])&255]^(c>>>8);return (c^0xFFFFFFFF)>>>0}
function zipBlob(files){
  var enc=new TextEncoder(),parts=[],cd=[],off=0,d=new Date();
  var dt=((d.getHours()<<11)|(d.getMinutes()<<5)|(d.getSeconds()>>1))&0xFFFF,dd=(((d.getFullYear()-1980)<<9)|((d.getMonth()+1)<<5)|d.getDate())&0xFFFF;
  files.forEach(function(f){var nm=enc.encode(f.name),data=f.data,crc=crc32(data);
    var lh=new DataView(new ArrayBuffer(30));lh.setUint32(0,0x04034b50,true);lh.setUint16(4,20,true);lh.setUint16(6,0x0800,true);lh.setUint16(8,0,true);lh.setUint16(10,dt,true);lh.setUint16(12,dd,true);lh.setUint32(14,crc,true);lh.setUint32(18,data.length,true);lh.setUint32(22,data.length,true);lh.setUint16(26,nm.length,true);lh.setUint16(28,0,true);
    parts.push(lh.buffer,nm,data);
    var ch=new DataView(new ArrayBuffer(46));ch.setUint32(0,0x02014b50,true);ch.setUint16(4,20,true);ch.setUint16(6,20,true);ch.setUint16(8,0x0800,true);ch.setUint16(10,0,true);ch.setUint16(12,dt,true);ch.setUint16(14,dd,true);ch.setUint32(16,crc,true);ch.setUint32(20,data.length,true);ch.setUint32(24,data.length,true);ch.setUint16(28,nm.length,true);ch.setUint16(30,0,true);ch.setUint16(32,0,true);ch.setUint16(34,0,true);ch.setUint16(36,0,true);ch.setUint32(38,0,true);ch.setUint32(42,off,true);
    cd.push(ch.buffer,nm);off+=30+nm.length+data.length});
  var cdSize=cd.reduce(function(a,b){return a+(b.byteLength!=null?b.byteLength:b.length)},0);
  var e=new DataView(new ArrayBuffer(22));e.setUint32(0,0x06054b50,true);e.setUint16(8,files.length,true);e.setUint16(10,files.length,true);e.setUint32(12,cdSize,true);e.setUint32(16,off,true);
  return new Blob(parts.concat(cd,[e.buffer]),{type:'application/zip'});
}
function unzip(buf){
  var v=new DataView(buf),u8=new Uint8Array(buf),dec=new TextDecoder(),eo=-1;
  for(var i=buf.byteLength-22;i>=Math.max(0,buf.byteLength-65600);i--){if(v.getUint32(i,true)===0x06054b50){eo=i;break}}
  if(eo<0)return Promise.reject(new Error('file ZIP non valido'));
  var n=v.getUint16(eo+10,true),p=v.getUint32(eo+16,true),out={},jobs=[];
  for(var k=0;k<n;k++){if(v.getUint32(p,true)!==0x02014b50)break;var meth=v.getUint16(p+10,true),cs=v.getUint32(p+20,true),nl=v.getUint16(p+28,true),xl=v.getUint16(p+30,true),cl=v.getUint16(p+32,true),lo=v.getUint32(p+42,true);
    var name=dec.decode(u8.subarray(p+46,p+46+nl));p+=46+nl+xl+cl;
    var ds=lo+30+v.getUint16(lo+26,true)+v.getUint16(lo+28,true),data=u8.slice(ds,ds+cs);
    (function(name,meth,data){if(meth===0)out[name]=data;else if(meth===8&&window.DecompressionStream){jobs.push(new Response(new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer().then(function(ab){out[name]=new Uint8Array(ab)}))}})(name,meth,data)}
  return Promise.all(jobs).then(function(){return out});
}
function ext(m){var t=(m.mime||'').toLowerCase();if(t.indexOf('jpeg')>=0||t.indexOf('jpg')>=0)return 'jpg';if(t.indexOf('png')>=0)return 'png';if(t.indexOf('webm')>=0)return 'webm';if(t.indexOf('mp4')>=0||t.indexOf('m4a')>=0||t.indexOf('aac')>=0)return 'm4a';if(t.indexOf('ogg')>=0)return 'ogg';if(t.indexOf('mpeg')>=0||t.indexOf('mp3')>=0)return 'mp3';if(t.indexOf('wav')>=0)return 'wav';return 'bin'}
function mediaName(p,m){var idx=(p.media||[]).indexOf(m)+1;return 'media/'+slug(p.title)+'_'+p.id.slice(-5)+'_'+(m.type==='photo'?'foto':'audio')+idx+'.'+ext(m)}
function exportZip(){
  toast('Preparo il backup completo…',8000);
  var enc=new TextEncoder(),files=[],pts=POINTS.slice().sort(function(a,b){return (a.when||'').localeCompare(b.when||'')}),mjobs=[];
  pts.forEach(function(p){(p.media||[]).forEach(function(m){mjobs.push(DB.get('media',m.id).then(function(r){if(r)return r.blob.arrayBuffer().then(function(ab){files.push({name:mediaName(p,m),data:new Uint8Array(ab)})})}))})});
  return Promise.all(mjobs).then(function(){
    var data={app:'atlante-lago-piccolo',version:VERSION,exported:new Date().toISOString(),points:pts.map(function(p){var q=JSON.parse(JSON.stringify(p));q.media.forEach(function(m,i){m.file=mediaName(p,p.media[i])});return q}),tracks:TRACKS,checklist:CHECK,fonti:FON.lib,diario:FON.dia,livelli:FON.cl};
    files.unshift({name:'LEGGIMI.txt',data:enc.encode('Atlante del Lago Piccolo di Avigliana - backup del '+fmtDate(data.exported)+'\r\n\r\ndati.json      tutti i dati (per reimportarli nell\'app: Altro > Importa)\r\nschede.html    schede stampabili con foto (aprila nel browser)\r\npunti.gpx      punti e tracce per OsmAnd, Garmin, ecc.\r\npunti.kml      per Google Earth / My Maps\r\npunti.geojson  per QGIS\r\npunti.csv      per Excel / Fogli (separatore ;)\r\nmedia/         foto e registrazioni\r\n\r\n'+BRAND+'\r\n')},
      {name:'dati.json',data:enc.encode(JSON.stringify(data))},
      {name:'schede.html',data:enc.encode(reportHTML(pts,mediaName,mediaName))},
      {name:'punti.gpx',data:enc.encode(toGPX(pts,TRACKS))},
      {name:'punti.kml',data:enc.encode(toKML(pts,TRACKS,mediaName))},
      {name:'punti.geojson',data:enc.encode(toGeoJSON(pts,TRACKS,mediaName))},
      {name:'punti.csv',data:enc.encode(toCSV(pts))});
    if(FON.dia.length)files.push({name:'diario.csv',data:enc.encode(csvText(diarioRows()))});
    if(FON.lib.length)files.push({name:'bibliografia.txt',data:enc.encode(libText())});
    var z=zipBlob(files);
    SET.lastBackup=Date.now();SET.changes=0;saveSet();updBackupDot();
    return shareOrDownload(z,'atlante_lago_piccolo_'+stamp()+'.zip','Backup Atlante Lago Piccolo').then(function(){toast('Backup pronto ('+fmtSize(z.size)+')',4000);if(curPage==='alt')renderAlt()});
  }).catch(function(e){alert('Errore durante l\'esportazione: '+e.message)});
}
function exportText(kind){
  var pts=POINTS.slice().sort(function(a,b){return (a.when||'').localeCompare(b.when||'')}),s,t,n;
  if(kind==='gpx'){s=toGPX(pts,TRACKS);t='application/gpx+xml'}else if(kind==='kml'){s=toKML(pts,TRACKS,null);t='application/vnd.google-earth.kml+xml'}else if(kind==='geojson'){s=toGeoJSON(pts,TRACKS,null);t='application/geo+json'}else{s=toCSV(pts);t='text/csv'}
  n='lago_piccolo_'+stamp()+'.'+kind;shareOrDownload(new Blob([s],{type:t}),n);
}
/* ---- importazione ---- */
function importFile(f){
  var nm=f.name.toLowerCase();
  if(nm.endsWith('.zip'))return f.arrayBuffer().then(unzip).then(importZipFiles);
  return f.text().then(function(txt){
    if(nm.endsWith('.json')&&txt.indexOf('atlante-lago-piccolo')>=0)return importData(JSON.parse(txt),{});
    var pts=[],trks=[];
    if(nm.endsWith('.gpx')||txt.indexOf('<gpx')>=0){var x=new DOMParser().parseFromString(txt,'application/xml');$$('wpt',x).forEach(function(w){pts.push({lat:+w.getAttribute('lat'),lon:+w.getAttribute('lon'),name:($('name',w)||{}).textContent,desc:($('desc',w)||{}).textContent,ele:($('ele',w)||{}).textContent,time:($('time',w)||{}).textContent})});trks=gpxTracks(x,f.name)}
    else if(nm.endsWith('.kml')||txt.indexOf('<kml')>=0){var k=new DOMParser().parseFromString(txt,'application/xml');$$('Placemark',k).forEach(function(pm){var c=$('Point coordinates',pm);if(!c)return;var a=c.textContent.trim().split(',');pts.push({lat:+a[1],lon:+a[0],ele:a[2],name:($('name',pm)||{}).textContent,desc:(($('description',pm)||{}).textContent||'').replace(/<[^>]+>/g,' ')})})}
    else{var g=JSON.parse(txt);(g.features||[]).forEach(function(ft){if(ft.geometry&&ft.geometry.type==='Point'){var pr=ft.properties||{};pts.push({lat:ft.geometry.coordinates[1],lon:ft.geometry.coordinates[0],ele:ft.geometry.coordinates[2],name:pr.titolo||pr.name||pr.nome,desc:pr.note||pr.description||pr.desc})}})}
    if(!pts.length&&!trks.length)throw new Error('nessun punto né traccia trovati nel file');
    var now=new Date().toISOString();
    return Promise.all(pts.filter(function(q){return isFinite(q.lat)&&isFinite(q.lon)}).map(function(q){return DB.put('points',{id:uid(),cat:'altro',title:q.name||'Punto importato',sp:null,x:{},s:{},note:q.desc||'',tags:['importato'],when:q.time||now,lat:q.lat,lon:q.lon,acc:null,alt:q.ele!=null&&q.ele!==''?Math.round(+q.ele):null,altSrc:'file importato',gpsN:0,meteo:'',comp:SET.compilatore,media:[],created:now,updated:now})})).then(function(a){return Promise.all(trks.map(function(t){return DB.put('tracks',t)})).then(function(){if(trks.length)loadTracks();return {np:a.length,nm:0,nt:trks.length,sk:0}})});
  });
}
/* tracce GPX (per esempio registrate in background con la tua app nativa «Traccia GPS offline») */
function gpxTracks(x,fname){var out=[];
  $$('trk',x).forEach(function(t){var pts=[],brk=[];
    $$('trkseg',t).forEach(function(sg,si){if(si>0&&pts.length)brk.push(pts.length);$$('trkpt',sg).forEach(function(q){var e=$('ele',q),tm=$('time',q);pts.push([+q.getAttribute('lat'),+q.getAttribute('lon'),e&&e.textContent!==''?Math.round(+e.textContent*10)/10:null,tm?Date.parse(tm.textContent)||null:null,null])})});
    pts=pts.filter(function(p){return isFinite(p[0])&&isFinite(p[1])});if(pts.length<2)return;
    var t0=pts[0][3]||Date.now();pts.forEach(function(p){if(p[3]==null)p[3]=t0});
    var nm=null;for(var c=t.firstChild;c;c=c.nextSibling)if(c.nodeName==='name'){nm=c.textContent;break}
    out.push({id:uid(),name:nm||String(fname||'Traccia importata').replace(/\.gpx$/i,''),start:t0,end:pts[pts.length-1][3]||t0,pts:pts,brk:brk,imported:true})});
  return out}
function importZipFiles(files){var dj=files['dati.json'];if(!dj)throw new Error('nello ZIP manca dati.json: non è un backup di questa app');return importData(JSON.parse(new TextDecoder().decode(dj)),files)}
function importData(data,files){
  if(data.app!=='atlante-lago-piccolo')throw new Error('file non riconosciuto');
  var have={};POINTS.forEach(function(p){have[p.id]=p});var res={np:0,nm:0,nt:0,sk:0},jobs=[];
  (data.points||[]).forEach(function(p){var old=have[p.id];if(old&&(old.updated||'')>=(p.updated||'')){res.sk++;return}
    p.media=(p.media||[]).map(function(m){var f=m.file&&files[m.file];if(f){jobs.push(DB.put('media',{id:m.id,pid:p.id,blob:new Blob([f],{type:m.mime})}));res.nm++}delete m.file;return m});
    jobs.push(DB.put('points',p));res.np++});
  var ht={};TRACKS.forEach(function(t){ht[t.id]=1});(data.tracks||[]).forEach(function(t){if(!ht[t.id]){jobs.push(DB.put('tracks',t));res.nt++}});
  if(data.checklist){Object.keys(data.checklist).forEach(function(k){CHECK[k]=CHECK[k]||data.checklist[k]});jobs.push(saveCheck())}
  if(data.fonti||data.diario||data.livelli)jobs.push(FON.load().then(function(){function mg(a,b){var h={};a.forEach(function(x){h[x.id]=1});(b||[]).forEach(function(x){if(!h[x.id]){a.push(x);h[x.id]=1}})}mg(FON.lib,data.fonti);mg(FON.dia,data.diario);mg(FON.cl,data.livelli);FON.regLayers();return Promise.all([FON.saveLib(),FON.saveDia(),FON.saveCl()])}));
  return Promise.all(jobs).then(function(){return res});
}
$('#fImp').onchange=function(){var f=this.files[0];if(!f)return;toast('Importo '+f.name+'…',6000);importFile(f).then(function(r){thumbCache={};return Promise.all([loadPoints(),loadTracks()]).then(function(){alert('Importazione completata.\n\nPunti nuovi o aggiornati: '+r.np+'\nFoto/audio: '+r.nm+'\nTracce: '+r.nt+(r.sk?'\nGià presenti (saltati): '+r.sk:''))})}).catch(function(e){alert('Importazione non riuscita: '+e.message)})};
