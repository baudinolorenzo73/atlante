/* Atlante Lago Piccolo - Ricerca e fonti: studi (OpenAlex), foto storiche (Wikimedia Commons, Panoramax), canti (Xeno-canto),
   diario delle stagioni, biblioteca delle fonti, macchina del tempo (Esri Wayback), livelli WMS/XYZ personalizzati, Natura 2000.
   by Lollo ®2026 · i moduli si caricano nell'ordine dei numeri (vedi index.html) */
'use strict';

/* =================== DATI SALVATI =================== */
var FON={lib:[],dia:[],cl:[],ready:null};
FON.load=function(){
  if(FON.ready)return FON.ready;
  FON.ready=Promise.all([DB.get('kv','fonti'),DB.get('kv','diario'),DB.get('kv','customlayers')]).then(function(r){
    FON.lib=(r[0]&&r[0].v)||[];FON.dia=(r[1]&&r[1].v)||[];
    if(r[2]&&r[2].v&&!FON.cl.length)FON.cl=r[2].v;
    if(!SET.fonSeed&&!FON.lib.length){FON.lib=FON.seed();SET.fonSeed=1;saveSet();return DB.put('kv',{id:'fonti',v:FON.lib})}
  });
  return FON.ready;
};
FON.saveLib=function(){markChange();return DB.put('kv',{id:'fonti',v:FON.lib})};
FON.saveDia=function(){markChange();return DB.put('kv',{id:'diario',v:FON.dia})};
FON.saveCl=function(){markChange();return DB.put('kv',{id:'customlayers',v:FON.cl})};
FON.addLib=function(o){
  var dup=FON.lib.filter(function(x){return (o.doi&&x.doi===o.doi)||(!o.doi&&x.title===o.title&&x.url===o.url)})[0];
  if(dup){toast('Già nella biblioteca');return Promise.resolve(false)}
  o.id=o.id||uid();o.added=new Date().toISOString();o.note=o.note||'';o.pid=o.pid||'';FON.lib.unshift(o);
  return FON.saveLib().then(function(){toast('🗂 Salvato nella biblioteca delle fonti');return true});
};
// fonti già verificate durante la ricerca (compaiono la prima volta che apri la biblioteca)
FON.seed=function(){
  var now=new Date().toISOString();
  return [
   {t:'Formulario Natura 2000 IT1110007 «Laghi di Avigliana»',u:'https://www.regione.piemonte.it/giscartografia/Parchi/schede/IT1110007.pdf',y:'',a:'Regione Piemonte',k:'documento',n:'Elenco ufficiale di habitat e specie del sito: da qui vengono i codici e la checklist Natura 2000 dell\'app.'},
   {t:'Piano di gestione ZSC/ZPS IT1110007 «Laghi di Avigliana» (relazione)',u:'https://www.regione.piemonte.it/giscartografia/Parchi/Piani/IT1110007_PdG_Relazione_DEF.pdf',y:'2017',a:'Regione Piemonte',k:'documento',n:'Geologia, storia, habitat, specie, misure di conservazione. Nel testo letto non c\'erano profondità, superficie né valori delle analisi.'},
   {t:'ARPA Piemonte: laghi della provincia di Torino e Biella',u:'https://old-static.arpa.piemonte.it/pubblicazioni-2/pubblicazioni-anno-2010/testo%20laghi%20torino%20biella.pdf',y:'2010',a:'ARPA Piemonte',k:'documento',n:'Rapporto sullo stato dei laghi: da leggere per i dati di qualità dell\'acqua (non ancora letto in dettaglio).'},
   {t:'Disentangling the stratigraphic architecture of the Rivoli-Avigliana end moraine system (Western Alps, NW Italy)',u:'https://doi.org/10.1080/17445647.2021.1942252',y:'2021',a:'',k:'studio',d:'10.1080/17445647.2021.1942252',n:'Geologia dell\'anfiteatro morenico. Trovato con OpenAlex.'},
   {t:'Assessing the distribution and habitat suitability of Austropotamobius pallipes complex in proximity of invasive Procambarus clarkii',u:'https://doi.org/10.1007/s00027-025-01175-1',y:'2025',a:'',k:'studio',d:'10.1007/s00027-025-01175-1',n:'Gambero di fiume autoctono e gambero rosso invasivo. Trovato con OpenAlex.'},
   {t:'Growth and diet of Perca fluviatilis and Lepomis gibbosus in two eutrophic lakes (lakes of Avigliana, Italy)',u:'',y:'2000',a:'',k:'studio',n:'Pesci dei laghi di Avigliana. Trovato con OpenAlex: cerca il titolo per il testo.'},
   {t:'The effect of position in stacked trays on cultured freshwater mussels in Avigliana Lakes (N-W Italy)',u:'',y:'2005',a:'',k:'studio',n:'Trovato con OpenAlex: cerca il titolo per il testo.'}
  ].map(function(s){return {id:'seed-'+slug(s.t).slice(0,24),type:s.k,title:s.t,url:s.u,year:s.y,authors:s.a,doi:s.d||'',note:s.n,pid:'',added:now,src:'ricerca iniziale'}});
};

/* =================== UTILITÀ =================== */
function safeUrl(u){return /^https?:\/\//i.test(u||'')?u:''}
function aLink(u,t){u=safeUrl(u);return u?'<a href="'+esc(u)+'" target="_blank" rel="noopener">'+esc(t)+'</a>':''}
function plain(s){try{return new DOMParser().parseFromString(String(s||''),'text/html').body.textContent.replace(/\s+/g,' ').trim()}catch(e){return String(s||'')}}
function fj(url,ms){
  var ctl=window.AbortController?new AbortController():null,t=ctl&&setTimeout(function(){ctl.abort()},ms||15000);
  return fetch(url,ctl?{signal:ctl.signal}:{}).then(function(r){clearTimeout(t);if(!r.ok)throw new Error('HTTP '+r.status);return r.json()}).catch(function(e){clearTimeout(t);throw (e&&e.name==='AbortError')?new Error('nessuna risposta (rete assente o lenta)'):e});
}
function ptTitle(id){var p=POINTS.filter(function(x){return x.id===id})[0];return p?p.title:''}
function csvCell(v){v=String(v==null?'':v);return /[",\n;]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v}
function csvText(rows){return '\ufeff'+rows.map(function(r){return r.map(csvCell).join(';')}).join('\r\n')}
function saveCSV(rows,name){shareOrDownload(new Blob([csvText(rows)],{type:'text/csv'}),name)}

/* =================== CHECKLIST: specie del sito Natura 2000 =================== */
// le specie del formulario Natura 2000 entrano nella checklist del Dossier (senza doppioni, con gruppi raggruppati)
(function(){
  if(typeof N2000_SP==='undefined'||typeof CHK_SPECIES==='undefined')return;
  var have={},ord=[];
  CHK_SPECIES.forEach(function(s){have[s.sci.toLowerCase()]=s;if(ord.indexOf(s.g)<0)ord.push(s.g)});
  N2000_SP.forEach(function(r){
    var tag='Natura 2000'+(r[3]?' '+r[3]:'')+(r[4]==='A'?' · specie principale del sito':' · specie importante del sito'),k=r[1].toLowerCase();
    if(have[k]){if((have[k].note||'').indexOf('Natura 2000')<0)have[k].note=(have[k].note?have[k].note+' · ':'')+tag;have[k].n2k=r[4]}
    else{var o={g:r[0],it:r[2],sci:r[1],note:tag,n2k:r[4]};have[k]=o;CHK_SPECIES.push(o);if(ord.indexOf(r[0])<0)ord.push(r[0])}
  });
  var idx=CHK_SPECIES.map(function(s,i){return [s,i]});
  idx.sort(function(a,b){return (ord.indexOf(a[0].g)-ord.indexOf(b[0].g))||(a[1]-b[1])});
  idx.forEach(function(x,i){CHK_SPECIES[i]=x[0]});
})();

/* =================== MACCHINA DEL TEMPO (Esri Wayback) =================== */
var TM={cfg:null,list:[],i:0,layer:null,on:false,bar:null};
function tmDate(d){var m=['gen','feb','mar','apr','mag','giu','lug','ago','set','ott','nov','dic'],a=d.split('-');return +a[2]+' '+m[+a[1]-1]+' '+a[0]}
TM.load=function(){
  if(TM.list.length)return Promise.resolve();
  return fj('https://s3-us-west-2.amazonaws.com/config.maptiles.arcgis.com/waybackconfig.json',20000).then(function(j){
    var out=[];Object.keys(j).forEach(function(k){
      var o=j[k],m=/(\d{4}-\d{2}-\d{2})/.exec(o.itemTitle||'');if(!m)return;
      var u=o.itemURL||'';
      if(u.indexOf('{level}')>=0)u=u.replace('{level}','{z}').replace('{row}','{y}').replace('{col}','{x}');
      else u='https://wayback.maptiles.arcgis.com/arcgis/rest/services/world_imagery/mapserver/tile/'+k+'/{z}/{y}/{x}';
      out.push({id:k,date:m[1],url:u});
    });
    out.sort(function(a,b){return a.date<b.date?-1:a.date>b.date?1:0});
    if(!out.length)throw new Error('elenco vuoto');
    TM.list=out;DB.put('kv',{id:'wayback',v:out});
  }).catch(function(e){
    // senza rete usa l'elenco salvato l'ultima volta
    return DB.get('kv','wayback').then(function(r){if(r&&r.v&&r.v.length){TM.list=r.v;toast('Elenco date salvato (senza rete: le immagini potrebbero non caricarsi)',3500)}else throw e});
  });
};
TM.show=function(i){
  if(!TM.list.length)return;
  i=Math.max(0,Math.min(TM.list.length-1,i));TM.i=i;var it=TM.list[i];
  if(!TM.layer){TM.layer=L.tileLayer(it.url,{maxNativeZoom:19,maxZoom:MAXZ,attribution:'Esri World Imagery Wayback'}).addTo(map);TM.layer.setZIndex(5)}
  else TM.layer.setUrl(it.url);
  TM.layer.setOpacity(+$('#tmOp').value/100);
  $('#tmD').textContent=tmDate(it.date);$('#tmR').value=i;
  var y=it.date.slice(0,4),s=$('#tmY');if(s)s.value=y;
};
TM.open=function(){
  if(!TM.bar){
    TM.bar=el('<div id="tmBar"><div class="tmr"><b id="tmD">…</b><span class="mut" id="tmH">archivio Esri: la foto può essere più vecchia della data</span><button class="btn s" id="tmX" title="Chiudi">✕</button></div><div class="tmr"><button class="btn s" id="tmP">‹</button><input type="range" id="tmR" min="0" max="0" value="0" style="flex:1"><button class="btn s" id="tmN">›</button></div><div class="tmr"><select id="tmY" style="width:auto"></select><span class="mut">sfuma</span><input type="range" id="tmOp" min="0" max="100" value="100" style="flex:1"></div></div>');
    document.body.appendChild(TM.bar);
    $('#tmX').onclick=TM.close;$('#tmP').onclick=function(){TM.show(TM.i-1)};$('#tmN').onclick=function(){TM.show(TM.i+1)};
    var dT;$('#tmR').oninput=function(){var v=+this.value;$('#tmD').textContent=tmDate(TM.list[v].date);clearTimeout(dT);dT=setTimeout(function(){TM.show(v)},250)};
    $('#tmOp').oninput=function(){if(TM.layer)TM.layer.setOpacity(this.value/100)};
    $('#tmY').onchange=function(){var y=this.value,k=TM.list.findIndex(function(x){return x.date.slice(0,4)===y});if(k>=0)TM.show(k)};
  }
  if(curPage!=='map')go('map');
  TM.bar.style.display='block';$('#bTime').classList.add('on');TM.on=true;$('#tmD').textContent='carico…';
  TM.load().then(function(){
    var ys=[];TM.list.forEach(function(x){var y=x.date.slice(0,4);if(ys.indexOf(y)<0)ys.push(y)});
    $('#tmY').innerHTML=ys.map(function(y){return '<option>'+y+'</option>'}).join('');
    $('#tmR').max=TM.list.length-1;
    TM.show(TM.layer?TM.i:0);
  }).catch(function(e){$('#tmD').textContent='Archivio non raggiungibile';toast('Macchina del tempo: '+e.message+' (serve la rete)',4500)});
};
TM.close=function(){
  if(TM.bar)TM.bar.style.display='none';
  if(TM.layer){map.removeLayer(TM.layer);TM.layer=null}
  TM.on=false;$('#bTime').classList.remove('on');
};
$('#bTime').onclick=function(){TM.on?TM.close():TM.open()};

/* =================== LIVELLI PERSONALIZZATI (WMS / XYZ) =================== */
FON.regLayers=function(){
  for(var i=OVERS.length-1;i>=0;i--)if(OVERS[i].custom){if(overLayers[OVERS[i].id]){map.removeLayer(overLayers[OVERS[i].id]);delete overLayers[OVERS[i].id]}OVERS.splice(i,1)}
  FON.cl.forEach(function(c){
    var o={id:c.id,g:'Miei livelli',n:c.n,op:.8,custom:true,mk:function(){
      return c.kind==='xyz'?L.tileLayer(c.url,{maxNativeZoom:c.maxz||19,maxZoom:MAXZ,attribution:c.attr||''})
        :wms(c.url,c.layers,{maxNativeZoom:c.maxz||19,format:c.fmt||'image/png',version:c.ver||'1.3.0'},c.attr||'')}};
    OVERS.push(o);
    LEGINFO[c.id]={t:'Livello aggiunto da te ('+(c.kind==='xyz'?'tessere XYZ':'servizio WMS')+'): '+c.url+(c.layers?' · livello «'+c.layers+'»':'')+'. Il servizio non fornisce una legenda all\'app: consulta la pagina del gestore.'};
  });
};
function wmsCaps(url){
  return fetch(url+(url.indexOf('?')<0?'?':'&')+'service=WMS&request=GetCapabilities').then(function(r){if(!r.ok)throw new Error('HTTP '+r.status);return r.text()}).then(function(t){
    var x=new DOMParser().parseFromString(t,'text/xml'),ls=x.getElementsByTagName('Layer'),out=[];
    for(var i=0;i<ls.length&&out.length<300;i++){
      var nm=null,ti='';for(var c=ls[i].firstElementChild;c;c=c.nextElementSibling){if(c.tagName==='Name')nm=c.textContent;if(c.tagName==='Title')ti=c.textContent}
      if(nm)out.push([nm,ti||nm]);
    }
    if(!out.length)throw new Error('nessun livello trovato');
    return out;
  });
}
var PRESETS=[
 ['Ortofoto 1988-89 bianco e nero (Geoportale Nazionale)','https://wms.pcn.minambiente.it/ogc?map=/ms_ogc/WMS_v1.3/raster/ortofoto_bn_8588.map'],
 ['Ortofoto 2006 a colori (Geoportale Nazionale)','https://wms.pcn.minambiente.it/ogc?map=/ms_ogc/WMS_v1.3/raster/ortofoto_colore_06.map'],
 ['Ortofoto 2012 a colori (Geoportale Nazionale)','https://wms.pcn.minambiente.it/ogc?map=/ms_ogc/WMS_v1.3/raster/ortofoto_colore_12.map']
];

/* =================== STRUMENTI DI RICERCA (finestra a schede) =================== */
var HUB={tab:'studi',ctx:{},res:[]};
var HUBT=[['studi','📖','Studi'],['foto','📷','Foto storiche'],['canti','🎵','Canti'],['diario','📔','Diario'],['riep','📊','Riepilogo'],['fonti','🗂','Fonti'],['mappe','🕰','Mappe storiche'],['n2k','🧾','Natura 2000']];
var HUBR={};
function openHub(tab,ctx){
  HUB.tab=tab||'studi';HUB.ctx=ctx||{};
  FON.load().then(function(){
    var foot=HUB.ctx.pid?[mkBtn('‹ Torna al punto','',function(){openDetail(HUB.ctx.pid)})]:[];
    openModal('Ricerca e fonti','<div class="hubtabs" id="hubT"></div><div id="hubC"></div>',foot);
    hubGo(HUB.tab);
  });
}
function hubGo(t){
  HUB.tab=t;
  $('#hubT').innerHTML=HUBT.map(function(x){return '<button class="cat'+(x[0]===t?' on':'')+'" data-t="'+x[0]+'">'+x[1]+' '+x[2]+'</button>'}).join('');
  $$('[data-t]',$('#hubT')).forEach(function(b){b.onclick=function(){hubGo(b.getAttribute('data-t'))}});
  HUBR[t]();
}
function hubCtxLine(){return HUB.ctx.pid?'<div class="mut" style="margin-bottom:6px">Punto: <b>'+esc(ptTitle(HUB.ctx.pid))+'</b></div>':''}
function hubCenter(){var c=HUB.ctx;if(c.lat!=null)return {lat:c.lat,lon:c.lon};var m=map.getCenter();return {lat:m.lat,lon:m.lng}}

/* ---- Studi (OpenAlex) ---- */
HUBR.studi=function(){
  var c=HUB.ctx;
  $('#hubC').innerHTML=hubCtxLine()+'<p class="mut">Articoli, tesi e rapporti scientifici da <b>OpenAlex</b> (gratuito, senza chiave). Serve la rete.</p>'
   +'<div class="row"><input type="search" id="stQ" value="'+esc(c.q||'Avigliana lakes')+'" style="flex:1"><button class="btn f" id="stGo">Cerca</button></div>'
   +'<div class="row" style="margin-top:6px"><select id="stS" style="width:auto"><option value="">più pertinenti</option><option value="publication_year:desc">più recenti</option><option value="cited_by_count:desc">più citati</option></select><label><input type="checkbox" id="stA" '+(c.q?'checked':'')+'> cerca prima con «Avigliana», poi «Piemonte», poi ovunque</label></div><div id="stR" style="margin-top:8px"></div>';
  $('#stGo').onclick=studiGo;$('#stQ').onkeydown=function(e){if(e.key==='Enter')studiGo()};
  if(c.q)studiGo();
};
function oaQuery(q,sort){
  return fj('https://api.openalex.org/works?search='+encodeURIComponent(q)+'&per-page=15'+(sort?'&sort='+sort:'')+'&select=id,title,publication_year,doi,primary_location,authorships,open_access,cited_by_count,type',20000);
}
function studiGo(){
  var q=$('#stQ').value.trim();if(!q)return;var sort=$('#stS').value,tiers=$('#stA').checked?[q+' Avigliana',q+' Piemonte',q]:[q],lab=['con «Avigliana»','con «Piemonte»','ovunque'];
  $('#stR').innerHTML='<span class="mut">cerco…</span>';
  (function next(i){
    oaQuery(tiers[i],sort).then(function(j){
      if(!(j.results||[]).length&&i<tiers.length-1)return next(i+1);
      HUB.res=(j.results||[]).map(function(w){
        var pl=w.primary_location||{},oa=w.open_access||{},au=(w.authorships||[]).map(function(a){return a.author&&a.author.display_name}).filter(Boolean);
        return {title:w.title||'(senza titolo)',year:w.publication_year||'',authors:au.slice(0,3).join(', ')+(au.length>3?' et al.':''),venue:(pl.source&&pl.source.display_name)||'',doi:(w.doi||'').replace('https://doi.org/',''),url:safeUrl(pl.landing_page_url)||(w.doi||''),pdf:safeUrl(pl.pdf_url)||safeUrl(oa.oa_url),oa:!!oa.is_oa,cit:w.cited_by_count||0};
      });
      var tot=(j.meta&&j.meta.count)||HUB.res.length;
      $('#stR').innerHTML='<div class="mut">'+tot+' risultati'+(tiers.length>1?' ('+lab[i]+')':'')+(tot>HUB.res.length?' · mostro i primi '+HUB.res.length:'')+'</div>'+(HUB.res.length?HUB.res.map(function(r,k){
        return '<div class="card"><b>'+esc(r.title)+'</b><div class="mut">'+esc([r.year,r.authors,r.venue].filter(Boolean).join(' · '))+(r.cit?' · citato '+r.cit+' volte':'')+'</div><div class="row" style="margin-top:6px">'+(r.oa?'<span class="tag">accesso libero</span>':'')+aLink(r.pdf,'PDF')+aLink(r.url,'Pagina')+(r.doi?aLink('https://doi.org/'+r.doi,'DOI'):'')+'<button class="btn s" data-sv="'+k+'">💾 Salva</button></div></div>'}).join(''):'<p class="mut">Nessun risultato.</p>');
      $$('[data-sv]',$('#stR')).forEach(function(b){b.onclick=function(){var r=HUB.res[+b.getAttribute('data-sv')];FON.addLib({type:'studio',title:r.title,year:String(r.year),authors:r.authors,venue:r.venue,doi:r.doi,url:r.pdf||r.url||(r.doi?'https://doi.org/'+r.doi:''),pid:HUB.ctx.pid||'',src:'OpenAlex'})}});
    }).catch(function(e){$('#stR').innerHTML='<p class="mut">Ricerca non riuscita: '+esc(e.message)+'</p>'});
  })(0);
}

/* ---- Foto storiche (Commons + Panoramax) ---- */
HUBR.foto=function(){
  var c=hubCenter();
  $('#hubC').innerHTML=hubCtxLine()+'<p class="mut">Foto geolocalizzate '+(HUB.ctx.lat!=null?'vicino a questo punto':'vicino al centro della mappa')+', dalla più vecchia. Fonti: <b>Wikimedia Commons</b> (foto storiche e attuali con licenza libera) e <b>Panoramax</b> (foto stradali collaborative, se presenti).</p>'
   +'<div class="row"><select id="fhR" style="width:auto"><option value="300">entro 300 m</option><option value="1000" selected>entro 1 km</option><option value="3000">entro 3 km</option><option value="8000">entro 8 km</option></select><label>solo prima del <input type="number" id="fhY" placeholder="anno" style="width:90px"></label><button class="btn f" id="fhGo">Cerca</button></div><div id="fhR2" style="margin-top:8px"></div>';
  $('#fhGo').onclick=function(){fotoGo(c)};fotoGo(c);
};
function dateKey(s){var m=/(\d{4})(?:-(\d{2}))?(?:-(\d{2}))?/.exec(s||'');return m?(+m[1])*10000+(+(m[2]||0))*100+(+(m[3]||0)):99999999}
function fotoGo(c){
  var r=+$('#fhR').value,ymax=+$('#fhY').value||0,box=$('#fhR2');box.innerHTML='<span class="mut">cerco…</span>';
  var dlat=r/111000,dlon=r/(111000*Math.cos(c.lat*Math.PI/180));
  var u1='https://commons.wikimedia.org/w/api.php?action=query&format=json&origin=*&generator=geosearch&ggscoord='+c.lat.toFixed(5)+'%7C'+c.lon.toFixed(5)+'&ggsradius='+Math.min(r,10000)+'&ggslimit=40&ggsnamespace=6&prop=imageinfo&iiprop=url%7Cextmetadata&iiurlwidth=800';
  var u2='https://api.panoramax.xyz/api/search?limit=20&bbox='+[c.lon-dlon,c.lat-dlat,c.lon+dlon,c.lat+dlat].map(function(v){return v.toFixed(5)}).join(',');
  Promise.all([
    fj(u1,20000).then(function(j){return Object.keys((j.query&&j.query.pages)||{}).map(function(k){var p=j.query.pages[k],ii=(p.imageinfo||[])[0];if(!ii)return null;var m=ii.extmetadata||{};function mv(n){return m[n]?plain(m[n].value):''}
      var d=mv('DateTimeOriginal')||mv('DateTime');return {src:'Commons',title:p.title.replace(/^File:/,'').replace(/\.\w+$/,''),thumb:ii.thumburl||ii.url,full:ii.thumburl||ii.url,page:ii.descriptionurl,date:d,desc:mv('ImageDescription'),artist:mv('Artist'),lic:mv('LicenseShortName')}}).filter(Boolean)}).catch(function(e){return {err:'Commons: '+e.message}}),
    fj(u2,15000).then(function(j){return (j.features||[]).map(function(f){var a=f.assets||{},pr=f.properties||{};return {src:'Panoramax',title:'Foto stradale',thumb:a.thumb&&a.thumb.href,full:(a.sd&&a.sd.href)||(a.thumb&&a.thumb.href),page:'https://api.panoramax.xyz/#focus=pic&pic='+f.id,date:(pr.datetime||pr['datetimetz']||'').slice(0,10),desc:'',artist:pr['geovisio:producer']||'',lic:pr.license||''}}).filter(function(x){return x.thumb})}).catch(function(e){return {err:'Panoramax: '+e.message}})
  ]).then(function(rs){
    var items=[],errs=[];rs.forEach(function(x){if(x.err)errs.push(x.err);else items=items.concat(x)});
    if(ymax)items=items.filter(function(x){var y=Math.floor(dateKey(x.date)/10000);return y<ymax});
    items.sort(function(a,b){return dateKey(a.date)-dateKey(b.date)});HUB.res=items;
    box.innerHTML=(errs.length?'<div class="mut" style="color:var(--warn)">'+esc(errs.join(' · '))+'</div>':'')+'<div class="mut">'+items.length+' foto</div>'+(items.length?'<div class="gal">'+items.map(function(x,k){
      return '<figure><img data-pm="'+k+'" src="'+esc(x.thumb)+'" alt="" loading="lazy"><figcaption><b>'+esc(x.date?x.date.slice(0,10):'data ignota')+'</b> · '+esc(x.title)+'<br><span class="mut">'+esc((x.desc||'').slice(0,140))+'</span><br><span class="mut">'+esc([x.src,x.artist&&plain(x.artist).slice(0,40),x.lic].filter(Boolean).join(' · '))+'</span><br>'+aLink(x.page,'Pagina originale')+' <button class="btn s" data-sf="'+k+'">💾</button></figcaption></figure>'}).join('')+'</div>':'<p class="mut">Nessuna foto in questo raggio.</p>');
    $$('img[data-pm]',box).forEach(function(im){im.onclick=function(){view(im.src)}});
    $$('[data-sf]',box).forEach(function(b){b.onclick=function(){var x=HUB.res[+b.getAttribute('data-sf')];FON.addLib({type:'foto',title:x.title,year:(x.date||'').slice(0,4),authors:plain(x.artist||''),venue:x.src,url:x.page,note:(x.desc||'').slice(0,300)+(x.lic?' · '+x.lic:''),pid:HUB.ctx.pid||'',src:x.src})}});
  });
}

/* ---- Canti (Xeno-canto) ---- */
HUBR.canti=function(){
  var c=HUB.ctx,key=SET.xckey||'';
  $('#hubC').innerHTML=hubCtxLine()+'<p class="mut">Registrazioni dei canti da <b>Xeno-canto</b>. Serve una chiave gratuita: ti iscrivi su <a href="https://xeno-canto.org/account/register" target="_blank" rel="noopener">xeno-canto.org</a> e la trovi nel tuo profilo.</p>'
   +'<label class="l">La tua chiave Xeno-canto</label><div class="row"><input type="password" id="xcK" value="'+esc(key)+'" autocomplete="off" style="flex:1"><button class="btn s" id="xcS">Salva</button></div>'
   +'<label class="l">Specie (nome scientifico)</label><div class="row"><input type="search" id="xcQ" value="'+esc(c.q||'')+'" placeholder="per esempio Alcedo atthis" style="flex:1"><button class="btn f" id="xcGo">Cerca</button></div>'
   +'<label><input type="checkbox" id="xcIt" checked> preferisci registrazioni in Italia</label><div id="xcR" style="margin-top:8px"></div>';
  $('#xcS').onclick=function(){SET.xckey=$('#xcK').value.trim();saveSet();toast('Chiave salvata')};
  $('#xcGo').onclick=cantiGo;$('#xcQ').onkeydown=function(e){if(e.key==='Enter')cantiGo()};
  if(c.q&&key)cantiGo();
};
function xcFetch(q,key){return fj('https://xeno-canto.org/api/3/recordings?query='+encodeURIComponent(q)+'&per_page=20&key='+encodeURIComponent(key),20000)}
function cantiGo(){
  var sp=$('#xcQ').value.trim().replace(/\s+/g,' ');if(!sp)return;
  var key=($('#xcK').value||'').trim();if(!key){$('#xcR').innerHTML='<p class="mut" style="color:var(--warn)">Inserisci prima la chiave Xeno-canto.</p>';return}
  if(key!==SET.xckey){SET.xckey=key;saveSet()}
  var q1='sp:"'+sp+'"',tries=$('#xcIt').checked?[q1+' cnt:italy',q1]:[q1];
  $('#xcR').innerHTML='<span class="mut">cerco…</span>';
  (function next(i){
    xcFetch(tries[i],key).then(function(j){
      var rs=j.recordings||[];
      if(!rs.length&&i<tries.length-1)return next(i+1);
      var Q={A:0,B:1,C:2,D:3,E:4};rs.sort(function(a,b){return (Q[a.q]==null?9:Q[a.q])-(Q[b.q]==null?9:Q[b.q])});HUB.res=rs;
      $('#xcR').innerHTML='<div class="mut">'+(j.numRecordings||rs.length)+' registrazioni'+(i>0||tries.length===1?' (ovunque)':' (Italia)')+' · le migliori per prime</div>'+(rs.length?rs.map(function(r,k){
        var f=(r.file||'').replace(/^\/\//,'https://');
        return '<div class="card"><b>'+esc(r.en||r.sp||sp)+'</b> <span class="mut">'+esc(r.type||'')+' · qualità '+esc(r.q||'?')+' · '+esc(r.length||'')+'</span><div class="mut">'+esc([r.loc,r.cnt,r.date].filter(Boolean).join(' · '))+'</div>'+(safeUrl(f)?'<audio controls preload="none" src="'+esc(f)+'" style="width:100%;margin-top:6px"></audio>':'')+'<div class="mut">© '+esc(r.rec||'')+' · '+aLink((r.lic||'').replace(/^\/\//,'https://'),'licenza')+' · '+aLink((r.url||'').replace(/^\/\//,'https://'),'pagina Xeno-canto')+' <button class="btn s" data-sx="'+k+'">💾</button></div></div>'}).join(''):'<p class="mut">Nessuna registrazione per «'+esc(sp)+'».</p>');
      $$('[data-sx]',$('#xcR')).forEach(function(b){b.onclick=function(){var r=HUB.res[+b.getAttribute('data-sx')];FON.addLib({type:'canto',title:(r.en||r.sp)+' – '+(r.type||'canto')+' ('+(r.loc||'')+')',year:(r.date||'').slice(0,4),authors:r.rec||'',venue:'Xeno-canto',url:(r.url||'').replace(/^\/\//,'https://'),pid:HUB.ctx.pid||'',src:'Xeno-canto'})}});
    }).catch(function(e){$('#xcR').innerHTML='<p class="mut" style="color:var(--warn)">Ricerca non riuscita: '+esc(e.message)+(/40[13]/.test(e.message)?' (controlla la chiave)':'')+'</p>'});
  })(0);
}

/* ---- Diario delle stagioni ---- */
var DIA_LIV=['','molto basso','basso','normale','alto','in piena'],DIA_ASP=['','limpida','torbida','verdastra (alghe)','fioritura algale','schiuma o pellicola','moria di pesci'],DIA_GHI=['','assente','parziale','totale'];
function opts(a,v){return a.map(function(x){return '<option'+(x===v?' selected':'')+'>'+esc(x)+'</option>'}).join('')}
function spark(arr,col,lab,unit){
  if(arr.length<2)return '';var xs=arr.map(function(a){return a[0]}),ys=arr.map(function(a){return a[1]}),x0=Math.min.apply(0,xs),x1=Math.max.apply(0,xs),y0=Math.min.apply(0,ys),y1=Math.max.apply(0,ys);
  if(y1===y0){y1=y0+1}if(x1===x0)x1=x0+1;
  var pts=arr.map(function(a){return (6+(a[0]-x0)/(x1-x0)*268).toFixed(1)+','+(54-(a[1]-y0)/(y1-y0)*46).toFixed(1)}).join(' ');
  return '<div class="card"><b>'+esc(lab)+'</b> <span class="mut">da '+y0+' a '+y1+' '+unit+' · '+arr.length+' misure</span><svg viewBox="0 0 280 60" width="100%" height="60"><polyline points="'+pts+'" fill="none" stroke="'+col+'" stroke-width="2"/>'+arr.map(function(a){return '<circle cx="'+(6+(a[0]-x0)/(x1-x0)*268).toFixed(1)+'" cy="'+(54-(a[1]-y0)/(y1-y0)*46).toFixed(1)+'" r="2.5" fill="'+col+'"/>'}).join('')+'</svg></div>';
}
HUBR.diario=function(){
  var c=HUB.ctx,h=hubCtxLine()+'<p class="mut">Una riga ogni volta che passi dal lago: dopo un anno hai la tua serie di dati (livello, trasparenza, temperatura, fioriture algali, ghiaccio).</p>'
   +'<div class="card"><label class="l">Data e ora</label><input type="datetime-local" id="dgW" value="'+localInput()+'">'
   +'<div class="row" style="margin-top:6px"><div style="flex:1"><label class="l">Livello dell\'acqua</label><select id="dgL">'+opts(DIA_LIV)+'</select></div><div style="flex:1"><label class="l">Aspetto</label><select id="dgA">'+opts(DIA_ASP)+'</select></div></div>'
   +'<div class="row" style="margin-top:6px"><div style="flex:1"><label class="l">Trasparenza (cm)</label><input type="number" id="dgT" inputmode="decimal" placeholder="disco di Secchi"></div><div style="flex:1"><label class="l">Acqua (°C)</label><input type="number" id="dgC" inputmode="decimal" step="0.1"></div><div style="flex:1"><label class="l">Ghiaccio</label><select id="dgG">'+opts(DIA_GHI)+'</select></div></div>'
   +'<label class="l">Note</label><textarea id="dgN" rows="2" placeholder="cosa hai visto, sentito, cambiato rispetto all\'ultima volta"></textarea>'
   +'<div class="row" style="margin-top:8px"><button class="btn s" id="dgM">🌤 Aggiungi il meteo di adesso</button><span class="mut" id="dgMt"></span></div>'
   +'<div class="row" style="margin-top:8px"><button class="btn f" id="dgS">Salva nel diario</button></div></div>'
   +'<h3>Diario ('+FON.dia.length+')</h3>';
  var d=FON.dia.slice().sort(function(a,b){return b.when.localeCompare(a.when)});
  if(d.length){
    h+=spark(FON.dia.filter(function(e){return e.trasp!==''&&e.trasp!=null}).map(function(e){return [new Date(e.when).getTime(),+e.trasp]}).sort(function(a,b){return a[0]-b[0]}),'#4fc3f7','Trasparenza','cm')
      +spark(FON.dia.filter(function(e){return e.temp!==''&&e.temp!=null}).map(function(e){return [new Date(e.when).getTime(),+e.temp]}).sort(function(a,b){return a[0]-b[0]}),'#ffb74d','Temperatura dell\'acqua','°C');
    h+='<div class="row"><button class="btn s" id="dgX">📄 Esporta CSV</button></div>';
  }
  h+=d.map(function(e){return '<div class="card"><div class="row"><b style="flex:1">'+esc(fmtDate(e.when))+'</b><button class="btn s" data-dr="'+ldate(e.when)+'">📊</button><button class="btn s" data-dd="'+e.id+'">✕</button></div><div class="mut">'+esc([e.liv&&'livello '+e.liv,e.asp,e.trasp!==''&&e.trasp!=null&&'trasparenza '+e.trasp+' cm',e.temp!==''&&e.temp!=null&&'acqua '+e.temp+' °C',e.ghi&&e.ghi!=='assente'&&'ghiaccio '+e.ghi].filter(Boolean).join(' · '))+'</div>'+(e.meteo?'<div class="mut">'+esc(e.meteo)+'</div>':'')+(e.note?'<div style="white-space:pre-wrap">'+esc(e.note)+'</div>':'')+(e.pid?'<div class="mut">punto: '+esc(ptTitle(e.pid))+'</div>':'')+'</div>'}).join('');
  $('#hubC').innerHTML=h;
  var meteo='';
  $('#dgM').onclick=function(){
    var q=hubCenter();$('#dgMt').textContent='…';
    fj('https://api.open-meteo.com/v1/forecast?latitude='+q.lat.toFixed(4)+'&longitude='+q.lon.toFixed(4)+'&current=temperature_2m,precipitation,cloud_cover,wind_speed_10m&timezone=auto',12000).then(function(j){
      var m=j.current||{};meteo=(m.temperature_2m!=null?m.temperature_2m+' °C':'')+(m.cloud_cover!=null?', nuvole '+m.cloud_cover+'%':'')+(m.wind_speed_10m!=null?', vento '+m.wind_speed_10m+' km/h':'')+(m.precipitation!=null?', pioggia '+m.precipitation+' mm':'');$('#dgMt').textContent=meteo||'nessun dato';
    }).catch(function(e){$('#dgMt').textContent='non disponibile ('+e.message+')'});
  };
  $('#dgS').onclick=function(){
    var w=$('#dgW').value;if(!w)return toast('Metti la data');
    var e={id:uid(),when:new Date(w).toISOString(),liv:$('#dgL').value,asp:$('#dgA').value,trasp:$('#dgT').value,temp:$('#dgC').value,ghi:$('#dgG').value,note:$('#dgN').value.trim(),meteo:meteo,pid:c.pid||''};
    if(!e.liv&&!e.asp&&e.trasp===''&&e.temp===''&&!e.ghi&&!e.note&&!e.meteo)return toast('Compila almeno un campo');
    FON.dia.push(e);FON.saveDia().then(function(){toast('📔 Salvato nel diario');HUBR.diario()});
  };
  $$('[data-dd]').forEach(function(b){b.onclick=function(){if(confirm('Eliminare questa riga del diario?')){FON.dia=FON.dia.filter(function(x){return x.id!==b.getAttribute('data-dd')});FON.saveDia().then(HUBR.diario)}}});
  if($('#dgX'))$('#dgX').onclick=diarioCSV;
  $$('[data-dr]').forEach(function(b){b.onclick=function(){HUB.ctx.day=b.getAttribute('data-dr');hubGo('riep')}});
};
function diarioRows(){return [['data','livello','aspetto','trasparenza_cm','acqua_C','ghiaccio','meteo','note','punto']].concat(FON.dia.slice().sort(function(a,b){return a.when.localeCompare(b.when)}).map(function(e){return [e.when,e.liv,e.asp,e.trasp,e.temp,e.ghi,e.meteo,e.note,ptTitle(e.pid)]}))}
function diarioCSV(){saveCSV(diarioRows(),'diario_lago_piccolo_'+stamp()+'.csv')}

/* ---- Biblioteca delle fonti ---- */
var LIBK={studio:'📖 studio',foto:'📷 foto',canto:'🎵 canto',documento:'📄 documento',link:'🔗 link',altro:'• altro'};
HUBR.fonti=function(){
  var f=HUB.ctx.f||'';
  var h=hubCtxLine()+'<p class="mut">Tutto ciò che salvi dagli strumenti qui sopra, più le fonti già verificate. Si esporta insieme al backup.</p><div class="row"><input type="search" id="lbQ" placeholder="Filtra…" value="'+esc(f)+'" style="flex:1"><button class="btn s" id="lbAdd">+ Aggiungi</button></div><div id="lbF"></div><div id="lbL"></div><div class="row" style="margin-top:8px"><button class="btn s" id="lbC">📄 CSV</button><button class="btn s" id="lbM">📝 Bibliografia (testo)</button></div>';
  $('#hubC').innerHTML=h;
  function draw(){
    var q=$('#lbQ').value.toLowerCase(),pid=HUB.ctx.pid;HUB.ctx.f=$('#lbQ').value;
    var a=FON.lib.filter(function(x){return (!pid||x.pid===pid)&&(!q||(x.title+' '+x.authors+' '+x.note+' '+x.type).toLowerCase().indexOf(q)>=0)});
    $('#lbL').innerHTML=(pid?'<div class="mut">Solo le fonti legate a questo punto ('+a.length+')</div>':'<div class="mut">'+a.length+' di '+FON.lib.length+'</div>')+a.map(function(x){
      return '<div class="card"><div class="row"><span class="tag">'+esc(LIBK[x.type]||LIBK.altro)+'</span><b style="flex:1">'+esc(x.title)+'</b></div><div class="mut">'+esc([x.year,x.authors,x.venue].filter(Boolean).join(' · '))+'</div>'+(x.note?'<div style="white-space:pre-wrap;font-size:13px">'+esc(x.note)+'</div>':'')+(x.pid?'<div class="mut">punto: '+esc(ptTitle(x.pid))+'</div>':'')+'<div class="row" style="margin-top:6px">'+aLink(x.url,'Apri')+'<button class="btn s" data-ln="'+x.id+'">✎ Nota</button><button class="btn s" data-ld="'+x.id+'">✕</button></div></div>'}).join('');
    $$('[data-ln]',$('#lbL')).forEach(function(b){b.onclick=function(){var x=FON.lib.filter(function(y){return y.id===b.getAttribute('data-ln')})[0],n=prompt('Nota',x.note||'');if(n!=null){x.note=n;FON.saveLib().then(draw)}}});
    $$('[data-ld]',$('#lbL')).forEach(function(b){b.onclick=function(){if(confirm('Togliere dalla biblioteca?')){FON.lib=FON.lib.filter(function(y){return y.id!==b.getAttribute('data-ld')});FON.saveLib().then(draw)}}});
  }
  draw();$('#lbQ').oninput=draw;
  $('#lbAdd').onclick=function(){
    $('#lbF').innerHTML='<div class="card"><label class="l">Titolo</label><input type="text" id="lfT"><label class="l">Indirizzo web (facoltativo)</label><input type="text" id="lfU" placeholder="https://…"><label class="l">Autore e anno (facoltativo)</label><input type="text" id="lfA"><label class="l">Nota</label><textarea id="lfN" rows="2"></textarea><div class="row" style="margin-top:8px"><button class="btn f" id="lfS">Salva</button><button class="btn s" id="lfX">Annulla</button></div></div>';
    $('#lfX').onclick=function(){$('#lbF').innerHTML=''};
    $('#lfS').onclick=function(){var t=$('#lfT').value.trim();if(!t)return toast('Metti un titolo');var u=$('#lfU').value.trim();if(u&&!safeUrl(u))u='https://'+u;
      FON.addLib({type:u?'link':'altro',title:t,url:u,authors:$('#lfA').value.trim(),note:$('#lfN').value.trim(),pid:HUB.ctx.pid||'',src:'manuale'}).then(function(){$('#lbF').innerHTML='';draw()})};
  };
  $('#lbC').onclick=function(){saveCSV([['tipo','titolo','autori','anno','sede','doi','indirizzo','nota','punto','aggiunta']].concat(FON.lib.map(function(x){return [x.type,x.title,x.authors,x.year,x.venue,x.doi,x.url,x.note,ptTitle(x.pid),x.added]})),'fonti_lago_piccolo_'+stamp()+'.csv')};
  $('#lbM').onclick=function(){shareOrDownload(new Blob([libText()],{type:'text/plain'}),'bibliografia_lago_piccolo_'+stamp()+'.txt')};
};
function libText(){return 'Bibliografia - Lago Piccolo di Avigliana\r\n'+BRAND+'\r\n\r\n'+FON.lib.slice().sort(function(a,b){return String(a.year||'').localeCompare(String(b.year||''))}).map(function(x){return '- '+[x.authors,x.year&&'('+x.year+')',x.title,x.venue,x.doi?'doi:'+x.doi:x.url].filter(Boolean).join('. ')+(x.note?'\r\n    '+x.note.replace(/\s*\n\s*/g,' '):'')}).join('\r\n')+'\r\n'}

/* ---- Mappe storiche e livelli personalizzati ---- */
HUBR.mappe=function(){
  var h='<p class="mut">Per vedere com\'era il lago nel tempo.</p>'
   +'<div class="card"><b>🕰 Macchina del tempo</b><div class="mut">Immagini da satellite di anni diversi (archivio Esri Wayback, dal 2014 a oggi). Si apre una barra sulla mappa: scorri la data e sfuma tra passato e presente. Puoi aprirla anche dal pulsante 🕰 sulla mappa.</div><div class="row" style="margin-top:8px"><button class="btn f" id="mpT">Apri la macchina del tempo</button></div></div>'
   +'<div class="card"><b>🗺 Aggiungi un livello</b><div class="mut">Per foto aeree più vecchie (1954-1989) e carte storiche: incolla l\'indirizzo di un servizio WMS (o di tessere XYZ, con {z}/{x}/{y}). Il livello poi compare in «Livelli» → «Miei livelli».</div>'
   +'<label class="l">Esempi (indirizzi da verificare: se il servizio non risponde, cambia o cancella)</label><div class="row">'+PRESETS.map(function(p,i){return '<button class="btn s" data-pr="'+i+'">'+esc(p[0])+'</button>'}).join('')+'</div>'
   +'<label class="l">Nome</label><input type="text" id="clN" placeholder="per esempio Ortofoto 1988"><label class="l">Indirizzo del servizio</label><input type="text" id="clU" placeholder="https://…/wms?"><div class="row" style="margin-top:6px"><button class="btn s" id="clR">Leggi i livelli disponibili</button></div><div id="clL" class="sug" style="display:none"></div>'
   +'<label class="l">Nome del livello (WMS) — lascia vuoto per tessere XYZ</label><input type="text" id="clY"><div class="row" style="margin-top:8px"><button class="btn f" id="clA">Aggiungi</button></div></div>'
   +'<h3>Miei livelli ('+FON.cl.length+')</h3>'+(FON.cl.map(function(c){return '<div class="card"><div class="row"><b style="flex:1">'+esc(c.n)+'</b><button class="btn s" data-cd="'+c.id+'">✕</button></div><div class="mut" style="word-break:break-all">'+esc(c.kind==='xyz'?c.url:c.url+' · '+c.layers)+'</div></div>'}).join('')||'<p class="mut">Nessuno.</p>');
  $('#hubC').innerHTML=h;
  $('#mpT').onclick=function(){closeModal();TM.open()};
  $$('[data-pr]').forEach(function(b){b.onclick=function(){var p=PRESETS[+b.getAttribute('data-pr')];$('#clN').value=p[0].replace(/ \(.*/,'');$('#clU').value=p[1]}});
  $('#clR').onclick=function(){
    var u=$('#clU').value.trim(),box=$('#clL');if(!safeUrl(u))return toast('Incolla prima l\'indirizzo');
    box.style.display='block';box.innerHTML='<div class="mut" style="padding:8px">leggo…</div>';
    wmsCaps(u).then(function(ls){box.innerHTML=ls.map(function(l){return '<div class="item" data-ly="'+esc(l[0])+'" style="cursor:pointer"><span class="tx"><b>'+esc(l[1])+'</b><small>'+esc(l[0])+'</small></span></div>'}).join('');$$('[data-ly]',box).forEach(function(d){d.onclick=function(){$('#clY').value=d.getAttribute('data-ly');if(!$('#clN').value)$('#clN').value=$('b',d).textContent;box.style.display='none'}})})
    .catch(function(e){box.innerHTML='<div class="mut" style="padding:8px;color:var(--warn)">Non riesco a leggere l\'elenco ('+esc(e.message)+'). Il servizio può vietare la lettura dall\'app: scrivi tu il nome del livello, lo trovi nella pagina del gestore.</div>'});
  };
  $('#clA').onclick=function(){
    var n=$('#clN').value.trim(),u=$('#clU').value.trim(),ly=$('#clY').value.trim();
    if(!n||!safeUrl(u))return toast('Servono nome e indirizzo');
    var xyz=!ly||/\{z\}/.test(u);if(xyz&&!/\{z\}/.test(u))return toast('Per le tessere XYZ l\'indirizzo deve contenere {z}/{x}/{y}');
    FON.cl.push({id:'cl'+uid(),n:n,kind:xyz?'xyz':'wms',url:u,layers:ly,maxz:19});
    FON.saveCl().then(function(){FON.regLayers();toast('Livello aggiunto: lo trovi in «Livelli»');HUBR.mappe()});
  };
  $$('[data-cd]').forEach(function(b){b.onclick=function(){if(confirm('Togliere questo livello?')){var id=b.getAttribute('data-cd');delete overOn[id];FON.cl=FON.cl.filter(function(c){return c.id!==id});FON.saveCl().then(function(){FON.regLayers();HUBR.mappe()})}}});
};

/* ---- Natura 2000 ---- */
HUBR.n2k=function(){
  if(typeof N2000_SP==='undefined'){$('#hubC').innerHTML='<p class="mut">Dati non disponibili.</p>';return}
  var seen=seenSci(),tot={A:0,B:0},got={A:0,B:0},miss=[];
  N2000_SP.forEach(function(r){var k=r[1].toLowerCase().split(' ').slice(0,2).join(' '),ok=seen[k]||CHECK[r[1]];tot[r[4]]++;if(ok)got[r[4]]++;else if(r[4]==='A')miss.push(r)});
  var h='<p class="mut">Confronto con il formulario ufficiale Natura 2000 del sito IT1110007 «Laghi di Avigliana» (Regione Piemonte). I nomi italiani sono indicativi.</p>'
   +'<div class="card"><b>Specie principali del sito: '+got.A+' / '+tot.A+' osservate da te</b><div class="prog"><i style="width:'+Math.round(got.A/tot.A*100)+'%"></i></div><div class="mut">Altre specie importanti: '+got.B+' / '+tot.B+'. Tutte sono nella checklist del Dossier (spunta automatica quando le catalogli con il nome scientifico).</div><div class="row" style="margin-top:8px"><button class="btn s" id="nkD">📚 Apri la checklist</button><button class="btn s" id="nkL">🗺 Mostra habitat sulla mappa</button></div></div>'
   +'<h3>Ancora da trovare ('+miss.length+')</h3>'+miss.map(function(r,i){return '<div class="card"><div class="row"><div style="flex:1"><b>'+esc(r[2])+'</b> <i>'+esc(r[1])+'</i><div class="mut">'+esc(r[0])+' · '+esc(r[3])+'</div></div><button class="btn s" data-ns="'+i+'">📖</button>'+(/^Uccelli|^Aironi|^Rapaci|^Canneto|^Altri uccelli/.test(r[0])?'<button class="btn s" data-nc="'+i+'">🎵</button>':'')+'</div></div>'}).join('')
   +'<h3>Habitat dichiarati ('+N2000_HAB.length+')</h3>'+N2000_HAB.map(function(x){return '<div class="card"><b>'+esc(x[0])+'</b> <span class="mut">'+esc(x[1])+'</span></div>'}).join('')
   +'<p class="mut">Fonte: '+aLink('https://www.regione.piemonte.it/giscartografia/Parchi/schede/IT1110007.pdf','Formulario Natura 2000 IT1110007')+'</p>';
  $('#hubC').innerHTML=h;
  $('#nkD').onclick=function(){closeModal();go('dos')};
  $('#nkL').onclick=function(){var o=OVERS.filter(function(x){return x.id==='hab'})[0];if(o)setOver(o,true);closeModal();go('map');map.setView(HOME,15)};
  $$('[data-ns]').forEach(function(b){b.onclick=function(){HUB.ctx={q:miss[+b.getAttribute('data-ns')][1]};hubGo('studi')}});
  $$('[data-nc]').forEach(function(b){b.onclick=function(){HUB.ctx={q:miss[+b.getAttribute('data-nc')][1]};hubGo('canti')}});
};

/* =================== AGGANCI: scheda del punto e pagina Altro =================== */
FON.detailBtns=function(p){
  return '<h3>Ricerca</h3><div class="row"><button class="btn s" id="fnS">📖 Cerca studi</button>'+(p.sp&&p.sp.sci?'<button class="btn s" id="fnC">🎵 Canti</button>':'')+'<button class="btn s" id="fnF">📷 Foto storiche</button><button class="btn s" id="fnD">📔 Diario</button><button class="btn s" id="fnL">🗂 Fonti</button></div>';
};
FON.bindDetail=function(p){
  var q=(p.sp&&p.sp.sci)||p.title||'',base={pid:p.id,lat:p.lat,lon:p.lon};
  function go2(tab,extra){return function(){openHub(tab,Object.assign({},base,extra))}}
  if($('#fnS'))$('#fnS').onclick=go2('studi',{q:q});
  if($('#fnC'))$('#fnC').onclick=go2('canti',{q:p.sp.sci});
  if($('#fnF'))$('#fnF').onclick=go2('foto');
  if($('#fnD'))$('#fnD').onclick=go2('diario');
  if($('#fnL'))$('#fnL').onclick=go2('fonti');
};
FON.altCard=function(){
  return '<h3>Ricerca e fonti</h3><div class="card"><div class="mut">Studi scientifici, foto storiche, canti degli uccelli, diario delle stagioni, biblioteca delle fonti, mappe del passato e confronto con il sito Natura 2000.</div><div class="row" style="margin-top:8px">'+HUBT.map(function(x){return '<button class="btn s" data-hub="'+x[0]+'">'+x[1]+' '+x[2]+'</button>'}).join('')+'</div></div>';
};
FON.bindAlt=function(){$$('[data-hub]').forEach(function(b){b.onclick=function(){openHub(b.getAttribute('data-hub'),{})}})};

/* =================== RIEPILOGHI (giorno e totale) =================== */
function ldate(iso){var d=new Date(iso);return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())}
function itDay(k){var d=new Date(k+'T12:00:00');return ['domenica','lunedì','martedì','mercoledì','giovedì','venerdì','sabato'][d.getDay()]+' '+d.getDate()+'/'+pad(d.getMonth()+1)+'/'+d.getFullYear()}
function myPoints(){return POINTS.filter(function(p){return !p.rk||p.note||(p.media&&p.media.length)})}
function sciKey(p){return p.sp&&p.sp.sci?p.sp.sci.toLowerCase().split(' ').slice(0,2).join(' '):''}
function nameOf(p){return (p.sp&&(p.sp.com||p.sp.sci))||p.title||'(senza titolo)'}
function dayData(k){
  var pts=myPoints(),first={};
  pts.slice().sort(function(a,b){return (a.when||'').localeCompare(b.when||'')}).forEach(function(p){var s=sciKey(p);if(s&&!first[s])first[s]=ldate(p.when)});
  var dp=pts.filter(function(p){return ldate(p.when)===k}).sort(function(a,b){return a.when.localeCompare(b.when)});
  var tr=TRACKS.filter(function(t){return ldate(t.start)===k}),km=0,ms=0;tr.forEach(function(t){var q=trkStats(t);km+=q.d;ms+=q.t});
  var sp={},cat={},ph=0,au=0,nw=[];
  dp.forEach(function(p){cat[p.cat]=(cat[p.cat]||0)+1;(p.media||[]).forEach(function(m){if(m.type==='photo')ph++;else if(m.type==='audio')au++});var s=sciKey(p);if(s){sp[s]=nameOf(p);if(first[s]===k&&nw.indexOf(nameOf(p))<0)nw.push(nameOf(p))}});
  return {k:k,dia:FON.dia.filter(function(e){return ldate(e.when)===k}),pts:dp,tr:tr,km:km,ms:ms,sp:Object.keys(sp).map(function(x){return sp[x]}),cat:cat,ph:ph,au:au,nw:nw};
}
function catList(c){return Object.keys(c).map(function(id){return c[id]+' '+CAT(id).n.toLowerCase()}).join(', ')}
function dayText(k){
  var d=dayData(k),L=['RIEPILOGO DEL '+itDay(k).toUpperCase(),BRAND,''];
  d.dia.forEach(function(e){L.push('Diario ('+fmtDate(e.when).slice(-5)+'): '+[e.liv&&'livello '+e.liv,e.asp,e.trasp!==''&&e.trasp!=null&&'trasparenza '+e.trasp+' cm',e.temp!==''&&e.temp!=null&&'acqua '+e.temp+' °C',e.ghi&&e.ghi!=='assente'&&'ghiaccio '+e.ghi].filter(Boolean).join(', '));if(e.meteo)L.push('  Meteo: '+e.meteo);if(e.note)L.push('  Note: '+e.note)});
  L.push('Percorso: '+(d.tr.length?d.tr.length+(d.tr.length>1?' tracce, ':' traccia, ')+fmtDist(d.km)+', '+fmtDur(d.ms):'nessuna traccia registrata'));
  L.push('Punti catalogati: '+d.pts.length+(d.pts.length?' ('+catList(d.cat)+')':'')+' · foto '+d.ph+' · audio '+d.au);
  if(d.sp.length)L.push('Specie viste ('+d.sp.length+'): '+d.sp.join(', '));
  if(d.nw.length)L.push('Prime osservazioni nel tuo catalogo: '+d.nw.join(', '));
  if(d.pts.length){L.push('','Elenco dei punti:');d.pts.forEach(function(p){L.push('- '+fmtDate(p.when).slice(-5)+' '+CAT(p.cat).n+': '+nameOf(p))})}
  return L.join('\r\n')+'\r\n';
}
function totData(){
  var pts=myPoints(),days={},sp={},cat={},ph=0,au=0,km=0,ms=0;
  pts.forEach(function(p){days[ldate(p.when)]=1;cat[p.cat]=(cat[p.cat]||0)+1;(p.media||[]).forEach(function(m){if(m.type==='photo')ph++;else if(m.type==='audio')au++});var s=sciKey(p);if(s)sp[s]=(sp[s]||{n:0,name:nameOf(p)}),sp[s].n++});
  TRACKS.forEach(function(t){days[ldate(t.start)]=1;var q=trkStats(t);km+=q.d;ms+=q.t});
  FON.dia.forEach(function(e){days[ldate(e.when)]=1});
  var ks=Object.keys(days).sort(),mon={};ks.forEach(function(k){var m=k.slice(0,7);mon[m]=(mon[m]||0)+1});
  var tr=FON.dia.filter(function(e){return e.trasp!==''&&e.trasp!=null}).map(function(e){return +e.trasp}),tp=FON.dia.filter(function(e){return e.temp!==''&&e.temp!=null}).map(function(e){return +e.temp});
  var n2={A:0,B:0};if(typeof N2000_SP!=='undefined')N2000_SP.forEach(function(r){var k=r[1].toLowerCase().split(' ').slice(0,2).join(' ');if(sp[k]||CHECK[r[1]])n2[r[4]]++});
  var top=Object.keys(sp).map(function(k){return sp[k]}).sort(function(a,b){return b.n-a.n}).slice(0,8);
  return {days:ks,mon:mon,pts:pts.length,cat:cat,ph:ph,au:au,km:km,ms:ms,nsp:Object.keys(sp).length,top:top,ntr:TRACKS.length,dia:FON.dia.length,tr:tr,tp:tp,n2:n2};
}
function rng(a,u){return a.length?Math.min.apply(0,a)+'–'+Math.max.apply(0,a)+' '+u+' ('+a.length+' misure)':'nessuna misura'}
function totText(){
  var t=totData(),L=['RIEPILOGO TOTALE · LAGO PICCOLO DI AVIGLIANA',BRAND,''];
  L.push('Uscite (giorni con attività): '+t.days.length+(t.days.length?' · dal '+itDay(t.days[0])+' al '+itDay(t.days[t.days.length-1]):''));
  L.push('Punti catalogati: '+t.pts+(t.pts?' ('+catList(t.cat)+')':'')+' · foto '+t.ph+' · audio '+t.au);
  L.push('Specie diverse nel catalogo: '+t.nsp+(typeof N2000_SP!=='undefined'?' · del sito Natura 2000: principali '+t.n2.A+' su '+N2000_SP.filter(function(r){return r[4]==='A'}).length+', importanti '+t.n2.B+' su '+N2000_SP.filter(function(r){return r[4]==='B'}).length:''));
  L.push('Tracce: '+t.ntr+' · '+fmtDist(t.km)+' · '+fmtDur(t.ms));
  L.push('Diario: '+t.dia+' righe · trasparenza '+rng(t.tr,'cm')+' · acqua '+rng(t.tp,'°C'));
  if(t.top.length)L.push('Più osservate: '+t.top.map(function(x){return x.name+' ('+x.n+')'}).join(', '));
  var m=Object.keys(t.mon).sort();if(m.length){L.push('','Uscite per mese:');m.forEach(function(k){L.push('- '+k+': '+t.mon[k])})}
  if(t.days.length){L.push('','Giorni di uscita: '+t.days.map(function(k){return k.split('-').reverse().join('/')}).join(', '))}
  return L.join('\r\n')+'\r\n';
}
HUBR.riep=function(){
  var k=HUB.ctx.day||ldate(new Date().toISOString()),mode=HUB.ctx.rmode||'day';
  var h='<p class="mut">Il riepilogo unisce diario, punti catalogati e tracce della giornata scelta (oppure di tutto il lavoro svolto).</p><div class="row"><button class="btn s'+(mode==='day'?' f':'')+'" id="rpD">Riepilogo del giorno</button><button class="btn s'+(mode==='tot'?' f':'')+'" id="rpT">Riepilogo totale</button></div>';
  if(mode==='day'){
    var all={};myPoints().forEach(function(p){all[ldate(p.when)]=1});TRACKS.forEach(function(t){all[ldate(t.start)]=1});FON.dia.forEach(function(e){all[ldate(e.when)]=1});
    var ks=Object.keys(all).sort().reverse();
    h+='<div class="row" style="margin-top:8px"><input type="date" id="rpK" value="'+k+'" style="flex:1"><button class="btn s" id="rpP">‹</button><button class="btn s" id="rpN">›</button></div>'+(ks.length?'<div class="mut" style="margin-top:4px">Giorni con attività: '+ks.slice(0,12).map(function(x){return '<a href="#" data-rk="'+x+'">'+x.split('-').reverse().slice(0,2).join('/')+'</a>'}).join(' · ')+(ks.length>12?' …':'')+'</div>':'');
    var d=dayData(k);
    h+='<div class="card"><b>'+esc(itDay(k))+'</b>'
     +(d.dia.length?d.dia.map(function(e){return '<div class="mut" style="margin-top:4px">📔 '+esc(fmtDate(e.when).slice(-5)+' · '+[e.liv&&'livello '+e.liv,e.asp,e.trasp!==''&&e.trasp!=null&&'trasparenza '+e.trasp+' cm',e.temp!==''&&e.temp!=null&&'acqua '+e.temp+' °C'].filter(Boolean).join(', '))+(e.note?'<br>'+esc(e.note):'')+(e.meteo?'<br>'+esc(e.meteo):'')+'</div>'}).join(''):'<div class="mut" style="margin-top:4px">📔 nessuna riga di diario</div>')
     +'<div style="margin-top:6px">🥾 '+(d.tr.length?d.tr.length+(d.tr.length>1?' tracce · ':' traccia · ')+fmtDist(d.km)+' · '+fmtDur(d.ms):'nessuna traccia')+'</div>'
     +'<div>📍 '+d.pts.length+' punti'+(d.pts.length?' ('+esc(catList(d.cat))+')':'')+' · 📷 '+d.ph+' · 🎙 '+d.au+'</div>'
     +(d.sp.length?'<div style="margin-top:4px">🔎 Specie ('+d.sp.length+'): '+esc(d.sp.join(', '))+'</div>':'')
     +(d.nw.length?'<div class="mut">✨ Prime nel tuo catalogo: '+esc(d.nw.join(', '))+'</div>':'')+'</div>'
     +(d.pts.length?'<h3>Punti del giorno</h3>'+d.pts.map(function(p){return '<div class="card"><span class="mut">'+esc(fmtDate(p.when).slice(-5))+'</span> '+CAT(p.cat).e+' <b>'+esc(nameOf(p))+'</b></div>'}).join(''):'');
  }else{
    var t=totData();
    h+='<div class="card"><b>Tutto il lavoro svolto</b><div style="margin-top:6px">📅 '+t.days.length+' giorni di uscita'+(t.days.length?' · dal '+esc(t.days[0].split('-').reverse().join('/'))+' al '+esc(t.days[t.days.length-1].split('-').reverse().join('/')):'')+'</div><div>📍 '+t.pts+' punti'+(t.pts?' ('+esc(catList(t.cat))+')':'')+' · 📷 '+t.ph+' · 🎙 '+t.au+'</div><div>🔎 '+t.nsp+' specie diverse'+(typeof N2000_SP!=='undefined'?' · Natura 2000: '+t.n2.A+' principali, '+t.n2.B+' importanti':'')+'</div><div>🥾 '+t.ntr+' tracce · '+fmtDist(t.km)+' · '+fmtDur(t.ms)+'</div><div>📔 '+t.dia+' righe di diario · trasparenza '+esc(rng(t.tr,'cm'))+' · acqua '+esc(rng(t.tp,'°C'))+'</div></div>'
     +(t.top.length?'<h3>Più osservate</h3><div class="card">'+t.top.map(function(x){return esc(x.name)+' <span class="mut">('+x.n+')</span>'}).join(' · ')+'</div>':'')
     +(Object.keys(t.mon).length?'<h3>Uscite per mese</h3><div class="card">'+Object.keys(t.mon).sort().map(function(m){return '<div class="row"><span style="width:80px">'+m+'</span><div class="prog" style="flex:1"><i style="width:'+Math.min(100,t.mon[m]*10)+'%"></i></div><b>'+t.mon[m]+'</b></div>'}).join('')+'</div>':'');
  }
  h+='<div class="row" style="margin-top:10px"><button class="btn f" id="rpX">📄 Salva come testo</button><button class="btn s" id="rpC">Copia</button></div>';
  $('#hubC').innerHTML=h;
  function cur(){return mode==='day'?dayText($('#rpK').value||k):totText()}
  $('#rpD').onclick=function(){HUB.ctx.rmode='day';HUBR.riep()};$('#rpT').onclick=function(){HUB.ctx.rmode='tot';HUBR.riep()};
  if(mode==='day'){
    function go3(v){HUB.ctx.day=v;HUBR.riep()}
    $('#rpK').onchange=function(){if(this.value)go3(this.value)};
    function shift(n){var d=new Date($('#rpK').value+'T12:00:00');d.setDate(d.getDate()+n);go3(ldate(d.toISOString()))}
    $('#rpP').onclick=function(){shift(-1)};$('#rpN').onclick=function(){shift(1)};
    $$('[data-rk]').forEach(function(a){a.onclick=function(e){e.preventDefault();go3(a.getAttribute('data-rk'))}});
  }
  $('#rpX').onclick=function(){shareOrDownload(new Blob([cur()],{type:'text/plain'}),(mode==='day'?'riepilogo_'+($('#rpK').value||k):'riepilogo_totale_'+stamp())+'.txt')};
  $('#rpC').onclick=function(){var t=cur();(navigator.clipboard?navigator.clipboard.writeText(t):Promise.reject()).then(function(){toast('Copiato')},function(){toast('Copia non consentita: usa «Salva come testo»')})};
};
