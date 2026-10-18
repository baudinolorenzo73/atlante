/* Atlante di campo - Strumenti da campo (v4.5): Sole e luna, Declinazione magnetica, Clinometro, Rientro prima del buio.
   Tutto funziona senza rete (i calcoli sono in 22-astro.js). Idee prese da Trail Sense (MIT), codice scritto da capo.
   by Lollo ®2026 · i moduli si caricano nell'ordine dei numeri (vedi index.html) */
'use strict';
var CAMPO={};
var RAD_=Math.PI/180;
function f1(x,d){return (+x).toFixed(d==null?1:d).replace('.',',').replace('-','−')}
function hhmm(d){return d?pad(d.getHours())+':'+pad(d.getMinutes()):'—'}
/* dove sono: GPS se acceso, altrimenti il centro del luogo di lavoro */
CAMPO.pos=function(){
  if(typeof here!=='undefined'&&here&&gpsWatch!=null)return {lat:here.lat,lon:here.lon,alt:here.alt||0,src:'gps'};
  return {lat:HOME[0],lon:HOME[1],alt:0,src:'luogo'};
};
CAMPO.posName=function(p){return p.src==='gps'?'la tua posizione GPS':PL.name()};
/* ---- declinazione magnetica ---- */
CAMPO._dc=null;
CAMPO.decl=function(){
  var p=CAMPO.pos(),k=Math.round(p.lat*2)+'/'+Math.round(p.lon*2),n=Date.now();
  if(CAMPO._dc&&CAMPO._dc.k===k&&n-CAMPO._dc.t<3600000)return CAMPO._dc.v;
  var v=ASTRO.declination(p.lat,p.lon,new Date(),p.alt);CAMPO._dc={k:k,t:n,v:v};return v;
};
/* correzione da sommare alla direzione della bussola del telefono (nord magnetico → nord vero) */
CAMPO.declCorr=function(){return SET.oriTrue===false?0:CAMPO.decl().deg};
CAMPO.fmtDecl=function(d){return (d>=0?'+':'−')+f1(Math.abs(d))+'° '+(d>=0?'Est':'Ovest')};
CAMPO.openDecl=function(){
  var d=CAMPO.decl(),p=CAMPO.pos(),a=Math.abs(d.deg);
  var h='<div class="card"><div style="font-size:26px;font-weight:650">'+CAMPO.fmtDecl(d.deg)+'</div><div class="mut">per '+esc(CAMPO.posName(p))+' · modello WMM2025, calcolato nel telefono</div></div>'
   +'<p>L\'ago di una bussola punta verso il <b>nord magnetico</b>, che qui è '+f1(a)+'° a '+(d.deg>=0?'<b>est</b>':'<b>ovest</b>')+' del <b>nord vero</b> (quello delle carte e del GPS).</p>'
   +'<p><b>Sulla carta</b>: per riportare un rilevamento letto con la bussola, '+(d.deg>=0?'<b>aggiungi</b> ':'<b>togli</b> ')+f1(a)+'° (nord vero = nord bussola '+(d.deg>=0?'+ ':'− ')+f1(a)+'°). Per fare il contrario, '+(d.deg>=0?'togli':'aggiungi')+' lo stesso valore.</p>'
   +'<p class="mut">Inclinazione del campo '+f1(d.incl)+'° · intensità '+Math.round(d.total)+' nT. La declinazione cambia di circa 0,1° all\'anno.'+(d.expired?' <b style="color:var(--warn)">Il modello è valido dal 2025 al 2030: aggiorna l\'app.</b>':'')+'</p>'
   +'<label class="item opt"><input type="checkbox" id="dcOn"'+(SET.oriTrue===false?'':' checked')+'><span class="tx"><b>Bussola della mappa verso il nord vero</b><small>Il sensore del telefono dà il nord magnetico: con questa spunta la mappa ruotata sulla tua direzione si corregge di '+f1(a)+'°.</small></span></label>';
  openModal('Declinazione magnetica',h,[]);
  $('#dcOn').onchange=function(){SET.oriTrue=this.checked;saveSet();if(typeof ORI!=='undefined'&&ORI.mode==='segui')applyHeading()};
};

/* ---- Sole e luna ---- */
CAMPO.sunDay=0;                                    // giorni da oggi
CAMPO.dayDate=function(){var d=new Date();d.setDate(d.getDate()+CAMPO.sunDay);return d};
function sunChart(date,lat,lon,st){
  var W=340,H=118,pl=6,pr=6,pt=8,pb=20,d0=new Date(date.getFullYear(),date.getMonth(),date.getDate(),0,0,0).getTime(),al=[],i,lo=0,hi=0;
  for(i=0;i<=144;i++){var a=ASTRO.sunPos(new Date(d0+i*600000),lat,lon).alt;al.push(a);if(a<lo)lo=a;if(a>hi)hi=a}
  lo=Math.min(lo,-12);hi=Math.max(hi,12)+3;
  var X=function(k){return pl+(W-pl-pr)*k/144},Y=function(v){return pt+(H-pt-pb)*(1-(v-lo)/(hi-lo))};
  var pts=al.map(function(v,k){return X(k).toFixed(1)+','+Y(v).toFixed(1)}),y0=Y(0).toFixed(1);
  var s='<svg viewBox="0 0 '+W+' '+H+'" style="width:100%;height:auto" role="img" aria-label="Altezza del sole nel corso della giornata">';
  s+='<rect x="'+pl+'" y="'+Y(-6).toFixed(1)+'" width="'+(W-pl-pr)+'" height="'+(Y(lo)-Y(-6)).toFixed(1)+'" fill="var(--panel2)"/>';       // notte e crepuscolo
  s+='<defs><clipPath id="skyc"><rect x="0" y="0" width="'+W+'" height="'+y0+'"/></clipPath></defs>';
  s+='<polyline clip-path="url(#skyc)" points="'+pl+','+y0+' '+pts.join(' ')+' '+(W-pr)+','+y0+'" fill="var(--accsoft)" stroke="none"/>';
  s+='<line x1="'+pl+'" y1="'+y0+'" x2="'+(W-pr)+'" y2="'+y0+'" stroke="var(--mut)" stroke-dasharray="3 3"/>';
  s+='<polyline points="'+pts.join(' ')+'" fill="none" stroke="var(--acc)" stroke-width="2"/>';
  [0,6,12,18,24].forEach(function(h){s+='<text x="'+X(h*6).toFixed(1)+'" y="'+(H-5)+'" font-size="10" text-anchor="'+(h===0?'start':h===24?'end':'middle')+'" fill="var(--mut)">'+h+'</text>'});
  [[st.rise,'☀↑'],[st.set,'☀↓']].forEach(function(e){if(!e[0])return;var k=(e[0].getTime()-d0)/600000;s+='<circle cx="'+X(k).toFixed(1)+'" cy="'+y0+'" r="3.5" fill="var(--acc)"/>'});
  var now=Date.now(),kn=(now-d0)/600000;if(kn>=0&&kn<=144){var an=ASTRO.sunPos(new Date(now),lat,lon).alt;s+='<line x1="'+X(kn).toFixed(1)+'" y1="'+pt+'" x2="'+X(kn).toFixed(1)+'" y2="'+(H-pb)+'" stroke="var(--link)" stroke-width="1.2"/><circle cx="'+X(kn).toFixed(1)+'" cy="'+Y(an).toFixed(1)+'" r="4.5" fill="#f5b400" stroke="var(--txt)" stroke-width=".8"/>'}
  return s+'</svg>';
}
CAMPO.sunHtml=function(){
  var p=CAMPO.pos(),dt=CAMPO.dayDate(),st=ASTRO.sunTimes(dt,p.lat,p.lon),mo=ASTRO.moon(new Date(dt.getFullYear(),dt.getMonth(),dt.getDate(),21,0,0),p.lat,p.lon),mt=ASTRO.moonTimes(dt,p.lat,p.lon);
  var dir=function(a){return a==null?'':' · '+dirName(a)+' '+Math.round(a)+'°'};
  var lbl=dt.toLocaleDateString('it-IT',{weekday:'long',day:'numeric',month:'long'});
  var h='<div class="row" style="justify-content:space-between"><button class="btn s" id="sdPrev" aria-label="Giorno prima">◀</button><b style="flex:1;text-align:center">'+esc(lbl)+(CAMPO.sunDay===0?' · oggi':'')+'</b><button class="btn s" id="sdNext" aria-label="Giorno dopo">▶</button></div>';
  h+='<p class="mut" style="margin:6px 0">Per '+esc(CAMPO.posName(p))+' · orari del fuso del telefono · senza rete</p>'+sunChart(dt,p.lat,p.lon,st);
  var kv=[];
  if(st.polar)kv.push(['Sole',st.polar]);
  else{
    kv.push(['Alba',hhmm(st.rise)+dir(st.azRise)],['Mezzogiorno solare',hhmm(st.noon)+' · altezza '+Math.round(st.altNoon)+'°'],['Tramonto',hhmm(st.set)+dir(st.azSet)],['Durata del giorno',fmtDur(st.lenMs)]);
    if(st.dawn&&st.dusk)kv.push(['Crepuscolo civile',hhmm(st.dawn)+' – '+hhmm(st.rise)+' e '+hhmm(st.set)+' – '+hhmm(st.dusk)]);
    if(st.goldAm&&st.goldPm)kv.push(['Ora d\'oro (luce calda)',hhmm(st.rise)+' – '+hhmm(st.goldAm)+' e '+hhmm(st.goldPm)+' – '+hhmm(st.set)]);
  }
  h+='<h3>Sole</h3><div class="kv">'+kv.map(function(r){return '<div>'+esc(r[0])+'</div><div>'+esc(r[1])+'</div>'}).join('')+'</div>';
  var nf=ASTRO.nextPhase(dt,'full'),nn=ASTRO.nextPhase(dt,'new'),dd=function(x){return x?x.toLocaleDateString('it-IT',{day:'numeric',month:'long'}):'—'};
  h+='<h3>Luna</h3><div class="kv"><div>Fase</div><div>'+mo.emoji+' '+esc(mo.name)+' · illuminata al '+Math.round(mo.illum*100)+'%</div><div>Sorge</div><div>'+hhmm(mt.rise)+'</div><div>Tramonta</div><div>'+hhmm(mt.set)+'</div><div>Prossima luna piena</div><div>'+dd(nf)+'</div><div>Prossima luna nuova</div><div>'+dd(nn)+'</div></div>';
  var dc=CAMPO.decl();
  h+='<h3>Bussola</h3><div class="item" id="sdDecl"><div class="th">🧭</div><div class="tx"><b>Declinazione magnetica '+CAMPO.fmtDecl(dc.deg)+'</b><small>Differenza tra il nord della bussola e il nord delle carte</small></div><span class="chev">›</span></div>';
  h+='<p class="mut">Il sole è calcolato al minuto, la luna a pochi minuti. Il chiaro «ora d\'oro» va dal sorgere fino a quando il sole supera i 6° e dal tramonto in giù. Luna: l\'emoji è quella dell\'emisfero nord.</p>';
  return h;
};
CAMPO.openSun=function(){
  var draw=function(){
    openModal('Sole e luna',CAMPO.sunHtml(),[]);
    $('#sdPrev').onclick=function(){CAMPO.sunDay--;draw()};$('#sdNext').onclick=function(){CAMPO.sunDay++;draw()};
    $('#sdDecl').onclick=CAMPO.openDecl;
  };
  CAMPO.sunDay=0;draw();
};

/* ---- Rientro prima del buio ---- */
var RIE={fired:{},t:null};
RIE.cfg=function(){if(!SET.rie)SET.rie={on:false,ref:'set',margin:15,ret:'auto'};return SET.rie};
RIE.calc=function(now){
  now=now||new Date();var c=RIE.cfg(),p=CAMPO.pos(),st=ASTRO.sunTimes(now,p.lat,p.lon),dark=c.ref==='dusk'?st.dusk:st.set;
  if(!dark)return {err:'Oggi in questo luogo il sole non tramonta (o non sorge)'};
  var retMs=0,auto=c.ret==='auto',known=true,src='';
  if(auto){if(REC.on&&REC.trk){retMs=trkStats(REC.trk).mv;src='tempo in movimento fin qui'}else{known=false;src='nessuna traccia in corso'}}
  else{retMs=(+c.ret)*60000;src='scelto da te'}
  var limit=new Date(dark.getTime()-(+c.margin||0)*60000-retMs);
  return {dark:dark,limit:limit,remain:limit.getTime()-now.getTime(),retMs:retMs,known:known,src:src,dusk:c.ref==='dusk',margin:+c.margin||0,after:now.getTime()>dark.getTime()};
};
RIE.text=function(r){
  if(r.err)return r.err;
  if(r.after)return 'È già buio ('+(r.dusk?'fine del crepuscolo':'tramonto')+' alle '+hhmm(r.dark)+').';
  var s=(r.dusk?'Fine crepuscolo ':'Tramonto ')+'alle '+hhmm(r.dark)+(r.margin?' · margine '+r.margin+' min':'')+' · rientro '+(r.known?fmtDur(r.retMs):'non noto');
  if(r.remain>0)return s+'. <b>Inizia a tornare entro le '+hhmm(r.limit)+'</b> (tra '+fmtDur(r.remain)+').'+(r.known?'':' Avvia una traccia o scegli un tempo di rientro.');
  return s+'. <b style="color:var(--bad)">È ora di tornare</b>: il limite era alle '+hhmm(r.limit)+'.';
};
RIE.notify=function(title,body){
  try{if(window.Notification&&Notification.permission==='granted'&&navigator.serviceWorker)navigator.serviceWorker.getRegistration().then(function(r){if(r)r.showNotification(title,{body:body,tag:'atl-rie',renotify:true})}).catch(function(){})}catch(e){}
};
RIE.alert=function(title,body,hard){
  toast('🌅 '+title,hard?9000:6000);sndWarn();
  if(navigator.vibrate&&navigator.userActivation&&navigator.userActivation.hasBeenActive)try{navigator.vibrate([400,200,400,200,400])}catch(e){}
  RIE.notify(title,body);
};
RIE.chip=function(){
  var c=$('#chipRie');if(!c)return;var cf=RIE.cfg();
  if(!cf.on){c.style.display='none';return}
  var r=RIE.calc();if(r.err||r.after){c.style.display='none';return}
  c.style.display='';c.classList.toggle('rec',r.remain<=0);c.textContent=r.remain>0?'🌅 via entro '+hhmm(r.limit):'🌅 ora di tornare';
};
RIE.tick=function(){
  var c=RIE.cfg();RIE.chip();if(!c.on)return;
  var r=RIE.calc();if(r.err||r.after||!r.known)return;
  var k=new Date().toDateString();if(RIE.fired.k!==k)RIE.fired={k:k,w:false,a:0};
  var now=Date.now();
  if(r.remain<=0){if(!RIE.fired.a||now-RIE.fired.a>10*60000){RIE.fired.a=now;RIE.alert('È ora di tornare','Il buio arriva alle '+hhmm(r.dark)+(r.retMs?': per rientrare servono circa '+fmtDur(r.retMs):'')+'.',true)}}
  else if(r.remain<=15*60000&&!RIE.fired.w){RIE.fired.w=true;RIE.alert('Tra '+Math.max(1,Math.round(r.remain/60000))+' min inizia a tornare','Limite alle '+hhmm(r.limit)+' (buio alle '+hhmm(r.dark)+').')}
};
RIE.start=function(){
  if(RIE.t)return;if($('#chipRie'))$('#chipRie').onclick=RIE.open;RIE.t=setInterval(RIE.tick,30000);RIE.tick();
  document.addEventListener('visibilitychange',function(){if(document.visibilityState==='visible')RIE.tick()});
};
RIE.open=function(){
  var c=RIE.cfg();
  var opt=function(list,cur){return list.map(function(o){return '<option value="'+o[0]+'"'+(String(o[0])===String(cur)?' selected':'')+'>'+esc(o[1])+'</option>'}).join('')};
  var h='<p>L\'Atlante ti avvisa quando è ora di <b>iniziare a tornare</b>, per rientrare prima del buio: <i>buio − margine − tempo di rientro</i>.</p>'
   +'<label class="item opt"><input type="checkbox" id="rieOn"'+(c.on?' checked':'')+'><span class="tx"><b>Avviso di rientro acceso</b><small>chip sulla mappa, suono, vibrazione e notifica</small></span></label>'
   +'<label class="l">Fino a quando voglio avere luce</label><select id="rieRef">'+opt([['set','Tramonto'],['dusk','Fine del crepuscolo civile (circa 30 min dopo)']],c.ref)+'</select>'
   +'<label class="l">Margine di sicurezza</label><select id="rieMar">'+opt([[0,'nessuno'],[15,'15 minuti'],[30,'30 minuti'],[45,'45 minuti'],[60,'1 ora']],c.margin)+'</select>'
   +'<label class="l">Tempo che serve per tornare</label><select id="rieRet">'+opt([['auto','Automatico: il tempo in movimento della traccia in corso'],[15,'15 minuti'],[30,'30 minuti'],[45,'45 minuti'],[60,'1 ora'],[90,'1 ora e 30'],[120,'2 ore'],[180,'3 ore'],[240,'4 ore']],c.ret)+'</select>'
   +'<div class="card" id="rieRes" style="margin-top:12px"></div>'
   +'<p class="mut">Con «Automatico» si assume che il ritorno duri come l\'andata: è una stima prudente se hai già superato il punto più lontano. L\'avviso suona solo con l\'app aperta (anche nella modalità tasca): con l\'app chiusa o il browser sospeso non può suonare.</p>';
  openModal('Rientro prima del buio',h,[]);
  var upd=function(){$('#rieRes').innerHTML=RIE.text(RIE.calc());RIE.chip()};
  var save=function(){c.ref=$('#rieRef').value;c.margin=+$('#rieMar').value;c.ret=$('#rieRet').value==='auto'?'auto':+$('#rieRet').value;c.on=$('#rieOn').checked;RIE.fired={};saveSet();upd();if(curPage==='usc')renderUsc()};
  $('#rieOn').onchange=function(){if(this.checked&&window.Notification&&Notification.permission==='default')try{Notification.requestPermission()}catch(e){}save()};
  ['rieRef','rieMar','rieRet'].forEach(function(id){$('#'+id).onchange=save});upd();
};

/* ---- scheda «Strumenti da campo» in Uscita ---- */
CAMPO.card=function(){
  var p=CAMPO.pos(),now=new Date(),st=ASTRO.sunTimes(now,p.lat,p.lon),mo=ASTRO.moon(now,p.lat,p.lon),c=RIE.cfg(),r=RIE.calc();
  var sl=st.polar?esc(st.polar):'alba <b>'+hhmm(st.rise)+'</b> · tramonto <b>'+hhmm(st.set)+'</b>';
  var h='<h3>Strumenti da campo</h3><div class="card"><div class="mut">'+sl+' · '+mo.emoji+' '+Math.round(mo.illum*100)+'% · declinazione '+esc(CAMPO.fmtDecl(CAMPO.decl().deg))+'</div>'
   +(c.on&&!r.err?'<div class="mut" style="margin-top:4px">🌅 '+RIE.text(r)+'</div>':'')
   +'<div class="tools"><button class="tool" id="cpCli"><i>📐</i>Clinometro<br>altezza alberi e pendenza</button><button class="tool" id="cpSun"><i>☀️</i>Sole e luna</button><button class="tool'+(c.on?' on':'')+'" id="cpRie"><i>🌅</i>Rientro prima del buio'+(c.on?' · acceso':'')+'</button><button class="tool" id="cpDec"><i>🧭</i>Declinazione magnetica</button></div></div>';
  return h;
};
CAMPO.bind=function(){
  if($('#cpCli'))$('#cpCli').onclick=function(){CLINO.open()};
  if($('#cpSun'))$('#cpSun').onclick=CAMPO.openSun;
  if($('#cpRie'))$('#cpRie').onclick=RIE.open;
  if($('#cpDec'))$('#cpDec').onclick=CAMPO.openDecl;
};

/* =================== CLINOMETRO =================== */
var CLINO={on:false,mode:'cam',tab:'alt',v:null,buf:[],top:null,base:null,hold:null,stream:null,field:null,listening:false};
/* altezza di un albero: a = angolo verso la cima, b = angolo verso la base (negativo se sta sotto l'orizzonte), D = distanza dalla base, eye = altezza degli occhi.
   Con la base misurata vale D·(tan a − tan b); senza, D·tan a + altezza occhi. L'incertezza è quella di ±1° sulle misure. */
CLINO.height=function(a,b,D,eye){
  var t=function(x){return Math.tan(x*RAD_)};
  if(a==null||!(D>0))return null;
  var h=b!=null?D*(t(a)-t(b)):D*t(a)+(eye||0);
  var ea=D*(t(a+1)-t(a-1))/2,eb=b!=null?D*(t(b+1)-t(b-1))/2:0;
  return {h:h,err:Math.sqrt(ea*ea+eb*eb),ok:a>0&&a<88&&(b==null||b<a)};
};
CLINO.ensure=function(){
  if($('#clino'))return;
  var d=el('<div id="clino" role="dialog" aria-label="Clinometro"><video id="clVid" playsinline muted autoplay></video><div id="clCross"></div><button id="clX" aria-label="Chiudi">✕</button><div id="clAng">—</div>'
   +'<div id="clPan"><div class="seg" id="clTabs"><button data-ct="alt" class="on">🌲 Altezza albero</button><button data-ct="pen">⛰ Pendenza</button></div>'
   +'<div id="clAlt"><div class="row clf"><label>Distanza dalla base (m)<input id="clD" type="number" inputmode="decimal" min="1" step="0.5"></label><label>Altezza occhi (m)<input id="clE" type="number" inputmode="decimal" min="0" step="0.05"></label></div>'
   +'<div class="row"><button class="btn f" id="clTop">① Cima</button><button class="btn f" id="clBase">② Base</button><button class="btn s" id="clRst">Azzera</button></div><div id="clRes" class="clr"></div><div class="row"><button class="btn f s" id="clUse">Usa nella scheda</button><button class="btn s" id="clCopy">Copia</button></div></div>'
   +'<div id="clPen" style="display:none"><div class="clr" id="clPenR"></div><div class="row"><button class="btn f" id="clHold">Fissa il valore</button></div></div>'
   +'<div class="seg" id="clMode"><button data-cm="cam">📷 Mira con la fotocamera</button><button data-cm="edge">📱 Mira lungo il bordo</button></div><div class="clm" id="clMsg"></div></div></div>');
  document.body.appendChild(d);
  $('#clX').onclick=CLINO.close;
  $('#clTabs').onclick=function(e){var b=e.target.closest('button');if(b){CLINO.tab=b.getAttribute('data-ct');CLINO.hold=null;CLINO.draw()}};
  $('#clMode').onclick=function(e){var b=e.target.closest('button');if(b){CLINO.setMode(b.getAttribute('data-cm'))}};
  $('#clTop').onclick=function(){CLINO.cap('top')};$('#clBase').onclick=function(){CLINO.cap('base')};
  $('#clRst').onclick=function(){CLINO.top=CLINO.base=null;CLINO.draw()};
  $('#clHold').onclick=function(){CLINO.hold=CLINO.hold==null?CLINO.med():null;CLINO.draw()};
  $('#clD').onchange=function(){SET.clinoD=+this.value;saveSet();CLINO.draw()};$('#clE').onchange=function(){SET.clinoE=+this.value;saveSet();CLINO.draw()};
  $('#clUse').onclick=CLINO.use;
  $('#clCopy').onclick=function(){var r=CLINO.result();if(!r)return toast('Misura prima la cima');var t=f1(r.h,1)+' m';if(navigator.clipboard)navigator.clipboard.writeText(t).then(function(){toast('Copiato: '+t)}).catch(function(){toast(t)});else toast(t)};
};
CLINO.open=function(opt){
  CLINO.ensure();CLINO.field=(opt&&opt.field)||null;CLINO.top=CLINO.base=CLINO.hold=null;CLINO.buf=[];CLINO.v=null;CLINO.tab='alt';
  $('#clD').value=SET.clinoD||20;$('#clE').value=SET.clinoE||1.6;
  $('#clino').classList.add('on');CLINO.on=true;
  CLINO.sensor(true);CLINO.camera();CLINO.draw();
};
CLINO.close=function(){
  CLINO.on=false;var c=$('#clino');if(c)c.classList.remove('on');CLINO.sensor(false);
  if(CLINO.stream){CLINO.stream.getTracks().forEach(function(t){t.stop()});CLINO.stream=null}
  var v=$('#clVid');if(v)v.srcObject=null;
};
CLINO.camera=function(){
  var v=$('#clVid');CLINO.setMode('cam',true);
  if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia){CLINO.noCam();return}
  navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}},audio:false}).then(function(s){
    if(!CLINO.on){s.getTracks().forEach(function(t){t.stop()});return}
    CLINO.stream=s;v.srcObject=s;v.style.display='';v.play&&v.play().catch(function(){});
  }).catch(function(){CLINO.noCam()});
};
CLINO.noCam=function(){var v=$('#clVid');if(v)v.style.display='none';CLINO.setMode('edge',true);$('#clMsg').textContent='Fotocamera non disponibile: tieni il telefono in verticale con lo schermo verso di te e punta il bordo superiore verso la cima.'};
CLINO.setMode=function(m,quiet){
  CLINO.mode=m;CLINO.buf=[];
  $$('#clMode button').forEach(function(b){b.classList.toggle('on',b.getAttribute('data-cm')===m)});
  if(!quiet)$('#clMsg').textContent='';
  if(m==='cam'&&!quiet)$('#clMsg').textContent='Tieni il telefono in verticale e inquadra con la fotocamera: l\'angolo è quello della mira al centro.';
  if(m==='edge'&&!quiet)$('#clMsg').textContent='Tieni il telefono in verticale con lo schermo verso di te e punta il bordo superiore verso il bersaglio.';
};
CLINO.sensor=function(on){
  if(on&&!CLINO.listening){
    var go=function(){window.addEventListener('deviceorientation',CLINO.onO,true);CLINO.listening=true;setTimeout(function(){if(CLINO.on&&CLINO.v==null)$('#clMsg').textContent='Sensori di inclinazione non disponibili su questo dispositivo.'},2000)};
    if(window.DeviceOrientationEvent&&typeof DeviceOrientationEvent.requestPermission==='function')DeviceOrientationEvent.requestPermission().then(go).catch(go);else go();
  }
  if(!on&&CLINO.listening){window.removeEventListener('deviceorientation',CLINO.onO,true);CLINO.listening=false}
};
/* angolo di mira sopra l'orizzonte, in gradi, dai sensori */
CLINO.elev=function(beta,gamma,mode){
  var b=beta*RAD_,g=(gamma||0)*RAD_,cl=function(x){return Math.max(-1,Math.min(1,x))};
  return (mode==='cam'?Math.asin(cl(-Math.cos(b)*Math.cos(g))):Math.asin(cl(Math.sin(b))))/RAD_;
};
CLINO.onO=function(e){
  if(!CLINO.on||e.beta==null)return;
  var raw=CLINO.elev(e.beta,e.gamma,CLINO.mode),now=Date.now();
  CLINO.v=CLINO.v==null?raw:CLINO.v+(raw-CLINO.v)*0.35;
  CLINO.buf.push([now,raw]);while(CLINO.buf.length&&now-CLINO.buf[0][0]>600)CLINO.buf.shift();
  CLINO.paint();
};
/* valore stabile: mediana delle letture dell'ultimo secondo */
CLINO.med=function(){
  var a=CLINO.buf.map(function(x){return x[1]}).sort(function(x,y){return x-y});
  if(!a.length)return CLINO.v;return a.length%2?a[(a.length-1)/2]:(a[a.length/2-1]+a[a.length/2])/2;
};
CLINO.cap=function(which){
  var v=CLINO.med();if(v==null)return toast('Nessuna lettura dai sensori');
  CLINO[which]=v;if(navigator.vibrate)try{navigator.vibrate(30)}catch(e){}CLINO.draw();
};
CLINO.result=function(){
  var D=+$('#clD').value,E=+$('#clE').value;if(CLINO.top==null)return null;
  var r=CLINO.height(CLINO.top,CLINO.base,D,E);return r&&r.h>0?r:null;
};
CLINO.paint=function(){
  var a=$('#clAng');if(!a)return;var v=CLINO.hold!=null?CLINO.hold:CLINO.v;
  a.textContent=v==null?'—':(v>=0?'+':'−')+f1(Math.abs(v))+'°';
  if(CLINO.tab==='pen')CLINO.penRes(v);
};
CLINO.penRes=function(v){
  var el_=$('#clPenR');if(!el_)return;
  if(v==null){el_.textContent='Aspetto i sensori…';return}
  var pc=Math.tan(Math.abs(v)*RAD_)*100;
  el_.innerHTML='Pendenza <b>'+f1(Math.abs(v))+'°</b> = <b>'+f1(pc,0)+'%</b><br><span class="mut">'+(v>=0?'in salita':'in discesa')+': ogni 100 m in orizzontale il terreno '+(v>=0?'sale':'scende')+' di '+f1(pc,0)+' m.</span>';
  $('#clHold').textContent=CLINO.hold!=null?'Riprendi la misura':'Fissa il valore';
};
CLINO.draw=function(){
  $$('#clTabs button').forEach(function(b){b.classList.toggle('on',b.getAttribute('data-ct')===CLINO.tab)});
  $('#clAlt').style.display=CLINO.tab==='alt'?'':'none';$('#clPen').style.display=CLINO.tab==='pen'?'':'none';
  var r=CLINO.result(),t='';
  t+='<div>Cima: <b>'+(CLINO.top==null?'—':(CLINO.top>=0?'+':'−')+f1(Math.abs(CLINO.top))+'°')+'</b> · Base: <b>'+(CLINO.base==null?'non misurata (uso gli occhi)':(CLINO.base>=0?'+':'−')+f1(Math.abs(CLINO.base))+'°')+'</b></div>';
  if(CLINO.top!=null&&!(CLINO.top>0))t+='<div style="color:#ff8a80">La cima deve stare sopra l\'orizzonte (angolo positivo).</div>';
  else if(CLINO.top!=null&&CLINO.base!=null&&!(CLINO.base<CLINO.top))t+='<div style="color:#ff8a80">La base deve stare più in basso della cima.</div>';
  else if(r)t+='<div class="clbig">Altezza ≈ '+f1(r.h)+' m <small>± '+f1(r.err)+'</small></div>'+(CLINO.top>75?'<div class="clm">Angolo molto alto: allontanati dall\'albero per misurare meglio.</div>':'');
  else t+='<div class="clm">① Mira la cima e tocca «Cima». ② Mira la base del tronco e tocca «Base» (migliora il risultato sui terreni in pendenza).</div>';
  $('#clRes').innerHTML=t;$('#clUse').style.display=CLINO.field?'':'none';
  CLINO.paint();
};
CLINO.use=function(){
  var r=CLINO.result();if(!r)return toast('Misura prima la cima');
  var v=Math.round(r.h*10)/10,inp=CLINO.field?document.querySelector('[data-x="'+CLINO.field+'"]'):null;
  if(inp){inp.value=String(v);if(typeof draft!=='undefined'&&draft&&draft.x)draft.x[CLINO.field]=String(v)}
  CLINO.close();toast('Altezza '+f1(v)+' m scritta nella scheda');
};

