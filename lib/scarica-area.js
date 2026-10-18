/*!
 * Scarica area v1.2 — download di tile per l'uso offline (Atlante di campo)
 * by Lollo ®2026
 *
 * Due parti:
 *  1) NUCLEO       calcolo dei tile, stima, download, cancellazione, archivio aree.
 *                  Nessuna dipendenza: si può provare anche con Node (vedi test/).
 *  2) INTERFACCIA  ScaricaArea.monta(mappa): pulsante + pannello su una mappa Leaflet.
 *
 * Scelte importanti (dai difetti trovati nei repository studiati):
 *  - i tile stanno in una cache a parte (di default 'atlante-tiles'; nell'Atlante 'atl-aree'),
 *    che il service worker NON cancella mai quando si aggiorna l'app (vedi sw.js);
 *  - l'elenco delle aree sta in IndexedDB, non in localStorage;
 *  - cancellando un'area si tolgono solo i tile che nessun'altra area usa;
 *  - v1.1: i livelli si registrano dall'esterno (registraLivello), anche con indirizzi
 *    costruiti da una funzione (servizi WMS); un livello che il server non lascia
 *    scaricare viene lasciato perdere subito, senza martellare il server;
 *    il pannello si può incorporare in una finestra dell'app (opzione contenitore);
 *  - v1.2: con opz.file (lib/area-file.js) ogni area si esporta come file ZIP e si reimporta.
 */
(function (radice, fabbrica) {
  if (typeof module === 'object' && module.exports) { module.exports = fabbrica(); }
  else { radice.ScaricaArea = fabbrica(); }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var VERSIONE = '1.2';
  var NOME_CACHE_TILE = 'atlante-tiles'; // deve coincidere con CACHE_TILE in sw.js
  var LIMITE_TILE = 3000;                // tetto per singolo download
  var CONCORRENZA = 2;                   // richieste in parallelo (gentile con i server)
  var LAT_MAX = 85.0511287798;           // limite della proiezione Web Mercator

  // Un solo indirizzo per livello, senza sottodomini casuali: la chiave della cache
  // deve essere identica a quella richiesta da Leaflet.
  var LIVELLI = {
    osm: {
      nome: 'OpenStreetMap',
      url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
      zMax: 19,
      kbPerTile: 18, // stima media, serve solo per l'anteprima
      attribuzione: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    },
    topo: {
      nome: 'OpenTopoMap',
      url: 'https://a.tile.opentopomap.org/{z}/{x}/{y}.png',
      zMax: 17,
      kbPerTile: 30,
      attribuzione: 'Dati: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>, <a href="http://viewfinderpanoramas.org">SRTM</a> | Stile: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)'
    }
  };

  /* ================================================================
   * 1) NUCLEO
   * ================================================================ */

  function pausa(ms) { return new Promise(function (ok) { setTimeout(ok, ms); }); }

  function controllaLivelli(livelli) {
    if (!livelli || !livelli.length) { throw new Error('Scegli almeno un livello.'); }
    livelli.forEach(function (id) {
      if (!LIVELLI[id]) { throw new Error('Livello sconosciuto: ' + id); }
    });
  }

  // Coordinate -> numero del tile (formula standard delle mappe "slippy").
  function latLonToTile(lat, lon, z) {
    var n = Math.pow(2, z);
    var la = Math.max(-LAT_MAX, Math.min(LAT_MAX, lat));
    var x = Math.floor((lon + 180) / 360 * n);
    var r = la * Math.PI / 180;
    var y = Math.floor((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2 * n);
    return {
      x: Math.max(0, Math.min(n - 1, x)),
      y: Math.max(0, Math.min(n - 1, y))
    };
  }

  // Intervallo di tile che copre il riquadro {s,w,n,e} a un dato zoom.
  function intervalloTile(b, z) {
    var nw = latLonToTile(b.n, b.w, z);
    var se = latLonToTile(b.s, b.e, z);
    return { x0: nw.x, x1: se.x, y0: nw.y, y1: se.y };
  }

  // Ogni livello ha il suo zoom massimo (OSM 19, OpenTopoMap 17).
  function zoomFinale(id, zMax) { return Math.min(zMax, LIVELLI[id].zMax); }

  // Conta senza costruire elenchi: si può chiamare a ogni movimento della mappa.
  function contaTile(b, zMin, zMax, livelli) {
    controllaLivelli(livelli);
    var totale = 0;
    livelli.forEach(function (id) {
      for (var z = zMin; z <= zoomFinale(id, zMax); z++) {
        var t = intervalloTile(b, z);
        totale += (t.x1 - t.x0 + 1) * (t.y1 - t.y0 + 1);
      }
    });
    return totale;
  }

  // Indirizzo di un tile: da modello fisso ({z}/{x}/{y}) oppure da funzione urlFn(z,x,y).
  function urlTile(id, z, x, y) {
    var l = LIVELLI[id];
    if (l.urlFn) { return l.urlFn(z, x, y); }
    return l.url.replace('{z}', z).replace('{x}', x).replace('{y}', y);
  }

  // Aggiunge o sostituisce un livello. def = { nome, zMax, kbPerTile, url | urlFn, gruppo?, attribuzione? }
  function registraLivello(id, def) {
    if (!id || !def) { throw new Error('Livello non valido.'); }
    if (typeof def.nome !== 'string' || !def.nome) { throw new Error('Livello ' + id + ': manca il nome.'); }
    if (!(def.zMax >= 0 && def.zMax <= 24)) { throw new Error('Livello ' + id + ': zoom massimo non valido.'); }
    if (typeof def.url !== 'string' && typeof def.urlFn !== 'function') { throw new Error('Livello ' + id + ': manca l\'indirizzo.'); }
    LIVELLI[id] = {
      nome: def.nome, zMax: def.zMax, kbPerTile: def.kbPerTile || 25,
      url: def.url, urlFn: def.urlFn, gruppo: def.gruppo || '', attribuzione: def.attribuzione || ''
    };
  }

  // Toglie tutti i livelli (si usa prima di registrare quelli dell'app).
  function azzeraLivelli() {
    Object.keys(LIVELLI).forEach(function (k) { delete LIVELLI[k]; });
  }

  // Elenco completo: ogni voce dice indirizzo e livello. Si rifiuta di costruirlo se è enorme.
  function elencoVoci(b, zMin, zMax, livelli) {
    if (contaTile(b, zMin, zMax, livelli) > 250000) {
      throw new Error('Area troppo grande per costruire l\'elenco dei tile.');
    }
    var voci = [];
    livelli.forEach(function (id) {
      for (var z = zMin; z <= zoomFinale(id, zMax); z++) {
        var t = intervalloTile(b, z);
        for (var x = t.x0; x <= t.x1; x++) {
          for (var y = t.y0; y <= t.y1; y++) { voci.push({ url: urlTile(id, z, x, y), liv: id }); }
        }
      }
    });
    return voci;
  }

  function elencoUrl(b, zMin, zMax, livelli) {
    return elencoVoci(b, zMin, zMax, livelli).map(function (v) { return v.url; });
  }

  // Anteprima prima del download: quanti tile, quanto spazio (stima).
  function stima(b, zMin, zMax, livelli, limite) {
    limite = limite || LIMITE_TILE;
    controllaLivelli(livelli);
    var tile = 0, byte = 0;
    livelli.forEach(function (id) {
      var n = contaTile(b, zMin, zMax, [id]);
      tile += n;
      byte += n * LIVELLI[id].kbPerTile * 1024;
    });
    return { tile: tile, byte: byte, limite: limite, entroLimite: tile > 0 && tile <= limite };
  }

  /*
   * Scarica i tile di un'area dentro la cache indicata.
   * o = { nome, bounds:{s,w,n,e}, zMin, zMax, livelli:['osm',...], cache,
   *       segnale (AbortSignal), onProgresso(fn), limite, concorrenza,
   *       fetchFn, pausaMs }
   * Restituisce il "record area" da salvare nell'archivio.
   * I tile già presenti in cache non vengono riscaricati: rilanciare un download
   * incompleto recupera solo quelli mancanti.
   */
  async function scarica(o) {
    var limite = o.limite || LIMITE_TILE;
    var fetchFn = o.fetchFn || function (u, i) { return fetch(u, i); };
    var segnale = o.segnale || null;
    var attesa = o.pausaMs == null ? 600 : o.pausaMs;
    var conc = o.concorrenza || CONCORRENZA;

    var totale = contaTile(o.bounds, o.zMin, o.zMax, o.livelli);
    if (totale === 0) { throw new Error('Nessun tile da scaricare.'); }
    if (totale > limite) {
      throw new Error('Troppi tile (' + totale + '): il limite è ' + limite + '.');
    }

    var coda = elencoVoci(o.bounds, o.zMin, o.zMax, o.livelli);
    var prossimo = 0;
    var st = { fatti: 0, errori: 0, saltati: 0, byte: 0 };
    // Un livello che non risponde mai (server che non permette il download, area fuori
    // copertura) viene lasciato perdere dopo pochi tentativi: niente centinaia di richieste inutili.
    var perLivello = {};
    var morti = {};
    var SOGLIA_MORTO = 6;
    o.livelli.forEach(function (id) { perLivello[id] = { ok: 0, ko: 0 }; });

    function annullato() { return !!(segnale && segnale.aborted); }
    function avanza() {
      if (o.onProgresso) {
        o.onProgresso({ fatti: st.fatti, totale: totale, errori: st.errori, saltati: st.saltati, byte: st.byte });
      }
    }

    // Due tentativi. Si accetta solo una vera immagine: una pagina di accesso Wi-Fi
    // con stato 200 non deve finire nella cache al posto della mappa.
    async function recupera(url) {
      for (var t = 0; t < 2; t++) {
        if (annullato()) { throw new Error('annullato'); }
        try {
          var r = await fetchFn(url, { mode: 'cors', credentials: 'omit', signal: segnale || undefined });
          if (r.ok) {
            var tipo = r.headers.get('content-type') || '';
            if (/^image\//i.test(tipo)) { return { r: r, tipo: tipo }; }
            break; // 200 ma non è un'immagine: inutile riprovare
          }
          if (r.status !== 429 && r.status < 500) { break; } // 404, 403...: definitivo
        } catch (e) {
          if (annullato()) { throw e; }
        }
        if (t === 0) { await pausa(attesa); }
      }
      throw new Error('tile non scaricabile');
    }

    async function lavoratore() {
      while (prossimo < coda.length && !annullato()) {
        var voce = coda[prossimo++];
        var url = voce.url;
        var pl = perLivello[voce.liv];
        try {
          if (await o.cache.match(url, { ignoreVary: true })) {
            st.saltati++;
          } else if (morti[voce.liv]) {
            throw new Error('livello non scaricabile');
          } else {
            var x = await recupera(url);
            var blob = await x.r.blob();
            // Si salva una risposta nostra (non "opaca"): così la dimensione è vera.
            await o.cache.put(url, new Response(blob, { status: 200, headers: { 'Content-Type': x.tipo } }));
            st.byte += blob.size;
            pl.ok++;
          }
        } catch (e) {
          if (annullato()) { return; }
          st.errori++;
          if (!morti[voce.liv]) {
            pl.ko++;
            if (pl.ok === 0 && pl.ko >= SOGLIA_MORTO) { morti[voce.liv] = true; }
          }
        }
        st.fatti++;
        avanza();
      }
    }

    var lavoratori = [];
    for (var i = 0; i < conc; i++) { lavoratori.push(lavoratore()); }
    await Promise.all(lavoratori);

    var interrotto = annullato();
    return {
      id: String(Date.now()) + '-' + Math.random().toString(36).slice(2, 6),
      nome: o.nome || 'Area',
      data: new Date().toISOString(),
      bounds: { s: o.bounds.s, w: o.bounds.w, n: o.bounds.n, e: o.bounds.e },
      zMin: o.zMin,
      zMax: o.zMax,
      livelli: o.livelli.slice(),
      tileTotali: totale,
      tileOk: st.fatti - st.errori,
      errori: st.errori,
      livelliKo: Object.keys(morti),
      urls: coda.map(function (v) { return v.url; }), // serve a eliminare l'area anche se i livelli cambiano
      byteNuovi: st.byte,
      stato: interrotto ? 'parziale' : (st.errori ? 'incompleta' : 'completa'),
      versione: VERSIONE
    };
  }

  // Indirizzi di un'area: quelli salvati nel record; per i record vecchi si ricalcolano
  // (ignorando i livelli che non esistono più).
  function urlDiArea(a) {
    if (a.urls) { return a.urls; }
    var noti = (a.livelli || []).filter(function (id) { return !!LIVELLI[id]; });
    return noti.length ? elencoUrl(a.bounds, a.zMin, a.zMax, noti) : [];
  }

  // Elimina i tile di un'area, tenendo quelli che altre aree usano ancora.
  async function eliminaArea(area, altreAree, cache) {
    var daTenere = new Set();
    altreAree.forEach(function (a) {
      urlDiArea(a).forEach(function (u) { daTenere.add(u); });
    });
    var cancellati = 0;
    var urls = urlDiArea(area);
    for (var i = 0; i < urls.length; i++) {
      if (!daTenere.has(urls[i]) && await cache.delete(urls[i])) { cancellati++; }
    }
    return cancellati;
  }

  // Elenco delle aree salvate, in IndexedDB.
  function apriArchivio(nomeDb, idb) {
    idb = idb || (typeof indexedDB !== 'undefined' ? indexedDB : null);
    if (!idb) { throw new Error('IndexedDB non disponibile.'); }
    var dbp = new Promise(function (ok, ko) {
      var rq = idb.open(nomeDb || 'atlante-aree', 1);
      rq.onupgradeneeded = function () { rq.result.createObjectStore('aree', { keyPath: 'id' }); };
      rq.onsuccess = function () { ok(rq.result); };
      rq.onerror = function () { ko(rq.error); };
    });
    function tx(modo, fn) {
      return dbp.then(function (db) {
        return new Promise(function (ok, ko) {
          var t = db.transaction('aree', modo);
          var r = fn(t.objectStore('aree'));
          t.oncomplete = function () { ok(r && r.result); };
          t.onerror = function () { ko(t.error); };
          t.onabort = function () { ko(t.error); };
        });
      });
    }
    return {
      elenco: function () { return tx('readonly', function (s) { return s.getAll(); }); },
      salva: function (a) { return tx('readwrite', function (s) { return s.put(a); }); },
      elimina: function (id) { return tx('readwrite', function (s) { return s['delete'](id); }); }
    };
  }

  async function spazio() {
    if (typeof navigator === 'undefined' || !navigator.storage || !navigator.storage.estimate) { return null; }
    var e = await navigator.storage.estimate();
    return { usato: e.usage || 0, quota: e.quota || 0, libero: (e.quota || 0) - (e.usage || 0) };
  }

  // Chiede al browser di non cancellare i dati quando lo spazio scarseggia.
  async function chiediPersistenza() {
    try {
      if (navigator.storage && navigator.storage.persist) { return await navigator.storage.persist(); }
    } catch (e) { /* il browser può rifiutare */ }
    return false;
  }

  // Livello Leaflet con gli stessi indirizzi usati dal download.
  function layerLeaflet(id, extra) {
    var l = LIVELLI[id];
    if (!l || !l.url) { throw new Error('Livello senza modello di indirizzo: ' + id); }
    var opz = { maxNativeZoom: l.zMax, maxZoom: 22, attribution: l.attribuzione, updateWhenIdle: false };
    for (var k in (extra || {})) { opz[k] = extra[k]; }
    return L.tileLayer(l.url, opz);
  }

  /* ================================================================
   * 2) INTERFACCIA
   * ================================================================ */

  var CSS = [
    '.sa-pannello{position:absolute;left:0;right:0;bottom:0;z-index:1200;max-height:72%;overflow:auto;',
    'background:var(--sa-sfondo,#fff);color:var(--sa-testo,#1c1c1e);border-radius:14px 14px 0 0;',
    'box-shadow:0 -4px 18px rgba(0,0,0,.28);font:15px/1.4 system-ui,sans-serif}',
    '@media(prefers-color-scheme:dark){.sa-pannello{--sa-sfondo:#1f2327;--sa-testo:#e8eaed;--sa-riga:#3a4047}}',
    '.sa-nascosto{display:none!important}',
    '.sa-testa{display:flex;justify-content:space-between;align-items:center;padding:12px 14px;position:sticky;top:0;',
    'background:inherit;border-bottom:1px solid var(--sa-riga,#ddd)}',
    '.sa-chiudi{border:0;background:none;font-size:20px;color:inherit;padding:2px 8px}',
    '.sa-corpo{padding:10px 14px 16px}',
    '.sa-riga{display:block;margin:8px 0}',
    '.sa-riga input[type=text]{width:100%;box-sizing:border-box;padding:8px;font:inherit;margin-top:4px}',
    '.sa-livelli label{display:block;margin:4px 0}',
    '.sa-riga select{font:inherit;padding:4px}',
    '.sa-stima{margin:8px 0 2px;font-weight:600}',
    '.sa-avviso{margin:2px 0 8px;min-height:1.2em;color:#c0392b}',
    '.sa-avviso.sa-ok{color:#1e8449}',
    '.sa-btn{font:inherit;padding:9px 14px;border-radius:8px;border:1px solid #888;background:transparent;color:inherit}',
    '.sa-primario{background:#2e7d32;border-color:#2e7d32;color:#fff}',
    '.sa-btn[disabled]{opacity:.45}',
    '.sa-barra{width:100%;height:14px}',
    '.sa-salvate h4{margin:16px 0 6px}',
    '.sa-area{display:flex;justify-content:space-between;gap:8px;padding:8px 0;border-top:1px solid var(--sa-riga,#ddd)}',
    '.sa-area small{opacity:.75}',
    '.sa-badge{font-size:12px;padding:1px 7px;border-radius:9px;background:#e8f5e9;color:#1e6b2a;margin-left:4px}',
    '.sa-badge.sa-warn{background:#fdecea;color:#a93226}',
    '.sa-area-az{display:flex;gap:6px;align-items:center;flex-wrap:wrap;justify-content:flex-end}',
    '.sa-area{flex-wrap:wrap}',
    '.sa-file{margin-top:12px}',
    '.sa-nota{margin:6px 0 0;font-size:12px;opacity:.75}',
    '.sa-area-az .sa-btn{padding:6px 10px}',
    '.sa-ctrl{font-size:17px!important;line-height:30px!important;text-align:center;text-decoration:none!important;cursor:pointer}',
    '.sa-grp{margin:8px 0 2px;font-size:12px;font-weight:700;opacity:.7;text-transform:uppercase;letter-spacing:.04em}',
    '.sa-dim{margin:2px 0 6px;font-size:13px;opacity:.8}',
    // dentro una finestra dell'app: niente pannello a scomparsa, colori presi dall'app se ci sono
    '.sa-incorporato{position:static;max-height:none;overflow:visible;box-shadow:none;border-radius:0;background:transparent;',
    'color:inherit;font:inherit;--sa-riga:var(--line,#ddd)}',
    '.sa-incorporato .sa-corpo{padding:4px 0 8px}',
    // stima, messaggi e pulsanti restano sempre in vista in fondo alla finestra
    '.sa-incorporato .sa-azioni{position:sticky;bottom:0;z-index:2;margin:0 -14px;padding:8px 14px;',
    'background:var(--bg,#fff);border-top:1px solid var(--line,#ddd)}',
    '.sa-incorporato .sa-azioni p{margin:2px 0}',
    '.sa-incorporato .sa-btn{min-height:44px;border-radius:12px;border:1px solid var(--acc,#2e7d32);color:var(--acc,#2e7d32);',
    'background:var(--panel,transparent);font-weight:550}',
    '.sa-incorporato .sa-primario{background:var(--acc,#2e7d32);color:var(--onacc,#fff)}',
    '.sa-incorporato .sa-btn[disabled]{opacity:.45}',
    '.sa-incorporato .sa-riga select{width:auto;display:inline-block;padding:8px}',
    '.sa-incorporato .sa-livelli label{padding:3px 0}',
    '.sa-incorporato .sa-livelli input{width:20px;height:20px;vertical-align:middle}',
    '.sa-incorporato .sa-avviso{color:var(--bad,#c0392b)}',
    '.sa-incorporato .sa-avviso.sa-ok{color:var(--ok,#1e8449)}',
    '.sa-incorporato .sa-badge{background:var(--accsoft,#e8f5e9);color:var(--acc,#1e6b2a)}',
    '.sa-incorporato .sa-badge.sa-warn{background:transparent;border:1px solid var(--bad,#a93226);color:var(--bad,#a93226)}'
  ].join('');

  function fmtByte(b) {
    var u = ['B', 'KB', 'MB', 'GB'], i = 0;
    while (b >= 1024 && i < u.length - 1) { b /= 1024; i++; }
    return b.toLocaleString('it-IT', { maximumFractionDigits: i > 1 ? 1 : 0 }) + ' ' + u[i];
  }

  function el(tag, classe, testo) {
    var e = document.createElement(tag);
    if (classe) { e.className = classe; }
    if (testo != null) { e.textContent = testo; }
    return e;
  }

  function monta(mappa, opz) {
    if (typeof L === 'undefined') { throw new Error('Leaflet non trovato: caricalo prima di scarica-area.js'); }
    opz = opz || {};
    var idLivelli = opz.livelli || Object.keys(LIVELLI);
    var limite = opz.limite || LIMITE_TILE;
    var nomeCache = opz.nomeCache || NOME_CACHE_TILE;
    var incorporato = !!opz.contenitore;           // dentro una finestra dell'app, senza pulsante né intestazione
    var fissaArea = !!opz.fissaArea;               // l'area è quella vista al momento dell'apertura
    var selezione = opz.selezione || null;         // livelli spuntati all'inizio
    var haCache = typeof caches !== 'undefined' && typeof indexedDB !== 'undefined';
    var archivio = haCache ? (opz.archivio || apriArchivio(opz.nomeDb)) : null;
    var aree = [];
    var libero = null;
    var vivo = true;
    var areaFissa = null;
    var corso = { attivo: false, controller: null, dati: null };
    // Esito dell'ultimo download: resta visibile finché l'utente non cambia le scelte.
    var fisso = { testo: '', ok: false };
    var gruppo = L.layerGroup().addTo(mappa);
    var collegamenti = []; // listener da togliere in distruggi()

    if (!document.getElementById('sa-stile')) {
      var stile = document.createElement('style');
      stile.id = 'sa-stile';
      stile.textContent = CSS;
      document.head.appendChild(stile);
    }

    var pann = incorporato ? opz.contenitore : el('div', 'sa-pannello sa-nascosto');
    if (incorporato) { pann.classList.add('sa-pannello', 'sa-incorporato'); }
    pann.innerHTML =
      (incorporato ? '' : '<div class="sa-testa"><b>Mappe offline</b><button type="button" class="sa-chiudi" aria-label="Chiudi">✕</button></div>') +
      '<div class="sa-corpo">' +
      '<section>' +
      (fissaArea ? '<p class="sa-dim"></p>' : '') +
      '<label class="sa-riga">Nome area<input class="sa-nome" type="text" maxlength="60"></label>' +
      '<div class="sa-riga sa-livelli"></div>' +
      '<div class="sa-riga">Zoom da <select class="sa-zmin"></select> a <select class="sa-zmax"></select></div>' +
      '<div class="sa-azioni">' +
      '<p class="sa-stima"></p><p class="sa-avviso"></p>' +
      '<button type="button" class="sa-btn sa-primario sa-scarica">' + (fissaArea ? 'Scarica quest\'area' : 'Scarica l\'area visibile') + '</button>' +
      '<div class="sa-conferma sa-nascosto"><p class="sa-testo-conferma"></p>' +
      '<button type="button" class="sa-btn sa-primario sa-si">Conferma</button> ' +
      '<button type="button" class="sa-btn sa-no">Indietro</button></div>' +
      '<div class="sa-progresso sa-nascosto"><progress class="sa-barra" value="0" max="1"></progress>' +
      '<p class="sa-testo-prog"></p><button type="button" class="sa-btn sa-ferma">Annulla</button></div>' +
      '</div>' +
      '</section>' +
      '<section class="sa-salvate"><h4>Aree salvate</h4><div class="sa-lista"></div>' +
      (opz.file ? '<div class="sa-file"><button type="button" class="sa-btn sa-importa">Importa area da file…</button>' +
        '<input type="file" class="sa-input-file" accept=".zip,application/zip,application/x-zip-compressed" hidden>' +
        '<p class="sa-nota">Il file ZIP creato da «Esporta» resta nella cartella Download: tienilo come copia di sicurezza o portalo su un altro telefono.</p></div>' : '') +
      '</section>' +
      '</div>';
    if (!incorporato) {
      mappa.getContainer().appendChild(pann);
      L.DomEvent.disableClickPropagation(pann);
      L.DomEvent.disableScrollPropagation(pann);
    }

    function q(sel) { return pann.querySelector(sel); }
    var campoNome = q('.sa-nome'), selMin = q('.sa-zmin'), selMax = q('.sa-zmax');
    var testoStima = q('.sa-stima'), testoAvviso = q('.sa-avviso');
    var btnScarica = q('.sa-scarica'), boxConferma = q('.sa-conferma'), boxProg = q('.sa-progresso');
    var predefinito = opz.nomePredefinito || ('Area ' + new Date().toLocaleDateString('it-IT'));
    campoNome.placeholder = predefinito;

    for (var z = 8; z <= 19; z++) {
      selMin.appendChild(new Option(String(z), z));
      selMax.appendChild(new Option(String(z), z));
    }
    selMin.value = '13';
    selMax.value = '19'; // zoom massimo di OpenStreetMap
    var gruppoPrec = null;
    idLivelli.forEach(function (id, i) {
      if (!LIVELLI[id]) { return; }
      var g = LIVELLI[id].gruppo || '';
      if (g && g !== gruppoPrec) { q('.sa-livelli').appendChild(el('div', 'sa-grp', g)); }
      gruppoPrec = g;
      var lab = el('label');
      var cb = document.createElement('input');
      cb.type = 'checkbox'; cb.value = id;
      cb.checked = selezione ? selezione.indexOf(id) >= 0 : (i === 0 || id === 'osm');
      lab.appendChild(cb);
      lab.appendChild(document.createTextNode(' ' + LIVELLI[id].nome + ' (fino a zoom ' + LIVELLI[id].zMax + ')'));
      q('.sa-livelli').appendChild(lab);
    });

    function mostra(nodo, si) { nodo.classList.toggle('sa-nascosto', !si); }
    function avviso(testo, ok) { testoAvviso.textContent = testo || ''; testoAvviso.classList.toggle('sa-ok', !!ok); }
    function nomiLivelli(ids) { return ids.map(function (id) { return LIVELLI[id] ? LIVELLI[id].nome : id; }).join(', '); }

    function leggi() {
      var b = areaFissa || mappa.getBounds();
      return {
        nome: campoNome.value.trim() || predefinito,
        bounds: { s: b.getSouth(), w: b.getWest(), n: b.getNorth(), e: b.getEast() },
        zMin: parseInt(selMin.value, 10),
        zMax: parseInt(selMax.value, 10),
        livelli: Array.prototype.map.call(pann.querySelectorAll('.sa-livelli input:checked'), function (c) { return c.value; })
      };
    }

    function aggiornaStima() {
      if (corso.attivo) { return; }
      var d = leggi();
      var blocco = null;
      if (!haCache) { blocco = 'Serve https (o localhost) per salvare le mappe offline.'; }
      else if (!d.livelli.length) { blocco = 'Scegli almeno un livello.'; }
      else if (d.zMin > d.zMax) { blocco = 'Lo zoom «da» deve essere minore o uguale a «a».'; }
      else if (typeof navigator !== 'undefined' && navigator.onLine === false) { blocco = 'Sei offline: per scaricare serve la rete.'; }
      var s = null;
      if (!blocco) {
        s = stima(d.bounds, d.zMin, d.zMax, d.livelli, limite);
        testoStima.textContent = '≈ ' + s.tile.toLocaleString('it-IT') + ' tile · ≈ ' + fmtByte(s.byte) +
          (libero != null ? ' · spazio libero ' + fmtByte(libero) : '');
        if (!s.entroLimite) { blocco = 'Troppi tile (limite ' + limite.toLocaleString('it-IT') + '). ' + (fissaArea ? 'Riduci lo zoom massimo, togli un livello o scegli un\'area più piccola.' : 'Avvicina la mappa o riduci lo zoom massimo.'); }
        else if (libero != null && s.byte > libero * 0.5) { blocco = 'Spazio libero insufficiente per questo download.'; }
      } else { testoStima.textContent = ''; }
      // Un blocco ha la precedenza; altrimenti resta l'esito dell'ultimo download.
      avviso(blocco || fisso.testo, !blocco && fisso.ok);
      btnScarica.disabled = !!blocco;
    }

    async function aggiornaSpazio() {
      try { var s = await spazio(); libero = s ? s.libero : null; } catch (e) { libero = null; }
      if (vivo) { aggiornaStima(); }
    }

    // --- elenco aree salvate -------------------------------------------------
    function disegnaAree() {
      var lista = q('.sa-lista');
      lista.textContent = '';
      gruppo.clearLayers();
      if (!aree.length) { lista.appendChild(el('small', '', 'Nessuna area salvata.')); return; }
      aree.forEach(function (a) {
        L.rectangle([[a.bounds.s, a.bounds.w], [a.bounds.n, a.bounds.e]],
          { color: '#e67e22', weight: 1, dashArray: '4', fill: false, interactive: false }).addTo(gruppo);
        var riga = el('div', 'sa-area');
        var info = el('div');
        var nome = el('b', '', a.nome);
        var badge = el('span', 'sa-badge' + (a.stato === 'completa' ? '' : ' sa-warn'), a.stato);
        info.appendChild(nome); info.appendChild(badge); info.appendChild(document.createElement('br'));
        info.appendChild(el('small', '',
          new Date(a.data).toLocaleDateString('it-IT') + ' · ' + a.tileOk + '/' + a.tileTotali +
          ' tile · zoom ' + a.zMin + '–' + a.zMax + ' · ' + nomiLivelli(a.livelli)));
        var az = el('div', 'sa-area-az');
        var vai = el('button', 'sa-btn', 'Vai'); vai.type = 'button';
        vai.onclick = function () {
          if (opz.alVai) { opz.alVai(a); }
          mappa.fitBounds([[a.bounds.s, a.bounds.w], [a.bounds.n, a.bounds.e]], { padding: [20, 20] });
        };
        var del = el('button', 'sa-btn', 'Elimina'); del.type = 'button';
        del.onclick = function () { eliminaDaLista(a); };
        az.appendChild(vai);
        if (opz.file) {
          var esp = el('button', 'sa-btn', 'Esporta'); esp.type = 'button';
          esp.onclick = function () { esportaDaLista(a); };
          az.appendChild(esp);
        }
        az.appendChild(del);
        riga.appendChild(info); riga.appendChild(az);
        lista.appendChild(riga);
      });
    }

    async function ricarica() {
      if (!archivio) { return; }
      try {
        aree = (await archivio.elenco()) || [];
        aree.sort(function (a, b) { return a.data < b.data ? 1 : -1; });
      } catch (e) { aree = []; }
      disegnaAree();
    }

    async function eliminaDaLista(a) {
      if (!confirm('Eliminare «' + a.nome + '»? I tile in comune con altre aree restano.')) { return; }
      try {
        var cache = await caches.open(nomeCache);
        await eliminaArea(a, aree.filter(function (x) { return x.id !== a.id; }), cache);
        await archivio.elimina(a.id);
      } catch (e) { avviso('Eliminazione non riuscita: ' + e.message); }
      await ricarica();
      aggiornaSpazio();
    }

    // --- esporta / importa come file ------------------------------------------
    var occupato = false;
    function impegnato() {
      if (occupato || corso.attivo) { avviso('Aspetta la fine dell\'operazione in corso.'); return true; }
      return false;
    }

    async function esportaDaLista(a) {
      if (impegnato()) { return; }
      occupato = true; fisso = { testo: '', ok: false };
      avviso('Preparo il file…');
      try {
        var cache = await caches.open(nomeCache);
        var r = await opz.file.esporta(a, cache, {
          urls: urlDiArea(a),
          onProgresso: function (f, t) { avviso('Preparo il file… ' + f.toLocaleString('it-IT') + ' / ' + t.toLocaleString('it-IT')); }
        });
        var url = URL.createObjectURL(r.blob);
        var l = document.createElement('a');
        l.href = url; l.download = r.nome; l.style.display = 'none';
        document.body.appendChild(l); l.click(); l.remove();
        setTimeout(function () { URL.revokeObjectURL(url); }, 120000);
        fisso = { ok: true, testo: 'File creato: ' + r.nome + ' (' + fmtByte(r.blob.size) + ', ' + r.tileEsportati.toLocaleString('it-IT') + ' tile' +
          (r.tileMancanti ? ', ' + r.tileMancanti + ' non erano più nella cache' : '') + '). Lo trovi nella cartella Download del telefono.' };
      } catch (e) {
        fisso = { ok: false, testo: 'Esportazione non riuscita: ' + e.message };
      }
      occupato = false;
      avviso(fisso.testo, fisso.ok);
    }

    async function importaDaFile(file) {
      if (!file || impegnato()) { return; }
      occupato = true; fisso = { testo: '', ok: false };
      avviso('Leggo il file…');
      try {
        if (libero != null && file.size > libero * 0.8) { throw new Error('spazio libero insufficiente per questo file (' + fmtByte(file.size) + ')'); }
        var cache = await caches.open(nomeCache);
        var r = await opz.file.importa(file, cache, {
          origine: (typeof location !== 'undefined' ? location.origin : ''),
          onProgresso: function (f, t) { avviso('Importo… ' + f.toLocaleString('it-IT') + ' / ' + t.toLocaleString('it-IT')); }
        });
        await archivio.salva(r.area);
        var cattive = r.errori + r.scartati;
        fisso = { ok: !cattive, testo: 'Importata «' + r.area.nome + '»: ' + r.importati.toLocaleString('it-IT') + ' tile nuovi' +
          (r.saltati ? ', ' + r.saltati.toLocaleString('it-IT') + ' già presenti' : '') +
          (cattive ? ', ' + cattive + ' non validi (file rovinato o non fidato)' : '') + '.' };
      } catch (e) {
        fisso = { ok: false, testo: 'Importazione non riuscita: ' + e.message };
      }
      occupato = false;
      var inp = q('.sa-input-file'); if (inp) { inp.value = ''; }
      await ricarica();
      aggiornaSpazio();
      avviso(fisso.testo, fisso.ok);
    }

    // --- download ------------------------------------------------------------
    function fineDownload() {
      corso.attivo = false; corso.controller = null; corso.dati = null;
      mostra(boxProg, false); mostra(boxConferma, false); mostra(btnScarica, true);
      aggiornaSpazio();
    }

    async function avvia() {
      var d = corso.dati;
      if (!d) { return; }
      mostra(boxConferma, false); mostra(boxProg, true);
      corso.attivo = true;
      fisso = { testo: '', ok: false };
      avviso('');
      var barra = q('.sa-barra'), testoProg = q('.sa-testo-prog');
      barra.value = 0; barra.max = 1; testoProg.textContent = 'Preparazione…';
      var protetto = await chiediPersistenza();
      corso.controller = new AbortController();
      var rec;
      try {
        var cache = await caches.open(nomeCache);
        rec = await scarica({
          nome: d.nome, bounds: d.bounds, zMin: d.zMin, zMax: d.zMax, livelli: d.livelli,
          cache: cache, segnale: corso.controller.signal, limite: limite,
          onProgresso: function (p) {
            barra.max = p.totale; barra.value = p.fatti;
            testoProg.textContent = p.fatti.toLocaleString('it-IT') + ' / ' + p.totale.toLocaleString('it-IT') +
              (p.errori ? ' · errori: ' + p.errori : '');
          }
        });
      } catch (e) {
        fisso = { testo: 'Download non riuscito: ' + e.message, ok: false };
        fineDownload();
        avviso(fisso.testo);
        return;
      }
      var messaggio, ok = false;
      if (rec.tileOk > 0) {
        try { await archivio.salva(rec); } catch (e) { messaggio = 'Tile salvati, ma non l\'elenco delle aree: ' + e.message; }
      }
      if (!messaggio) {
        if (rec.stato === 'completa') {
          ok = true;
          messaggio = 'Fatto: ' + rec.tileOk.toLocaleString('it-IT') + ' tile salvati (' + fmtByte(rec.byteNuovi) + '). ' +
            (protetto ? 'Archivio protetto dal sistema.'
                      : 'Attenzione: se lo spazio del telefono scarseggia il browser potrebbe cancellarli.');
        } else if (rec.stato === 'parziale') {
          messaggio = 'Interrotto: ' + rec.tileOk.toLocaleString('it-IT') + ' tile salvati (area parziale).';
        } else {
          messaggio = 'Completato con ' + rec.errori + ' tile mancanti. ' +
            (rec.livelliKo && rec.livelliKo.length
              ? 'Il server non ha permesso di scaricare: ' + nomiLivelli(rec.livelliKo) + ' (resta visibile solo con la rete). '
              : 'Rilancia lo stesso download: riprende solo i tile mancanti.');
        }
      }
      fisso = { testo: messaggio, ok: ok };
      campoNome.value = ''; // pronto per un'altra area, senza riusare il nome per sbaglio
      await ricarica();
      fineDownload();
      avviso(fisso.testo, fisso.ok);
    }

    btnScarica.onclick = function () {
      var d = leggi();
      var s = stima(d.bounds, d.zMin, d.zMax, d.livelli, limite);
      corso.dati = d; // il riquadro si "congela" qui: muovere la mappa dopo non lo cambia
      q('.sa-testo-conferma').textContent =
        'Scaricare «' + d.nome + '»: ' + s.tile.toLocaleString('it-IT') + ' tile (≈ ' + fmtByte(s.byte) +
        '), zoom ' + d.zMin + '–' + d.zMax + '. Servono la rete e qualche minuto.' +
        (incorporato ? ' Se chiudi questa finestra il download si ferma e resta quanto già scaricato.' : '');
      mostra(btnScarica, false); mostra(boxConferma, true);
    };
    q('.sa-no').onclick = function () { corso.dati = null; mostra(boxConferma, false); mostra(btnScarica, true); };
    q('.sa-si').onclick = avvia;
    q('.sa-ferma').onclick = function () { if (corso.controller) { corso.controller.abort(); } };
    if (opz.file) {
      q('.sa-importa').onclick = function () { if (!impegnato()) { q('.sa-input-file').click(); } };
      q('.sa-input-file').onchange = function () { importaDaFile(this.files && this.files[0]); };
    }

    // --- apertura, chiusura, pulizia -----------------------------------------
    function misure(b) {
      var m = (b.getNorth() + b.getSouth()) / 2;
      var largo = L.latLng(m, b.getWest()).distanceTo(L.latLng(m, b.getEast()));
      var alto = L.latLng(b.getSouth(), b.getWest()).distanceTo(L.latLng(b.getNorth(), b.getWest()));
      function f(v) { return v >= 1000 ? (v / 1000).toLocaleString('it-IT', { maximumFractionDigits: 1 }) + ' km' : Math.round(v) + ' m'; }
      return f(largo) + ' × ' + f(alto);
    }
    function apri() {
      mostra(pann, true);
      campoNome.value = '';
      if (fissaArea) {
        areaFissa = mappa.getBounds();
        q('.sa-dim').textContent = 'Area: quella che vedevi sulla mappa, circa ' + misure(areaFissa) + '.';
      }
      aggiornaSpazio();
      ricarica();
    }
    function chiudi() { mostra(pann, false); }
    function alterna() { if (pann.classList.contains('sa-nascosto')) { apri(); } else { chiudi(); } }
    function collega(bersaglio, evento, fn) {
      if (bersaglio === mappa) { mappa.on(evento, fn); } else { bersaglio.addEventListener(evento, fn); }
      collegamenti.push([bersaglio, evento, fn]);
    }
    function distruggi() {
      if (!vivo) { return; }
      vivo = false;
      if (corso.controller) { corso.controller.abort(); } // download in corso: si ferma, resta quanto scaricato
      collegamenti.forEach(function (c) {
        if (c[0] === mappa) { mappa.off(c[1], c[2]); } else { c[0].removeEventListener(c[1], c[2]); }
      });
      collegamenti = [];
      mappa.removeLayer(gruppo);
      if (controllo) { mappa.removeControl(controllo); }
      if (!incorporato && pann.parentNode) { pann.parentNode.removeChild(pann); }
    }

    if (!incorporato) { q('.sa-chiudi').onclick = chiudi; }
    // Cambiare zoom o livelli = nuova scelta: l'esito del download precedente sparisce.
    function cambiato() { fisso = { testo: '', ok: false }; aggiornaStima(); }
    [selMin, selMax].forEach(function (s) { s.onchange = cambiato; });
    pann.querySelectorAll('.sa-livelli input').forEach(function (c) { c.onchange = cambiato; });
    if (!fissaArea) {
      collega(mappa, 'moveend', function () { if (!pann.classList.contains('sa-nascosto')) { aggiornaStima(); } });
    }
    collega(window, 'online', aggiornaStima);
    collega(window, 'offline', aggiornaStima);

    var controllo = null;
    if (!incorporato && opz.controllo !== false) {
      var Ctrl = L.Control.extend({
        options: { position: 'topleft' },
        onAdd: function () {
          var box = L.DomUtil.create('div', 'leaflet-bar');
          var a = L.DomUtil.create('a', 'sa-ctrl', box);
          a.href = '#'; a.title = 'Mappe offline'; a.setAttribute('role', 'button'); a.textContent = '⬇';
          L.DomEvent.disableClickPropagation(box);
          L.DomEvent.on(a, 'click', function (ev) { L.DomEvent.preventDefault(ev); alterna(); });
          return box;
        }
      });
      controllo = new Ctrl();
      mappa.addControl(controllo);
    }
    if (incorporato) { apri(); } else { ricarica(); }

    return { apri: apri, chiudi: chiudi, ricarica: ricarica, distruggi: distruggi };
  }

  return {
    versione: VERSIONE,
    LIVELLI: LIVELLI,
    LIMITE_TILE: LIMITE_TILE,
    NOME_CACHE_TILE: NOME_CACHE_TILE,
    latLonToTile: latLonToTile,
    contaTile: contaTile,
    elencoUrl: elencoUrl,
    registraLivello: registraLivello,
    azzeraLivelli: azzeraLivelli,
    stima: stima,
    scarica: scarica,
    eliminaArea: eliminaArea,
    apriArchivio: apriArchivio,
    spazio: spazio,
    chiediPersistenza: chiediPersistenza,
    layerLeaflet: layerLeaflet,
    monta: monta
  };
});
