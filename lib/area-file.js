/*!
 * Area file v1.0 — salva e ripristina un'area di mappe offline come file ZIP (Atlante di campo)
 * by Lollo ®2026
 *
 * Perché: la cache del browser può essere svuotata da Chrome se il telefono ha poco spazio.
 * Un file ZIP in Download resta tuo: lo vedi nel gestore file, lo copi sul PC, lo reimporti con un tocco.
 *
 * Formato (un normale ZIP, senza compressione perché PNG/JPEG sono già compressi):
 *   manifest.json   formato, versione, dati dell'area, elenco {u: indirizzo, f: nome file, t: tipo}
 *   t/000001.bin …  una tessera per file
 * Nessuna dipendenza. Si prova anche con Node (vedi tools/test-aree/).
 *
 * Sicurezza dell'importazione: un file ricevuto da altri non è fidato. Si accettano solo
 * indirizzi https di altri siti (mai quelli dell'app), solo immagini png/jpeg/webp/gif,
 * si controlla il CRC di ogni tessera e si rifiutano file enormi o malformati.
 */
(function (radice, fabbrica) {
  if (typeof module === 'object' && module.exports) { module.exports = fabbrica(); }
  else { radice.AreaFile = fabbrica(); }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var VERSIONE = '1.0';
  var FORMATO = 'atlante-area';
  var FORMATO_VERSIONE = 1;
  var MAX_TILE_IMPORT = 50000;          // tetto di tessere per file
  var MAX_MANIFEST = 30 * 1024 * 1024;  // byte
  var TIPI_OK = /^image\/(png|jpeg|webp|gif)$/i;

  // --- CRC32 ---------------------------------------------------------------
  var TAB = (function () {
    var t = new Uint32Array(256);
    for (var n = 0; n < 256; n++) {
      var c = n;
      for (var k = 0; k < 8; k++) { c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1); }
      t[n] = c >>> 0;
    }
    return t;
  })();
  function crc32(u8) {
    var c = 0xFFFFFFFF;
    for (var i = 0; i < u8.length; i++) { c = TAB[(c ^ u8[i]) & 255] ^ (c >>> 8); }
    return (c ^ 0xFFFFFFFF) >>> 0;
  }

  // --- scrittura ZIP (solo "store") ----------------------------------------
  function dosOraData(d) {
    var ora = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1);
    var data = (Math.max(0, d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
    return { ora: ora & 0xFFFF, data: data & 0xFFFF };
  }

  function ScrittoreZip() {
    this.parti = [];     // Uint8Array e Blob, in ordine
    this.centrale = [];  // voci della directory centrale
    this.pos = 0;
    this.quando = dosOraData(new Date());
  }
  ScrittoreZip.prototype.aggiungi = function (nome, u8, tipoBlob) {
    var enc = new TextEncoder().encode(nome);
    var crc = crc32(u8);
    var h = new DataView(new ArrayBuffer(30));
    h.setUint32(0, 0x04034b50, true);
    h.setUint16(4, 20, true);
    h.setUint16(6, 0x0800, true);          // nomi in UTF-8
    h.setUint16(8, 0, true);               // 0 = store
    h.setUint16(10, this.quando.ora, true);
    h.setUint16(12, this.quando.data, true);
    h.setUint32(14, crc, true);
    h.setUint32(18, u8.length, true);
    h.setUint32(22, u8.length, true);
    h.setUint16(26, enc.length, true);
    h.setUint16(28, 0, true);
    this.centrale.push({ enc: enc, crc: crc, size: u8.length, off: this.pos });
    this.parti.push(new Uint8Array(h.buffer), enc, u8);
    this.pos += 30 + enc.length + u8.length;
  };
  ScrittoreZip.prototype.fine = function () {
    var inizio = this.pos, quando = this.quando, parti = this.parti, dimCentrale = 0;
    this.centrale.forEach(function (e) {
      var d = new DataView(new ArrayBuffer(46));
      d.setUint32(0, 0x02014b50, true);
      d.setUint16(4, 20, true);
      d.setUint16(6, 20, true);
      d.setUint16(8, 0x0800, true);
      d.setUint16(10, 0, true);
      d.setUint16(12, quando.ora, true);
      d.setUint16(14, quando.data, true);
      d.setUint32(16, e.crc, true);
      d.setUint32(20, e.size, true);
      d.setUint32(24, e.size, true);
      d.setUint16(28, e.enc.length, true);
      d.setUint32(42, e.off, true);
      parti.push(new Uint8Array(d.buffer), e.enc);
      dimCentrale += 46 + e.enc.length;
    });
    var f = new DataView(new ArrayBuffer(22));
    f.setUint32(0, 0x06054b50, true);
    f.setUint16(8, this.centrale.length, true);
    f.setUint16(10, this.centrale.length, true);
    f.setUint32(12, dimCentrale, true);
    f.setUint32(16, inizio, true);
    parti.push(new Uint8Array(f.buffer));
    return new Blob(parti, { type: 'application/zip' });
  };

  // --- lettura ZIP a fette (non carica tutto in memoria) --------------------
  async function leggiFetta(file, da, a) {
    return new Uint8Array(await file.slice(da, a).arrayBuffer());
  }

  async function apriZip(file) {
    if (!file || file.size < 22) { throw new Error('Il file non è un archivio valido.'); }
    var coda = await leggiFetta(file, Math.max(0, file.size - 65557), file.size);
    var dv = new DataView(coda.buffer);
    var i = coda.length - 22, trovato = -1;
    for (; i >= 0; i--) { if (dv.getUint32(i, true) === 0x06054b50) { trovato = i; break; } }
    if (trovato < 0) { throw new Error('Il file non è un archivio ZIP completo (copia interrotta?).'); }
    var n = dv.getUint16(trovato + 10, true);
    var dimC = dv.getUint32(trovato + 12, true);
    var offC = dv.getUint32(trovato + 16, true);
    if (n === 0xFFFF || dimC === 0xFFFFFFFF || offC === 0xFFFFFFFF) { throw new Error('Archivio troppo grande (ZIP64 non supportato).'); }
    if (offC + dimC > file.size) { throw new Error('Archivio danneggiato (elenco file fuori dal file).'); }
    var cen = await leggiFetta(file, offC, offC + dimC);
    var cd = new DataView(cen.buffer);
    var voci = {}, p = 0;
    for (var k = 0; k < n; k++) {
      if (p + 46 > cen.length || cd.getUint32(p, true) !== 0x02014b50) { throw new Error('Archivio danneggiato (elenco file).'); }
      var metodo = cd.getUint16(p + 10, true);
      var crc = cd.getUint32(p + 16, true);
      var comp = cd.getUint32(p + 20, true);
      var lung = cd.getUint32(p + 24, true);
      var ln = cd.getUint16(p + 28, true), le = cd.getUint16(p + 30, true), lc = cd.getUint16(p + 32, true);
      var off = cd.getUint32(p + 42, true);
      var nome = new TextDecoder().decode(cen.subarray(p + 46, p + 46 + ln));
      voci[nome] = { metodo: metodo, crc: crc, comp: comp, lung: lung, off: off };
      p += 46 + ln + le + lc;
    }
    // dati di una voce: salta l'intestazione locale (lunghezze nome ed extra possono differire)
    async function dati(nome) {
      var v = voci[nome];
      if (!v) { throw new Error('Nel file manca «' + nome + '».'); }
      if (v.metodo !== 0) { throw new Error('«' + nome + '» è compresso: formato non riconosciuto.'); }
      if (v.comp !== v.lung) { throw new Error('«' + nome + '» ha dimensioni incoerenti.'); }
      var h = await leggiFetta(file, v.off, v.off + 30);
      var hv = new DataView(h.buffer);
      if (h.length < 30 || hv.getUint32(0, true) !== 0x04034b50) { throw new Error('«' + nome + '» è danneggiato.'); }
      var ini = v.off + 30 + hv.getUint16(26, true) + hv.getUint16(28, true);
      if (ini + v.lung > file.size) { throw new Error('«' + nome + '» è tagliato: copia interrotta?'); }
      return { blob: file.slice(ini, ini + v.lung), crc: v.crc, lung: v.lung };
    }
    return { voci: voci, dati: dati };
  }

  // --- esporta -------------------------------------------------------------
  function nomeFile(nome) {
    var s = String(nome || 'area').normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^A-Za-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 50) || 'area';
    return 'atlante-area-' + s + '.zip';
  }

  /*
   * area   = record dell'area (nome, bounds, zMin, zMax, livelli, stato, tileTotali…)
   * cache  = cache con le tessere
   * opz    = { urls: [..] (se il record non le ha), onProgresso(fatti,totale) }
   * Restituisce { blob, nome, tileEsportati, tileMancanti, byte }
   */
  async function esporta(area, cache, opz) {
    opz = opz || {};
    var urls = opz.urls || area.urls;
    if (!urls || !urls.length) { throw new Error('Nessun indirizzo di tessera per questa area.'); }
    var z = new ScrittoreZip();
    var tiles = [], mancanti = 0, byte = 0;
    for (var i = 0; i < urls.length; i++) {
      var r = await cache.match(urls[i], { ignoreVary: true });
      if (!r) { mancanti++; }
      else {
        var tipo = (r.headers && r.headers.get('content-type')) || 'image/png';
        var u8 = new Uint8Array(await (await r.blob()).arrayBuffer());
        var f = 't/' + String(tiles.length + 1).padStart(6, '0') + '.bin';
        z.aggiungi(f, u8);
        tiles.push({ u: urls[i], f: f, t: tipo });
        byte += u8.length;
      }
      if (opz.onProgresso && (i % 20 === 0 || i === urls.length - 1)) { opz.onProgresso(i + 1, urls.length); }
    }
    if (!tiles.length) { throw new Error('Nella cache non c\'è nessuna tessera di quest\'area (già cancellata?).'); }
    var copia = {};
    Object.keys(area).forEach(function (k) { if (k !== 'urls') { copia[k] = area[k]; } });
    var manifest = {
      formato: FORMATO, versione: FORMATO_VERSIONE, creatoDa: 'Area file ' + VERSIONE,
      esportato: new Date().toISOString(), area: copia, tiles: tiles
    };
    z.aggiungi('manifest.json', new TextEncoder().encode(JSON.stringify(manifest)));
    return { blob: z.fine(), nome: nomeFile(area.nome), tileEsportati: tiles.length, tileMancanti: mancanti, byte: byte };
  }

  // --- importa -------------------------------------------------------------
  function indirizzoAmmesso(u, origine) {
    if (typeof u !== 'string' || u.length > 4096) { return false; }
    var url;
    try { url = new URL(u); } catch (e) { return false; }
    if (url.protocol !== 'https:') { return false; }
    if (origine && url.origin === origine) { return false; }   // mai sovrascrivere file dell'app
    return true;
  }

  /*
   * file  = File scelto dall'utente
   * cache = cache dove mettere le tessere
   * opz   = { origine: location.origin, onProgresso(fatti,totale) }
   * Restituisce { area (record da salvare), importati, saltati, errori, scartati }
   */
  async function importa(file, cache, opz) {
    opz = opz || {};
    var zip = await apriZip(file);
    var m = await zip.dati('manifest.json');
    if (m.lung > MAX_MANIFEST) { throw new Error('Il file ha un elenco troppo grande.'); }
    var man;
    try { man = JSON.parse(new TextDecoder().decode(new Uint8Array(await m.blob.arrayBuffer()))); }
    catch (e) { throw new Error('L\'elenco interno del file è illeggibile.'); }
    if (!man || man.formato !== FORMATO) { throw new Error('Non è un file area dell\'Atlante.'); }
    if (typeof man.versione !== 'number' || man.versione > FORMATO_VERSIONE) {
      throw new Error('File creato da una versione più nuova dell\'Atlante: aggiorna l\'app.');
    }
    if (!Array.isArray(man.tiles) || !man.tiles.length) { throw new Error('Il file non contiene tessere.'); }
    if (man.tiles.length > MAX_TILE_IMPORT) { throw new Error('Il file contiene troppe tessere (' + man.tiles.length + ').'); }
    var a = man.area || {};
    var b = a.bounds || {};
    if (![b.s, b.w, b.n, b.e].every(function (x) { return typeof x === 'number' && isFinite(x); })) {
      throw new Error('Il file non ha un\'area valida.');
    }

    var st = { importati: 0, saltati: 0, errori: 0, scartati: 0 };
    var urlsBuoni = [];
    for (var i = 0; i < man.tiles.length; i++) {
      var t = man.tiles[i];
      var ok = t && indirizzoAmmesso(t.u, opz.origine) && TIPI_OK.test(String(t.t || '')) && typeof t.f === 'string';
      if (!ok) { st.scartati++; }
      else {
        try {
          if (await cache.match(t.u, { ignoreVary: true })) { st.saltati++; urlsBuoni.push(t.u); }
          else {
            var d = await zip.dati(t.f);
            var u8 = new Uint8Array(await d.blob.arrayBuffer());
            if (crc32(u8) !== d.crc) { throw new Error('CRC'); }
            await cache.put(t.u, new Response(new Blob([u8], { type: t.t }), { status: 200, headers: { 'Content-Type': t.t } }));
            st.importati++; urlsBuoni.push(t.u);
          }
        } catch (e) { st.errori++; }
      }
      if (opz.onProgresso && (i % 20 === 0 || i === man.tiles.length - 1)) { opz.onProgresso(i + 1, man.tiles.length); }
    }
    if (!urlsBuoni.length) { throw new Error('Nessuna tessera importata (' + st.errori + ' danneggiate, ' + st.scartati + ' scartate).'); }

    var area = {
      id: typeof a.id === 'string' && a.id ? a.id : String(Date.now()) + '-imp',
      nome: String(a.nome || 'Area importata').slice(0, 60),
      data: typeof a.data === 'string' ? a.data : new Date().toISOString(),
      bounds: { s: b.s, w: b.w, n: b.n, e: b.e },
      zMin: +a.zMin || 0, zMax: +a.zMax || 0,
      livelli: Array.isArray(a.livelli) ? a.livelli.map(String) : [],
      tileTotali: man.tiles.length,
      tileOk: urlsBuoni.length,
      errori: st.errori + st.scartati,
      livelliKo: Array.isArray(a.livelliKo) ? a.livelliKo.map(String) : [],
      urls: urlsBuoni,
      byteNuovi: 0,
      stato: (st.errori + st.scartati) ? 'incompleta' : (a.stato === 'parziale' ? 'parziale' : (a.stato === 'incompleta' ? 'incompleta' : 'completa')),
      importata: true,
      versione: String(a.versione || '')
    };
    return { area: area, importati: st.importati, saltati: st.saltati, errori: st.errori, scartati: st.scartati };
  }

  return {
    versione: VERSIONE,
    FORMATO: FORMATO,
    crc32: crc32,
    nomeFile: nomeFile,
    esporta: esporta,
    importa: importa
  };
});
