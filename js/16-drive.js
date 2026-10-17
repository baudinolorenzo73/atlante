/* Atlante di campo - Sincronizzazione con Google Drive (v3.1).
   Cartella «Atlante di campo» nel tuo Drive: dati.json (punti, tracce, diario, fonti, luoghi), foto/, audio/ ed esporta/ (GPX, KML, GeoJSON, CSV).
   L'app vede solo i file che crea lei (permesso drive.file). I dispositivi si uniscono per singolo elemento: vince la modifica più recente;
   le eliminazioni viaggiano come «lapidi» (TOMB) così un punto cancellato su un dispositivo non ricompare sull'altro.
   by Lollo ®2026 · i moduli si caricano nell'ordine dei numeri (vedi index.html) */
'use strict';

/* =================== LAPIDI (elementi eliminati) =================== */
var TOMB={};
function tomb(id){TOMB[id]=new Date().toISOString();DB.put('kv',{id:'tomb',v:TOMB});if(typeof GD!=='undefined')GD.touch()}
DB.keys=function(store){
  if(!DB.ok)return Promise.resolve(Object.keys(DB.mem[store]));
  return DB.tx(store,'readonly',function(s){return s.getAllKeys()});
};

/* =================== ACCESSO E CHIAMATE A DRIVE =================== */
var GD={tok:null,exp:0,busy:false,F:{},timer:null,st:{}};
try{var _gt=JSON.parse(localStorage.getItem('atl_gtok')||'null');if(_gt&&_gt.e>Date.now()+60000){GD.tok=_gt.t;GD.exp=_gt.e}}catch(e){}
GD.ready=function(){return !!(GD.tok&&Date.now()<GD.exp-60000)};
GD.loadGIS=function(){
  if(window.google&&google.accounts&&google.accounts.oauth2)return Promise.resolve();
  return new Promise(function(res,rej){var s=document.createElement('script');s.src='https://accounts.google.com/gsi/client';s.onload=function(){res()};s.onerror=function(){rej(new Error('Google non raggiungibile (serve la rete)'))};document.head.appendChild(s)});
};
GD.token=function(){
  if(GD.ready())return Promise.resolve(GD.tok);
  if(!SET.gClient)return Promise.reject(new Error('Manca l\'ID client Google (Altro → Google Drive)'));
  return GD.loadGIS().then(function(){return new Promise(function(res,rej){
    var tc=google.accounts.oauth2.initTokenClient({client_id:SET.gClient,scope:'https://www.googleapis.com/auth/drive.file',
      callback:function(r){if(r.error)return rej(new Error(r.error_description||r.error));GD.tok=r.access_token;GD.exp=Date.now()+(r.expires_in||3600)*1000;SET.gOk=1;saveSet();try{localStorage.setItem('atl_gtok',JSON.stringify({t:GD.tok,e:GD.exp}))}catch(e){}res(GD.tok)},
      error_callback:function(e){rej(new Error('Accesso Google annullato o bloccato ('+(e&&e.type||'errore')+')'))}});
    tc.requestAccessToken({prompt:SET.gOk?'':'consent'});
  })});
};
GD.api=function(path,opt){
  return GD.token().then(function(t){opt=opt||{};opt.headers=Object.assign({Authorization:'Bearer '+t},opt.headers||{});return fetch(path.indexOf('http')===0?path:'https://www.googleapis.com'+path,opt)}).then(function(r){
    if(r.status===401){GD.tok=null;try{localStorage.removeItem('atl_gtok')}catch(e){}throw new Error('Accesso scaduto: tocca Sincronizza di nuovo')}
    if(!r.ok)return r.text().then(function(t){throw new Error('Drive HTTP '+r.status+' '+t.slice(0,100))});
    return r});
};
GD.json=function(path,opt){return GD.api(path,opt).then(function(r){return r.json()})};
GD.list=function(q){
  var out=[];
  function pg(tk){return GD.json('/drive/v3/files?q='+encodeURIComponent(q)+'&fields='+encodeURIComponent('nextPageToken,files(id,name,modifiedTime,appProperties)')+'&pageSize=1000'+(tk?'&pageToken='+encodeURIComponent(tk):'')).then(function(j){out=out.concat(j.files||[]);return j.nextPageToken?pg(j.nextPageToken):out})}
  return pg();
};
GD.folder=function(name,parent){
  var q="name='"+name+"' and mimeType='application/vnd.google-apps.folder' and trashed=false"+(parent?" and '"+parent+"' in parents":'');
  return GD.list(q).then(function(a){
    if(a.length)return a[0].id;
    return GD.json('/drive/v3/files?fields=id',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:name,mimeType:'application/vnd.google-apps.folder',parents:parent?[parent]:undefined})}).then(function(j){return j.id});
  });
};
// cartella principale: «Atlante di campo». Se trova quella vecchia («Atlante Lago Piccolo») la rinomina, così non perdi niente.
GD.ROOT='Atlante di campo';GD.OLDROOT='Atlante Lago Piccolo';
GD.rootFolder=function(){
  var q=function(n){return "name='"+n+"' and mimeType='application/vnd.google-apps.folder' and trashed=false and 'root' in parents"};
  return GD.list(q(GD.ROOT)).then(function(a){if(a.length)return a[0].id;
    return GD.list(q(GD.OLDROOT)).then(function(b){if(!b.length)return GD.folder(GD.ROOT);
      return GD.json('/drive/v3/files/'+b[0].id+'?fields=id',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:GD.ROOT})}).then(function(){GD.log('• Cartella su Drive rinominata in «'+GD.ROOT+'»');return b[0].id})})});
};
GD.children=function(folder){return GD.list("'"+folder+"' in parents and trashed=false")};
GD.up=function(id,meta,blob){
  var b='atlb'+uid(),body=new Blob(['--'+b+'\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n'+JSON.stringify(meta)+'\r\n--'+b+'\r\nContent-Type: '+(blob.type||'application/octet-stream')+'\r\n\r\n',blob,'\r\n--'+b+'--']);
  return GD.json((id?'/upload/drive/v3/files/'+id:'/upload/drive/v3/files')+'?uploadType=multipart&fields=id,name',{method:id?'PATCH':'POST',headers:{'Content-Type':'multipart/related; boundary='+b},body:body});
};
GD.down=function(id){return GD.api('/drive/v3/files/'+id+'?alt=media').then(function(r){return r.blob()})};
GD.del=function(id){return GD.api('/drive/v3/files/'+id,{method:'DELETE'}).catch(function(){})};
function pool(items,n,fn){var i=0,out=[];function w(){if(i>=items.length)return Promise.resolve();var k=i++;return Promise.resolve(fn(items[k],k)).then(function(r){out[k]=r;return w()})}var ws=[];for(var j=0;j<n;j++)ws.push(w());return Promise.all(ws).then(function(){return out})}
function hash(s){var h=5381;for(var i=0;i<s.length;i++)h=((h<<5)+h+s.charCodeAt(i))|0;return String(h)}

/* =================== UNIONE DEI DATI =================== */
function mimeExt(m){return /jpeg|jpg/.test(m)?'jpg':/png/.test(m)?'png':/webp/.test(m)?'webp':/webm/.test(m)?'webm':/mp4|m4a|aac/.test(m)?'m4a':/ogg/.test(m)?'ogg':/mpeg|mp3/.test(m)?'mp3':/wav/.test(m)?'wav':'bin'}
function tsOf(o){return o.updated||o.u||o.created||o.added||o.when||''}
function mergeList(local,remote,T){
  var by={},out=[],ch=0;local.forEach(function(x){by[x.id]=x});
  (remote||[]).forEach(function(r){var l=by[r.id],tb=T[r.id];if(tb&&tb>=tsOf(r))return;if(!l){by[r.id]=r;ch++}else if(tsOf(r)>tsOf(l)){by[r.id]=r;ch++}});
  Object.keys(by).forEach(function(k){var x=by[k],tb=T[k];if(tb&&tb>=tsOf(x)){ch++;return}out.push(x)});
  return {list:out,ch:ch};
}
GD.merge=function(R){
  var res={np:0,nt:0,nd:0,nf:0,del:0},jobs=[],T=Object.assign({},R.tomb||{});
  Object.keys(TOMB).forEach(function(k){if(!T[k]||TOMB[k]>T[k])T[k]=TOMB[k]});
  TOMB=T;jobs.push(DB.put('kv',{id:'tomb',v:TOMB}));
  // punti
  var have={};POINTS.forEach(function(p){have[p.id]=p});
  (R.points||[]).forEach(function(rp){var lp=have[rp.id],tb=T[rp.id];if(tb&&tb>=tsOf(rp))return;if(!lp||(rp.updated||'')>(lp.updated||'')){jobs.push(DB.put('points',rp));res.np++}});
  POINTS.forEach(function(p){var tb=T[p.id];if(tb&&tb>=tsOf(p)){(p.media||[]).forEach(function(m){jobs.push(DB.del('media',m.id))});jobs.push(DB.del('points',p.id));res.del++}});
  // tracce
  var ht={};TRACKS.forEach(function(t){ht[t.id]=t});
  (R.tracks||[]).forEach(function(rt){if(T[rt.id])return;var lt=ht[rt.id];if(REC.on&&REC.trk&&REC.trk.id===rt.id)return;if(!lt||(rt.u||'')>(lt.u||'')){jobs.push(DB.put('tracks',rt));res.nt++}});
  TRACKS.forEach(function(t){if(T[t.id]&&!(REC.on&&REC.trk&&REC.trk.id===t.id)){jobs.push(DB.del('tracks',t.id));res.del++}});
  // diario, fonti
  var md=mergeList(FON.dia,R.diario,T);res.nd=md.ch;FON.dia=md.list;jobs.push(DB.put('kv',{id:'diario',v:FON.dia}));
  var mf=mergeList(FON.lib,R.fonti,T);res.nf=mf.ch;FON.lib=mf.list;jobs.push(DB.put('kv',{id:'fonti',v:FON.lib}));
  // luoghi, livelli
  var mp=mergeList(PL.list,R.luoghi,T);PL.list=mp.list;if(!PL.all().some(function(p){return p.id===PL.cur}))PL.cur='lago';jobs.push(PL.save());
  var mq=mergeList(PC.list,R.percorsi,T);PC.list=mq.list;if(PC.cur&&!PC.get(PC.cur)){PC.cur=null;PC.all=false}jobs.push(PC.save(false));
  var mc=mergeList(FON.cl,R.livelli,T);FON.cl=mc.list;jobs.push(DB.put('kv',{id:'customlayers',v:FON.cl}));
  // checklist
  Object.keys(R.checklist||{}).forEach(function(k){if(R.checklist[k])CHECK[k]=true});jobs.push(saveCheck());
  return Promise.all(jobs).then(function(){return res});
};
GD.bundle=function(){
  return {app:'atlante-lago-piccolo',v:VERSION,at:new Date().toISOString(),points:POINTS,tracks:TRACKS,diario:FON.dia,fonti:FON.lib,luoghi:PL.list,percorsi:PC.list,livelli:FON.cl,checklist:CHECK,tomb:TOMB};
};

/* =================== SINCRONIZZAZIONE =================== */
GD.log=function(t,c){GD.st.lines=(GD.st.lines||[]);GD.st.lines.push([t,c||'']);var b=$('#gdLog');if(b){var d=document.createElement('div');if(c)d.className=c;d.textContent=t;b.appendChild(d);b.scrollTop=b.scrollHeight}};
GD.sync=function(silent){
  if(GD.busy)return Promise.resolve();
  GD.busy=true;GD.st={lines:[]};var b0=$('#gdLog');if(b0)b0.innerHTML='';var btn=$('#gdSync');if(btn)btn.disabled=true;
  var R={},rem={},sum={};
  return GD.token().then(function(){GD.log('… cartella su Drive');
    return GD.rootFolder().then(function(root){return Promise.all([GD.folder('foto',root),GD.folder('audio',root),GD.folder('esporta',root)]).then(function(a){GD.F={root:root,foto:a[0],audio:a[1],exp:a[2]}})});
  }).then(function(){return GD.children(GD.F.root)}).then(function(files){
    var d=files.filter(function(f){return f.name==='dati.json'})[0];GD.F.dati=d&&d.id;
    if(!d){GD.log('• Primo collegamento: la cartella è vuota');return null}
    GD.log('… leggo i dati di Drive');return GD.down(d.id).then(function(bl){return bl.text()}).then(function(t){return JSON.parse(t)});
  }).then(function(remote){
    R=remote||{};GD.log('… unisco i dati');return GD.merge(R);
  }).then(function(r){
    sum=r;return Promise.all([loadPoints(),loadTracks()]);
  }).then(function(){
    thumbCache={};FON.regLayers();PC.badge();
    GD.log('✓ Dati uniti: '+sum.np+' punti, '+sum.nt+' tracce, '+sum.nd+' righe di diario, '+sum.nf+' fonti'+(sum.del?', '+sum.del+' eliminati':''),'ok');
    var bl=new Blob([JSON.stringify(GD.bundle())],{type:'application/json'});
    return GD.up(GD.F.dati||null,GD.F.dati?{name:'dati.json'}:{name:'dati.json',parents:[GD.F.root]},bl).then(function(j){GD.F.dati=j.id;GD.log('✓ dati.json salvato su Drive','ok')});
  }).then(function(){return Promise.all([GD.children(GD.F.foto),GD.children(GD.F.audio),DB.keys('media')])}).then(function(x){
    var remote={},keys={};x[0].concat(x[1]).forEach(function(f){var m=f.appProperties&&f.appProperties.mid;if(m)remote[m]={id:f.id,pid:f.appProperties.pid}});x[2].forEach(function(k){keys[k]=1});
    var up=[],down=[],live={};
    POINTS.forEach(function(p){(p.media||[]).forEach(function(m){live[m.id]=1;if(keys[m.id]&&!remote[m.id])up.push([p,m]);else if(!keys[m.id]&&remote[m.id])down.push([p,m,remote[m.id].id])})});
    var orphan=Object.keys(remote).filter(function(k){return !live[k]&&TOMB[remote[k].pid]}).map(function(k){return remote[k].id});
    GD.log('… foto e audio: '+up.length+' da caricare, '+down.length+' da scaricare'+(orphan.length?', '+orphan.length+' da togliere':''));
    var nU=0,nD=0,err=0;
    return pool(up,3,function(it){var p=it[0],m=it[1];return DB.get('media',m.id).then(function(r){if(!r)return;var ext=mimeExt(m.mime||r.blob.type||''),folder=m.type==='audio'?GD.F.audio:GD.F.foto;
      return GD.up(null,{name:slug(p.title)+'_'+m.id+'.'+ext,parents:[folder],appProperties:{mid:m.id,pid:p.id}},r.blob).then(function(){nU++})}).catch(function(){err++})})
    .then(function(){return pool(down,3,function(it){return GD.down(it[2]).then(function(bl){return DB.put('media',{id:it[1].id,pid:it[0].id,blob:new Blob([bl],{type:it[1].mime||bl.type})}).then(function(){nD++})}).catch(function(){err++})})})
    .then(function(){return pool(orphan,3,GD.del)})
    .then(function(){if(nD){thumbCache={};drawPoints();renderCat()}})
    .then(function(){GD.log('✓ Foto e audio: '+nU+' caricati, '+nD+' scaricati'+(err?', '+err+' non riusciti (riprova)':''),err?'ko':'ok')});
  }).then(function(){
    var pts=POINTS.slice().sort(function(a,b){return (a.when||'').localeCompare(b.when||'')});
    var ex=[['punti.gpx',toGPX(pts,TRACKS),'application/gpx+xml'],['punti.kml',toKML(pts,TRACKS,null),'application/vnd.google-earth.kml+xml'],['punti.geojson',toGeoJSON(pts,TRACKS,null),'application/geo+json'],['punti.csv',toCSV(pts),'text/csv']];
    if(FON.dia.length)ex.push(['diario.csv',csvText(diarioRows()),'text/csv']);if(FON.lib.length)ex.push(['bibliografia.txt',libText(),'text/plain']);
    var H=SET.gH||{};
    return GD.children(GD.F.exp).then(function(cur){var ids={};cur.forEach(function(f){ids[f.name]=f.id});var n=0;
      return pool(ex,2,function(e){var h=hash(e[1]);if(H[e[0]]===h&&ids[e[0]])return;var bl=new Blob([e[1]],{type:e[2]});
        return GD.up(ids[e[0]]||null,ids[e[0]]?{name:e[0]}:{name:e[0],parents:[GD.F.exp]},bl).then(function(){H[e[0]]=h;n++})}).then(function(){SET.gH=H;GD.log('✓ File per PC e GIS (esporta/): '+n+' aggiornati','ok')});
    });
  }).then(function(){
    SET.gLast=Date.now();saveSet();GD.log('✓ Sincronizzazione completata','ok');if(!silent)toast('☁️ Sincronizzato con Google Drive',3000);
    if(curPage==='alt')renderAlt();
  }).catch(function(e){
    GD.log('✗ '+e.message,'ko');toast('☁️ '+e.message,5000);
  }).then(function(){GD.busy=false;var b=$('#gdSync');if(b)b.disabled=false});
};
// dopo una modifica: se l'accesso è ancora valido, sincronizza da sola dopo qualche secondo
GD.touch=function(){
  if(!SET.gAuto||!SET.gClient||!GD.ready())return;
  clearTimeout(GD.timer);GD.timer=setTimeout(function(){if(navigator.onLine!==false)GD.sync(true)},20000);
};
GD.signOut=function(){
  var t=GD.tok;GD.tok=null;GD.exp=0;try{localStorage.removeItem('atl_gtok')}catch(e){}SET.gOk=0;saveSet();
  if(t&&window.google&&google.accounts&&google.accounts.oauth2)try{google.accounts.oauth2.revoke(t,function(){})}catch(e){}
  if(curPage==='alt')renderAlt();toast('Scollegato da Google');
};

/* =================== SCHEDA «GOOGLE DRIVE» (pagina Altro) =================== */
GD.altCard=function(){
  var h='<h3>Google Drive</h3><div class="card"><div class="mut">Sincronizza punti, tracce, foto, audio, diario e fonti tra telefono, tablet e PC. In Drive trovi la cartella «Atlante di campo» con file veri (foto, audio, GPX, KML, CSV).</div>';
  if(!SET.gClient){
    h+='<div class="mut" style="margin-top:6px">Per collegarti serve un «ID client» Google: segui la procedura guidata qui sotto, è quasi tutta a un tocco.</div>';
  }else{
    h+='<div style="margin-top:8px">'+(SET.gOk?'<b class="ok">Collegato</b>':'<b>Non ancora collegato</b>')+' · ultima sincronizzazione: '+(SET.gLast?fmtDate(new Date(SET.gLast).toISOString()):'mai')+'</div>'
     +'<div class="row" style="margin-top:8px"><button class="btn f" id="gdSync">☁️ '+(SET.gOk?'Sincronizza ora':'Accedi e sincronizza')+'</button>'+(SET.gOk?'<button class="btn s" id="gdOut">Esci da Google</button>':'')+'<button class="btn s" id="gdChg">Cambia ID client</button></div>'
     +'<label style="display:block;margin-top:8px"><input type="checkbox" id="gdAuto" '+(SET.gAuto?'checked':'')+'> sincronizza da sola dopo ogni modifica (se l\'accesso è ancora valido)</label>'
     +'<div class="log" id="gdLog" style="max-height:180px;overflow:auto"></div>';
  }
  h+=GD.wizard();
  return h;
};
GD.bindAlt=function(){
  GD.bindWiz();
  if($('#gdSync'))$('#gdSync').onclick=function(){GD.sync(false)};
  if($('#gdOut'))$('#gdOut').onclick=GD.signOut;
  if($('#gdChg'))$('#gdChg').onclick=function(){if(confirm('Cambiare l\'ID client? Dovrai accedere di nuovo.')){SET.gClient='';SET.gOk=0;GD.tok=null;saveSet();renderAlt()}};
  if($('#gdAuto'))$('#gdAuto').onchange=function(){SET.gAuto=this.checked;saveSet()};
  if(GD.st.lines&&$('#gdLog'))GD.st.lines.forEach(function(l){var d=document.createElement('div');if(l[1])d.className=l[1];d.textContent=l[0];$('#gdLog').appendChild(d)});
};

/* =================== PROCEDURA GUIDATA PER L'ID CLIENT =================== */
GD.ORIGIN=(location.protocol==='https:'&&location.origin)||'https://baudinolorenzo73.github.io';
GD.STEPS=[
 {t:'Crea il progetto',u:'https://console.cloud.google.com/projectcreate',b:'Apri «Nuovo progetto»',cp:['Atlante'],d:'Accedi con il tuo account Google. Nome progetto: <b>Atlante</b> (tocca «Copia nome»), poi <b>Crea</b>. Aspetta la notifica e controlla in alto che il progetto «Atlante» sia selezionato.',cl:['Copia nome','Atlante']},
 {t:'Abilita Google Drive API',u:'https://console.cloud.google.com/apis/library/drive.googleapis.com',b:'Apri Drive API',d:'Tocca <b>Abilita</b> (se vedi già «Gestisci» è a posto).'},
 {t:'Configura la schermata di consenso',u:'https://console.cloud.google.com/auth/overview',b:'Apri Google Auth Platform',d:'Tocca <b>Inizia</b>. Nome app: <b>Atlante</b>; email di assistenza: la tua. Pubblico: <b>Esterno</b>. Contatto: la tua email. Spunta le condizioni e <b>Crea</b>.',cl:['Copia email','baudinolorenzo@gmail.com']},
 {t:'Aggiungi te come utente di prova',u:'https://console.cloud.google.com/auth/audience',b:'Apri Pubblico',d:'Sotto «Utenti di prova» tocca <b>Add users</b> e inserisci la tua Gmail. Lascia lo stato «In fase di test».',cl:['Copia email','baudinolorenzo@gmail.com']},
 {t:'Crea l\'ID client',u:'https://console.cloud.google.com/auth/clients/create',b:'Apri «Crea ID client»',d:'Tipo di applicazione: <b>Applicazione web</b>. Nome: <b>Atlante web</b>. In <b>Origini JavaScript autorizzate</b> → Aggiungi URI e incolla l\'indirizzo qui sotto (senza barra finale). Poi <b>Crea</b>.',cl:['Copia indirizzo',GD.ORIGIN],show:GD.ORIGIN},
 {t:'Incolla qui l\'ID client',d:'Google mostra «ID client» (finisce con .apps.googleusercontent.com). Tocca <b>Incolla dagli appunti</b>, oppure scegli il file JSON scaricato da Google: l\'ID viene riconosciuto da solo.',paste:1}
];
GD.wizard=function(){
  var S=SET.gSteps||{},ok=!!SET.gClient;
  var h='<details'+(ok?'':' open')+' style="margin-top:10px"><summary><b>'+(ok?'Procedura per ottenere l\'ID client (già fatta)':'Come ottenere l\'ID client: procedura guidata (una volta sola)')+'</b></summary><div class="dc">';
  if(location.protocol!=='https:')h+='<p style="color:var(--bad)"><b>Attenzione:</b> stai usando l\'app da «'+esc(location.origin)+'». Per Google devi aprirla dal tuo indirizzo pubblicato (https). Apri l\'app da GitHub Pages e rifai da lì.</p>';
  GD.STEPS.forEach(function(s,i){
    h+='<div class="card" style="margin:6px 0"><label class="row" style="align-items:flex-start"><input type="checkbox" data-gs="'+i+'" '+(S[i]||(ok&&i<5)?'checked':'')+' style="width:22px;height:22px;flex:none"><span style="flex:1"><b>'+(i+1)+'. '+s.t+'</b><br>'+s.d+(s.show?'<br><code style="word-break:break-all">'+esc(s.show)+'</code>':'')+'</span></label><div class="row" style="margin-top:6px;flex-wrap:wrap">';
    if(s.u)h+='<a class="btn f" href="'+s.u+'" target="_blank" rel="noopener" data-gn="'+i+'">'+s.b+'</a>';
    if(s.cl&&s.cl[1])h+='<button class="btn s" data-gc="'+esc(s.cl[1])+'">'+s.cl[0]+'</button>';
    if(s.paste)h+='<button class="btn f" id="gdPaste">📋 Incolla dagli appunti</button><label class="btn s" style="cursor:pointer">📄 Scegli file JSON<input type="file" id="gdFile" accept=".json,application/json,text/plain" hidden></label><input type="text" id="gdId" placeholder="oppure scrivi/incolla qui l\'ID" autocomplete="off" style="flex:1 1 100%;margin-top:6px" value="'+esc(SET.gClient||'')+'">';
    h+='</div></div>';
  });
  return h+'<p class="mut">Al primo accesso Google dice «app non verificata»: tocca <b>Avanzate</b> → <b>Vai a Atlante</b>. Sugli altri dispositivi basta incollare lo stesso ID e accedere con lo stesso account.</p></div></details>';
};
GD.takeId=function(txt){
  var m=/[0-9]{6,}-[a-z0-9]+\.apps\.googleusercontent\.com/i.exec(String(txt||''));
  if(!m){toast('Non trovo un ID client in quel testo');return false}
  SET.gClient=m[0];SET.gSteps=SET.gSteps||{};for(var i=0;i<6;i++)SET.gSteps[i]=1;saveSet();toast('✓ ID client riconosciuto e salvato');renderAlt();return true;
};
GD.bindWiz=function(){
  $$('[data-gs]').forEach(function(c){c.onchange=function(){SET.gSteps=SET.gSteps||{};SET.gSteps[c.getAttribute('data-gs')]=c.checked?1:0;saveSet()}});
  $$('[data-gn]').forEach(function(a){a.addEventListener('click',function(){SET.gSteps=SET.gSteps||{};SET.gSteps[a.getAttribute('data-gn')]=1;saveSet();var c=$('[data-gs="'+a.getAttribute('data-gn')+'"]');if(c)c.checked=true})});
  $$('[data-gc]').forEach(function(b){b.onclick=function(){var t=b.getAttribute('data-gc');(navigator.clipboard&&navigator.clipboard.writeText?navigator.clipboard.writeText(t):Promise.reject()).then(function(){toast('Copiato: '+t,2200)},function(){prompt('Copia questo testo:',t)})}});
  if($('#gdPaste'))$('#gdPaste').onclick=function(){(navigator.clipboard&&navigator.clipboard.readText?navigator.clipboard.readText():Promise.reject()).then(function(t){GD.takeId(t)},function(){toast('Il telefono non permette di leggere gli appunti: incolla nella casella qui sotto',4000);var i=$('#gdId');if(i)i.focus()})};
  if($('#gdId')){$('#gdId').oninput=function(){if(/\.apps\.googleusercontent\.com/i.test(this.value))GD.takeId(this.value)};$('#gdId').onpaste=function(e){var t=(e.clipboardData||window.clipboardData).getData('text');if(/\.apps\.googleusercontent\.com/i.test(t)){e.preventDefault();GD.takeId(t)}}}
  if($('#gdFile'))$('#gdFile').onchange=function(){var f=this.files[0];if(!f)return;var r=new FileReader();r.onload=function(){GD.takeId(r.result)};r.readAsText(f)};
};
