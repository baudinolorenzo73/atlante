/* Atlante Lago Piccolo - Scheda nuovo/modifica punto: foto, audio, specie, campi «Scheda sito».
   by Lollo ®2026 · i moduli si caricano nell'ordine dei numeri (vedi index.html) */
'use strict';
/* =================== FORM NUOVO / MODIFICA =================== */
var draft=null,draftURLs=[];
function freeDraft(){draftURLs.forEach(function(u){URL.revokeObjectURL(u)});draftURLs=[]}
function newDraft(lat,lon,extra){var d={id:uid(),isNew:true,cat:'fauna',title:'',sp:null,x:{},s:{},note:'',ric:'',tags:[],when:new Date().toISOString(),lat:lat,lon:lon,acc:null,alt:null,altSrc:'',gpsN:0,meteo:'',comp:SET.compilatore,media:[],removed:[]};return Object.assign(d,extra||{})}
function openForm(p,opts){
  opts=opts||{};
  if(p){draft=JSON.parse(JSON.stringify(p));draft.isNew=false;draft.removed=[];draft.x=draft.x||{};draft.s=draft.s||{};draft.media=(draft.media||[]).map(function(m){return Object.assign({},m)})}
  else draft=opts.draft;
  renderForm();
}
function catSel(){return CATS.map(function(c){return '<span class="cat'+(draft.cat===c.id?' on':'')+'" data-c="'+c.id+'">'+c.e+' '+esc(c.n)+'</span>'}).join('')}
function renderForm(){
  var c=CAT(draft.cat),h='';
  if(draft.qc){var ph=draft.media.filter(function(m){return m.type==='photo'&&m.blob})[0],u='';if(ph){u=URL.createObjectURL(ph.blob);draftURLs.push(u)}
    h+='<div class="card row" style="align-items:center">'+(u?'<img src="'+u+'" alt="" style="width:64px;height:64px;object-fit:cover;border-radius:10px">':'')+'<div style="flex:1"><b>✓ Foto e posizione salvate nella bozza</b><div class="mut">'+(draft.acc?'📍 GPS ±'+draft.acc+' m':'📍 '+esc(draft.posSrc||''))+' · ora scegli la categoria e completa</div></div></div>'}
  h+='<label class="l">Categoria</label><div class="cats" id="fCats">'+catSel()+'</div>';
  if(c.sp){h+='<label class="l">Specie (nome italiano o scientifico)</label><input type="text" id="fSp" autocomplete="off" value="'+esc(draft.sp?((draft.sp.com||'')+(draft.sp.sci&&draft.sp.com?' – ':'')+(draft.sp.sci||'')):'')+'" placeholder="es. svasso maggiore, Alnus glutinosa…"><div id="fSpSug"></div>';
    h+='<div id="fSpInfo" class="mut">'+(draft.sp&&draft.sp.tratti?esc(draft.sp.tratti):'')+'</div>';
    if(draft.cat==='flora'||draft.cat==='albero'||draft.cat==='fungo')h+='<div class="row" style="margin-top:6px"><button class="btn s" id="fPlant">🔍 Identifica con Pl@ntNet (fino a 5 foto)</button></div><div id="fPlantBox"></div>';}
  h+='<label class="l">Titolo</label><input type="text" id="fTitle" value="'+esc(draft.title)+'" placeholder="es. Svassi in parata davanti al canneto">';
  (EXTRA[draft.cat]||[]).forEach(function(f){var v=draft.x[f.k]==null?'':draft.x[f.k];
    h+='<label class="l">'+esc(f.l)+'</label>';
    if(f.t==='select')h+='<select data-x="'+f.k+'"><option value=""></option>'+f.o.map(function(o){return '<option'+(o===v?' selected':'')+'>'+esc(o)+'</option>'}).join('')+'</select>';
    else h+='<input type="'+(f.t==='number'?'number':'text')+'" inputmode="'+(f.t==='number'?'decimal':'text')+'" data-x="'+f.k+'" value="'+esc(v)+'">';});
  h+='<label class="l">Dalla ricerca (testi da libri, siti, dispense, con le fonti) – modificabile</label><textarea id="fRic" style="min-height:'+(draft.ric?'160':'60')+'px" placeholder="Informazioni raccolte da fonti esterne, con la fonte">'+esc(draft.ric||'')+'</textarea>';
  h+='<label class="l">Descrizione e note (solo testo tuo)</label><textarea id="fNote" placeholder="Cosa vedi, cosa senti, dettagli, comportamento, ipotesi…">'+esc(draft.note)+'</textarea>';
  if(c.sch){h+='<h3>Scheda sito (modello del corso)</h3>';SCHEDA.forEach(function(s){var v=draft.s[s.k]||'';h+='<label class="l">'+esc(s.l)+'</label>'+(s.ta?'<textarea data-s="'+s.k+'" style="min-height:60px">'+esc(v)+'</textarea>':'<input type="text" data-s="'+s.k+'" value="'+esc(v)+'">')})}
  h+='<h3>Foto</h3><div class="row"><button class="btn" id="fCamB">📷 Scatta</button><button class="btn" id="fGalB">🖼️ Dalla galleria</button></div><div class="media" id="fPhotos"></div>';
  h+='<h3>Audio</h3><div class="row"><button class="btn" id="fRecB">🎙️ Registra</button><button class="btn" id="fAudB">📁 File audio</button><span id="fRecT" class="mut"></span></div><div id="fAuds"></div>';
  h+='<h3>Posizione</h3><div id="fPos" class="card"></div><div class="row"><button class="btn s" id="fGpsB">📡 Aggiorna dal GPS ('+SET.gpsAvg+' s)</button><button class="btn s" id="fPickB">🎯 Scegli sulla mappa</button><button class="btn s" id="fExifB" style="display:none">🖼️ Usa posizione della foto</button><button class="btn s" id="fEleB">⛰️ Quota dal modello del terreno</button></div><div id="fGpsP" class="prog" style="display:none;margin-top:6px"><i></i></div>';
  h+='<label class="l">Data e ora</label><input type="datetime-local" id="fWhen" value="'+localInput(draft.when)+'">';
  h+='<label class="l">Tag (separati da virgola)</label><input type="text" id="fTags" value="'+esc((draft.tags||[]).join(', '))+'" placeholder="es. esame GEA, da verificare, foto belle">';
  h+='<label class="l">Meteo (automatico se online, modificabile)</label><input type="text" id="fMeteo" value="'+esc(draft.meteo)+'">';
  h+='<label class="l">Compilatore</label><input type="text" id="fComp" value="'+esc(draft.comp)+'">';
  var foot=[mkBtn(draft.isNew?'Salva punto':'Salva modifiche','f',saveDraft),mkBtn('Annulla','',function(){if(confirm('Uscire senza salvare?'))closeModal()})];
  openModal(draft.isNew?'Nuovo punto':'Modifica punto',h,foot,function(){stopRec(true);freeDraft()});
  bindForm();renderMediaEdit();renderPos();
  if(draft.isNew&&!draft.meteo)fillMeteo();
}
function readForm(){
  var g=function(id){var e=$('#'+id);return e?e.value:''};
  draft.title=g('fTitle').trim();draft.note=g('fNote');if($('#fRic'))draft.ric=g('fRic');
  draft.tags=g('fTags').split(',').map(function(t){return t.trim()}).filter(Boolean);
  var w=g('fWhen');if(w)draft.when=new Date(w).toISOString();
  draft.meteo=g('fMeteo');draft.comp=g('fComp');
  $$('[data-x]',$('#mbody')).forEach(function(e){draft.x[e.getAttribute('data-x')]=e.value});
  $$('[data-s]',$('#mbody')).forEach(function(e){draft.s[e.getAttribute('data-s')]=e.value});
  $$('[data-cap]',$('#mbody')).forEach(function(e){var m=draft.media.filter(function(x){return x.id===e.getAttribute('data-cap')})[0];if(m)m.cap=e.value});
  var sp=$('#fSp');if(sp){var v=sp.value.trim();if(!v)draft.sp=null;else if(!draft.sp||v!==spLabel(draft.sp))draft.sp={com:'',sci:v,src:'inserito a mano'}}
}
function spLabel(s){return (s.com||'')+(s.sci&&s.com?' – ':'')+(s.sci||'')}
function bindForm(){
  $$('#fCats .cat').forEach(function(e){e.onclick=function(){readForm();draft.cat=e.getAttribute('data-c');var keep={};(EXTRA[draft.cat]||[]).forEach(function(f){if(draft.x[f.k]!=null)keep[f.k]=draft.x[f.k]});draft.x=keep;var y=$('#mbody').scrollTop;renderForm();$('#mbody').scrollTop=y}});
  $('#fCamB').onclick=function(){$('#fCam').value='';$('#fCam').click()};
  $('#fGalB').onclick=function(){$('#fGal').value='';$('#fGal').click()};
  $('#fAudB').onclick=function(){$('#fAud').value='';$('#fAud').click()};
  $('#fRecB').onclick=toggleRec;
  $('#fGpsB').onclick=gpsForDraft;
  $('#fPickB').onclick=function(){readForm();pickStart()};
  $('#fEleB').onclick=demForDraft;
  $('#fExifB').onclick=function(){if(draft._exif){draft.lat=draft._exif.lat;draft.lon=draft._exif.lon;draft.acc=null;draft.gpsN=0;draft.posSrc='dai dati GPS della foto';if(draft._exif.alt!=null){draft.alt=draft._exif.alt;draft.altSrc='EXIF foto'}renderPos();toast('Posizione presa dalla foto')}};
  if(draft._exif)$('#fExifB').style.display='';
  var sp=$('#fSp');if(sp){sp.oninput=debounce(function(){spSuggest(sp.value)},350);sp.onfocus=function(){if(sp.value.length>=2)spSuggest(sp.value)}}
  var pl=$('#fPlant');if(pl)pl.onclick=plantnetId;
}
function debounce(f,ms){var t;return function(){var a=arguments,s=this;clearTimeout(t);t=setTimeout(function(){f.apply(s,a)},ms)}}
function renderPos(){var e=$('#fPos');if(!e)return;
  e.innerHTML='<b>'+draft.lat.toFixed(6)+', '+draft.lon.toFixed(6)+'</b><br><small class="mut">'+(draft.acc?'precisione ±'+draft.acc+' m'+(draft.gpsN?' · media di '+draft.gpsN+' letture':''):(isInd(draft)?'<b style="color:var(--warn)">📍 '+esc(draft.posSrc)+'</b>':esc(draft.posSrc||'posizione scelta a mano')))+(draft.alt!=null?' · quota '+draft.alt+' m ('+esc(draft.altSrc||'GPS')+')':'')+'</small>'}
function gpsForDraft(){
  var pb=$('#fGpsP'),bar=$('i',pb);pb.style.display='';bar.style.width='0';
  getFix(SET.gpsAvg,function(n,acc,t){bar.style.width=Math.min(100,t/SET.gpsAvg*100)+'%';$('#fGpsB').textContent='📡 '+n+' letture · ±'+Math.round(acc)+' m'}).then(function(f){
    draft.lat=f.lat;draft.lon=f.lon;draft.acc=f.acc;draft.gpsN=f.n;draft.posSrc='GPS';if(f.alt!=null){draft.alt=f.alt;draft.altSrc='GPS'}
    here={lat:f.lat,lon:f.lon,acc:f.acc,alt:f.alt};renderPos();pb.style.display='none';$('#fGpsB').textContent='📡 Aggiorna dal GPS ('+SET.gpsAvg+' s)';
  }).catch(function(e){pb.style.display='none';$('#fGpsB').textContent='📡 Aggiorna dal GPS ('+SET.gpsAvg+' s)';toast('GPS: '+e.message)})
}
function demForDraft(){fetchJSON('https://api.open-meteo.com/v1/elevation?latitude='+draft.lat.toFixed(6)+'&longitude='+draft.lon.toFixed(6)).then(function(j){if(j.elevation&&j.elevation.length){draft.alt=Math.round(j.elevation[0]);draft.altSrc='modello del terreno';renderPos()}}).catch(function(e){toast('Quota non disponibile: '+e.message)})}
var WMO={0:'sereno',1:'poco nuvoloso',2:'parzialmente nuvoloso',3:'coperto',45:'nebbia',48:'nebbia con brina',51:'pioviggine debole',53:'pioviggine',55:'pioviggine intensa',56:'pioviggine gelata',57:'pioviggine gelata intensa',61:'pioggia debole',63:'pioggia',65:'pioggia forte',66:'pioggia gelata',67:'pioggia gelata forte',71:'neve debole',73:'neve',75:'neve forte',77:'granuli di neve',80:'rovesci deboli',81:'rovesci',82:'rovesci violenti',85:'rovesci di neve',86:'rovesci di neve forti',95:'temporale',96:'temporale con grandine',99:'temporale con grandine forte'};
function fillMeteo(){fetchJSON('https://api.open-meteo.com/v1/forecast?latitude='+draft.lat.toFixed(4)+'&longitude='+draft.lon.toFixed(4)+'&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,cloud_cover&timezone=Europe%2FRome').then(function(j){var c=j.current;if(!c)return;var t=(WMO[c.weather_code]||'')+', '+Math.round(c.temperature_2m)+' °C, umidità '+c.relative_humidity_2m+'%, vento '+Math.round(c.wind_speed_10m)+' km/h, nuvole '+c.cloud_cover+'%';draft.meteo=t;var e=$('#fMeteo');if(e&&!e.value)e.value=t}).catch(function(){})}

/* ---- suggerimenti specie ---- */
var CHK_SPECIES=[];
function spSuggest(q){
  var box=$('#fSpSug');if(!box)return;q=q.trim();if(q.length<2){box.innerHTML='';return}
  var ql=q.toLowerCase(),loc=[];
  CHK_SPECIES.forEach(function(s){if((s.it+' '+s.sci).toLowerCase().indexOf(ql)>=0)loc.push({com:s.it,sci:s.sci,src:'checklist del lago',tr:s.note})});
  if(draft.cat==='albero'||draft.cat==='flora')ALBERI.forEach(function(a){if(a[0].toLowerCase().indexOf(ql)>=0)loc.push({com:'',sci:a[0],src:'catalogo alberi del corso (p. '+a[6]+')',tr:[a[1],a[2],a[3]?'classe '+a[3]:'',a[5]].filter(Boolean).join(' · ')})});
  loc=loc.slice(0,12);
  function paint(online){var all=loc.concat(online||[]);box.innerHTML=all.length?'<div class="sug">'+all.map(function(s,i){return '<div data-i="'+i+'">'+(s.img?'<img src="'+esc(s.img)+'" alt="">':'')+'<span><b>'+esc(s.com||s.sci)+'</b>'+(s.com?' <i>'+esc(s.sci)+'</i>':'')+'<br><small>'+esc(s.src)+'</small></span></div>'}).join('')+'</div>':'';
    $$('.sug div',box).forEach(function(d){d.onclick=function(){var s=all[+d.getAttribute('data-i')];draft.sp={com:s.com||'',sci:s.sci,src:s.src,key:s.key||null,tratti:s.tr||''};$('#fSp').value=spLabel(draft.sp);$('#fSpInfo').textContent=draft.sp.tratti||'';box.innerHTML='';if(!$('#fTitle').value)$('#fTitle').value=s.com||s.sci}})}
  paint();
  var iconic={fauna:'Animalia',flora:'Plantae',albero:'Plantae',fungo:'Fungi'}[draft.cat]||'';
  fetchJSON('https://api.inaturalist.org/v1/taxa/autocomplete?q='+encodeURIComponent(q)+'&locale=it&per_page=10'+(iconic?'&iconic_taxa='+iconic:'')).then(function(j){
    paint((j.results||[]).map(function(t){return {com:t.preferred_common_name||'',sci:t.name,src:'iNaturalist · '+(t.rank||''),key:'inat:'+t.id,img:t.default_photo&&t.default_photo.square_url}}));
  }).catch(function(){});
}
/* ---- Pl@ntNet: fino a 5 foto della stessa pianta, ognuna con il suo organo ---- */
var PN_ORG=[['auto','automatico'],['leaf','foglia'],['flower','fiore'],['fruit','frutto'],['bark','corteccia'],['habit','pianta intera']];
function plantnetId(){
  readForm();
  if(!SET.plantnet){alert('Serve una chiave Pl@ntNet gratuita.\n\n1) Vai su my.plantnet.org e crea un account.\n2) Nella sezione "Your API key" copia la chiave.\n3) In questa app: Altro → Impostazioni → incolla la chiave.');return}
  var phs=draft.media.filter(function(m){return m.type==='photo'});if(!phs.length)return toast('Aggiungi prima una o più foto della pianta');
  if(phs.length===1)return plantnetSend([{m:phs[0],o:'auto'}]);
  var box=$('#fPlantBox');
  box.innerHTML='<div class="card"><b>Quali foto mando a Pl@ntNet?</b><div class="mut">Massimo 5, della stessa pianta. Più organi diversi (foglia, fiore, frutto, corteccia) = riconoscimento più sicuro.</div><div id="pnL"></div><div class="row" style="margin-top:8px"><button class="btn s f" id="pnGo">🔍 Identifica</button><button class="btn s" id="pnNo">Annulla</button><span class="mut" id="pnN"></span></div></div>';
  var L2=$('#pnL');
  phs.forEach(function(m,i){var r=el('<div class="row pnr" style="margin-top:6px"><input type="checkbox" '+(i<5?'checked':'')+' data-pn="'+i+'"><img alt="" style="width:56px;height:56px;object-fit:cover;border-radius:8px;background:#000"><select data-po="'+i+'" style="flex:1;width:auto">'+PN_ORG.map(function(o){return '<option value="'+o[0]+'">'+o[1]+'</option>'}).join('')+'</select></div>');L2.appendChild(r);
    getBlob(m).then(function(b){if(!b)return;var u=URL.createObjectURL(b);draftURLs.push(u);$('img',r).src=u})});
  function cnt(){var n=$$('[data-pn]',L2).filter(function(c){return c.checked}).length;$('#pnN').textContent=n+' foto scelte'+(n>5?' (massimo 5!)':'');$('#pnGo').disabled=!n||n>5}
  $$('[data-pn]',L2).forEach(function(c){c.onchange=cnt});cnt();
  $('#pnNo').onclick=function(){box.innerHTML=''};
  $('#pnGo').onclick=function(){var sel=[];$$('[data-pn]',L2).forEach(function(c){if(c.checked){var i=+c.getAttribute('data-pn');sel.push({m:phs[i],o:$('[data-po="'+i+'"]',L2).value})}});box.innerHTML='';plantnetSend(sel)};
}
function plantnetSend(sel){
  sel=sel.slice(0,5);toast('Invio '+sel.length+' foto a Pl@ntNet…',8000);
  Promise.all(sel.map(function(s){return getBlob(s.m)})).then(function(bl){
    var fd=new FormData();bl.forEach(function(b,i){if(b){fd.append('images',b,'foto'+(i+1)+'.jpg');fd.append('organs',sel[i].o)}});
    return fetch('https://my-api.plantnet.org/v2/identify/all?include-related-images=false&no-reject=false&lang=it&api-key='+encodeURIComponent(SET.plantnet),{method:'POST',body:fd})
  }).then(function(r){if(!r.ok)throw new Error('HTTP '+r.status+(r.status===401?' (chiave non valida)':r.status===404?' (specie non trovata)':r.status===429?' (troppe richieste oggi)':''));return r.json()}).then(function(j){
    var res=(j.results||[]).slice(0,6);if(!res.length)return toast('Nessuna specie riconosciuta');
    var used=sel.map(function(s){return (PN_ORG.filter(function(o){return o[0]===s.o})[0]||[,''])[1]}).join(', ');
    var box=$('#fSpSug');box.innerHTML='<div class="mut" style="margin:6px 0">Pl@ntNet su '+sel.length+' foto ('+esc(used)+')'+(j.remainingIdentificationRequests!=null?' · richieste rimaste oggi: '+j.remainingIdentificationRequests:'')+'</div><div class="sug">'+res.map(function(r,i){return '<div data-i="'+i+'"><span><b>'+esc((r.species.commonNames||[])[0]||r.species.scientificNameWithoutAuthor)+'</b> <i>'+esc(r.species.scientificNameWithoutAuthor)+'</i><br><small>Pl@ntNet · probabilità '+Math.round(r.score*100)+'%'+(r.species.family&&r.species.family.scientificNameWithoutAuthor?' · '+esc(r.species.family.scientificNameWithoutAuthor):'')+'</small></span></div>'}).join('')+'</div>';
    $$('.sug div',box).forEach(function(d){d.onclick=function(){var r=res[+d.getAttribute('data-i')];draft.sp={com:(r.species.commonNames||[])[0]||'',sci:r.species.scientificNameWithoutAuthor,src:'Pl@ntNet '+Math.round(r.score*100)+'% su '+sel.length+' foto'};$('#fSp').value=spLabel(draft.sp);box.innerHTML='';if(!$('#fTitle').value)$('#fTitle').value=draft.sp.com||draft.sp.sci}});
  }).catch(function(e){toast('Pl@ntNet: '+e.message,5000)});
}
function getBlob(m){return m.blob?Promise.resolve(m.blob):DB.get('media',m.id).then(function(r){return r&&r.blob})}
function renderMediaEdit(){
  var ph=$('#fPhotos'),au=$('#fAuds');if(!ph)return;
  var photos=draft.media.filter(function(m){return m.type==='photo'}),auds=draft.media.filter(function(m){return m.type==='audio'});
  ph.innerHTML=photos.map(function(m){return '<div class="mi"><img data-pm="'+m.id+'" alt=""><button class="del" data-del="'+m.id+'">✕</button><input type="text" data-cap="'+m.id+'" value="'+esc(m.cap||'')+'" placeholder="didascalia"></div>'}).join('');
  au.innerHTML=auds.map(function(m){return '<div class="au"><audio controls data-pm="'+m.id+'"></audio><button class="btn s r" data-del="'+m.id+'">✕</button></div><input type="text" data-cap="'+m.id+'" value="'+esc(m.cap||'')+'" placeholder="descrizione della registrazione (es. canto di raganella)">'}).join('');
  $$('[data-pm]',$('#mbody')).forEach(function(n){var m=draft.media.filter(function(x){return x.id===n.getAttribute('data-pm')})[0];getBlob(m).then(function(b){if(!b)return;var u=URL.createObjectURL(b);draftURLs.push(u);n.src=u;if(n.tagName==='IMG')n.onclick=function(){view(u)}})});
  $$('[data-del]',$('#mbody')).forEach(function(b){b.onclick=function(){readForm();var id=b.getAttribute('data-del');var m=draft.media.filter(function(x){return x.id===id})[0];if(m&&!m.blob)draft.removed.push(id);draft.media=draft.media.filter(function(x){return x.id!==id});renderMediaEdit()}});
}
function compress(file,max){return new Promise(function(res){
  function draw(src,w,h,done){var s=Math.min(1,max/Math.max(w,h));var c=document.createElement('canvas');c.width=Math.round(w*s);c.height=Math.round(h*s);c.getContext('2d').drawImage(src,0,0,c.width,c.height);c.toBlob(function(b){done&&done();res(b||file)},'image/jpeg',0.86)}
  if(window.createImageBitmap){createImageBitmap(file,{imageOrientation:'from-image'}).then(function(bm){draw(bm,bm.width,bm.height,function(){bm.close&&bm.close()})}).catch(fallback)}else fallback();
  function fallback(){var u=URL.createObjectURL(file),i=new Image();i.onload=function(){draw(i,i.naturalWidth,i.naturalHeight,function(){URL.revokeObjectURL(u)})};i.onerror=function(){URL.revokeObjectURL(u);res(file)};i.src=u}
})}
// lettura GPS dai metadati EXIF di una foto JPEG
function exifGPS(buf){try{
  var v=new DataView(buf);if(v.getUint16(0)!==0xFFD8)return null;var o=2;
  while(o<v.byteLength-4){var mk=v.getUint16(o);var len=v.getUint16(o+2);if(mk===0xFFE1&&v.getUint32(o+4)===0x45786966){return parseTiff(v,o+10)}if((mk&0xFF00)!==0xFF00)break;o+=2+len}
  return null;
  function parseTiff(v,t){var le=v.getUint16(t)===0x4949;var g16=function(p){return v.getUint16(p,le)},g32=function(p){return v.getUint32(p,le)};
    var ifd=t+g32(t+4),n=g16(ifd),gps=0;for(var i=0;i<n;i++){var e=ifd+2+i*12;if(g16(e)===0x8825)gps=t+g32(e+8)}
    if(!gps)return null;var m=g16(gps),r={};
    for(var j=0;j<m;j++){var q=gps+2+j*12,tag=g16(q),cnt=g32(q+4),vo=q+8;
      if(tag===1||tag===3)r[tag]=String.fromCharCode(v.getUint8(vo));
      else if(tag===2||tag===4){var off=t+g32(vo),a=[];for(var k=0;k<3;k++){a.push(g32(off+k*8)/g32(off+k*8+4))}r[tag]=a[0]+a[1]/60+a[2]/3600}
      else if(tag===6){var of2=t+g32(vo);r[6]=g32(of2)/g32(of2+4)}
      else if(tag===5)r[5]=v.getUint8(vo)}
    if(r[2]==null||r[4]==null)return null;
    var lat=r[2]*(r[1]==='S'?-1:1),lon=r[4]*(r[3]==='W'?-1:1);if(!lat&&!lon)return null;
    return {lat:lat,lon:lon,alt:r[6]!=null?Math.round(r[6]*(r[5]===1?-1:1)):null}}
}catch(e){return null}}
function addPhotos(files){
  files=Array.prototype.slice.call(files||[]);if(!files.length||!draft)return;readForm();toast('Elaboro '+files.length+' foto…');
  Promise.all(files.map(function(f){return f.slice(0,262144).arrayBuffer().then(function(ab){var g=exifGPS(ab);if(g&&!draft._exif){draft._exif=g}return compress(f,SET.photoMax)}).then(function(b){draft.media.push({id:uid(),type:'photo',mime:'image/jpeg',cap:'',blob:b,size:b.size})})})).then(function(){renderMediaEdit();if(draft._exif){var b=$('#fExifB');if(b)b.style.display='';toast('La foto contiene la posizione GPS: puoi usarla con «Usa posizione della foto»',4500)}});
}
$('#fCam').onchange=function(){if(QC.on)return quickPhotos(this.files);addPhotos(this.files)};
/* ---- scatto rapido: prima foto e posizione, poi il resto ---- */
var QC={on:false,wid:null,reads:[]};
function qcStop(){if(QC.wid!=null)navigator.geolocation.clearWatch(QC.wid);QC.wid=null}
function quickCapture(){
  var c=map.getCenter();draft=newDraft(c.lat,c.lng,{posSrc:'in attesa del GPS'});QC.on=true;
  // il GPS resta in ascolto mentre scatti: dopo la foto si usano le letture più recenti
  QC.reads=[];if(QC.wid!=null)navigator.geolocation.clearWatch(QC.wid);QC.wid=null;
  if(navigator.geolocation)QC.wid=navigator.geolocation.watchPosition(function(p){QC.reads.push({t:Date.now(),lat:p.coords.latitude,lon:p.coords.longitude,acc:p.coords.accuracy,alt:p.coords.altitude})},function(){},{enableHighAccuracy:true,maximumAge:0});
  var inp=$('#fCam');inp.value='';
  inp.oncancel=function(){if(!QC.on)return;QC.on=false;qcStop();toast('Foto annullata. Tieni premuto + per gli altri modi di creare un punto',4000)};
  inp.click();
}
function quickPhotos(files){
  QC.on=false;files=Array.prototype.slice.call(files||[]);if(!files.length)return;
  var d=draft,sec=SET.gpsAvg;toast('📍 Foto presa. Leggo la posizione GPS ('+sec+' s)…',sec*1000+3000);
  var pPh=Promise.all(files.map(function(f){return f.slice(0,262144).arrayBuffer().then(function(ab){var g=exifGPS(ab);if(g&&!d._exif)d._exif=g;return compress(f,SET.photoMax)}).then(function(b){d.media.push({id:uid(),type:'photo',mime:'image/jpeg',cap:'',blob:b,size:b.size})})}));
  var tPh=Date.now();
  var pFx=new Promise(function(res){
    if(QC.wid==null)return res(null);
    var iv=setInterval(function(){var el=(Date.now()-tPh)/1000,fresh=QC.reads.filter(function(r){return r.t>=tPh-2000});
      if((fresh.length&&el>=sec)||(fresh.length&&fresh[fresh.length-1].acc<=3)||el>=sec+8){clearInterval(iv);
        var use=fresh.length?fresh:QC.reads.filter(function(r){return Date.now()-r.t<180000}).slice(-3);qcStop();
        if(!use.length)return res(null);
        var best=Math.min.apply(null,use.map(function(r){return r.acc}));use=use.filter(function(r){return r.acc<=best*2.5});
        var sw=0,la=0,lo=0,al=0,aw=0;use.forEach(function(r){var w=1/(r.acc*r.acc);sw+=w;la+=r.lat*w;lo+=r.lon*w;if(r.alt!=null){al+=r.alt*w;aw+=w}});
        res({lat:la/sw,lon:lo/sw,acc:Math.max(1,Math.round(best*10)/10),alt:aw?Math.round(al/aw):null,n:use.length})}},400)});
  Promise.all([pPh,pFx]).then(function(r){var f=r[1];
    if(f){d.lat=f.lat;d.lon=f.lon;d.acc=f.acc;d.gpsN=f.n;d.posSrc='GPS';if(f.alt!=null){d.alt=f.alt;d.altSrc='GPS'}here={lat:f.lat,lon:f.lon,acc:f.acc,alt:f.alt}}
    else if(d._exif){d.lat=d._exif.lat;d.lon=d._exif.lon;d.posSrc='dai dati GPS della foto';if(d._exif.alt!=null){d.alt=d._exif.alt;d.altSrc='EXIF foto'}}
    else d.posSrc='posizione da completare (GPS non disponibile): usa «Scegli sulla mappa»';
    d.qc=true;openForm(null,{draft:d});if(!f&&!d._exif)toast('GPS non disponibile: scegli il punto sulla mappa',4500);else toast('✓ Foto e posizione pronte: scegli la categoria e completa la scheda',4000);
    if(d.alt==null&&f)demForDraft();
  }).catch(function(e){toast('Errore: '+e.message,5000);openForm(null,{draft:d})});
}
$('#fGal').onchange=function(){addPhotos(this.files)};
$('#fAud').onchange=function(){var f=this.files[0];if(!f||!draft)return;readForm();draft.media.push({id:uid(),type:'audio',mime:f.type||'audio/mpeg',cap:f.name,blob:f,size:f.size});renderMediaEdit()};
/* registratore */
var RECA={mr:null,chunks:[],t0:0,tm:null,stream:null};
function audioMime(){if(!window.MediaRecorder)return null;var c=['audio/webm;codecs=opus','audio/webm','audio/mp4','audio/ogg;codecs=opus','audio/aac'];for(var i=0;i<c.length;i++)if(MediaRecorder.isTypeSupported&&MediaRecorder.isTypeSupported(c[i]))return c[i];return ''}
function toggleRec(){
  if(RECA.mr){stopRec();return}
  var mt=audioMime();if(mt===null)return toast('Registrazione non supportata da questo browser: usa «File audio»');
  navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false}}).then(function(st){
    RECA.stream=st;RECA.chunks=[];RECA.mr=mt?new MediaRecorder(st,{mimeType:mt}):new MediaRecorder(st);
    RECA.mr.ondataavailable=function(e){if(e.data&&e.data.size)RECA.chunks.push(e.data)};
    RECA.mr.onstop=function(){var type=(RECA.mr&&RECA.mr.mimeType)||mt||'audio/webm';var b=new Blob(RECA.chunks,{type:type});st.getTracks().forEach(function(t){t.stop()});var discard=RECA.discard;RECA.mr=null;RECA.discard=false;clearInterval(RECA.tm);var tb=$('#fRecT');if(tb)tb.textContent='';var rb=$('#fRecB');if(rb){rb.textContent='🎙️ Registra';rb.classList.remove('r')}
      if(!discard&&draft&&b.size){readForm();draft.media.push({id:uid(),type:'audio',mime:type.split(';')[0],cap:'',blob:b,size:b.size,dur:Math.round((Date.now()-RECA.t0)/1000)});renderMediaEdit()}};
    RECA.mr.start(1000);RECA.t0=Date.now();
    $('#fRecB').textContent='⏹ Ferma';$('#fRecB').classList.add('r');
    RECA.tm=setInterval(function(){var s=Math.round((Date.now()-RECA.t0)/1000);var tb=$('#fRecT');if(tb)tb.innerHTML='<span class="rec" style="color:var(--bad)">●</span> '+Math.floor(s/60)+':'+pad(s%60)},500);
  }).catch(function(e){toast('Microfono non disponibile: '+e.message,4000)});
}
function stopRec(discard){if(RECA.mr){RECA.discard=!!discard;try{RECA.mr.stop()}catch(e){}}}

/* ---- salvataggio ---- */
function saveDraft(){
  readForm();
  if(RECA.mr){toast('Ferma prima la registrazione audio');return}
  if(!draft.title){draft.title=(draft.sp&&(draft.sp.com||draft.sp.sci))||CAT(draft.cat).n+' '+fmtDate(draft.when)}
  var now=new Date().toISOString();
  var rec={id:draft.id,cat:draft.cat,title:draft.title,sp:CAT(draft.cat).sp?draft.sp:null,x:draft.x,s:CAT(draft.cat).sch?draft.s:{},note:draft.note,ric:draft.ric||'',rk:draft.rk||null,match:draft.match||null,tags:draft.tags,when:draft.when,lat:+draft.lat,lon:+draft.lon,acc:draft.acc,posSrc:draft.posSrc||'',alt:draft.alt,altSrc:draft.altSrc,gpsN:draft.gpsN,meteo:draft.meteo,comp:draft.comp,created:draft.created||now,updated:now,
    media:draft.media.map(function(m){return {id:m.id,type:m.type,mime:m.mime,cap:m.cap||'',size:m.size||0,dur:m.dur||null}})};
  var ops=draft.media.filter(function(m){return m.blob}).map(function(m){return DB.put('media',{id:m.id,pid:rec.id,blob:m.blob})});
  draft.removed.forEach(function(id){delete thumbCache[id];ops.push(DB.del('media',id))});
  Promise.all(ops).then(function(){return DB.put('points',rec)}).then(function(){markChange();var isNew=draft.isNew;closeModal();toast(isNew?'Punto salvato':'Modifiche salvate');return loadPoints()}).catch(function(e){alert('Errore nel salvataggio: '+e.message+'\nSe lo spazio è finito, esporta un backup e libera memoria.')});
}
function markChange(){SET.changes=(SET.changes||0)+1;saveSet();updBackupDot()}
function updBackupDot(){var late=SET.changes>0&&(Date.now()-(SET.lastBackup||0)>2*86400000||SET.changes>=15);$('#navAlt').classList.toggle('dotb',!!late)}

/* ---- scelta posizione sulla mappa ---- */
var picking=null;
function pickStart(cb){picking=cb||'draft';$('#modal').classList.remove('on');go('map',true);if(draft&&picking==='draft')map.setView([draft.lat,draft.lon],Math.max(map.getZoom(),18));$('#cross').style.display='block';$('#pickbar').style.display='flex';$('#fabAdd').style.display='none'}
function pickEnd(ok){var c=map.getCenter();$('#cross').style.display='none';$('#pickbar').style.display='none';$('#fabAdd').style.display='';var p=picking;picking=null;
  if(p==='draft'){if(ok){draft.lat=c.lat;draft.lon=c.lng;draft.acc=null;draft.gpsN=0;draft.alt=null;draft.altSrc='';draft.posSrc='posizione scelta sulla mappa'}$('#modal').classList.add('on');renderPos();if(ok)demForDraft()}
  else if(typeof p==='function'&&ok)p(c.lat,c.lng)}
$('#pickOk').onclick=function(){pickEnd(true)};$('#pickNo').onclick=function(){pickEnd(false)};

/* ---- nuovo punto ---- */
function newPointMenu(){
  var h='<p class="mut">Dove si trova il punto?</p>';
  var foot=[mkBtn('📷 Foto e posizione, poi il resto','f',function(){closeModal();quickCapture()}),mkBtn('📡 Qui, dal GPS','',function(){closeModal();newFromGps()}),mkBtn('🎯 Al centro della mappa','',function(){closeModal();pickStart(function(la,lo){openForm(null,{draft:newDraft(la,lo)})})}),mkBtn('🖼️ Da una foto con GPS','',function(){closeModal();newFromPhoto()})];
  openModal('Nuovo punto',h+'<p class="mut">Un tocco su <b>+</b> apre subito la fotocamera (foto e posizione, poi il resto). Tenendo premuto <b>+</b> apri questo menu. Puoi anche <b>tenere premuto</b> sulla mappa nel punto esatto.</p>',foot);
}
function newFromGps(){toast('Leggo il GPS per '+SET.gpsAvg+' secondi…',SET.gpsAvg*1000+1500);getFix(SET.gpsAvg).then(function(f){here={lat:f.lat,lon:f.lon,acc:f.acc,alt:f.alt};var d=newDraft(f.lat,f.lon,{acc:f.acc,gpsN:f.n,alt:f.alt,altSrc:f.alt!=null?'GPS':''});openForm(null,{draft:d})}).catch(function(e){toast('GPS non disponibile ('+e.message+'): scegli il punto sulla mappa',4000);var c=map.getCenter();openForm(null,{draft:newDraft(c.lat,c.lng)})})}
function newFromPhoto(){var c=map.getCenter();openForm(null,{draft:newDraft(c.lat,c.lng)});setTimeout(function(){$('#fGal').value='';$('#fGal').click()},200)}
(function(){var fab=$('#fabAdd'),lt=null,long=false;
  fab.addEventListener('pointerdown',function(){long=false;clearTimeout(lt);lt=setTimeout(function(){long=true;if(navigator.vibrate)navigator.vibrate(30);newPointMenu()},550)});
  ['pointerup','pointercancel','pointerleave'].forEach(function(ev){fab.addEventListener(ev,function(){clearTimeout(lt)})});
  fab.addEventListener('contextmenu',function(e){e.preventDefault()});
  fab.onclick=function(e){if(long){long=false;return}quickCapture()};})();
map.on('contextmenu',function(e){if(picking)return;openForm(null,{draft:newDraft(e.latlng.lat,e.latlng.lng)});demForDraft()});
map.on('click',function(e){if(picking)return;$('#coord').textContent=e.latlng.lat.toFixed(6)+', '+e.latlng.lng.toFixed(6)});
