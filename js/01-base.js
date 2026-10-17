/* Atlante di campo - Configurazione, utilità, database (IndexedDB), impostazioni, categorie e campi delle schede.
   by Lollo ®2026 · i moduli si caricano nell'ordine dei numeri (vedi index.html) */
'use strict';
var BRAND='by Lollo ®2026';
var HOME=[45.0567,7.3922];
var MAXZ=22;

/* =================== UTILITÀ =================== */
function $(s,r){return (r||document).querySelector(s)}
function $$(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))}
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function uid(){return Date.now().toString(36)+Math.random().toString(36).slice(2,8)}
function pad(n){return (n<10?'0':'')+n}
function fmtDate(iso){if(!iso)return'';var d=new Date(iso);if(isNaN(d))return iso;return pad(d.getDate())+'/'+pad(d.getMonth()+1)+'/'+d.getFullYear()+' '+pad(d.getHours())+':'+pad(d.getMinutes())}
function localInput(iso){var d=iso?new Date(iso):new Date();return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())+'T'+pad(d.getHours())+':'+pad(d.getMinutes())}
function dist(a,b,c,d){var R=6371000,r=Math.PI/180,x=(c-a)*r,y=(d-b)*r,h=Math.sin(x/2)*Math.sin(x/2)+Math.cos(a*r)*Math.cos(c*r)*Math.sin(y/2)*Math.sin(y/2);return 2*R*Math.asin(Math.sqrt(h))}
function fmtDist(m){return m<1000?Math.round(m)+' m':(m/1000).toFixed(m<10000?2:1)+' km'}
function fmtDur(ms){var s=Math.round(ms/1000),h=Math.floor(s/3600),m=Math.floor(s%3600/60);return (h?h+' h ':'')+m+' min'}
function fmtSize(b){return b<1024?b+' B':b<1048576?(b/1024).toFixed(0)+' kB':(b/1048576).toFixed(1)+' MB'}
var toastT;function toast(t,ms){var e=$('#toast');e.textContent=t;e.style.display='block';clearTimeout(toastT);toastT=setTimeout(function(){e.style.display='none'},ms||2600)}
function stamp(){var d=new Date();return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())+'_'+pad(d.getHours())+pad(d.getMinutes())}
function slug(s){return String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-zA-Z0-9]+/g,'_').replace(/^_|_$/g,'').slice(0,40)||'punto'}
function fetchJSON(url,opt){return fetch(url,opt).then(function(r){if(!r.ok)throw new Error('HTTP '+r.status);return r.json()})}
function el(html){var t=document.createElement('template');t.innerHTML=html.trim();return t.content.firstChild}

/* OpenStreetMap (Overpass): il server principale è spesso sovraccarico e in quel caso il browser mostra solo «Failed to fetch».
   Si provano in ordine più server, con un tempo massimo per ciascuno. */
var OVP=['https://overpass-api.de/api/interpreter','https://overpass.private.coffee/api/interpreter','https://overpass.kumi.systems/api/interpreter','https://maps.mail.ru/osm/tools/overpass/api/interpreter'];
function overpass(q,ms){
  var errs=[];
  function one(i){
    if(i>=OVP.length)return Promise.reject(new Error('OpenStreetMap non risponde ora ('+errs.join('; ')+'). Riprova tra qualche minuto'));
    var ctl=window.AbortController?new AbortController():null,t=ctl&&setTimeout(function(){ctl.abort()},ms||45000);
    return fetch(OVP[i],{method:'POST',body:'data='+encodeURIComponent(q),headers:{'Content-Type':'application/x-www-form-urlencoded'},signal:ctl?ctl.signal:undefined})
      .then(function(r){clearTimeout(t);if(!r.ok)throw new Error('HTTP '+r.status);return r.json()})
      .then(function(j){if(j&&j.remark&&!(j.elements||[]).length&&/timed out|out of memory|runtime error/i.test(j.remark))throw new Error('server sovraccarico');return j})
      .catch(function(e){clearTimeout(t);errs.push(OVP[i].split('/')[2]+': '+(e.name==='AbortError'?'tempo scaduto':e.message==='Failed to fetch'?'non raggiungibile':e.message));return one(i+1)});
  }
  return one(0);
}

/* =================== DATABASE (IndexedDB) =================== */
var DB={db:null,ok:false,mem:{points:{},media:{},tracks:{},kv:{}}};
DB.open=function(){return new Promise(function(res){
  try{
    var rq=indexedDB.open('atlante_lago_piccolo',1);
    rq.onupgradeneeded=function(){var d=rq.result;['points','media','tracks','kv'].forEach(function(s){if(!d.objectStoreNames.contains(s))d.createObjectStore(s,{keyPath:'id'})})};
    rq.onsuccess=function(){DB.db=rq.result;DB.ok=true;res(true)};
    rq.onerror=function(){res(false)};
  }catch(e){res(false)}
})};
DB.tx=function(store,mode,fn){return new Promise(function(res,rej){
  if(!DB.ok){try{res(fn(null))}catch(e){rej(e)}return}
  var t=DB.db.transaction(store,mode),s=t.objectStore(store),out;
  try{out=fn(s)}catch(e){rej(e);return}
  t.oncomplete=function(){res(out&&typeof IDBRequest!=='undefined'&&out instanceof IDBRequest?out.result:out)};
  t.onerror=function(){rej(t.error)};t.onabort=function(){rej(t.error||new Error('abort'))};
})};
DB.put=function(store,obj){if(!DB.ok){DB.mem[store][obj.id]=obj;return Promise.resolve()}return DB.tx(store,'readwrite',function(s){s.put(obj)})};
DB.get=function(store,id){if(!DB.ok)return Promise.resolve(DB.mem[store][id]);return DB.tx(store,'readonly',function(s){return s.get(id)})};
DB.del=function(store,id){if(!DB.ok){delete DB.mem[store][id];return Promise.resolve()}return DB.tx(store,'readwrite',function(s){s.delete(id)})};
DB.all=function(store){if(!DB.ok)return Promise.resolve(Object.keys(DB.mem[store]).map(function(k){return DB.mem[store][k]}));return DB.tx(store,'readonly',function(s){return s.getAll()})};

/* =================== IMPOSTAZIONI =================== */
var SET={compilatore:'Lorenzo Baudino',plantnet:'',photoMax:1920,gpsAvg:5,wikiLang:'it',lastBackup:0,changes:0};
function saveSet(){return DB.put('kv',{id:'settings',v:SET})}
var CHECK={}; // stato manuale checklist
function saveCheck(){return DB.put('kv',{id:'checklist',v:CHECK})}

/* =================== CATEGORIE =================== */
var CATS=[
 {id:'fauna',n:'Fauna',e:'🦆',c:'#4fc3f7',sp:1},
 {id:'flora',n:'Flora',e:'🌿',c:'#81c784',sp:1},
 {id:'albero',n:'Albero',e:'🌳',c:'#43a047',sp:1},
 {id:'fungo',n:'Funghi e licheni',e:'🍄',c:'#bcaaa4',sp:1},
 {id:'geo',n:'Rocce e terreno',e:'🪨',c:'#a1887f'},
 {id:'acqua',n:'Acqua',e:'💧',c:'#29b6f6'},
 {id:'storia',n:'Storia e arte',e:'⛪',c:'#ffb74d',sch:1},
 {id:'folclore',n:'Folclore e leggende',e:'🧙',c:'#ba68c8',sch:1},
 {id:'curiosita',n:'Curiosità',e:'💡',c:'#fff176',sch:1},
 {id:'panorama',n:'Panorama',e:'👁️',c:'#90caf9'},
 {id:'sentiero',n:'Sentiero e servizi',e:'🥾',c:'#cfd8dc'},
 {id:'criticita',n:'Criticità',e:'⚠️',c:'#e57373'},
 {id:'altro',n:'Altro',e:'📍',c:'#9e9e9e'}
];
function CAT(id){for(var i=0;i<CATS.length;i++)if(CATS[i].id===id)return CATS[i];return CATS[CATS.length-1]}
var FENO=['vegetativo','in boccio','in fiore','in frutto','senescente/secco'];
var EXTRA={
 fauna:[{k:'n_ind',l:'Numero individui',t:'number'},{k:'comport',l:'Tipo di osservazione',t:'select',o:['visto','in volo','in acqua','in alimentazione','canto o verso','nido o cova','con piccoli','corteggiamento','tracce o impronte','resti, piume, borre','solo sentito']},{k:'eta_sesso',l:'Età / sesso',t:'text'}],
 flora:[{k:'fenologia',l:'Fenologia',t:'select',o:FENO},{k:'abbond',l:'Abbondanza',t:'select',o:['individuo singolo','pochi individui','sparsa','comune','dominante']},{k:'ambiente',l:'Ambiente',t:'select',o:['acqua aperta','canneto','sponda','bosco','prato','margine o sentiero','muro o roccia']}],
 albero:[{k:'circ',l:'Circonferenza a 1,30 m (cm)',t:'number'},{k:'alt_alb',l:'Altezza stimata (m)',t:'number'},{k:'fenologia',l:'Fenologia',t:'select',o:FENO},{k:'stato',l:'Stato',t:'select',o:['sano','sofferente','secco','schiantato','con cavità']}],
 fungo:[{k:'substrato',l:'Substrato',t:'text'}],
 geo:[{k:'tipo_roccia',l:'Tipo',t:'select',o:['deposito morenico','masso erratico','lherzolite / peridotite','serpentinite','gneiss','micascisto','torba o sedimento palustre','ciottoli e ghiaia','affioramento roccioso','altro']},{k:'dimensioni',l:'Dimensioni (m)',t:'text'}],
 acqua:[{k:'tipo_acqua',l:'Tipo',t:'select',o:['lago','immissario o rio','canale','sorgente','zona umida','pozza']},{k:'aspetto',l:'Aspetto dell\'acqua',t:'text'}],
 criticita:[{k:'tipo_crit',l:'Tipo',t:'select',o:['rifiuti','erosione della sponda','specie invasiva','danno o vandalismo','sentiero impraticabile','inquinamento','altro']},{k:'gravita',l:'Gravità',t:'select',o:['bassa','media','alta']}]
};
var SCHEDA=[{k:'epoca',l:'Epoca'},{k:'indirizzo',l:'Indirizzo / località'},{k:'apertura',l:'Aperture / periodo'},{k:'costo',l:'Costo'},{k:'conservazione',l:'Stato di conservazione'},{k:'accessibilita',l:'Accessibilità'},{k:'bibliografia',l:'Bibliografia',ta:1},{k:'sitografia',l:'Sitografia (link)',ta:1}];
function isInd(p){return /^indicativa/.test(p&&p.posSrc||'')}
function linkify(t){return esc(t).replace(/(https?:\/\/[^\s<]+)/g,'<a href="$1" target="_blank" rel="noopener">$1</a>')}
function extraLabel(k){for(var c in EXTRA)for(var i=0;i<EXTRA[c].length;i++)if(EXTRA[c][i].k===k)return EXTRA[c][i].l;return k}
