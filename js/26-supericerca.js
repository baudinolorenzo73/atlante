/* Atlante di campo - Super ricerca (v4.9): trova la specie di una scheda interrogando insieme più fonti.
   Fonti: nome digitato (anche con refusi: iNaturalist + GBIF), Pl@ntNet con le foto (piante), ogni AI con chiave (con le prime 3 foto dove il provider le accetta),
   poi verifica di ogni nome su GBIF, presenza nei dintorni (GBIF, coordinate arrotondate a ~1 km), voce di Wikipedia e confronto con le liste locali.
   Le percentuali delle fonti NON si mediano né si confrontano: restano separate. Nessun campo cambia finché non tocchi «Usa questa specie».
   Idea dalla «Super ricerca» di Scheda Botanica PRO (di Lorenzo); codice scritto da capo per l'Atlante.
   by Lollo ®2026 · i moduli si caricano nell'ordine dei numeri (vedi index.html) */
'use strict';
var SUP={MAXPX:1024,N_AI:3,N_PN:5,run:0};
SUP.kingdom=function(cat){return {flora:'Plantae',albero:'Plantae',fungo:'Fungi',fauna:'Animalia'}[cat]||''};
SUP.tipo=function(cat){return {flora:'vegetali (piante)',albero:'vegetali (alberi o arbusti)',fungo:'funghi',fauna:'animali'}[cat]||'organismi'};
SUP.BIN=/^[A-ZÀ-ÖØ-Þ][\p{L}-]+\s+(?:[×x]\s*)?[a-zà-öø-ÿ][\p{L}-]+(?:\s+(?:subsp\.|ssp\.|var\.|f\.)\s+[a-zà-öø-ÿ][\p{L}-]+)?$/u;
SUP.photos=function(){
  var phs=(draft.media||[]).filter(function(m){return m.type==='photo'}).slice(0,SUP.N_PN);
  return Promise.all(phs.map(getBlob)).then(function(bl){return bl.filter(Boolean)});
};
SUP.b64=function(blob){return compress(blob,SUP.MAXPX).then(function(b){return new Promise(function(res,rej){var fr=new FileReader();fr.onload=function(){res(String(fr.result).split(',')[1])};fr.onerror=rej;fr.readAsDataURL(b)})})};
SUP.typed=function(){var e=$('#fSp');return e?e.value.trim():''};
/* Cosa si dice all'AI: categoria, nome digitato, campi compilati, note, quota, mese. Mai le coordinate. */
SUP.obs=function(){
  var o={categoria:CAT(draft.cat).n},t=SUP.typed();
  if(t)o.nomeDigitato=t;
  (EXTRA[draft.cat]||[]).forEach(function(f){var v=draft.x[f.k];if(v!=null&&v!=='')o[f.l]=v});
  if(draft.note&&draft.note.trim())o.noteOsservatore=draft.note.trim().slice(0,600);
  if(draft.alt!=null&&isFinite(draft.alt))o.quotaM=Math.round(draft.alt);
  if(draft.when){var d=new Date(draft.when);if(!isNaN(d))o.mese=AI.MESI[d.getMonth()]}
  return o;
};
SUP.prompt=function(n){
  return 'Sei un assistente di identificazione naturalistica prudente (atlante di campo in Italia). '
   +(n?'Guarda '+(n===1?'la foto':'le '+n+' foto')+' dello stesso individuo e considera anche':'Considera')+' queste osservazioni fatte sul campo: '+JSON.stringify(SUP.obs())+'.\n'
   +'Il nome digitato dall\'osservatore può contenere errori di battitura o essere solo un nome comune.\n'
   +'Proponi al massimo 4 taxa '+SUP.tipo(draft.cat)+' compatibili. Usa solo nomi scientifici binomiali (genere e specie, oppure con subsp./var.), non inventare taxa e non proporre nomi di solo genere.\n'
   +'La percentuale è un numero intero da 0 a 100: una stima orientativa basata solo su ciò che vedi e leggi; se i dati non bastano, abbassala.\n'
   +'Rispondi SOLO con JSON valido, senza altro testo né ```: {"candidati":[{"nomeScientifico":"","nomeComune":"in italiano, se lo conosci","percentuale":0,"motivazione":"max 140 caratteri: i caratteri che lo indicano"}]}';
};
SUP.parseCands=function(txt){
  txt=String(txt||'').replace(/^```(?:json)?/i,'').replace(/```\s*$/,'').trim();
  var a=txt.search(/[{[]/),b=Math.max(txt.lastIndexOf('}'),txt.lastIndexOf(']'));if(a<0||b<=a)throw new Error('risposta non valida');
  var j=JSON.parse(txt.slice(a,b+1)),L=Array.isArray(j)?j:(j.candidati||j.candidates||j.risultati||[]),seen={};
  return (Array.isArray(L)?L:[]).slice(0,6).map(function(c){
    if(!c||typeof c!=='object')return null;
    var n=String(c.nomeScientifico||c.nome||c.scientificName||c.name||'').trim().replace(/\s+/g,' ');
    if(!SUP.BIN.test(n)||seen[n.toLowerCase()])return null;seen[n.toLowerCase()]=1;
    var p=typeof c.percentuale==='string'?parseFloat(c.percentuale.replace(',','.')):Number(c.percentuale!=null?c.percentuale:(c.confidenza!=null?c.confidenza:c.confidence));
    if(isFinite(p)&&p>0&&p<1)p*=100;
    return {sci:n.slice(0,120),com:String(c.nomeComune||c.commonName||'').trim().slice(0,80),pct:isFinite(p)?Math.round(Math.max(0,Math.min(100,p))):null,why:String(c.motivazione||c.motivo||c.reason||'').trim().slice(0,180)};
  }).filter(Boolean).slice(0,4);
};
/* ---- le fonti: ognuna restituisce [{sci,com,src:{l,pct,why,photo}}] ---- */
SUP.fromName=function(){
  var q=SUP.typed().replace(/\s+[–-]\s+.*$/,'').trim(),K=SUP.kingdom(draft.cat);
  if(q.length<3)return Promise.resolve([]);
  var iconic={Plantae:'Plantae',Fungi:'Fungi',Animalia:'Animalia'}[K]||'';
  return fetchJSON('https://api.inaturalist.org/v1/taxa/autocomplete?q='+encodeURIComponent(q)+'&locale=it&per_page=6'+(iconic?'&iconic_taxa='+iconic:''),null,15000).then(function(j){
    return (j.results||[]).filter(function(t){return t.rank==='species'||t.rank==='subspecies'||t.rank==='variety'}).slice(0,3).map(function(t){
      return {sci:t.name,com:t.preferred_common_name||'',src:{l:'Nome digitato',why:'iNaturalist'}}});
  });
};
SUP.fromPlantnet=function(blobs){
  if(!SET.plantnet||!blobs.length||(draft.cat!=='flora'&&draft.cat!=='albero'))return Promise.resolve([]);
  var fd=new FormData();blobs.forEach(function(b,i){fd.append('images',b,'foto'+(i+1)+'.jpg');fd.append('organs','auto')});
  return fetch('https://my-api.plantnet.org/v2/identify/all?include-related-images=false&no-reject=false&lang=it&api-key='+encodeURIComponent(SET.plantnet),{method:'POST',body:fd}).then(function(r){
    if(!r.ok){var e=new Error('HTTP '+r.status);e.status=r.status;throw e}return r.json();
  }).then(function(j){
    return (j.results||[]).slice(0,4).map(function(r){var s=r.species||{};
      return {sci:s.scientificNameWithoutAuthor,com:(s.commonNames||[])[0]||'',src:{l:'Pl@ntNet',pct:Math.round((r.score||0)*100),photo:blobs.length}}}).filter(function(c){return c.sci});
  });
};
SUP.fromAI=function(p,imgs){
  var use=AI.vision(p)?imgs:[];
  function ask(im){return AI.send(p,'',[{r:'user',t:SUP.prompt(im.length)}],0.1,im).then(function(t){
    return SUP.parseCands(t).map(function(c){return {sci:c.sci,com:c.com,src:{l:p.n,pct:c.pct,why:c.why,photo:im.length}}})})}
  return ask(use).catch(function(e){
    if(use.length<2||[401,403,429].indexOf(e.status)>=0)throw e;
    return ask(use.slice(0,1));   // alcuni modelli accettano una sola foto
  });
};
/* verifica il nome su GBIF: solo specie (o sottospecie, varietà) del regno giusto, corrispondenza esatta */
SUP.verify=function(sci){
  var K=SUP.kingdom(draft.cat);
  return fetchJSON('https://api.gbif.org/v1/species/match?name='+encodeURIComponent(sci)+(K?'&kingdom='+K:''),null,15000).then(function(g){
    var ok=g&&g.matchType==='EXACT'&&g.confidence>=90&&/^\d+$/.test(String(g.usageKey||''))&&['SPECIES','SUBSPECIES','VARIETY','FORM'].indexOf(g.rank)>=0&&(!K||g.kingdom===K);
    return ok?{id:g.usageKey,name:g.canonicalName||g.scientificName||sci}:null;
  });
};
SUP.near=function(id){
  if(draft.lat==null)return Promise.resolve(null);
  var la=Math.round(draft.lat*100)/100,lo=Math.round(draft.lon*100)/100;
  return fetchJSON('https://api.gbif.org/v1/occurrence/search?taxonKey='+id+'&decimalLatitude='+(la-0.09).toFixed(2)+','+(la+0.09).toFixed(2)+'&decimalLongitude='+(lo-0.125).toFixed(2)+','+(lo+0.125).toFixed(2)+'&limit=0',null,15000).then(function(j){return typeof j.count==='number'?j.count:null}).catch(function(){return null});
};
SUP.wiki=function(c){
  var langs=[SET.wikiLang||'it'];if(langs.indexOf('en')<0)langs.push('en');
  var tries=[];langs.forEach(function(l){[c.sci,c.com].filter(Boolean).forEach(function(n){tries.push([l,n])})});var i=0;
  function next(){
    if(i>=tries.length)return Promise.resolve(null);var t=tries[i++];
    return fetchJSON('https://'+t[0]+'.wikipedia.org/api/rest_v1/page/summary/'+encodeURIComponent(t[1].replace(/ /g,'_')),null,12000).then(function(j){
      if(!j||j.type==='disambiguation'||!j.extract)return next();
      return {txt:String(j.extract).slice(0,240),img:j.thumbnail&&j.thumbnail.source,url:j.content_urls&&j.content_urls.desktop&&j.content_urls.desktop.page,lang:t[0]};
    }).catch(function(){return next()});
  }
  return next();
};
SUP.local=function(sci){
  var k=sci.toLowerCase(),f=[];
  if(typeof CHK_SPECIES!=='undefined'&&CHK_SPECIES.some(function(s){return String(s.sci).toLowerCase()===k}))f.push('nella checklist del lago');
  if(typeof ALBERI!=='undefined'&&ALBERI.some(function(a){return String(a[0]).toLowerCase()===k}))f.push('nel catalogo alberi del corso');
  return f;
};
/* ---- esecuzione ---- */
SUP.start=function(){
  readForm();var box=$('#fSuper'),btn=$('#fSup');
  var provs=AI.active(),hasPN=!!SET.plantnet&&(draft.cat==='flora'||draft.cat==='albero'),typed=SUP.typed();
  if(!SUP.kingdom(draft.cat)){box.innerHTML='<div class="card mut">La Super ricerca vale per fauna, flora, alberi e funghi.</div>';return}
  if(navigator.onLine===false){box.innerHTML='<div class="card" style="color:var(--warn)">Serve la rete.</div>';return}
  var sendPh=!$('#supPh')||$('#supPh').checked;
  btn.disabled=true;var id=++SUP.run,st=function(t){if(id===SUP.run)box.innerHTML='<div class="card mut">'+esc(t)+'</div>'};
  st('Preparo le foto…');
  (sendPh?SUP.photos():Promise.resolve([])).then(function(blobs){
    var nPh=Math.min(blobs.length,SUP.N_AI);
    return Promise.all(blobs.slice(0,SUP.N_AI).map(SUP.b64)).then(function(b64){
      var imgs=b64.map(function(x){return {b64:x,mime:'image/jpeg'}});
      if(!typed&&!blobs.length&&!Object.keys(SUP.obs()).some(function(k){return k!=='categoria'&&k!=='quotaM'&&k!=='mese'}))throw new Error('Scrivi un nome, compila qualche campo o aggiungi una foto prima di cercare.');
      if(!typed&&!provs.length&&!hasPN)throw new Error('Senza nome servono una chiave AI (Altro → Assistente AI) o la chiave Pl@ntNet.');
      var fails=[],tasks=[],ask=[];
      st('Interrogo '+(1+(hasPN&&blobs.length?1:0)+provs.length)+' fonti…');
      function wrap(label,pr){return pr.catch(function(e){var c=e&&e.status;fails.push(label+' ('+(c?'HTTP '+c:String(e&&e.message||e))+')');return []})}
      tasks.push(wrap('Nome digitato',SUP.fromName()));ask.push('nome digitato');
      if(hasPN&&blobs.length){tasks.push(wrap('Pl@ntNet',SUP.fromPlantnet(blobs)));ask.push('Pl@ntNet ('+blobs.length+' foto)')}
      provs.forEach(function(p){tasks.push(wrap(p.n,SUP.fromAI(p,imgs)));ask.push(p.n+(AI.vision(p)&&imgs.length?' ('+imgs.length+' foto)':''))});
      return Promise.all(tasks).then(function(lists){
        var map={},order=[];
        lists.forEach(function(L){L.forEach(function(c){var k=c.sci.toLowerCase();if(!map[k]){map[k]={sci:c.sci,com:'',src:[]};order.push(k)}if(c.com&&!map[k].com)map[k].com=c.com;map[k].src.push(c.src)})});
        if(!order.length)return {cands:[],fails:fails,ask:ask,dropped:0};
        st('Verifico '+order.length+' nomi su GBIF…');
        return Promise.all(order.map(function(k){return SUP.verify(map[k].sci).then(function(g){return g?(map[k].gbif=g,map[k]):null}).catch(function(){fails.push('GBIF');return undefined})})).then(function(vv){
          var okAll=vv.filter(function(x){return x}),net=vv.some(function(x){return x===undefined});
          if(!okAll.length&&net)throw new Error('Le fonti hanno risposto, ma GBIF non è raggiungibile per verificare i nomi. Nessun dato applicato; riprova più tardi.');
          var dropped=vv.filter(function(x){return x===null}).length;
          okAll.forEach(function(c){c.n=c.src.length;c.max=Math.max.apply(0,c.src.map(function(s){return s.pct==null?0:s.pct}));c.ai=c.src.filter(function(s){return s.l!=='Nome digitato'&&s.l!=='Pl@ntNet'}).length});
          okAll.sort(function(a,b){return b.n-a.n||b.max-a.max});
          var top=okAll.slice(0,4);
          st('Controllo presenza e Wikipedia…');
          return Promise.all(top.map(function(c){return Promise.all([SUP.near(c.gbif.id),SUP.wiki(c)]).then(function(r){c.near=r[0];c.wk=r[1];c.loc=SUP.local(c.sci)})})).then(function(){return {cands:top,fails:fails,ask:ask,dropped:dropped,nAi:provs.length,nPh:nPh}});
        });
      });
    });
  }).then(function(R){if(id!==SUP.run)return;SUP.draw(R);btn.disabled=false}).catch(function(e){
    if(id===SUP.run)box.innerHTML='<div class="card" style="color:var(--bad)">✗ '+esc(String(e&&e.message||e))+'</div>';btn.disabled=false;
  });
};
SUP.draw=function(R){
  var box=$('#fSuper');
  var h='<div class="card"><b>🔎 Super ricerca</b><div class="mut">Interrogati: '+esc(R.ask.join(', '))+'.'+(R.fails.length?' <span style="color:var(--warn)">Non riusciti: '+esc(R.fails.join('; '))+'.</span>':'')+(R.dropped?' Scartati '+R.dropped+' nomi non verificati su GBIF.':'')+'</div>';
  if(!R.cands.length)h+='<div style="margin-top:8px"><b>Nessuna proposta verificabile.</b><div class="mut">Aggiungi una foto più chiara, un nome o qualche campo e riprova. Non è un risultato negativo: la scheda non è cambiata.</div></div>';
  R.cands.forEach(function(c,i){
    var voti=c.src.filter(function(s){return s.l!=='Nome digitato'}).length;
    h+='<div style="margin-top:10px;padding:8px;border-radius:10px;background:rgba(127,127,127,.12)"><div class="row" style="align-items:flex-start">'
     +(c.wk&&c.wk.img?'<img src="'+esc(safeUrl(c.wk.img))+'" alt="" style="width:64px;height:64px;object-fit:cover;border-radius:8px;margin-right:8px">':'')
     +'<div style="flex:1"><b>'+esc(c.com||c.sci)+'</b>'+(c.com?' <i>'+esc(c.sci)+'</i>':'')
     +'<div class="mut">'+(R.nAi?'🤖 AI '+c.ai+'/'+R.nAi:'')+(c.src.some(function(s){return s.l==='Nome digitato'})?' · ✓ corrisponde al nome digitato':'')+(c.loc.length?' · '+esc(c.loc.join(', ')):'')+'</div></div></div>'
     +'<div class="mut" style="margin-top:6px">'+c.src.map(function(s){return '• '+esc(s.l)+(s.pct!=null?' · '+s.pct+'%':'')+(s.photo?' · con '+s.photo+' foto':'')+(s.why?' — '+esc(s.why):'')}).join('<br>')+'</div>'
     +(c.near!=null?'<div class="mut" style="margin-top:4px">📍 GBIF: '+c.near+(c.near===1?' osservazione':' osservazioni')+' entro circa 10 km</div>':'')
     +(c.wk?'<div class="mut" style="margin-top:4px">'+esc(c.wk.txt)+(c.wk.url?' <a href="'+esc(safeUrl(c.wk.url))+'" target="_blank" rel="noopener">Wikipedia '+esc(c.wk.lang)+'</a>':'')+'</div>':'')
     +'<div class="row" style="margin-top:8px"><button class="btn f" data-supu="'+i+'">Usa questa specie</button></div></div>';
  });
  h+='<div class="mut" style="margin-top:10px">Le percentuali sono stime delle singole fonti, non si sommano né sono confrontabili: più fonti che concordano pesano più di una sola percentuale alta. Verifica sempre l\'esemplare sul campo.</div></div>';
  box.innerHTML=h;
  $$('[data-supu]',box).forEach(function(b){b.onclick=function(){
    var c=R.cands[+b.getAttribute('data-supu')];
    draft.sp={com:c.com||'',sci:c.gbif.name,src:'Super ricerca · '+c.src.map(function(s){return s.l}).join(', '),key:'gbif:'+c.gbif.id,tratti:''};
    $('#fSp').value=spLabel(draft.sp);$('#fSpInfo').textContent='';if(!$('#fTitle').value)$('#fTitle').value=draft.sp.com||draft.sp.sci;
    box.innerHTML='<div class="card" style="color:var(--ok)">✓ Specie impostata: '+esc(spLabel(draft.sp))+'. Ora puoi usare «Compila dai dati» o «Chiedi all\'AI».</div>';
  }});
};
/* riquadro nella scheda, sotto i pulsanti della specie */
SUP.panel=function(){
  var pn=(draft.cat==='flora'||draft.cat==='albero')&&SET.plantnet,n=AI.active().length;
  return '<div class="row" style="margin-top:6px"><button class="btn s" id="fSup">🔎 Super ricerca</button></div>'
   +'<label class="item opt" style="margin-top:4px"><input type="checkbox" id="supPh" checked><span class="tx"><b>Invia le prime 3 foto alle AI</b><small>Invio: nome, campi, note, quota, mese e foto ridotte (1024 px). Mai le coordinate; per i dintorni GBIF riceve la zona arrotondata a circa 1 km.</small></span></label>'
   +'<div id="fSuper"></div>';
};
