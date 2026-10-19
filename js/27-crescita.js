/* Atlante di campo - Tipo di crescita / estensione del germoglio (v5.0).
   Dalla «Guida per principianti: capire le tre tipologie di crescita» (piante e bonsai, esempi del Piemonte):
     1 = una sola estensione · 2 = estensione continua · 3 = crescita mista (allunga, ramifica o fiorisce).
   La guida precisa che è uno schema pratico, non una classificazione botanica universale, e che una sola foto non basta: bisogna seguire il germoglio.
   Quindi qui NON si assegna un tipo «a occhio»: si mostrano separate (1) la specie se è negli esempi della guida, (2) l'osservazione guidata,
   (3) il diario del germoglio, (4) un'ipotesi dell'AI segnata come tale. Ognuna dice il perché; scegli tu quale applicare.
   by Lollo ®2026 · i moduli si caricano nell'ordine dei numeri (vedi index.html) */
'use strict';
var CRES={
  T:{1:'1 · una sola estensione',2:'2 · estensione continua',3:'3 · crescita mista'},
  /* esempi della guida (pag. 4, 5, 6); g=true: vale per tutto il genere citato */
  G:[
    [1,'Fagus sylvatica','Faggio',4],[1,'Carpinus betulus','Carpino bianco',4],[1,'Quercus petraea','Rovere',4],[1,'Quercus pubescens','Roverella',4],
    [1,'Pinus sylvestris','Pino silvestre',4],[1,'Taxus baccata','Tasso',4],
    [2,'Ulmus minor','Olmo campestre',5],[2,'Juniperus communis','Ginepro comune',5],[2,'Acer buergerianum','Acero tridente',5],[2,'Acer palmatum','Acero giapponese',5],
    [2,'Ulmus parvifolia','Olmo cinese',5],[2,'Lagerstroemia','Lagerstroemia',5,true],
    [3,'Malus sylvestris','Melo selvatico',6],[3,'Prunus spinosa','Prugnolo',6],[3,'Prunus avium','Ciliegio selvatico',6],[3,'Cotoneaster','Cotoneaster',6,true]
  ],
  /* cosa dice la guida per ogni tipo: comportamento, quando intervenire */
  D:{
    1:{fa:'il germoglio si allunga una volta sola e poi si arresta (forma una gemma terminale)',quando:'dopo la fine dell\'estensione, quando le foglie si sono distese e sono più scure e consistenti'},
    2:{fa:'l\'apice resta attivo e continua a produrre nuovi nodi e foglie durante la stagione',quando:'lasciando allungare e poi accorciando alla terza gemma (o terza coppia di gemme), scegliendo quella ben orientata'},
    3:{fa:'non tutti i germogli hanno lo stesso destino: alcuni allungano, altri fanno rami corti, altri portano gemme a fiore',quando:'dopo lo sviluppo delle gemme arretrate, con taglio selettivo che conserva le gemme da fiore'}
  },
  FRUTTO:['malus','pyrus','prunus','cydonia','mespilus','ficus','vitis','corylus','juglans','castanea']
};
CRES.sp=function(){var s=draft.sp||{};return {sci:String(s.sci||'').trim(),com:String(s.com||'').trim()}};
CRES.genus=function(sci){return sci.split(/\s+/)[0].toLowerCase()};
CRES.bin=function(sci){return sci.split(/\s+/).slice(0,2).join(' ').toLowerCase()};
/* 1) la specie è negli esempi della guida? */
CRES.fromGuide=function(){
  var s=CRES.sp(),b=CRES.bin(s.sci),g=CRES.genus(s.sci),com=s.com.toLowerCase(),hit=null;
  CRES.G.forEach(function(r){
    if(hit)return;
    if(s.sci&&(r[4]?g===r[1].toLowerCase():b===r[1].toLowerCase()))hit=r;
    else if(!s.sci&&com&&com===r[2].toLowerCase())hit=r;
  });
  if(hit){var d=CRES.D[hit[0]];
    return {tipo:hit[0],src:'Guida',perche:'Dalla guida: '+hit[2]+(hit[4]?' (genere '+hit[1]+')':' ('+hit[1]+')')+' è tra gli esempi della tipologia '+hit[0]+' (pag. '+hit[3]+'): '+d.fa+'. Si interviene '+d.quando+'.'};}
  var frutto=CRES.FRUTTO.indexOf(g)>=0;
  return {tipo:null,frutto:frutto,src:'Guida',perche:'«'+(s.com||s.sci||'questa specie')+'» non è tra gli esempi della guida.'
    +(frutto?' È però una pianta da frutto: nella guida melo selvatico, prugnolo e ciliegio selvatico sono di tipo 3 (crescita mista). È un indizio forte, ma la guida non dice che lo siano tutte: conferma osservando il germoglio.':'')};
};
/* 2) osservazione guidata (albero decisionale della guida, pag. 7) */
CRES.fromObs=function(apice,rami,settimane){
  if(!apice)return null;
  var base=settimane?'':' (osservazione di un solo momento: la guida dice che una foto non basta, quindi è solo probabile)';
  if(apice==='fermo')return {tipo:1,src:'Osservazione',perche:'Il germoglio ha smesso di produrre nuovi nodi e ha una gemma terminale: si è fermato dopo il primo allungamento, quindi probabile tipologia 1 (una sola estensione)'+base+'.'};
  if(rami==='si')return {tipo:3,src:'Osservazione',perche:'L\'apice è ancora attivo e compaiono anche rami corti o gemme da fiore: i germogli hanno destini diversi, quindi può essere tipologia 3 (crescita mista)'+base+'.'};
  if(rami==='no')return {tipo:2,src:'Osservazione',perche:'L\'apice resta attivo, continua a produrre nodi e foglie e non compaiono rami corti né fiori: si allunga senza fermarsi, quindi tipologia 2 (estensione continua)'+base+'.'};
  return null;
};
/* 3) diario: una riga per rilevo, scritta come testo leggibile (si vede e si esporta con la scheda) */
CRES.ENT=/^(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?):\s*([\d.,]+)\s*cm,\s*([+-]?\d+)\s*nodi,\s*apice\s*(attivo|fermo),\s*rami corti\/fiori\s*(sì|no)\s*$/;
CRES.read=function(){
  var t=(draft.x&&draft.x.crescita_diario)||'';
  return t.split(' | ').map(function(r){var m=CRES.ENT.exec(r.trim());return m?{d:m[1],len:parseFloat(m[2].replace(',','.')),nodi:+m[3],apice:m[4],rami:m[5]==='sì'?'si':'no',txt:r.trim()}:null}).filter(Boolean);
};
CRES.write=function(L){
  draft.x=draft.x||{};draft.x.crescita_diario=L.map(function(e){return e.d+': '+e.len+' cm, '+(e.nodi>=0?'+':'')+e.nodi+' nodi, apice '+e.apice+', rami corti/fiori '+(e.rami==='si'?'sì':'no')}).join(' | ');
  var i=document.querySelector('[data-x="crescita_diario"]');if(i)i.value=draft.x.crescita_diario;
};
CRES.fromDiary=function(){
  var L=CRES.read();if(L.length<2)return null;
  var a=L[0],z=L[L.length-1],nodi=L.reduce(function(s,e){return s+(e.nodi>0?e.nodi:0)},0),rami=L.some(function(e){return e.rami==='si'});
  var storia='Nel diario, dal '+a.d+' al '+z.d+' ('+L.length+' rilievi) il germoglio è passato da '+a.len+' a '+z.len+' cm con '+nodi+' nuovi nodi';
  if(z.apice==='fermo')return {tipo:1,src:'Diario',perche:storia+' e l\'ultima volta l\'apice era fermo: si è allungato e poi si è arrestato, quindi tipologia 1 (una sola estensione).'};
  if(rami)return {tipo:3,src:'Diario',perche:storia+', apice ancora attivo e con rami corti o fiori: destini diversi dei germogli, quindi tipologia 3 (crescita mista).'};
  if(nodi>0)return {tipo:2,src:'Diario',perche:storia+', apice ancora attivo e senza rami corti né fiori: continua ad allungarsi, quindi tipologia 2 (estensione continua).'};
  return {tipo:null,src:'Diario',perche:storia+': nessun nuovo nodo ma l\'apice risulta attivo. Dati incoerenti o stagione ferma: continua a seguire il germoglio.'};
};
/* 4) ipotesi dell'AI, con le regole della guida come contesto */
CRES.sistema=function(){
  return 'Sei un assistente di potatura e osservazione della crescita (piante e bonsai, esempi del Piemonte). Rispondi in italiano.\n'
   +'Schema pratico della guida (non è una classificazione botanica universale; la stessa specie può reagire diversamente per clima, esposizione, vigore, irrigazione, concimazione):\n'
   +'1 = UNA SOLA ESTENSIONE: il germoglio si allunga una volta e poi si arresta (gemma terminale). Es.: faggio, carpino bianco, rovere/roverella, pino silvestre, tasso.\n'
   +'2 = ESTENSIONE CONTINUA: l\'apice resta attivo e produce nodi e foglie per tutta la stagione. Es.: olmo campestre, ginepro comune, acero tridente, aceri giapponesi, olmo cinese, lagerstroemia.\n'
   +'3 = CRESCITA MISTA: alcuni germogli allungano, altri fanno rami corti, altri portano fiori. Es.: melo selvatico, prugnolo, ciliegio selvatico, cotoneaster.\n'
   +'Regole: usa gli esempi della guida quando la specie c\'è; per le altre ragiona dal comportamento del germoglio e dichiara che è un\'ipotesi; non citare percentuali di frequenza che non conosci con certezza; se i dati non bastano rispondi tipo null.\n'
   +'Rispondi SOLO con JSON valido, senza altro testo né ```: {"tipo":1|2|3|null,"perche":"2-3 frasi: causa ed effetto, in base a specie e osservazioni","da_osservare":"cosa guardare sul germoglio nelle prossime settimane per confermare"}';
};
CRES.ctx=function(){
  var s=CRES.sp(),o={categoria:CAT(draft.cat).n,specie:[s.com,s.sci].filter(Boolean).join(' – ')||'non indicata'};
  (EXTRA[draft.cat]||[]).forEach(function(f){var v=draft.x[f.k];if(v!=null&&v!==''&&f.k.indexOf('crescita')!==0)o[f.l]=v});
  var ob=CRES.obsNow;if(ob&&(ob.apice||ob.rami))o.osservazioneGuidata={apice:ob.apice||'non indicato',rami_corti_o_fiori:ob.rami||'non indicato'};
  var di=CRES.read();if(di.length)o.diario=di.map(function(e){return e.txt});
  if(draft.when){var d=new Date(draft.when);if(!isNaN(d))o.mese=AI.MESI[d.getMonth()]}
  if(draft.alt!=null&&isFinite(draft.alt))o.quotaM=Math.round(draft.alt);
  return 'Osservazioni sulla pianta: '+JSON.stringify(o);
};
CRES.fromAI=function(){
  return AI.run(CRES.sistema(),[{r:'user',t:CRES.ctx()}],0.1).then(function(r){
    var t=String(r.text||'').replace(/^```(?:json)?/i,'').replace(/```\s*$/,'').trim(),a=t.indexOf('{'),b=t.lastIndexOf('}');
    if(a<0||b<=a)throw new Error('risposta non valida');
    var j=JSON.parse(t.slice(a,b+1)),tp=(j.tipo===1||j.tipo===2||j.tipo===3)?j.tipo:null;
    return {tipo:tp,src:'Ipotesi AI ('+r.prov.n+')',ai:true,perche:String(j.perche||'').trim().slice(0,500),da:String(j.da_osservare||'').trim().slice(0,300)};
  });
};
/* applica alla scheda: tipo + perché (con l'origine), e aggiorna i campi se visibili */
CRES.apply=function(r){
  readForm();draft.x=draft.x||{};
  var ora=new Date(),d=pad(ora.getDate())+'/'+pad(ora.getMonth()+1);
  draft.x.crescita=r.tipo?CRES.T[r.tipo]:'';
  draft.x.crescita_perche='['+r.src+', '+d+'] '+r.perche+(r.ai?' (ipotesi, da confermare osservando il germoglio)':'');
  ['crescita','crescita_perche'].forEach(function(k){var e=document.querySelector('[data-x="'+k+'"]');if(e)e.value=draft.x[k]||''});
  var dt=document.querySelector('[data-x="crescita"]');if(dt){var dd=dt.closest('details');if(dd)dd.open=true}
  toast('🌱 Tipo di crescita scritto nella scheda',2500);
};
/* ---------- interfaccia nella scheda ---------- */
CRES.panel=function(){
  return '<div class="row" style="margin-top:6px"><button class="btn s" id="fCr">🌱 Riconosci l\'estensione</button></div><div id="fCres"></div>';
};
CRES.card=function(r,i,extra){
  var tp=r.tipo?'<b>Tipologia '+esc(CRES.T[r.tipo])+'</b>':'<b>Nessun tipo assegnato</b>';
  return '<div style="margin-top:8px;padding:8px;border-radius:10px;background:rgba(127,127,127,.12)"><div class="mut">'+esc(r.src)+'</div>'+tp+'<div class="mut" style="margin-top:4px">'+esc(r.perche)+'</div>'
   +(r.da?'<div class="mut" style="margin-top:4px"><b>Da osservare:</b> '+esc(r.da)+'</div>':'')+(extra||'')
   +(r.tipo?'<div class="row" style="margin-top:6px"><button class="btn f" data-crap="'+i+'">Applica alla scheda</button></div>':'')+'</div>';
};
CRES.today=function(){var d=new Date();return pad(d.getDate())+'/'+pad(d.getMonth()+1)};
CRES.open=function(){
  readForm();var box=$('#fCres');
  if(box.innerHTML){box.innerHTML='';return}
  CRES.obsNow={};CRES.res=[];
  var g=CRES.fromGuide();
  box.innerHTML='<div class="card"><b>🌱 Tipo di crescita (estensione)</b>'
   +'<div class="mut" style="margin-top:4px">Schema pratico della guida (non una classificazione botanica universale): <b>1</b> una sola estensione · <b>2</b> estensione continua · <b>3</b> crescita mista. Una foto sola non basta: serve seguire lo stesso germoglio per qualche settimana. Qui sotto trovi più strade; ognuna dice il perché e scegli tu quale applicare.</div>'
   +'<div id="crG"></div>'
   +'<h3 style="margin-top:12px">Osservazione guidata</h3>'
   +'<label class="l">Il germoglio ha ancora l\'apice attivo (produce nuovi nodi e foglie)?</label><select id="crA"><option value=""></option><option value="fermo">No: si è fermato, ha una gemma terminale</option><option value="attivo">Sì: continua ad allungarsi</option></select>'
   +'<div id="crRw"><label class="l">Compaiono anche rami corti o gemme da fiore, oltre ai rami lunghi?</label><select id="crR"><option value=""></option><option value="no">No</option><option value="si">Sì</option></select></div>'
   +'<label class="item opt" style="margin-top:6px"><input type="checkbox" id="crS"><span class="tx"><b>Ho seguito lo stesso germoglio per alcune settimane</b><small>se no, il risultato resta solo «probabile»</small></span></label>'
   +'<div id="crO"></div>'
   +'<h3 style="margin-top:12px">Diario del germoglio</h3><div class="mut">Un rilievo ogni 1–2 settimane: con almeno due righe l\'app ricava il tipo e spiega il perché.</div>'
   +'<div id="crL"></div>'
   +'<div class="row" style="margin-top:6px;flex-wrap:wrap"><input type="text" id="crD" value="'+CRES.today()+'" style="width:80px" inputmode="numeric" placeholder="gg/mm"><input type="number" id="crLn" placeholder="cm" style="width:70px" inputmode="decimal"><input type="number" id="crN" placeholder="nuovi nodi" style="width:90px" inputmode="numeric">'
   +'<select id="crAp"><option value="attivo">apice attivo</option><option value="fermo">apice fermo</option></select><select id="crRm"><option value="no">rami corti/fiori: no</option><option value="si">rami corti/fiori: sì</option></select><button class="btn s" id="crAdd">+ Aggiungi rilievo</button></div>'
   +'<div id="crDi"></div>'
   +'<div class="row" style="margin-top:12px"><button class="btn s" id="crAi">🤖 Chiedi un\'ipotesi all\'AI</button></div><div id="crAiB"></div></div>';
  CRES.res=[];
  var put=function(r){CRES.res.push(r);return CRES.res.length-1};
  var gi=put(g);
  $('#crG').innerHTML=CRES.card(g,gi);
  var bind=function(root){$$('[data-crap]',root).forEach(function(b){b.onclick=function(){CRES.apply(CRES.res[+b.getAttribute('data-crap')])}})};
  bind($('#crG'));
  var obs=function(){
    CRES.obsNow={apice:$('#crA').value,rami:$('#crR').value};
    $('#crRw').style.display=$('#crA').value==='attivo'?'':'none';
    var r=CRES.fromObs($('#crA').value,$('#crA').value==='attivo'?$('#crR').value:'',$('#crS').checked);
    if(!r){$('#crO').innerHTML='';return}
    var i=put(r);$('#crO').innerHTML=CRES.card(r,i,CRES.confronto(r,g));bind($('#crO'));
  };
  ['crA','crR','crS'].forEach(function(id){$('#'+id).onchange=obs});$('#crRw').style.display='none';
  var diario=function(){
    var L=CRES.read();
    $('#crL').innerHTML=L.length?'<div class="mut" style="margin-top:6px">'+L.map(function(e,i){return esc(e.txt)+' <button class="btn s" data-crdel="'+i+'">✕</button>'}).join('<br>')+'</div>':'';
    $$('[data-crdel]',$('#crL')).forEach(function(b){b.onclick=function(){var L2=CRES.read();L2.splice(+b.getAttribute('data-crdel'),1);CRES.write(L2);diario()}});
    var r=CRES.fromDiary();
    if(!r){$('#crDi').innerHTML=L.length===1?'<div class="mut" style="margin-top:6px">Serve almeno un secondo rilievo.</div>':'';return}
    var i=put(r);$('#crDi').innerHTML=CRES.card(r,i,CRES.confronto(r,g));bind($('#crDi'));
  };
  $('#crAdd').onclick=function(){
    var d=$('#crD').value.trim(),ln=parseFloat(($('#crLn').value||'').replace(',','.')),n=parseInt($('#crN').value,10);
    if(!/^\d{1,2}\/\d{1,2}(\/\d{2,4})?$/.test(d)||!isFinite(ln)||!isFinite(n)){toast('Compila data (gg/mm), lunghezza in cm e nuovi nodi');return}
    var L=CRES.read();L.push({d:d,len:ln,nodi:n,apice:$('#crAp').value,rami:$('#crRm').value});CRES.write(L);$('#crLn').value='';$('#crN').value='';diario();
  };
  diario();
  $('#crAi').onclick=function(){
    var b=$('#crAiB');
    if(!AI.active().length){AI.noKeyMsg();return}
    if(navigator.onLine===false){b.innerHTML='<div class="card" style="color:var(--warn)">Serve la rete.</div>';return}
    b.innerHTML='<div class="card mut">Chiedo all\'AI…</div>';$('#crAi').disabled=true;
    CRES.fromAI().then(function(r){var i=put(r);b.innerHTML=CRES.card(r,i,CRES.confronto(r,g));bind(b)}).catch(function(e){var m=String(e&&e.message||e);b.innerHTML='<div class="card" style="color:var(--bad)">✗ '+esc(m==='NOKEY'?'Nessuna chiave AI salvata.':m)+'</div>'}).then(function(){$('#crAi').disabled=false});
  };
};
/* se la guida (per la specie) e l'osservazione (per questo germoglio) non coincidono, lo dice senza scegliere */
CRES.confronto=function(r,g){
  if(!r.tipo||!g.tipo||r.tipo===g.tipo)return '';
  return '<div class="mut" style="margin-top:4px;color:var(--warn)">⚠ Non coincide con la guida per questa specie (tipo '+g.tipo+'). La guida vale in generale, questa osservazione per questo germoglio: la stessa specie può reagire diversamente secondo clima, vigore, irrigazione e concimazione. Continua a seguire il germoglio.</div>';
};
