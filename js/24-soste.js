/* Atlante di campo - Dividi alle soste (v4.5): trova le soste lunghe di una traccia e la divide in tratti, ognuno con le sue statistiche.
   Idea presa da Colota (che divide i percorsi alle soste), codice scritto da capo.
   by Lollo ®2026 · i moduli si caricano nell'ordine dei numeri (vedi index.html) */
'use strict';
var SOS={R:30,WALK:1.2,SLOW:0.25};   // raggio della sosta (m), passo medio per stimare quando riparti (m/s), sotto questa velocità un «buco» di punti è una sosta (m/s)
/* Sosta = ti sei tenuto entro R metri dal punto di arrivo per almeno minMs. Vale anche quando il GPS non ha registrato punti perché eri fermo
   (GPSLogger non scrive niente se non ti muovi): un lungo intervallo senza spostamento conta come sosta. */
SOS.find=function(t,minMs){
  var P=t.pts||[],n=P.length,out=[],i=0;
  while(i<n-1){
    var k=i+1;
    while(k<n&&dist(P[i][0],P[i][1],P[k][0],P[k][1])<=SOS.R)k++;
    var last=k-1,t0=P[i][3],end=P[last][3];
    if(k<n){
      var gap=P[k][3]-P[last][3],dd=dist(P[last][0],P[last][1],P[k][0],P[k][1]);
      if(gap>0&&dd/(gap/1000)<SOS.SLOW)end=Math.max(end,P[k][3]-dd/SOS.WALK*1000);   // fermo fino a poco prima del punto successivo
    }
    if(end-t0>=minMs){
      var la=0,lo=0,m=0;for(var j=i;j<=last;j++){la+=P[j][0];lo+=P[j][1];m++}
      out.push({i0:i,i1:last,t0:t0,t1:Math.round(end),min:Math.round((end-t0)/60000),lat:la/m,lon:lo/m});
      i=Math.max(k,last+1);
    }else i++;
  }
  return out;
};
/* tratti tra le soste: finiscono sul punto di arrivo e ripartono dal punto in cui lasci la sosta (con l'ora in cui ti sei rimesso in cammino) */
SOS.split=function(t,stops){
  var P=t.pts,segs=[],a=0,t0=null;
  stops.forEach(function(s){segs.push({a:a,b:s.i0,t0:t0});a=s.i1;t0=s.t1>P[s.i1][3]?s.t1:null});
  segs.push({a:a,b:P.length-1,t0:t0});
  segs=segs.filter(function(g){return g.b-g.a>=1});
  var base=String(t.name||'Traccia').replace(/ · tratto \d+\/\d+$/,''),now=new Date().toISOString(),brk=t.brk||[];
  return segs.map(function(g,k){
    var pts=P.slice(g.a,g.b+1).map(function(p){return p.slice()});if(g.t0!=null)pts[0][3]=g.t0;
    var r={id:uid(),name:base+' · tratto '+(k+1)+'/'+segs.length,start:pts[0][3],end:pts[pts.length-1][3],pts:pts,brk:brk.filter(function(i){return i>g.a&&i<=g.b}).map(function(i){return i-g.a}),perc:t.perc||null,u:now};
    if(t.src)r.src=t.src;return r;
  });
};
/* per le statistiche della traccia: quante soste da almeno 10 minuti e quanto tempo in tutto */
SOS.summary=function(t){
  if(!t.pts||t.pts.length<2)return null;var s=SOS.find(t,10*60000);
  return {n:s.length,min:s.reduce(function(a,x){return a+x.min},0)};
};
SOS.show=function(s){
  closeModal();go('map');map.setView([s.lat,s.lon],18);
  var m=L.circleMarker([s.lat,s.lon],{radius:16,color:'#ff9800',weight:3,fillOpacity:.18}).addTo(map).bindPopup('Sosta · '+s.min+' min · '+hhmm(new Date(s.t0))+' – '+hhmm(new Date(s.t1))).openPopup();
  setTimeout(function(){map.removeLayer(m)},15000);
};
SOS.open=function(t){
  if(REC.on&&REC.trk&&REC.trk.id===t.id)return toast('Ferma prima la registrazione in corso');
  if((t.pts||[]).length<3)return toast('La traccia è troppo corta');
  var min=SET.sosMin||10,del=false;
  var h='<p>Cerca i punti dove ti sei <b>fermato a lungo</b> (restando entro '+SOS.R+' m) e divide la traccia lì: ogni tratto ha distanza, dislivello e velocità suoi.</p>'
   +'<label class="l">Considera sosta una pausa di almeno</label><select id="sosMin">'+[5,10,15,20,30,45,60].map(function(m){return '<option value="'+m+'"'+(m===min?' selected':'')+'>'+m+' minuti</option>'}).join('')+'</select>'
   +'<div id="sosRes" style="margin-top:10px"></div>'
   +'<label class="item opt" style="margin-top:8px"><input type="checkbox" id="sosDel"><span class="tx"><b>Elimina la traccia originale</b><small>se non la spunti, l\'originale resta e i tratti si aggiungono</small></span></label>';
  var go_=mkBtn('✂️ Dividi','f',function(){SOS.apply(t,SOS.find(t,(+$('#sosMin').value)*60000),$('#sosDel').checked)});
  openModal('Dividi alle soste · '+(t.name||'traccia'),h,[go_]);
  var upd=function(){
    var m=+$('#sosMin').value,st=SOS.find(t,m*60000),parts=SOS.split(t,st);SET.sosMin=m;
    if(!st.length){$('#sosRes').innerHTML='<div class="card"><b>Nessuna sosta di almeno '+m+' minuti.</b><div class="mut">Prova con una pausa più breve.</div></div>';go_.disabled=true;return}
    go_.disabled=parts.length<2;
    $('#sosRes').innerHTML='<div class="card"><b>'+st.length+(st.length===1?' sosta':' soste')+' → '+parts.length+' tratti</b>'
     +st.map(function(s,i){return '<div class="row" style="margin-top:6px"><span style="flex:1">🧍 <b>'+s.min+' min</b> · '+hhmm(new Date(s.t0))+' – '+hhmm(new Date(s.t1))+'</span><button class="btn s" data-ss="'+i+'">Mostra</button></div>'}).join('')
     +'<div class="mut" style="margin-top:8px">'+parts.map(function(p){var s=trkStats(p);return esc(p.name.replace(/^.* · /,''))+': '+fmtDist(s.d)+' · '+fmtDur(s.t)+' · +'+s.up+' m'}).join('<br>')+'</div></div>';
    $$('[data-ss]').forEach(function(b){b.onclick=function(){SOS.show(st[+b.getAttribute('data-ss')])}});
  };
  $('#sosMin').onchange=function(){saveSet();upd()};upd();
};
SOS.apply=function(t,stops,delOld){
  var parts=SOS.split(t,stops);if(parts.length<2)return toast('Niente da dividere');
  var ops=parts.map(function(p){return DB.put('tracks',p)});
  if(delOld){tomb(t.id);ops.push(DB.del('tracks',t.id))}
  Promise.all(ops).then(function(){markChange();closeModal();tones([[660,.1],[880,.1],[1100,.16]]);toast('✂️ Traccia divisa in '+parts.length+' tratti'+(delOld?' (originale eliminata)':' (l\'originale resta)'),4500);return loadTracks()});
};
