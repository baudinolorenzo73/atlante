/* Atlante di campo - CAPITOLI del Dossier (v3.5).
   Il Lago Piccolo di Avigliana ha il suo capitolo scritto a mano (08-dossier.js). Per ogni altro luogo di lavoro l'app
   scarica da sola un capitolo da fonti libere e lo salva nel telefono (funziona poi anche senza rete):
   Wikipedia (introduzione e voci vicine), Wikidata (carta d'identità), Open-Meteo (quota e clima di 10 anni),
   iNaturalist (checklist delle specie osservate), OpenStreetMap (aree protette, cime, acque, storia), Macrostrat (geologia).
   by Lollo ®2026 · i moduli si caricano nell'ordine dei numeri (vedi index.html) */
'use strict';
var CAP={sel:null,have:{},busy:false};
CAP.key=function(id){return 'capitolo:'+id};
CAP.init=function(){return DB.keys('kv').then(function(ks){ks.forEach(function(k){if(String(k).indexOf('capitolo:')===0)CAP.have[String(k).slice(9)]=1})})};
CAP.place=function(){return PL.get(CAP.sel||PL.cur)};

/* =================== SCARICAMENTO =================== */
var CAP_GROUPS={Aves:'Uccelli',Mammalia:'Mammiferi',Reptilia:'Rettili',Amphibia:'Anfibi',Actinopterygii:'Pesci',Insecta:'Insetti',Arachnida:'Ragni e affini',Mollusca:'Molluschi',Animalia:'Altri animali',Plantae:'Piante',Fungi:'Funghi',Chromista:'Alghe e altri',Protozoa:'Alghe e altri'};
var CAP_ORDER=['Piante','Funghi','Uccelli','Mammiferi','Rettili','Anfibi','Pesci','Insetti','Ragni e affini','Molluschi','Altri animali','Alghe e altri','Altro'];
CAP.WD_UNITS={Q11573:'m',Q712226:'km²',Q828224:'km',Q35852:'ha',Q25343:'m²'};
CAP.steps=[
 ['intro','Wikipedia: introduzione',function(p,ch){
   var langs=[SET.wikiLang||'it'].concat((SET.wikiLang||'it')==='en'?[]:['en']);
   function tryLang(i){if(i>=langs.length)throw new Error('nessuna voce trovata');var L=langs[i],base='https://'+L+'.wikipedia.org/w/api.php?format=json&origin=*&';
     return fj(base+'action=query&list=search&srlimit=5&srsearch='+encodeURIComponent(p.name),15000).then(function(j){
       var titles=(j.query&&j.query.search||[]).map(function(x){return x.title});if(!titles.length)return tryLang(i+1);
       return fj(base+'action=query&redirects=1&prop=extracts|pageprops|coordinates&exintro=1&explaintext=1&exlimit=max&titles='+encodeURIComponent(titles.join('|')),15000).then(function(k){
         var pages=Object.keys(k.query&&k.query.pages||{}).map(function(id){return k.query.pages[id]}).filter(function(x){return x.extract});
         pages.sort(function(a,b){return titles.indexOf(a.title)-titles.indexOf(b.title)});
         // preferisco la voce con coordinate vicine al luogo (entro 25 km)
         var near=pages.filter(function(x){var c=x.coordinates&&x.coordinates[0];return c&&dist(c.lat,c.lon,p.lat,p.lon)<25000})[0]||pages.filter(function(x){return !x.coordinates})[0];
         if(!near)return tryLang(i+1);
         ch.intro={title:near.title,text:near.extract.slice(0,4000),url:'https://'+L+'.wikipedia.org/wiki/'+encodeURIComponent(near.title.replace(/ /g,'_')),lang:L,wd:near.pageprops&&near.pageprops.wikibase_item||null};
         return '«'+near.title+'»';
       })})}
   return tryLang(0);
 }],
 ['facts','Wikidata: carta d\'identità',function(p,ch){
   if(!ch.intro||!ch.intro.wd)throw new Error('serve prima la voce di Wikipedia');
   var q=ch.intro.wd;
   return fj('https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&origin=*&props=claims|descriptions&languages=it|en&ids='+q,15000).then(function(j){
     var e=j.entities&&j.entities[q];if(!e)throw new Error('voce Wikidata non trovata');var C=e.claims||{},f={q:q,desc:(e.descriptions.it||e.descriptions.en||{}).value||''},refs=[];
     function amount(P){var a=(C[P]||[]).filter(function(c){return c.rank!=='deprecated'&&c.mainsnak.datavalue});if(!a.length)return null;
       var best=a.filter(function(c){return c.rank==='preferred'})[0]||a[a.length-1],v=best.mainsnak.datavalue.value,u=String(v.unit||'').split('/').pop();
       return (+v.amount).toLocaleString('it-IT')+(CAP.WD_UNITS[u]?' '+CAP.WD_UNITS[u]:'')}
     function item(P){return (C[P]||[]).filter(function(c){return c.mainsnak.datavalue}).map(function(c){return c.mainsnak.datavalue.value.id})}
     [['P2044','Quota'],['P1082','Abitanti'],['P2046','Superficie'],['P4511','Profondità'],['P2043','Lunghezza']].forEach(function(x){var v=amount(x[0]);if(v)f[x[1]]=v});
     var inc=(C.P571||[])[0];if(inc&&inc.mainsnak.datavalue){var t=inc.mainsnak.datavalue.value.time;f['Fondazione / origine']=t.replace(/^\+/,'').slice(0,4).replace(/^0+/,'')}
     var ids={P31:item('P31').slice(0,3),P131:item('P131').slice(0,2),P17:item('P17').slice(0,1)};
     var all=ids.P31.concat(ids.P131,ids.P17);if(!all.length){ch.facts=f;return 'ok'}
     return fj('https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&origin=*&props=labels&languages=it|en&ids='+all.join('|'),15000).then(function(k){
       function lab(id){var x=k.entities&&k.entities[id];return x&&((x.labels.it||x.labels.en||{}).value)||id}
       if(ids.P31.length)f['Che cos\'è']=ids.P31.map(lab).join(', ');if(ids.P131.length)f['Si trova in']=ids.P131.map(lab).join(', ');if(ids.P17.length)f['Stato']=lab(ids.P17[0]);
       ch.facts=f;return Object.keys(f).length-2+' dati';
     });
   });
 }],
 ['clima','Open-Meteo: quota e clima degli ultimi 10 anni',function(p,ch){
   var y=new Date().getFullYear()-1,a=y-9;
   return Promise.all([
     fj('https://api.open-meteo.com/v1/elevation?latitude='+p.lat+'&longitude='+p.lon,15000).catch(function(){return null}),
     fj('https://archive-api.open-meteo.com/v1/archive?latitude='+p.lat+'&longitude='+p.lon+'&start_date='+a+'-01-01&end_date='+y+'-12-31&daily=temperature_2m_mean,temperature_2m_max,temperature_2m_min,precipitation_sum,snowfall_sum&timezone=auto',45000)
   ]).then(function(r){
     var d=r[1].daily,m=[];for(var i=0;i<12;i++)m.push({t:0,tx:0,tn:0,n:0,p:{},s:{}});
     d.time.forEach(function(ds,i){var mo=+ds.slice(5,7)-1,yr=ds.slice(0,4),o=m[mo];if(d.temperature_2m_mean[i]!=null){o.t+=d.temperature_2m_mean[i];o.tx+=d.temperature_2m_max[i];o.tn+=d.temperature_2m_min[i];o.n++}o.p[yr]=(o.p[yr]||0)+(d.precipitation_sum[i]||0);o.s[yr]=(o.s[yr]||0)+(d.snowfall_sum[i]||0)});
     function avg(o){var k=Object.keys(o);return k.length?k.reduce(function(s,x){return s+o[x]},0)/k.length:0}
     ch.clima={from:a,to:y,elev:r[0]&&r[0].elevation&&r[0].elevation[0],m:m.map(function(o){return {t:+(o.t/o.n).toFixed(1),tx:+(o.tx/o.n).toFixed(1),tn:+(o.tn/o.n).toFixed(1),p:Math.round(avg(o.p)),s:Math.round(avg(o.s))}})};
     return a+'–'+y;
   });
 }],
 ['wiki','Wikipedia: voci vicine (storia, luoghi, natura)',function(p,ch){
   var L=ch.intro&&ch.intro.lang||SET.wikiLang||'it',rad=Math.min(10000,Math.round((p.r||3)*1000));
   return fj('https://'+L+'.wikipedia.org/w/api.php?format=json&origin=*&action=query&generator=geosearch&ggscoord='+p.lat+'|'+p.lon+'&ggsradius='+rad+'&ggslimit=20&prop=extracts|coordinates&exintro=1&explaintext=1&exsentences=2&exlimit=max',20000).then(function(j){
     var a=Object.keys(j.query&&j.query.pages||{}).map(function(id){var x=j.query.pages[id],c=x.coordinates&&x.coordinates[0];return {t:x.title,d:(x.extract||'').slice(0,400),lat:c&&c.lat,lon:c&&c.lon,url:'https://'+L+'.wikipedia.org/wiki/'+encodeURIComponent(x.title.replace(/ /g,'_'))}});
     a.forEach(function(x){x.km=x.lat!=null?dist(p.lat,p.lon,x.lat,x.lon):1e9});a.sort(function(x,y){return x.km-y.km});
     ch.wiki=a;return a.length+' voci';
   });
 }],
 ['species','iNaturalist: specie osservate nella zona',function(p,ch){
   var b=PL.boxes(p).pack;
   return fj('https://api.inaturalist.org/v1/observations/species_counts?quality_grade=research&locale=it&per_page=500&swlat='+b[0]+'&swlng='+b[1]+'&nelat='+b[2]+'&nelng='+b[3],30000).then(function(j){
     var list=(j.results||[]).map(function(r){var t=r.taxon||{};return {sci:t.name,com:t.preferred_common_name||'',g:CAP_GROUPS[t.iconic_taxon_name]||'Altro',n:r.count,id:t.id,th:t.threatened||!!(t.conservation_status&&/^(VU|EN|CR)$/i.test(t.conservation_status.status||''))}}).filter(function(x){return x.sci});
     ch.species={total:j.total_results||list.length,list:list};return list.length+' specie'+(j.total_results>list.length?' (le '+list.length+' più osservate su '+j.total_results+')':'');
   });
 }],
 ['osm','OpenStreetMap: aree protette, cime, acque, storia',function(p,ch){
   var b=PL.boxes(p).pack,bb=b.join(',');
   var q='[out:json][timeout:50];(nwr["boundary"="protected_area"]["name"]('+bb+');nwr["leisure"="nature_reserve"]["name"]('+bb+');node["natural"~"^(peak|saddle|volcano)$"]["name"]('+bb+');nwr["natural"="water"]["name"]('+bb+');node["waterway"="waterfall"]('+bb+');node["natural"="spring"]["name"]('+bb+');nwr["natural"~"^(cave_entrance|stone|rock)$"]('+bb+');nwr["natural"="glacier"]["name"]('+bb+');nwr["historic"]["name"]('+bb+');node["tourism"~"^(viewpoint|alpine_hut|wilderness_hut)$"]('+bb+'););out center tags 600;';
   return overpass(q,60000).then(function(j){
     var G={};function add(g,o){(G[g]=G[g]||[]).push(o)}var seen={};
     (j.elements||[]).forEach(function(e){var t=e.tags||{},la=e.lat!=null?e.lat:e.center&&e.center.lat,lo=e.lon!=null?e.lon:e.center&&e.center.lon;if(la==null)return;
       var nm=t['name:it']||t.name||'',o={n:nm,lat:la,lon:lo,ele:t.ele||'',w:t.wikipedia||'',x:''},k=nm+'|'+la.toFixed(3)+'|'+lo.toFixed(3);if(nm&&seen[k])return;seen[k]=1;
       if(t.boundary==='protected_area'||t.leisure==='nature_reserve'){o.x=t.protection_title||t.designation||(t.leisure==='nature_reserve'?'riserva naturale':'area protetta');add('Aree protette',o)}
       else if(/^(peak|saddle|volcano)$/.test(t.natural)){o.x=t.natural==='saddle'?'colle / passo':t.natural==='volcano'?'vulcano':'cima';add('Cime e colli',o)}
       else if(t.natural==='water'||t.waterway==='waterfall'||t.natural==='spring'){o.x=t.waterway==='waterfall'?'cascata':t.natural==='spring'?'sorgente':(t.water==='lake'?'lago':t.water==='pond'?'stagno':t.water==='reservoir'?'bacino':t.water||'acqua');if(!o.n)o.n=o.x;add('Acque',o)}
       else if(t.natural==='glacier'){o.x='ghiacciaio';add('Ghiacciai',o)}
       else if(/^(cave_entrance|stone|rock)$/.test(t.natural)){o.x=t.natural==='cave_entrance'?'grotta':t.natural==='stone'?'masso':'roccia';if(!o.n)o.n=o.x;add('Grotte, massi e rocce',o)}
       else if(t.historic){o.x=({castle:'castello',ruins:'rovine',archaeological_site:'sito archeologico',church:'chiesa storica',chapel:'cappella',wayside_shrine:'pilone votivo',wayside_cross:'croce',monument:'monumento',memorial:'lapide / memoriale',tower:'torre',fort:'forte',bridge:'ponte storico',mine:'miniera',milestone:'pietra miliare',boundary_stone:'cippo di confine'})[t.historic]||t.historic;add('Storia e cultura',o)}
       else if(t.tourism){o.x=t.tourism==='viewpoint'?'panorama':'rifugio';if(!o.n)o.n=o.x;add('Panorami e rifugi',o)}
     });
     Object.keys(G).forEach(function(g){G[g].sort(function(a,b){return dist(p.lat,p.lon,a.lat,a.lon)-dist(p.lat,p.lon,b.lat,b.lon)});G[g]=G[g].slice(0,80)});
     ch.osm=G;return Object.keys(G).reduce(function(s,g){return s+G[g].length},0)+' elementi';
   });
 }],
 ['geo','Macrostrat: geologia (indicativa)',function(p,ch){
   return fj('https://macrostrat.org/api/v2/geologic_units/map?lat='+p.lat+'&lng='+p.lon,20000).then(function(j){
     var a=(j.success&&j.success.data||[]).map(function(u){return {name:u.name||u.strat_name||'',lith:u.lith||'',age:[u.b_int_name,u.t_int_name].filter(Boolean).filter(function(v,i,s){return s.indexOf(v)===i}).join(' – '),ma:u.b_age!=null?(u.b_age+(u.t_age!=null&&u.t_age!==u.b_age?'–'+u.t_age:''))+' Ma':'',d:(u.descrip||u.comments||'').slice(0,500)}}).filter(function(u){return u.name||u.lith});
     if(!a.length)throw new Error('nessuna unità geologica per questo punto');
     ch.geo=a.slice(0,4);return a.length+' unità';
   });
 }]
];
CAP.download=function(p,log){
  if(CAP.busy)return Promise.resolve(false);CAP.busy=true;
  p=p||CAP.place();log=log||function(t,c){var b=$('#capLog');if(!b)return;var d=document.createElement('div');if(c)d.className=c;d.textContent=t;b.appendChild(d)};
  var key=CAP.key(p.id),old=null,ch={v:1,when:new Date().toISOString(),place:{id:p.id,name:p.name,lat:p.lat,lon:p.lon,r:p.r},ok:[],ko:[]};
  return DB.get('kv',key).then(function(r){old=r&&r.v;
    var i=0;function next(){if(i>=CAP.steps.length)return Promise.resolve();var s=CAP.steps[i++];log('… '+s[1]);
      return Promise.resolve().then(function(){return s[2](p,ch)}).then(function(m){ch.ok.push(s[0]);log('✓ '+s[1]+(m?': '+m:''),'ok')},function(e){ch.ko.push(s[0]);if(old&&old[s[0]])ch[s[0]]=old[s[0]];log('✗ '+s[1]+': '+(e&&e.message||e)+(old&&old[s[0]]?' (tengo i dati di prima)':''),'ko')}).then(next)}
    return next();
  }).then(function(){
    CAP.busy=false;
    if(!ch.ok.length){log('✗ Nessuna fonte raggiungibile: serve la rete.'+(old?' Il capitolo di prima resta com\'è.':''),'ko');return false}
    return DB.put('kv',{id:key,v:ch}).then(function(){CAP.have[p.id]=1;log('✓ Capitolo «'+p.name+'» salvato nel telefono: ora funziona anche senza rete.','ok');if(curPage==='luo'&&LUO.tab==='cap')renderDossier();return true});
  });
};
CAP.ask=function(p){p=p||CAP.place();if(!confirm('Scarico il capitolo del luogo «'+p.name+'»?\n\nIntroduzione e voci vicine (Wikipedia), carta d\'identità (Wikidata), clima di 10 anni (Open-Meteo), specie osservate (iNaturalist), aree protette, cime, acque e storia (OpenStreetMap), geologia (Macrostrat).\nCirca 0,5–2 MB di rete; poi resta nel telefono.'))return;
  var b=$('#capLog');if(b)b.innerHTML='';CAP.download(p)};

/* =================== VISUALIZZAZIONE =================== */
CAP.head=function(){return ''};   // il luogo si sceglie in alto nella scheda Luogo (v4.0)
CAP.bindHead=function(){var s=$('#capSel');if(s)s.onchange=function(){CAP.sel=s.value===PL.cur?null:s.value;renderDossier()}};
CAP.sciSeen=function(sci){var s=seenSci();return s[String(sci).toLowerCase().split(' ').slice(0,2).join(' ')]};
CAP.body=function(ch,o){
  o=o||{};var h='',p=ch.place;
  if(ch.intro&&!o.noIntro)h+='<details open><summary>Introduzione</summary><div class="dc"><p>'+esc(ch.intro.text).replace(/\n+/g,'</p><p>')+'</p><p class="mut">Da Wikipedia, voce <a href="'+ch.intro.url+'" target="_blank" rel="noopener">«'+esc(ch.intro.title)+'»</a> (testo CC BY-SA).</p></div></details>';
  var f=ch.facts||{},rows=[];Object.keys(f).forEach(function(k){if(k!=='q'&&k!=='desc')rows.push([k,f[k]])});
  if(ch.clima&&ch.clima.elev!=null)rows.push(['Quota del punto (modello)',Math.round(ch.clima.elev)+' m']);
  rows.push(['Coordinate',p.lat.toFixed(5)+', '+p.lon.toFixed(5)]);
  if(rows.length||ch.geo)h+='<details'+(o.noIntro?'':' open')+'><summary>Carta d\'identità</summary><div class="dc">'+(f.desc?'<p><i>'+esc(f.desc)+'</i></p>':'')+'<table class="kv">'+rows.map(function(r){return '<tr><td class="mut">'+esc(r[0])+'</td><td>'+esc(r[1])+'</td></tr>'}).join('')+'</table>'
    +(ch.geo?'<p style="margin-top:8px"><b>Geologia</b> <span class="mut">(Macrostrat, scala regionale: indicativa, da verificare con la carta geologica)</span></p><ul>'+ch.geo.map(function(g){return '<li><b>'+esc(g.name||g.lith)+'</b>'+(g.lith&&g.name?' – '+esc(g.lith):'')+(g.age?' · '+esc(g.age):'')+(g.ma?' ('+esc(g.ma)+')':'')+(g.d?'<br><small class="mut">'+esc(g.d)+'</small>':'')+'</li>'}).join('')+'</ul>':'')
    +(f.q?'<p class="mut">Dati da <a href="https://www.wikidata.org/wiki/'+f.q+'" target="_blank" rel="noopener">Wikidata '+f.q+'</a> (CC0).</p>':'')+'</div></details>';
  if(ch.clima){var M=['gen','feb','mar','apr','mag','giu','lug','ago','set','ott','nov','dic'],c=ch.clima,tp=c.m.reduce(function(s,x){return s+x.p},0),ts=c.m.reduce(function(s,x){return s+x.s},0);
    h+='<details><summary>Clima ('+c.from+'–'+c.to+')</summary><div class="dc"><div style="overflow-x:auto"><table class="kv clim"><tr><td></td>'+M.map(function(m){return '<td><b>'+m+'</b></td>'}).join('')+'</tr><tr><td class="mut">T media °C</td>'+c.m.map(function(x){return '<td>'+x.t+'</td>'}).join('')+'</tr><tr><td class="mut">T max</td>'+c.m.map(function(x){return '<td>'+x.tx+'</td>'}).join('')+'</tr><tr><td class="mut">T min</td>'+c.m.map(function(x){return '<td>'+x.tn+'</td>'}).join('')+'</tr><tr><td class="mut">Pioggia mm</td>'+c.m.map(function(x){return '<td>'+x.p+'</td>'}).join('')+'</tr>'+(ts?'<tr><td class="mut">Neve cm</td>'+c.m.map(function(x){return '<td>'+x.s+'</td>'}).join('')+'</tr>':'')+'</table></div>'
     +'<p class="mut">Precipitazioni medie annue circa '+tp+' mm'+(ts?', neve circa '+ts+' cm':'')+'. Medie calcolate dall\'archivio Open-Meteo (rianalisi ERA5, CC BY 4.0): in montagna il modello può scostarsi dalle stazioni reali.</p></div></details>';}
  if(ch.osm&&Object.keys(ch.osm).length){var ord=['Aree protette','Acque','Cime e colli','Ghiacciai','Grotte, massi e rocce','Storia e cultura','Panorami e rifugi'],n=0;Object.keys(ch.osm).forEach(function(g){n+=ch.osm[g].length});
    h+='<details><summary>Natura e luoghi da OpenStreetMap ('+n+')</summary><div class="dc">'+ord.filter(function(g){return ch.osm[g]}).map(function(g){return '<p><b>'+g+'</b></p><ul>'+ch.osm[g].map(function(x){return '<li><a href="#" data-capgo="'+x.lat+','+x.lon+'">'+esc(x.n)+'</a> <span class="mut">'+esc(x.x)+(x.ele?' · '+esc(x.ele)+' m':'')+' · '+fmtDist(dist(p.lat,p.lon,x.lat,x.lon))+'</span></li>'}).join('')+'</ul>'}).join('')+'<p class="mut">© contributori OpenStreetMap (ODbL). Tocca un nome per vederlo sulla mappa.</p></div></details>'}
  if(ch.wiki&&ch.wiki.length)h+='<details><summary>Storia, luoghi e curiosità da Wikipedia ('+ch.wiki.length+')</summary><div class="dc">'+ch.wiki.map(function(w){return '<div class="card"><b><a href="'+w.url+'" target="_blank" rel="noopener">'+esc(w.t)+'</a></b>'+(w.km<1e8?' <span class="mut">'+fmtDist(w.km)+'</span>':'')+'<div class="mut">'+esc(w.d)+'</div>'+(w.lat!=null?'<button class="btn s" style="margin-top:4px" data-capgo="'+w.lat+','+w.lon+'">Sulla mappa</button>':'')+'</div>'}).join('')+'<p class="mut">Estratti da Wikipedia (CC BY-SA).</p></div></details>';
  if(ch.species&&ch.species.list.length){var L=ch.species.list,ns=0;L.forEach(function(s){if(CAP.sciSeen(s.sci)||CHECK['cap:'+s.sci])ns++});
    var by={};L.forEach(function(s,i){(by[s.g]=by[s.g]||[]).push(i)});
    h+='<details><summary>Checklist delle specie osservate: '+ns+' viste su '+L.length+'</summary><div class="dc"><p class="mut">Specie con osservazioni verificate su iNaturalist nella zona del luogo, dalle più osservate. Si spuntano da sole quando catalogi un punto con quel nome scientifico; ⚠ = specie minacciata. Tocca ＋ per creare la scheda.</p>'
      +CAP_ORDER.filter(function(g){return by[g]}).map(function(g){return '<h3>'+g+' ('+by[g].length+')</h3>'+by[g].map(function(i){var s=L[i],seen=CAP.sciSeen(s.sci);return '<div class="ck"><input type="checkbox" data-capck="'+esc(s.sci)+'" '+(seen||CHECK['cap:'+s.sci]?'checked':'')+(seen?' disabled':'')+'><span style="flex:1">'+(s.com?esc(s.com)+' ':'')+'<i class="mut">'+esc(s.sci)+'</i>'+(s.th?' ⚠':'')+' <small class="mut">· '+s.n+' oss.</small></span><a class="mut" href="https://www.inaturalist.org/taxa/'+s.id+'" target="_blank" rel="noopener">iNat</a><button class="btn s" data-capadd="'+i+'">＋</button></div>'}).join('')}).join('')
      +'<p class="mut">Dati iNaturalist (osservazioni di grado «ricerca»). L\'assenza di una specie non vuol dire che non ci sia.</p></div></details>';}
  h+='<details><summary>Fonti e licenze</summary><div class="dc"><ul><li>Wikipedia – testi CC BY-SA</li><li>Wikidata – CC0</li><li>Open-Meteo – archivio ERA5, CC BY 4.0</li><li>iNaturalist – osservazioni dei partecipanti, licenze CC delle singole osservazioni</li><li>OpenStreetMap – © contributori, ODbL</li><li>Macrostrat – CC BY 4.0</li></ul><p class="mut">Scaricato il '+fmtDate(ch.when)+(ch.ko&&ch.ko.length?' · fonti non raggiunte: '+ch.ko.join(', '):'')+'.</p></div></details>';
  return h;
};
CAP.bindBody=function(ch){
  $$('[data-capgo]').forEach(function(a){a.onclick=function(e){e.preventDefault();var c=a.getAttribute('data-capgo').split(',');go('map');map.setView([+c[0],+c[1]],16);var m=L.circleMarker([+c[0],+c[1]],{radius:14,color:'#ffd54f',weight:3,fill:false}).addTo(map);setTimeout(function(){map.removeLayer(m)},6000)}});
  $$('[data-capck]').forEach(function(c){c.onchange=function(){CHECK['cap:'+c.getAttribute('data-capck')]=c.checked;saveCheck()}});
  $$('[data-capadd]').forEach(function(b){b.onclick=function(){var s=ch.species.list[+b.getAttribute('data-capadd')],cat=s.g==='Piante'?'flora':s.g==='Funghi'?'fungo':'fauna';
    if(!CATS.some(function(c){return c.id===cat}))cat='altro';
    var c=here||{lat:map.getCenter().lat,lon:map.getCenter().lng};openForm(null,{draft:newDraft(c.lat,c.lon,{cat:cat,title:s.com||s.sci,sp:{com:s.com,sci:s.sci,src:'capitolo «'+ch.place.name+'» (iNaturalist)'}})});toast('Posizione provvisoria: aggiornala dal GPS o sceglila sulla mappa',4000)}});
  if($('#capUpd'))$('#capUpd').onclick=function(){CAP.ask(PL.get(ch.place.id))};
  if($('#capPrint'))$('#capPrint').onclick=function(){CAP.print(ch)};
};
// capitolo automatico di un luogo (diverso dal lago)
CAP.render=function(){
  var p=CAP.place(),box=$('#dosBody');
  box.innerHTML=CAP.head()+'<div id="capMain"><p class="mut">Carico il capitolo…</p></div>';CAP.bindHead();
  var main=$('#capMain');
  DB.get('kv',CAP.key(p.id)).then(function(r){
    var ch=r&&r.v,h='';if(!main.isConnected||CAP.place().id!==p.id)return;   // ridisegnata o luogo cambiato nel frattempo
    if(!ch){h='<div class="card"><b>'+esc(p.name)+'</b><div class="mut">Il capitolo di questo luogo non è ancora stato scaricato. Lo creo da fonti libere (Wikipedia, Wikidata, Open-Meteo, iNaturalist, OpenStreetMap, Macrostrat) e lo salvo nel telefono: dopo funziona anche senza rete.</div><div class="row" style="margin-top:8px"><button class="btn f" id="capDl">⬇️ Scarica il capitolo</button></div><div class="log" id="capLog"></div></div>';
      $('#capMain').innerHTML=h;$('#capDl').onclick=function(){CAP.ask(p)};return}
    var mine=POINTS.filter(function(q){return dist(q.lat,q.lon,p.lat,p.lon)<(p.r||3)*1000*1.2}).length;
    h='<div class="card"><b>'+esc(p.name)+'</b>'+(ch.facts&&ch.facts.desc?'<div class="mut">'+esc(ch.facts.desc)+'</div>':'')+'<div class="mut">Capitolo scaricato il '+fmtDate(ch.when)+' · '+mine+' tuoi punti in quest\'area'+(navigator.onLine===false?' · <b>senza rete: uso la copia nel telefono</b>':'')+'</div><div class="row" style="margin-top:8px;flex-wrap:wrap"><button class="btn s" id="capUpd">🔄 Aggiorna</button><button class="btn s" id="capPrint">🖨 Stampa / PDF</button></div><div class="log" id="capLog"></div></div>';
    h+=CAP.body(ch);
    var keep=$$('#capMain details').map(function(d){return d.open});
    $('#capMain').innerHTML=h;if(keep.length)$$('#capMain details').forEach(function(d,i){if(keep[i]!=null)d.open=keep[i]});
    CAP.bindBody(ch);
  });
};
// in fondo al capitolo del lago: i dati scaricati automaticamente (clima, specie iNaturalist, OSM…)
CAP.lakeExtra=function(){return '<div id="capLake"></div>'};
CAP.fillLake=function(){
  var box=$('#capLake');if(!box)return;var p=PL.lago;
  DB.get('kv',CAP.key('lago')).then(function(r){var ch=r&&r.v;if(!box.isConnected)return;   // la pagina è stata ridisegnata nel frattempo
   
    if(!ch){box.innerHTML='<div class="card"><b>📥 Dati scaricabili del lago</b><div class="mut">Clima degli ultimi 10 anni, specie osservate su iNaturalist, aree protette, acque e storia da OpenStreetMap, voci Wikipedia vicine, geologia: si scaricano una volta e restano nel telefono.</div><div class="row" style="margin-top:8px"><button class="btn s" id="capDl">⬇️ Scarica</button></div><div class="log" id="capLog"></div></div>';box.querySelector('#capDl').onclick=function(){CAP.ask(p)};return}
    box.innerHTML='<h3>Dati scaricati del lago</h3><div class="card"><div class="mut">Scaricati il '+fmtDate(ch.when)+'</div><div class="row" style="margin-top:6px"><button class="btn s" id="capUpd">🔄 Aggiorna</button><button class="btn s" id="capPrint">🖨 Stampa</button></div><div class="log" id="capLog"></div></div>'+CAP.body(ch,{noIntro:true});
    CAP.bindBody(ch);
  });
};
CAP.print=function(ch){
  var css='body{font:13px/1.45 Georgia,serif;color:#111;margin:18px}h1{font-size:22px;margin:0 0 4px}h3{margin:12px 0 4px}table{border-collapse:collapse;margin:6px 0}td{border:1px solid #bbb;padding:3px 6px;vertical-align:top}details{margin:8px 0}summary{font-weight:bold;font-size:16px;border-bottom:2px solid #333;list-style:none}.card{border:1px solid #ddd;padding:6px;margin:4px 0;page-break-inside:avoid}.mut{color:#555}button,input{display:none}a{color:#0b5394}';
  var body=CAP.body(ch).replace(/<details[^>]*>/g,'<details open>');
  var h='<!doctype html><html lang="it"><head><meta charset="utf-8"><title>'+esc(ch.place.name)+' – capitolo</title><style>'+css+'</style></head><body><h1>'+esc(ch.place.name)+'</h1><p class="mut">Capitolo del luogo · scaricato il '+fmtDate(ch.when)+' · '+esc(SET.compilatore||'')+' · '+BRAND+'</p>'+body+'</body></html>';
  var w=window.open('','_blank');if(w){w.document.open();w.document.write(h+'<script>setTimeout(function(){print()},500)<\/script>');w.document.close()}else shareOrDownload(new Blob([h],{type:'text/html'}),'capitolo_'+slug(ch.place.name)+'.html');
};
// la pagina Dossier sceglie il capitolo: lago (scritto a mano) o automatico
function renderDossier(){
  var p=CAP.place();if($('#dosT'))$('#dosT').textContent=p.name;if($('#dosS'))$('#dosS').textContent=p.id==='lago'?'Capitolo scritto a mano · ricerca con fonti · checklist':'Capitolo scaricato da fonti libere · funziona anche senza rete';
  if(p.id==='lago'){renderLakeDossier();CAP.fillLake();}else CAP.render();
}
