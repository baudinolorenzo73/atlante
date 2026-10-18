/* Atlante di campo - Luoghi di lavoro e casella di ricerca (v3.0).
   Il lago resta il luogo di partenza; si possono aggiungere altri luoghi (ognuno con il suo archivio della zona e le sue mappe senza rete)
   e cercare luoghi o qualsiasi cosa trovata (punti, note, specie, diario, fonti).
   by Lollo ®2026 · i moduli si caricano nell'ordine dei numeri (vedi index.html) */
'use strict';

/* =================== LUOGHI =================== */
var PL={
  list:[],cur:'lago',
  lago:{id:'lago',name:'Lago Piccolo di Avigliana',lat:45.0567,lon:7.3922,r:3,builtin:true,
    pack:[45.035,7.350,45.085,7.440],zone:[45.030,7.340,45.090,7.450],tiles:[45.0457,7.3767,45.0677,7.4077]}
};
PL.all=function(){return [PL.lago].concat(PL.list)};
PL.get=function(id){return PL.all().filter(function(p){return p.id===id})[0]||PL.lago};
PL.active=function(){return PL.get(PL.cur)};
PL.name=function(){return PL.active().name};
PL.isLake=function(){return PL.cur==='lago'};
PL.packKey=function(id){id=id||PL.cur;return id==='lago'?'zonepack':'zonepack:'+id};
PL.boxes=function(p){
  if(p.pack)return p;
  var r=p.r||3,dla=r/111,dlo=r/(111*Math.cos(p.lat*Math.PI/180)),t=Math.min(r,1.2),tla=t/111,tlo=t/(111*Math.cos(p.lat*Math.PI/180));
  function f(v){return +v.toFixed(5)}
  return {pack:[f(p.lat-dla),f(p.lon-dlo),f(p.lat+dla),f(p.lon+dlo)],zone:[f(p.lat-dla*1.15),f(p.lon-dlo*1.15),f(p.lat+dla*1.15),f(p.lon+dlo*1.15)],tiles:[f(p.lat-tla),f(p.lon-tlo),f(p.lat+tla),f(p.lon+tlo)]};
};
function setArr(a,b){a.splice(0,a.length);b.forEach(function(v){a.push(v)})}
PL.save=function(){return DB.put('kv',{id:'places',v:{list:PL.list,cur:PL.cur}})};
PL.load=function(rec){
  if(rec&&rec.v){PL.list=rec.v.list||[];PL.cur=rec.v.cur||'lago'}
  if(!PL.all().some(function(p){return p.id===PL.cur}))PL.cur='lago';
};
// applica il luogo corrente: centro, aree, archivio, titolo
PL.apply=function(opt){
  opt=opt||{};var p=PL.active(),b=PL.boxes(p);
  HOME[0]=p.lat;HOME[1]=p.lon;setArr(PACK_BB,b.pack);setArr(AVI_BB,b.zone);setArr(LAKE_BB,b.tiles);
  if(typeof HOMEMK!=='undefined')HOMEMK.setLatLng(HOME);
  var t=$('#topT');if(t)t.textContent=p.name;
  document.title=PL.isLake()?'Atlante di campo · Lago Piccolo':'Atlante di campo · '+p.name;
  NEAR.st={};NEAR.inZone=null;
  var done=DB.get('kv',PL.packKey()).then(function(r){NEAR.pack=r&&r.v||null;if(typeof updNearBtn==='function')updNearBtn()});
  if(opt.view)map.setView(HOME,opt.zoom||15);
  return done;
};
PL.switchTo=function(){if(typeof CAP!=='undefined')CAP.sel=null;return PL._switchTo.apply(null,arguments)};
PL._switchTo=function(id,view){
  PL.cur=id;return PL.save().then(function(){return PL.apply({view:view!==false})}).then(function(){markChange();refreshPage();if(curPage==='luo')renderLuo()});
};
PL.add=function(o){
  var dup=PL.list.filter(function(p){return Math.abs(p.lat-o.lat)<0.005&&Math.abs(p.lon-o.lon)<0.005&&p.name===o.name})[0];
  if(dup)return dup;
  o.id='pl'+uid();o.r=Math.max(1,Math.min(10,o.r||3));PL.list.push(o);return o;
};
PL.askPack=function(){openNear();setTimeout(function(){downloadPack()},150)};
PL.dossNote=function(){
  return PL.isLake()?'':'<div class="card" style="border-color:var(--warn)"><b>Luogo di lavoro: '+esc(PL.name())+'</b><div class="mut">Il capitolo scritto a mano, la checklist e le schede della ricerca qui sotto riguardano il <b>Lago Piccolo di Avigliana</b>. Per questo luogo usa Luogo → Esplora, la ricerca (🔍) e il Catalogo.</div></div>';
};

/* =================== SCHEDA «LUOGO DI LAVORO» (pagina Altro) =================== */
PL.altCard=function(){
  var p=PL.active();
  return '<h3>Luogo di lavoro</h3><div class="card"><div class="mut">Il luogo decide dove si apre la mappa, quale archivio usano gli avvisi «Vicino a te» e quale area si scarica per l\'uso senza rete.</div>'
   +'<label class="l">Luogo attivo</label><select id="plSel">'+PL.all().map(function(x){return '<option value="'+x.id+'"'+(x.id===p.id?' selected':'')+'>'+esc(x.name)+'</option>'}).join('')+'</select>'
   +'<div class="mut" style="margin-top:4px">Area dell\'archivio: circa '+(p.id==='lago'?'5 × 6 km':(2*p.r)+' × '+(2*p.r)+' km')+' · '+(NEAR.pack?'archivio scaricato il '+fmtDate(NEAR.pack.when):'archivio non ancora scaricato')+'</div>'
   +'<div class="row" style="margin-top:8px"><button class="btn s f" id="plFind">🔍 Cerca un luogo</button><button class="btn s" id="plHere">📍 Usa il centro della mappa</button></div>'
   +'<div class="row" style="margin-top:6px"><button class="btn s" id="plPack">⬇️ Archivio della zona</button>'+(p.builtin?'':'<button class="btn s" id="plR">↔ Raggio</button><button class="btn s" id="plDel">🗑 Elimina il luogo</button>')+'</div></div>';
};
PL.bindAlt=function(){
  var s=$('#plSel');if(!s)return;
  s.onchange=function(){PL.switchTo(s.value,true).then(function(){toast('Luogo: '+PL.name());if(!NEAR.pack&&!PL.isLake())toast('Archivio non scaricato: aprilo da «Archivio della zona»',4000)})};
  $('#plFind').onclick=function(){openSearch('')};
  $('#plPack').onclick=function(){PL.askPack()};
  $('#plHere').onclick=function(){
    var c=map.getCenter(),n=prompt('Nome del nuovo luogo',''); if(!n)return;
    var p=PL.add({name:n.trim(),lat:+c.lat.toFixed(5),lon:+c.lng.toFixed(5),r:3});
    PL.switchTo(p.id,true).then(function(){go('map');PL.askPack()});
  };
  if($('#plR'))$('#plR').onclick=function(){var p=PL.active(),v=prompt('Raggio dell\'area in km (da 1 a 10)',p.r);var n=parseFloat(String(v).replace(',','.'));if(!(n>=1&&n<=10))return;p.r=n;PL.save().then(function(){return PL.apply({})}).then(function(){refreshPage();if(curPage==='luo')renderLuo();if($('#modal').classList.contains('on'))openPlace();toast('Raggio: '+n+' km (riscarica l\'archivio per coprire la nuova area)',4500)})};
  if($('#plDel'))$('#plDel').onclick=function(){
    var p=PL.active();if(!confirm('Eliminare il luogo «'+p.name+'» e il suo archivio? I punti, le tracce e il diario NON vengono toccati.'))return;
    tomb(p.id);DB.del('kv',PL.packKey(p.id));PL.list=PL.list.filter(function(x){return x.id!==p.id});PL.cur='lago';
    PL.save().then(function(){return PL.apply({view:true,zoom:16})}).then(function(){markChange();closeModal();refreshPage();if(curPage==='luo')renderLuo()});
  };
};

/* =================== CASELLA DI RICERCA =================== */
var SRCH={res:[],q:''};
function parseCoords(q){
  var m=/^\s*(-?\d{1,2}(?:[.,]\d+)?)\s*[,; ]\s*(-?\d{1,3}(?:[.,]\d+)?)\s*$/.exec(q);if(!m)return null;
  var a=parseFloat(m[1].replace(',','.')),b=parseFloat(m[2].replace(',','.'));
  return (Math.abs(a)<=90&&Math.abs(b)<=180)?{lat:a,lon:b}:null;
}
function haystack(p){
  var a=[p.title,p.sp&&p.sp.com,p.sp&&p.sp.sci,p.note,p.ric,(p.tags||[]).join(' ')];
  Object.keys(p.x||{}).forEach(function(k){a.push(p.x[k])});Object.keys(p.s||{}).forEach(function(k){a.push(p.s[k])});
  return normTxt(a.filter(Boolean).join(' '));
}
function searchLocal(q){
  var terms=normTxt(q).split(' ').filter(Boolean),out=[];if(!terms.length)return out;
  function all(h){return terms.every(function(t){return h.indexOf(t)>=0})}
  POINTS.forEach(function(p){
    if(!all(haystack(p)))return;var tt=normTxt((p.title||'')+' '+(p.sp&&p.sp.sci||'')),sc=terms.every(function(t){return tt.indexOf(t)>=0})?0:1;
    out.push({kind:'p',sc:sc,p:p});
  });
  out.sort(function(a,b){return a.sc-b.sc});out=out.slice(0,40);
  var extra=[];
  FON.dia.forEach(function(e){if(all(normTxt([e.note,e.meteo,e.liv,e.asp,e.ghi].join(' '))))extra.push({kind:'d',e:e})});
  FON.lib.forEach(function(x){if(all(normTxt([x.title,x.authors,x.note,x.venue].join(' '))))extra.push({kind:'f',x:x})});
  CHK_SPECIES.forEach(function(s){if(all(normTxt(s.it+' '+s.sci+' '+(s.note||''))))extra.push({kind:'s',s:s})});
  return out.concat(extra.slice(0,30));
}
function openSearch(q0){
  FON.load().then(function(){
    openModal('Cerca','<div class="row"><input type="search" id="sqQ" placeholder="Un luogo, una specie, una nota, coordinate…" style="flex:1" autocomplete="off"><button class="btn f" id="sqGo">Cerca</button></div><div class="mut" style="margin-top:4px">Scrivi per cercare subito nel tuo lavoro; premi Cerca (o Invio) per cercare anche un luogo online. Puoi incollare delle coordinate, per esempio 45.0567, 7.3922.</div><div id="sqL"></div><div id="sqP"></div>',[]);
    var inp=$('#sqQ');inp.value=q0||'';
    var t;inp.oninput=function(){clearTimeout(t);t=setTimeout(function(){drawLocal(inp.value.trim())},200)};
    inp.onkeydown=function(e){if(e.key==='Enter'){e.preventDefault();searchGo()}};
    $('#sqGo').onclick=searchGo;
    drawLocal(inp.value.trim());inp.focus();
  });
}
function drawLocal(q){
  var box=$('#sqL');if(!box)return;SRCH.q=q;
  var c=parseCoords(q);
  if(!q){box.innerHTML='';return}
  var r=searchLocal(q),h='';
  if(c)h+='<h3>Coordinate</h3><div class="card"><b>'+c.lat.toFixed(5)+', '+c.lon.toFixed(5)+'</b><div class="row" style="margin-top:6px"><button class="btn s f" data-sq="go" data-i="c">Vai sulla mappa</button><button class="btn s" data-sq="work" data-i="c">Luogo di lavoro</button><button class="btn s" data-sq="pt" data-i="c">Nuovo punto</button></div></div>';
  SRCH.res=r;
  if(r.length){
    h+='<h3>Nel tuo lavoro ('+r.length+')</h3>'+r.map(function(x,i){
      if(x.kind==='p'){var p=x.p,cc=CAT(p.cat);return '<div class="item" data-sq="p" data-i="'+i+'" style="cursor:pointer"><span class="lgdot" style="background:'+cc.c+'">'+cc.e+'</span><span class="tx"><b>'+esc(p.title||'(senza titolo)')+'</b><small>'+esc(p.sp&&p.sp.sci?p.sp.sci+' · ':'')+esc(fmtDate(p.when).slice(0,10))+(p.rk&&!p.note?' · scheda della ricerca':'')+'</small></span></div>'}
      if(x.kind==='d')return '<div class="item" data-sq="d" data-i="'+i+'" style="cursor:pointer"><span class="lgdot" style="background:#555">📔</span><span class="tx"><b>Diario '+esc(fmtDate(x.e.when))+'</b><small>'+esc((x.e.note||x.e.asp||x.e.meteo||'').slice(0,90))+'</small></span></div>';
      if(x.kind==='f')return '<div class="item" data-sq="f" data-i="'+i+'" style="cursor:pointer"><span class="lgdot" style="background:#555">🗂</span><span class="tx"><b>'+esc(x.x.title)+'</b><small>fonte · '+esc(x.x.type)+'</small></span></div>';
      return '<div class="item" data-sq="s" data-i="'+i+'" style="cursor:pointer"><span class="lgdot" style="background:#555">🧾</span><span class="tx"><b>'+esc(x.s.it)+'</b><small><i>'+esc(x.s.sci)+'</i> · specie della checklist: tocca per cercare studi</small></span></div>'}).join('');
  }else if(!c)h+='<p class="mut">Niente nel tuo lavoro per «'+esc(q)+'». Premi Cerca per cercare un luogo online.</p>';
  box.innerHTML=h;bindSq(box);
}
function searchGo(){
  var q=$('#sqQ').value.trim();if(!q)return;drawLocal(q);
  var box=$('#sqP');box.innerHTML='<h3>Luoghi online</h3><span class="mut">cerco…</span>';
  fj('https://nominatim.openstreetmap.org/search?format=jsonv2&limit=8&accept-language=it&q='+encodeURIComponent(q),15000).then(function(j){
    SRCH.pl=(j||[]).map(function(r){
      var b=(r.boundingbox||[]).map(parseFloat),sp=b.length===4?Math.max((b[1]-b[0])*111,(b[3]-b[2])*111*Math.cos(parseFloat(r.lat)*Math.PI/180))/2:3;
      return {name:r.name||String(r.display_name||'').split(',')[0],sub:r.display_name,lat:parseFloat(r.lat),lon:parseFloat(r.lon),r:Math.max(1.5,Math.min(4,Math.round(sp*2)/2||3)),type:r.type||''};
    });
    box.innerHTML='<h3>Luoghi online ('+SRCH.pl.length+')</h3>'+(SRCH.pl.length?SRCH.pl.map(function(x,i){return '<div class="card"><b>'+esc(x.name)+'</b> <span class="mut">'+esc(x.type)+'</span><div class="mut">'+esc(x.sub)+'</div><div class="row" style="margin-top:6px"><button class="btn s f" data-sq="go" data-i="'+i+'">Vai</button><button class="btn s" data-sq="work" data-i="'+i+'">Luogo di lavoro</button><button class="btn s" data-sq="pt" data-i="'+i+'">Nuovo punto</button></div></div>'}).join(''):'<p class="mut">Nessun luogo trovato.</p>')+'<p class="mut">Dati © OpenStreetMap (Nominatim).</p>';
    bindSq(box);
  }).catch(function(e){box.innerHTML='<h3>Luoghi online</h3><p class="mut" style="color:var(--warn)">Ricerca non riuscita: '+esc(e.message)+'</p>'});
}
function bindSq(box){
  $$('[data-sq]',box).forEach(function(b){b.onclick=function(){
    var a=b.getAttribute('data-sq'),i=b.getAttribute('data-i'),x;
    var pl=function(){if(i==='c'){var c=parseCoords(SRCH.q);return {name:'Luogo '+c.lat.toFixed(3)+', '+c.lon.toFixed(3),lat:c.lat,lon:c.lon,r:3}}return SRCH.pl[+i]};
    if(a==='p'){x=SRCH.res[+i].p;closeModal();flashPoint(x.lat,x.lon,x.title,x.id);setTimeout(function(){openDetail(x.id)},0)}
    else if(a==='d'){closeModal();openHub('diario',{})}
    else if(a==='f'){closeModal();openHub('fonti',{f:SRCH.res[+i].x.title})}
    else if(a==='s'){x=SRCH.res[+i].s;openHub('studi',{q:x.sci})}
    else if(a==='go'){x=pl();closeModal();go('map');map.setView([x.lat,x.lon],15);flashPoint(x.lat,x.lon,x.name)}
    else if(a==='pt'){x=pl();closeModal();go('map');openForm(null,{draft:newDraft(x.lat,x.lon,{cat:'curiosita',title:x.name})})}
    else if(a==='work'){x=pl();var p=PL.add({name:x.name,lat:x.lat,lon:x.lon,r:x.r||3});closeModal();PL.switchTo(p.id,true).then(function(){go('map');toast('Luogo di lavoro: '+p.name,3500);PL.askPack()})}
  }});
}
$('#bSearch').onclick=function(){openSearch('')};
