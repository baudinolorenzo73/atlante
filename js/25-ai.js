/* Atlante di campo - Assistente AI (v4.8).
   1) «Compila dai dati»: scarica il testo da Wikipedia e l'AI lo riassume in italiano (solo da quel testo, mai a memoria).
   2) «Chiedi all'AI» (v4.8): una chat dentro la scheda; l'AI sa già di cosa parli (categoria, specie, campi, note, quota, data, meteo,
      testi di ricerca e, se c'è, la voce di Wikipedia) e distingue ciò che viene dal contesto da ciò che è conoscenza generale.
   Provider: Gemini (nativo) e Groq, Cerebras, OpenRouter, Together (compatibili OpenAI). Si prova nell'ordine; se uno è esaurito o in errore si passa al successivo.
   Le chiavi restano solo su questo dispositivo (SET.ai.k), non vanno nei backup né su Drive. Si possono caricare da un file open.env.
   Le idee su modelli di ripiego, nuovi tentativi e lettura di open.env vengono dal progetto «Scheda Botanica PRO» di Lorenzo; codice scritto da capo.
   by Lollo ®2026 · i moduli si caricano nell'ordine dei numeri (vedi index.html) */
'use strict';
var AI={
  PROV:[
    {id:'gemini',n:'Google Gemini',url:'https://aistudio.google.com/apikey',m:'gemini-3.5-flash'},
    {id:'groq',n:'Groq',url:'https://console.groq.com/keys',base:'https://api.groq.com/openai/v1',m:'llama-3.3-70b-versatile',mv:'qwen/qwen3.8-27b'},
    {id:'cerebras',n:'Cerebras',url:'https://cloud.cerebras.ai',base:'https://api.cerebras.ai/v1',m:'llama-3.3-70b'},
    {id:'openrouter',n:'OpenRouter',url:'https://openrouter.ai/keys',base:'https://openrouter.ai/api/v1',m:'meta-llama/llama-3.3-70b-instruct:free'},
    {id:'together',n:'Together AI',url:'https://api.together.ai/settings/api-keys',base:'https://api.together.xyz/v1',m:'meta-llama/Llama-3.3-70B-Instruct-Turbo'}
  ],
  ENV:{GOOGLE_API_KEY:'gemini',GEMINI_API_KEY:'gemini',GROQ_API_KEY:'groq',CEREBRAS_API_KEY:'cerebras',OPENROUTER_API_KEY:'openrouter',TOGETHER_API_KEY:'together'},
  MAXSRC:6000,
  RETRY:[1000,2000],   // attese (ms) prima di riprovare dopo un errore 500/502/503/504 del servizio
  alt:{}               // modello di ripiego scelto dal catalogo del provider (solo in memoria)
};
AI.cfg=function(){if(!SET.ai)SET.ai={k:{},m:{}};if(!SET.ai.k)SET.ai.k={};if(!SET.ai.m)SET.ai.m={};return SET.ai};
AI.key=function(id){return AI.cfg().k[id]||''};
AI.model=function(p){return AI.cfg().m[p.id]||p.m};
AI.active=function(){return AI.PROV.filter(function(p){return AI.key(p.id)})};
AI.stars=function(id){var k=AI.key(id);return k?'*'.repeat(Math.min(k.length,12)):''};
AI.byId=function(id){return AI.PROV.filter(function(p){return p.id===id})[0]};
/* HTTP con tempo massimo; negli errori conserva stato e un pezzo di risposta (serve a capire se il guaio è il modello) */
AI.http=function(url,opt,ms){
  opt=opt||{};var ctl=window.AbortController?new AbortController():null,t=ctl&&setTimeout(function(){ctl.abort()},ms||45000);
  if(ctl)opt=Object.assign({},opt,{signal:ctl.signal});
  return fetch(url,opt).then(function(r){clearTimeout(t);
    if(!r.ok)return r.text().then(function(tx){var e=new Error('HTTP '+r.status);e.status=r.status;e.detail=String(tx||'').slice(0,300);throw e});
    return r.json();
  }).catch(function(e){clearTimeout(t);throw (e&&e.name==='AbortError')?new Error('nessuna risposta (rete assente o lenta)'):e});
};
AI.reasons=function(m){return /qwen|gpt-oss|deepseek|reason/i.test(m)};
/* Una chiamata: restituisce il testo. system = istruzioni; msgs = [{r:'user'|'ai',t:'…'}] */
AI.vision=function(p){return p.id==='gemini'||p.id==='groq'};   // quali provider accettano foto
AI.once=function(p,model,system,msgs,temp,imgs){
  imgs=imgs||[];
  var key=AI.key(p.id);
  if(p.id==='gemini'){
    var body={contents:msgs.map(function(m,i){var pt=[{text:m.t}];if(i===msgs.length-1)imgs.forEach(function(x){pt.push({inline_data:{mime_type:x.mime||'image/jpeg',data:x.b64}})});return {role:m.r==='ai'?'model':'user',parts:pt}}),generationConfig:{temperature:temp}};
    if(system)body.systemInstruction={parts:[{text:system}]};
    return AI.http('https://generativelanguage.googleapis.com/v1beta/models/'+encodeURIComponent(model)+':generateContent',{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':key},body:JSON.stringify(body)},60000).then(function(j){
      var c=j&&j.candidates&&j.candidates[0],t=c&&c.content&&c.content.parts&&c.content.parts.filter(function(x){return !x.thought}).map(function(x){return x.text||''}).join('');
      if(!t||!t.trim())throw new Error('risposta vuota o bloccata'+((j&&j.promptFeedback&&j.promptFeedback.blockReason)||(c&&c.finishReason)?' ('+((j.promptFeedback&&j.promptFeedback.blockReason)||c.finishReason)+')':''));
      return t;
    });
  }
  var mm=(system?[{role:'system',content:system}]:[]).concat(msgs.map(function(m,i){var c=m.t;if(i===msgs.length-1&&imgs.length)c=[{type:'text',text:m.t}].concat(imgs.map(function(x){return {type:'image_url',image_url:{url:'data:'+(x.mime||'image/jpeg')+';base64,'+x.b64}}}));return {role:m.r==='ai'?'assistant':'user',content:c}}));
  var b={model:model,temperature:temp,messages:mm};
  if(p.id==='groq'&&AI.reasons(model)){b.reasoning_format='hidden';b.reasoning_effort=/qwen/i.test(model)?'none':'low'}
  return AI.http(p.base+'/chat/completions',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+key},body:JSON.stringify(b)},60000).then(function(j){
    var t=j&&j.choices&&j.choices[0]&&j.choices[0].message&&j.choices[0].message.content;
    if(typeof t!=='string'||!t.trim())throw new Error('risposta vuota');
    return t.replace(/<think>[\s\S]*?<\/think>/gi,'').trim();
  });
};
/* Riprova dopo un errore temporaneo del servizio (500/502/503/504) */
AI.retry=function(p,model,system,msgs,temp,imgs){
  var n=0;
  function go(){return AI.once(p,model,system,msgs,temp,imgs).catch(function(e){
    if([500,502,503,504].indexOf(e.status)>=0&&n<AI.RETRY.length){var w=AI.RETRY[n++];return new Promise(function(r){setTimeout(r,w)}).then(go)}
    throw e;
  })}
  return go();
};
/* Il guaio è il modello (non esiste più, non è concesso a questa chiave, nessuna quota gratuita)? */
AI.modelErr=function(e){
  if(e.status===404)return true;
  var d=String(e.detail||'').toLowerCase();
  if(e.status===400||e.status===403)return /model|not found|not supported|no longer available|decommission|deprecat/.test(d);
  if(e.status===429)return /limit: 0|free_tier|free tier/.test(d);
  return false;
};
/* Modello di ripiego dal catalogo ufficiale del provider (solo Gemini e Groq, e solo se non hai scelto tu il modello) */
AI.altModel=function(p,bad,vis){
  var key=AI.key(p.id);
  var url=p.id==='gemini'?'https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000':p.base+'/models';
  var hd=p.id==='gemini'?{'x-goog-api-key':key}:{'Authorization':'Bearer '+key};
  return AI.http(url,{headers:hd},15000).then(function(j){
    var m;
    if(p.id==='gemini'){
      var ok=(j.models||[]).filter(function(x){return x.supportedGenerationMethods&&x.supportedGenerationMethods.indexOf('generateContent')>=0}).map(function(x){return String(x.name||'').replace(/^models\//,'')});
      m=ok.filter(function(x){return /^gemini-[\d.]+-flash(?:-lite)?$/.test(x)&&x!==bad})
        .sort(function(a,b){return (/-lite$/.test(a)?1:0)-(/-lite$/.test(b)?1:0)||b.localeCompare(a,'en',{numeric:true})})[0];
    }else{
      var av=(j.data||[]).filter(function(x){return x.active!==false}).map(function(x){return x.id});
      m=(vis?['qwen/qwen3.8-27b','meta-llama/llama-4-scout-17b-16e-instruct']:['llama-3.3-70b-versatile','openai/gpt-oss-120b','llama-3.1-8b-instant','openai/gpt-oss-20b']).filter(function(x){return x!==bad&&av.indexOf(x)>=0})[0];
    }
    if(!m)throw new Error('nessun modello alternativo nel catalogo');
    return m;
  });
};
AI.send=function(p,system,msgs,temp,imgs){
  imgs=imgs&&imgs.length&&AI.vision(p)?imgs:null;
  var vis=!!imgs,ak=p.id+(vis?'v':''),custom=!!AI.cfg().m[p.id]&&!(vis&&p.mv),cached=AI.alt[ak];
  var model=cached||(vis&&p.mv?p.mv:AI.model(p));
  return AI.retry(p,model,system,msgs,temp,imgs).catch(function(e){
    if(custom||cached||!AI.modelErr(e)||(p.id!=='gemini'&&p.id!=='groq'))throw e;
    return AI.altModel(p,model,vis).then(function(m){AI.alt[ak]=m;return AI.retry(p,m,system,msgs,temp,imgs)});
  });
};
/* Prova i provider nell'ordine; passa al successivo se uno fallisce. Restituisce {text,prov} */
AI.run=function(system,msgs,temp){
  var list=AI.active(),errs=[],i=0;
  if(!list.length)return Promise.reject(new Error('NOKEY'));
  function next(){
    if(i>=list.length)return Promise.reject(new Error('Nessun provider ha risposto: '+errs.join('; ')));
    var p=list[i++];
    return AI.send(p,system,msgs,temp).then(function(t){return {text:t,prov:p}}).catch(function(e){errs.push(p.n+' ('+String(e&&e.message||e)+')');return next()});
  }
  return next();
};
/* Verifica una chiave senza consumare quota di generazione: elenca i modelli */
AI.verify=function(p,key){
  var url=p.id==='gemini'?'https://generativelanguage.googleapis.com/v1beta/models?pageSize=1':p.base+'/models';
  var hd=p.id==='gemini'?{'x-goog-api-key':key}:{'Authorization':'Bearer '+key};
  return AI.http(url,{headers:hd},15000);
};
/* Testo della fonte: Wikipedia (lingua scelta, poi inglese), cercando prima il nome scientifico e poi quello comune */
AI.source=function(sp){
  var names=[sp.sci,sp.com].filter(Boolean),langs=[SET.wikiLang||'it'];if(langs.indexOf('en')<0)langs.push('en');
  var tries=[],i=0;langs.forEach(function(l){names.forEach(function(n){tries.push([l,n])})});
  function next(){
    if(i>=tries.length)return Promise.resolve(null);
    var t=tries[i++],l=t[0];
    return fetchJSON('https://'+l+'.wikipedia.org/w/api.php?action=query&prop=extracts|info&inprop=url&explaintext=1&redirects=1&format=json&origin=*&titles='+encodeURIComponent(t[1]),null,15000).then(function(j){
      var pg=j&&j.query&&j.query.pages,k=pg&&Object.keys(pg)[0],p=k&&pg[k];
      if(!p||p.missing!==undefined||!p.extract||p.extract.length<200)return next();
      var tx=p.extract.replace(/\n=+\s*(Note|Bibliografia|Altri progetti|Collegamenti esterni|Voci correlate|References|External links|See also|Further reading)\s*=+[\s\S]*$/i,'').trim();
      return {text:tx.slice(0,AI.MAXSRC),title:p.title,url:p.fullurl||('https://'+l+'.wikipedia.org/wiki/'+encodeURIComponent(p.title)),lang:l};
    }).catch(function(){return next()});
  }
  return next();
};
AI.parse=function(t){
  t=String(t||'').replace(/^```(?:json)?/i,'').replace(/```\s*$/,'').trim();
  var a=t.indexOf('{'),b=t.lastIndexOf('}');if(a<0||b<=a)throw new Error('risposta non valida');
  var o=JSON.parse(t.slice(a,b+1));
  return {tratti:String(o.tratti||'').trim().slice(0,200),ricerca:String(o.ricerca||'').trim()};
};
/* ---------- 1) Compila dai dati ---------- */
AI.prompt=function(cat,sp,src){
  var tipo={fauna:'animale',flora:'pianta',albero:'albero',fungo:'fungo'}[cat]||'organismo';
  return 'Sei un assistente per un atlante naturalistico di campo. Ti do il testo di una voce di Wikipedia su un '+tipo+': '+(sp.com?sp.com+' ':'')+(sp.sci?'('+sp.sci+')':'')+'.\n'
   +'Riassumi in italiano SOLO ciò che è scritto nel testo. Non aggiungere nulla di tuo, non usare conoscenze esterne, non inventare. Se un\'informazione non è nel testo, omettila.\n'
   +'Rispondi SOLO con un oggetto JSON valido, senza altro testo né ```, con queste chiavi:\n'
   +'{"tratti": "una riga (max 140 caratteri) con i caratteri per riconoscerlo",\n'
   +' "ricerca": "riassunto di 4-7 frasi: descrizione, habitat e distribuzione, ecologia/ciclo (e fioritura o riproduzione se presenti), curiosità o stato di conservazione se presenti"}\n\n'
   +'TESTO (da '+src.title+', Wikipedia '+src.lang+'):\n"""\n'+src.text+'\n"""';
};
AI.noKeyMsg=function(){alert('Serve una chiave gratuita di almeno un provider AI.\n\n1) Vai su aistudio.google.com/apikey e crea una chiave (Google Gemini).\n2) In questa app: Altro → Assistente AI → incolla la chiave nella riga Google Gemini e tocca «Salva chiavi» (oppure «Carica da open.env»).\n3) Tocca «Verifica» per controllare che funzioni.')};
AI.fill=function(){
  readForm();var box=$('#fAiBox');
  if(!draft.sp||(!draft.sp.sci&&!draft.sp.com)){box.innerHTML='<div class="card mut">Scrivi prima la specie e scegline una dall\'elenco.</div>';return}
  if(!AI.active().length){AI.noKeyMsg();return}
  if(navigator.onLine===false){box.innerHTML='<div class="card" style="color:var(--warn)">Serve la rete.</div>';return}
  var btn=$('#fAi'),sp=draft.sp;btn.disabled=true;box.innerHTML='<div class="card mut">Cerco il testo su Wikipedia…</div>';
  AI.source(sp).then(function(src){
    if(!src){box.innerHTML='<div class="card"><b>Nessuna fonte trovata</b><div class="mut">Non c\'è una voce di Wikipedia per «'+esc(sp.sci||sp.com)+'». Per non inventare, non compilo niente. Puoi provare «Chiedi all\'AI».</div></div>';btn.disabled=false;return}
    box.innerHTML='<div class="card mut">Fonte: '+esc(src.title)+' (Wikipedia '+esc(src.lang)+'). Chiedo il riassunto all\'AI…</div>';
    return AI.run('',[{r:'user',t:AI.prompt(draft.cat,sp,src)}],0.1).then(function(r){
      var o=AI.parse(r.text);
      if(!o.ricerca&&!o.tratti)throw new Error('nessun contenuto');
      var cit='[Wikipedia '+src.lang+' · '+src.title+' · '+src.url+' · riassunto AI ('+r.prov.n+') del '+ldate(new Date().toISOString())+', da verificare]';
      box.innerHTML='<div class="card"><b>✨ Proposta (non ancora salvata)</b><div class="mut">Fonte: <a href="'+esc(safeUrl(src.url))+'" target="_blank" rel="noopener">'+esc(src.title)+'</a> · riassunto di '+esc(r.prov.n)+'. Controlla e correggi prima di aggiungere.</div>'
       +(o.tratti&&!sp.tratti?'<label class="l">Come riconoscerlo (riga sotto la specie)</label><input type="text" id="aiTr" value="'+esc(o.tratti)+'">':'')
       +'<label class="l">Testo per «Dalla ricerca»</label><textarea id="aiRic" style="min-height:140px">'+esc(o.ricerca)+'</textarea>'
       +'<div class="row" style="margin-top:8px"><button class="btn f" id="aiOk">Aggiungi alla scheda</button><button class="btn" id="aiNo">Scarta</button></div></div>';
      $('#aiNo').onclick=function(){box.innerHTML=''};
      $('#aiOk').onclick=function(){
        var tr=$('#aiTr'),ric=$('#aiRic').value.trim();
        if(tr&&tr.value.trim()){draft.sp.tratti=tr.value.trim();$('#fSpInfo').textContent=draft.sp.tratti}
        if(ric)AI.addRic(ric+'\n'+cit);
        box.innerHTML='<div class="card" style="color:var(--ok)">✓ Aggiunto a «Dalla ricerca». Ricorda di salvare il punto.</div>';
      };
      btn.disabled=false;
    });
  }).catch(function(e){
    var m=String(e&&e.message||e);
    box.innerHTML='<div class="card" style="color:var(--bad)">✗ '+esc(m==='NOKEY'?'Nessuna chiave AI salvata.':m)+'</div>';btn.disabled=false;
  });
};
/* aggiunge testo in coda a «Dalla ricerca» e apre il riquadro */
AI.addRic=function(txt){var f=$('#fRic');if(!f)return;var cur=f.value.trim();f.value=(cur?cur+'\n\n':'')+txt;f.style.minHeight='160px';var dt=f.closest('details');if(dt)dt.open=true};
/* ---------- 2) Chiedi all'AI (chat con il contesto della scheda) ---------- */
AI.MESI=['gennaio','febbraio','marzo','aprile','maggio','giugno','luglio','agosto','settembre','ottobre','novembre','dicembre'];
AI.ctx=function(){
  readForm();var c=CAT(draft.cat),sp=draft.sp||{},L=[];
  L.push('Categoria: '+c.n);
  if(sp.sci||sp.com)L.push('Specie: '+[sp.com,sp.sci].filter(Boolean).join(' – '));
  if(sp.tratti)L.push('Tratti noti: '+sp.tratti);
  if(draft.title)L.push('Titolo della scheda: '+draft.title);
  (EXTRA[draft.cat]||[]).forEach(function(f){var v=draft.x[f.k];if(v!=null&&v!=='')L.push(f.l+': '+v)});
  if(draft.alt!=null&&isFinite(draft.alt))L.push('Quota: '+Math.round(draft.alt)+' m');
  if(draft.when){var d=new Date(draft.when);if(!isNaN(d))L.push('Data dell\'osservazione: '+d.getDate()+' '+AI.MESI[d.getMonth()]+' '+d.getFullYear())}
  if(draft.meteo)L.push('Meteo: '+draft.meteo);
  if(draft.note&&draft.note.trim())L.push('Note dell\'osservatore: '+draft.note.trim().slice(0,800));
  var ric=$('#fRic');if(ric&&ric.value.trim())L.push('Testi di ricerca già raccolti: '+ric.value.trim().slice(0,1500));
  if(AI.cfg().geo&&draft.lat!=null)L.push('Zona (coordinate arrotondate a circa 1 km): '+(+draft.lat).toFixed(2)+', '+(+draft.lon).toFixed(2));
  return L.join('\n');
};
AI.system=function(src){
  return 'Sei l\'assistente di un atlante naturalistico di campo (Italia). Rispondi in italiano, in modo concreto e breve (di solito sotto le 150 parole); usa un elenco solo se serve.\n'
   +'Hai il contesto della scheda su cui l\'osservatore sta lavorando: usalo e non chiedere di nuovo ciò che già sai.\n'
   +'Regole:\n1) Non inventare: se non sei sicuro, dillo e indica come verificare.\n'
   +'2) Distingui ciò che viene dal contesto'+(src?' o dalla FONTE':'')+' da ciò che è conoscenza generale: in questo caso scrivi «(conoscenza generale)».\n'
   +'3) Non confermare mai la commestibilità di funghi o piante e non dare usi medicinali o dosi: serve un esperto.\n'
   +'4) Non confermare un\'identificazione dalle sole parole: indica i caratteri per distinguerla dalle specie simili.\n'
   +'5) Per misure, date e quote dai intervalli, non valori inventati.\n\n'
   +'CONTESTO DELLA SCHEDA:\n'+AI.ctx()
   +(src?'\n\nFONTE (Wikipedia '+src.lang+', voce «'+src.title+'»):\n'+src.text.slice(0,4000):'');
};
AI.srcFor=function(){
  var sp=draft.sp;if(!sp||(!sp.sci&&!sp.com))return Promise.resolve(null);
  var k=(sp.sci||sp.com)+'|'+(SET.wikiLang||'it');
  if(draft._srcK===k)return Promise.resolve(draft._src||null);
  return AI.source(sp).then(function(s){draft._srcK=k;draft._src=s||null;return draft._src}).catch(function(){return null});
};
AI.fmt=function(t){return esc(t).replace(/\*\*([^*\n]+)\*\*/g,'<b>$1</b>')};
AI.sug=function(){
  var b=['Come si riconosce?','Con cosa si può confondere?','Dove e quando si trova di solito?','Qualche curiosità?'];
  if(draft.cat==='flora'||draft.cat==='albero')b.splice(2,0,'Quando fiorisce e fruttifica?');
  if(draft.cat==='fauna')b.splice(2,0,'Che cosa mangia e come si comporta?');
  if(draft.cat==='fungo')b.splice(2,0,'Che habitat e periodo ha?');
  if(draft.cat==='geo')b=['Come si è formata questa roccia?','Come si riconosce sul campo?','Cosa potrebbe aver trasportato fin qui?'];
  return b;
};
AI.chatDraw=function(){
  var h=draft._chat||[],box=$('#aiMsgs');if(!box)return;
  box.innerHTML=h.map(function(m,i){
    return m.r==='user'
      ?'<div style="margin:8px 0 8px 18%;padding:8px 10px;border-radius:12px;background:rgba(46,125,50,.18);white-space:pre-wrap">'+esc(m.t)+'</div>'
      :'<div style="margin:8px 18% 8px 0;padding:8px 10px;border-radius:12px;background:rgba(127,127,127,.14);white-space:pre-wrap">'+AI.fmt(m.t)
        +'<div class="mut" style="margin-top:6px;white-space:normal">'+esc(m.p||'AI')+' · da verificare <button class="btn s" data-aipin="'+i+'" style="margin-left:6px">📌 Aggiungi a «Dalla ricerca»</button></div></div>';
  }).join('')+(draft._busy?'<div class="mut" style="margin:8px 0">…sto scrivendo</div>':'');
  $$('[data-aipin]').forEach(function(b){b.onclick=function(){
    var i=+b.getAttribute('data-aipin'),a=h[i],q=h[i-1];
    AI.addRic((q?'Domanda: '+q.t+'\n':'')+'Risposta: '+a.t+'\n[AI ('+(a.p||'')+') del '+ldate(new Date().toISOString())+', da verificare]');
    b.textContent='✓ Aggiunto';b.disabled=true;
  }});
  box.scrollTop=box.scrollHeight;
};
AI.chatCtxShow=function(){var e=$('#aiCtx');if(e)e.textContent=AI.ctx()+(draft._src?'\n\nFonte: Wikipedia '+draft._src.lang+' · '+draft._src.title:'')};
AI.chatSend=function(q){
  q=(q||'').trim();if(!q||draft._busy)return;
  if(navigator.onLine===false){toast('Serve la rete');return}
  var h=draft._chat=draft._chat||[];h.push({r:'user',t:q});draft._busy=true;$('#aiQ').value='';AI.chatDraw();
  AI.srcFor().then(function(src){
    return AI.run(AI.system(src),h.slice(-10),0.3).then(function(r){h.push({r:'ai',t:r.text.trim(),p:r.prov.n})}).then(function(){AI.chatCtxShow()});
  }).catch(function(e){
    h.pop();var m=String(e&&e.message||e);$('#aiQ').value=q;
    $('#aiErr').innerHTML='<div class="card" style="color:var(--bad)">✗ '+esc(m==='NOKEY'?'Nessuna chiave AI salvata.':m)+'</div>';
  }).then(function(){draft._busy=false;AI.chatDraw()});
};
AI.chat=function(){
  readForm();var box=$('#fChat');
  if(box.innerHTML){box.innerHTML='';return}
  if(!AI.active().length){AI.noKeyMsg();return}
  draft._chat=draft._chat||[];
  box.innerHTML='<div class="card"><b>💬 Chiedi all\'AI</b>'
   +'<details style="margin-top:6px"><summary class="mut">Cosa sa l\'AI di questa scheda</summary><div class="mut" id="aiCtx" style="white-space:pre-wrap;margin-top:6px"></div>'
   +'<label class="item opt" style="margin-top:8px"><input type="checkbox" id="aiGeo"'+(AI.cfg().geo?' checked':'')+'><span class="tx"><b>Invia anche la zona</b><small>coordinate arrotondate a circa 1 km, utile per «è tipica qui?»; mai la posizione precisa</small></span></label></details>'
   +'<div id="aiMsgs" style="max-height:320px;overflow:auto"></div><div id="aiErr"></div>'
   +'<div class="row" id="aiSug" style="margin-top:6px;flex-wrap:wrap">'+AI.sug().map(function(s,i){return '<button class="btn s" data-aisug="'+i+'">'+esc(s)+'</button>'}).join('')+'</div>'
   +'<textarea id="aiQ" style="min-height:56px;margin-top:8px" placeholder="Scrivi la tua domanda su questa scheda…"></textarea>'
   +'<div class="row" style="margin-top:6px"><button class="btn f" id="aiSend">Invia</button><button class="btn s" id="aiClr">Svuota chat</button></div>'
   +'<div class="mut" style="margin-top:6px">Le risposte sono dell\'AI, non di una fonte: controllale prima di usarle. Per funghi e piante non fidarti per la commestibilità.</div></div>';
  var sg=AI.sug();
  $$('[data-aisug]').forEach(function(b){b.onclick=function(){AI.chatSend(sg[+b.getAttribute('data-aisug')])}});
  $('#aiSend').onclick=function(){$('#aiErr').innerHTML='';AI.chatSend($('#aiQ').value)};
  $('#aiClr').onclick=function(){draft._chat=[];AI.chatDraw();$('#aiErr').innerHTML=''};
  $('#aiGeo').onchange=function(){AI.cfg().geo=this.checked;saveSet();AI.chatCtxShow()};
  AI.chatCtxShow();AI.chatDraw();
  AI.srcFor().then(function(){AI.chatCtxShow()});
};
/* ---------- Altro → Assistente AI ---------- */
AI.altBody=function(){
  var h='<div class="card"><div class="mut">Due strumenti nella scheda: <b>✨ Compila dai dati</b> (riassume Wikipedia) e <b>💬 Chiedi all\'AI</b> (domande sulla scheda aperta). Puoi mettere più provider gratuiti: l\'app li prova in questo ordine e passa al successivo se uno è esaurito. Le chiavi restano solo su questo telefono.</div>'
   +'<div class="row" style="margin-top:10px"><button class="btn" id="bAiEnv">📂 Carica da open.env</button></div>'
   +'<input type="file" id="fAiEnv" style="display:none"><div class="mut" id="aiEnvSt" style="margin-top:4px">Legge dal file solo le chiavi dei provider qui sotto (GOOGLE_API_KEY o GEMINI_API_KEY, GROQ, CEREBRAS, OPENROUTER, TOGETHER); il file non viene salvato né inviato.</div>';
  AI.PROV.forEach(function(p,i){
    h+='<div style="margin-top:12px"><b>'+(i+1)+'. '+esc(p.n)+'</b> · <a href="'+p.url+'" target="_blank" rel="noopener">crea chiave</a>'
     +'<label class="l">Chiave</label><input type="'+(AI.key(p.id)?'text':'password')+'" data-ak="'+p.id+'" value="'+esc(AI.stars(p.id))+'" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="incolla qui la chiave">'
     +'<label class="l">Modello (modificabile)</label><input type="text" data-am="'+p.id+'" value="'+esc(AI.model(p))+'" autocomplete="off" autocapitalize="off" spellcheck="false">'
     +'<div class="row" style="margin-top:6px"><button class="btn s" data-av="'+p.id+'">🔎 Verifica</button><span class="mut" data-as="'+p.id+'">'+(AI.key(p.id)?'Chiave salvata.':'Nessuna chiave.')+'</span></div></div>';
  });
  return h+'<div class="row" style="margin-top:14px"><button class="btn f" id="bAiS">Salva chiavi</button></div><div class="mut" id="aiSt" style="margin-top:6px"></div></div>';
};
AI.kval=function(id){var e=document.querySelector('[data-ak="'+id+'"]'),v=(e.value||'').trim();return /^\*+$/.test(v)?AI.key(id):v};
AI.paintKeys=function(){
  AI.PROV.forEach(function(p){var e=document.querySelector('[data-ak="'+p.id+'"]'),k=AI.key(p.id);if(!e)return;e.type=k?'text':'password';e.value=AI.stars(p.id);document.querySelector('[data-as="'+p.id+'"]').textContent=k?'Chiave salvata (tocca Verifica per provarla).':'Nessuna chiave.'});
};
/* legge un testo tipo open.env: RIGA = valore, anche tra virgolette, con «export» e commenti */
AI.parseEnv=function(txt){
  var out={};
  String(txt||'').replace(/^﻿/,'').split(/\r?\n/).forEach(function(riga){
    var m=riga.match(/^\s*(?:export\s+)?([A-Z][A-Z0-9_]*)\s*=\s*(.*?)\s*$/);if(!m||!AI.ENV[m[1]])return;
    var v=m[2];
    if(v.charAt(0)==='"'||v.charAt(0)==="'"){var q=v.match(/^(["'])(.*?)\1(?:\s*#.*)?$/);if(!q)return;v=q[2]}else v=v.replace(/\s+#.*$/,'').trim();
    if(v&&v.length<=4096){var id=AI.ENV[m[1]];if(!out[id]||m[1]==='GEMINI_API_KEY')out[id]=v}
  });
  return out;
};
AI.bindAlt=function(){
  $$('[data-ak]').forEach(function(e){e.onfocus=function(){if(/^\*+$/.test(this.value))this.select()};e.oninput=function(){this.type=(!this.value||/^\*+$/.test(this.value))?'text':'password'}});
  $('#bAiEnv').onclick=function(){$('#fAiEnv').value='';$('#fAiEnv').click()};
  $('#fAiEnv').onchange=function(){
    var f=this.files[0];if(!f)return;
    var rd=new FileReader();rd.onload=function(){
      var k=AI.parseEnv(rd.result),ids=Object.keys(k);
      if(!ids.length){$('#aiEnvSt').innerHTML='<span style="color:var(--warn)">Nessuna chiave riconosciuta nel file.</span>';return}
      ids.forEach(function(id){AI.cfg().k[id]=k[id]});
      saveSet().then(function(){AI.paintKeys();$('#aiEnvSt').innerHTML='<span style="color:var(--ok)">✓ '+ids.length+(ids.length===1?' chiave caricata: ':' chiavi caricate: ')+ids.map(function(id){return esc(AI.byId(id).n)}).join(', ')+'.</span> Tocca «Verifica» su ognuna per provarla.'});
    };
    rd.onerror=function(){$('#aiEnvSt').innerHTML='<span style="color:var(--bad)">Non riesco a leggere il file.</span>'};
    rd.readAsText(f);
  };
  $$('[data-av]').forEach(function(b){b.onclick=function(){
    var id=b.getAttribute('data-av'),p=AI.byId(id),st=document.querySelector('[data-as="'+id+'"]'),k=AI.kval(id);
    if(!k){st.innerHTML='<span style="color:var(--warn)">Incolla prima la chiave.</span>';return}
    if(navigator.onLine===false){st.innerHTML='<span style="color:var(--warn)">Serve la rete.</span>';return}
    st.textContent='Verifico…';b.disabled=true;
    AI.verify(p,k).then(function(){
      var ch=k!==AI.key(id);if(ch){AI.cfg().k[id]=k;saveSet()}
      var e=document.querySelector('[data-ak="'+id+'"]');e.type='text';e.value=AI.stars(id);
      st.innerHTML='<span style="color:var(--ok)">✓ Chiave valida'+(ch?' e salvata':'')+'.</span>';b.disabled=false;
    }).catch(function(er){
      var m=String(er&&er.message||er),c=er&&er.status;
      st.innerHTML='<span style="color:var(--bad)">✗ '+(c===400||c===401||c===403?'chiave non valida o non abilitata ('+c+')'+(id==='gemini'?': una chiave Google generica può non essere abilitata per Gemini, creane una su aistudio.google.com/apikey':'. Controlla di averla copiata tutta'):c===429?'quota esaurita (429): la chiave però esiste.':esc(m)+' (può essere un provider che non accetta richieste dal browser)')+'</span>';b.disabled=false;
    });
  }});
  var s=$('#bAiS');if(s)s.onclick=function(){
    var c=AI.cfg(),n=0;
    AI.PROV.forEach(function(p){var k=AI.kval(p.id);if(k){c.k[p.id]=k;n++}else delete c.k[p.id];
      var m=(document.querySelector('[data-am="'+p.id+'"]').value||'').trim();if(m&&m!==p.m)c.m[p.id]=m;else delete c.m[p.id]});
    AI.alt={};
    saveSet().then(function(){AI.paintKeys();$('#aiSt').textContent=n+(n===1?' chiave salvata.':' chiavi salvate.')});
  };
};
