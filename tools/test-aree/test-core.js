// Test del nucleo di lib/scarica-area.js — si lanciano con:  node tools/test-aree/test-core.js
// Non servono né rete né browser: cache e rete sono simulate.
'use strict';
const assert = require('assert');
const SA = require('../../lib/scarica-area.js');

let ok = 0, ko = 0;
async function prova(nome, fn) {
  try { await fn(); ok++; console.log('  ok   ' + nome); }
  catch (e) { ko++; console.log('  FAIL ' + nome + '\n       ' + e.message); }
}

// Cache finta con la stessa interfaccia essenziale della Cache API.
function cacheFinta() {
  const m = new Map();
  return {
    m,
    match: async (u) => m.get(u),
    put: async (u, r) => { m.set(u, r); },
    delete: async (u) => m['delete'](u)
  };
}

// Rete finta: restituisce immagini da 1000 byte; si può personalizzare per URL.
function reteFinta(regole) {
  const chiamate = [];
  const f = async (url, opz) => {
    chiamate.push(url);
    if (opz && opz.signal && opz.signal.aborted) { const e = new Error('Aborted'); e.name = 'AbortError'; throw e; }
    const r = regole ? regole(url, chiamate.length) : null;
    if (r) { return r; }
    return new Response(new Uint8Array(1000), { status: 200, headers: { 'Content-Type': 'image/png' } });
  };
  f.chiamate = chiamate;
  return f;
}

// Area piccola vicino ad Avigliana (circa 600 m x 400 m).
const AREA = { s: 45.0500, w: 7.3900, n: 45.0536, e: 7.3975 };

(async function () {
  console.log('Calcolo dei tile');
  await prova('tile noti: Londra a zoom 10 = 511/340', () => {
    const t = SA.latLonToTile(51.5074, -0.1278, 10);
    assert.deepStrictEqual(t, { x: 511, y: 340 });
  });
  await prova('zoom 0 = un solo tile', () => {
    assert.deepStrictEqual(SA.latLonToTile(45, 7, 0), { x: 0, y: 0 });
  });
  await prova('lon 180 e lat 90 non escono dal mondo', () => {
    const t = SA.latLonToTile(90, 180, 5);
    assert.ok(t.x >= 0 && t.x <= 31 && t.y >= 0 && t.y <= 31);
  });
  await prova('contaTile coincide con la lunghezza dell\'elenco', () => {
    for (const livelli of [['osm'], ['topo'], ['osm', 'topo']]) {
      const n = SA.contaTile(AREA, 13, 19, livelli);
      assert.strictEqual(SA.elencoUrl(AREA, 13, 19, livelli).length, n);
    }
  });
  await prova('OpenTopoMap si ferma a zoom 17 anche se si chiede 19', () => {
    const urls = SA.elencoUrl(AREA, 15, 19, ['topo']);
    assert.ok(urls.length > 0);
    assert.ok(urls.every(u => /\/(15|16|17)\//.test(u)), 'trovato un tile oltre zoom 17');
  });
  await prova('OpenStreetMap arriva a zoom 19', () => {
    assert.ok(SA.elencoUrl(AREA, 19, 19, ['osm']).every(u => u.includes('/19/')));
    assert.ok(SA.contaTile(AREA, 19, 19, ['osm']) > 0);
  });
  await prova('area piccola a zoom 19 resta ben sotto il limite', () => {
    const s = SA.stima(AREA, 13, 19, ['osm']);
    console.log('       -> ' + s.tile + ' tile, ~' + Math.round(s.byte / 1048576 * 10) / 10 + ' MB (zoom 13-19, solo OSM)');
    assert.ok(s.entroLimite);
    assert.ok(s.tile < 600);
  });
  await prova('area grande a zoom 19 supera il limite e viene segnalata', () => {
    const grande = { s: 44.9, w: 7.2, n: 45.2, e: 7.6 };
    const s = SA.stima(grande, 13, 19, ['osm']);
    assert.strictEqual(s.entroLimite, false);
    assert.ok(s.tile > SA.LIMITE_TILE);
  });
  await prova('livello sconosciuto o vuoto: errore chiaro', () => {
    assert.throws(() => SA.contaTile(AREA, 13, 15, ['xyz']), /sconosciuto/);
    assert.throws(() => SA.contaTile(AREA, 13, 15, []), /almeno un livello/);
  });

  console.log('Download');
  await prova('scarica tutto e salva nella cache', async () => {
    const cache = cacheFinta(), rete = reteFinta();
    const rec = await SA.scarica({ nome: 'Prova', bounds: AREA, zMin: 14, zMax: 17, livelli: ['osm'], cache, fetchFn: rete, pausaMs: 0 });
    assert.strictEqual(rec.stato, 'completa');
    assert.strictEqual(rec.errori, 0);
    assert.strictEqual(cache.m.size, rec.tileTotali);
    assert.strictEqual(rec.byteNuovi, rec.tileTotali * 1000, 'dimensione reale dei tile');
    const r = cache.m.values().next().value;
    assert.strictEqual(r.headers.get('content-type'), 'image/png');
  });
  await prova('rilanciare un download salta i tile già in cache', async () => {
    const cache = cacheFinta();
    const base = { nome: 'P', bounds: AREA, zMin: 14, zMax: 16, livelli: ['osm'], cache, pausaMs: 0 };
    await SA.scarica(Object.assign({ fetchFn: reteFinta() }, base));
    const rete2 = reteFinta();
    const rec = await SA.scarica(Object.assign({ fetchFn: rete2 }, base));
    assert.strictEqual(rete2.chiamate.length, 0);
    assert.strictEqual(rec.stato, 'completa');
  });
  await prova('un tile con errore 404 conta come errore, gli altri si salvano', async () => {
    const cache = cacheFinta();
    const rete = reteFinta((url) => url.includes('/16/') ? new Response('no', { status: 404 }) : null);
    const rec = await SA.scarica({ nome: 'E', bounds: AREA, zMin: 15, zMax: 16, livelli: ['osm'], cache, fetchFn: rete, pausaMs: 0 });
    assert.strictEqual(rec.stato, 'incompleta');
    assert.ok(rec.errori > 0);
    assert.strictEqual(rec.tileOk, rec.tileTotali - rec.errori);
    assert.ok(![...cache.m.keys()].some(u => u.includes('/16/')));
  });
  await prova('errore 500 temporaneo: al secondo tentativo riesce', async () => {
    const cache = cacheFinta();
    const viste = {};
    const rete = reteFinta((url) => { viste[url] = (viste[url] || 0) + 1; return viste[url] === 1 ? new Response('x', { status: 500 }) : null; });
    const rec = await SA.scarica({ nome: 'R', bounds: AREA, zMin: 15, zMax: 15, livelli: ['osm'], cache, fetchFn: rete, pausaMs: 0 });
    assert.strictEqual(rec.stato, 'completa');
  });
  await prova('pagina HTML con stato 200 (accesso Wi-Fi) NON finisce nella cache', async () => {
    const cache = cacheFinta();
    const rete = reteFinta(() => new Response('<html>accedi</html>', { status: 200, headers: { 'Content-Type': 'text/html' } }));
    const rec = await SA.scarica({ nome: 'H', bounds: AREA, zMin: 15, zMax: 15, livelli: ['osm'], cache, fetchFn: rete, pausaMs: 0 });
    assert.strictEqual(cache.m.size, 0);
    assert.strictEqual(rec.tileOk, 0);
    assert.strictEqual(rec.stato, 'incompleta');
  });
  await prova('annullamento a metà: stato "parziale", i tile già presi restano', async () => {
    const cache = cacheFinta(), rete = reteFinta(), ctl = new AbortController();
    let fermato = false;
    const rec = await SA.scarica({
      nome: 'A', bounds: AREA, zMin: 14, zMax: 18, livelli: ['osm'], cache, fetchFn: rete, pausaMs: 0, segnale: ctl.signal,
      onProgresso: (p) => { if (p.fatti >= 10 && !fermato) { fermato = true; ctl.abort(); } }
    });
    assert.strictEqual(rec.stato, 'parziale');
    assert.ok(rec.tileOk >= 10 && rec.tileOk < rec.tileTotali, 'tileOk=' + rec.tileOk);
    assert.strictEqual(cache.m.size, rec.tileOk);
  });
  await prova('rifiuta un\'area oltre il limite prima di toccare la rete', async () => {
    const rete = reteFinta();
    await assert.rejects(
      SA.scarica({ nome: 'G', bounds: { s: 44.9, w: 7.2, n: 45.2, e: 7.6 }, zMin: 13, zMax: 19, livelli: ['osm'], cache: cacheFinta(), fetchFn: rete }),
      /Troppi tile/
    );
    assert.strictEqual(rete.chiamate.length, 0);
  });
  await prova('mai più di 2 richieste in parallelo', async () => {
    let attive = 0, massimo = 0;
    const rete = async () => {
      attive++; massimo = Math.max(massimo, attive);
      await new Promise(r => setTimeout(r, 2));
      attive--;
      return new Response(new Uint8Array(10), { status: 200, headers: { 'Content-Type': 'image/png' } });
    };
    await SA.scarica({ nome: 'C', bounds: AREA, zMin: 15, zMax: 17, livelli: ['osm'], cache: cacheFinta(), fetchFn: rete, pausaMs: 0 });
    assert.ok(massimo <= 2, 'massimo parallelo = ' + massimo);
  });

  console.log('Cancellazione');
  await prova('eliminare un\'area tiene i tile condivisi con un\'altra', async () => {
    const cache = cacheFinta();
    const A = { nome: 'A', bounds: AREA, zMin: 15, zMax: 17, livelli: ['osm'], cache, fetchFn: reteFinta(), pausaMs: 0 };
    // B: stessa zona ma zoom 17-18, quindi condivide solo i tile di zoom 17
    const B = { nome: 'B', bounds: AREA, zMin: 17, zMax: 18, livelli: ['osm'], cache, fetchFn: reteFinta(), pausaMs: 0 };
    const recA = await SA.scarica(A);
    const recB = await SA.scarica(B);
    const comuni = SA.contaTile(AREA, 17, 17, ['osm']);
    const prima = cache.m.size;
    const cancellati = await SA.eliminaArea(recA, [recB], cache);
    assert.strictEqual(cancellati, recA.tileTotali - comuni);
    assert.strictEqual(cache.m.size, prima - cancellati);
    assert.ok([...cache.m.keys()].every(u => !/\/(15|16)\//.test(u)), 'restano tile di zoom 15-16');
    assert.strictEqual([...cache.m.keys()].filter(u => u.includes('/17/')).length, comuni, 'i tile di zoom 17 devono restare');
    // eliminando anche B, la cache torna vuota
    await SA.eliminaArea(recB, [], cache);
    assert.strictEqual(cache.m.size, 0);
  });

  console.log('Livelli registrati dall\'app (v1.1)');
  const copiaLivelli = Object.assign({}, SA.LIVELLI);
  const ripristina = () => { SA.azzeraLivelli(); Object.keys(copiaLivelli).forEach(k => SA.registraLivello(k, copiaLivelli[k])); };
  const defFinto = (extra) => Object.assign({ nome: 'Finto', zMax: 18, kbPerTile: 10, urlFn: (z, x, y) => 'https://wms.esempio.it/?z=' + z + '&bbox=' + x + ',' + y }, extra || {});

  await prova('un livello con urlFn produce quegli indirizzi e rispetta il suo zoom massimo', () => {
    SA.registraLivello('finto', defFinto());
    const urls = SA.elencoUrl(AREA, 17, 19, ['finto']);
    assert.ok(urls.length > 0 && urls.every(u => u.startsWith('https://wms.esempio.it/?z=')));
    assert.ok(urls.every(u => !/z=19&/.test(u)), 'oltre lo zoom massimo del livello');
    assert.strictEqual(urls.length, SA.contaTile(AREA, 17, 19, ['finto']));
    ripristina();
  });
  await prova('registraLivello rifiuta definizioni sbagliate', () => {
    assert.throws(() => SA.registraLivello('a', { zMax: 18, url: 'x' }), /nome/);
    assert.throws(() => SA.registraLivello('a', { nome: 'A', zMax: 99, url: 'x' }), /zoom/);
    assert.throws(() => SA.registraLivello('a', { nome: 'A', zMax: 18 }), /indirizzo/);
  });
  await prova('livello che il server non permette: lasciato perdere dopo pochi tentativi, gli altri si salvano', async () => {
    SA.registraLivello('muto', defFinto({ nome: 'Muto' }));
    const cache = cacheFinta();
    const rete = reteFinta(url => url.includes('wms.esempio.it')
      ? new Response('<xml>errore</xml>', { status: 200, headers: { 'Content-Type': 'text/xml' } }) : null);
    const rec = await SA.scarica({ nome: 'M', bounds: AREA, zMin: 15, zMax: 18, livelli: ['muto', 'osm'], cache, fetchFn: rete, pausaMs: 0 });
    const aMuto = rete.chiamate.filter(u => u.includes('wms.esempio.it')).length;
    const nMuto = SA.contaTile(AREA, 15, 18, ['muto']);
    assert.ok(nMuto > 30, 'il test vuole molti tile');
    assert.ok(aMuto <= 6 + 2, 'richieste al livello muto: ' + aMuto + ' su ' + nMuto);
    assert.deepStrictEqual(rec.livelliKo, ['muto']);
    assert.strictEqual(rec.stato, 'incompleta');
    assert.strictEqual(rec.tileOk, SA.contaTile(AREA, 15, 18, ['osm']), 'i tile di OSM devono essere tutti salvati');
    assert.strictEqual(rec.errori, nMuto);
    ripristina();
  });
  await prova('un livello che funziona a tratti NON viene dichiarato morto', async () => {
    SA.registraLivello('ballerino', defFinto({ nome: 'Ballerino' }));
    let n = 0;
    const rete = reteFinta(url => {
      if (!url.includes('wms.esempio.it')) { return null; }
      n++;
      return n % 3 === 0 ? new Response('x', { status: 404 }) : null; // ogni terzo manca
    });
    const rec = await SA.scarica({ nome: 'B', bounds: AREA, zMin: 16, zMax: 18, livelli: ['ballerino'], cache: cacheFinta(), fetchFn: rete, pausaMs: 0 });
    assert.deepStrictEqual(rec.livelliKo, []);
    assert.ok(rec.tileOk > rec.errori);
    ripristina();
  });
  await prova('il record salva gli indirizzi: l\'area si elimina anche se i livelli cambiano dopo', async () => {
    SA.registraLivello('finto', defFinto());
    const cache = cacheFinta();
    const rec = await SA.scarica({ nome: 'U', bounds: AREA, zMin: 16, zMax: 17, livelli: ['finto', 'osm'], cache, fetchFn: reteFinta(), pausaMs: 0 });
    assert.strictEqual(rec.urls.length, rec.tileTotali);
    SA.azzeraLivelli(); // l'app cambia: i livelli di prima non esistono più
    const cancellati = await SA.eliminaArea(rec, [], cache);
    assert.strictEqual(cancellati, rec.tileTotali);
    assert.strictEqual(cache.m.size, 0);
    ripristina();
  });
  await prova('record vecchi senza indirizzi: si ricalcolano; livelli spariti ignorati senza errori', async () => {
    const cache = cacheFinta();
    const rec = await SA.scarica({ nome: 'V', bounds: AREA, zMin: 16, zMax: 17, livelli: ['osm'], cache, fetchFn: reteFinta(), pausaMs: 0 });
    const vecchio = Object.assign({}, rec); delete vecchio.urls;
    const orfano = { nome: 'O', bounds: AREA, zMin: 16, zMax: 17, livelli: ['non-esiste'] };
    const cancellati = await SA.eliminaArea(vecchio, [orfano], cache);
    assert.strictEqual(cancellati, rec.tileTotali);
  });
  await prova('la tabella dei livelli di base è intatta dopo le prove', () => {
    assert.ok(SA.LIVELLI.osm && SA.LIVELLI.topo);
    assert.strictEqual(SA.LIVELLI.osm.zMax, 19);
  });

  console.log('Archivio aree (IndexedDB)');
  let idb = null;
  try { idb = require('fake-indexeddb'); } catch (e) { /* facoltativo */ }
  if (!idb) {
    console.log('  salta: installa "fake-indexeddb" per provarlo (npm i fake-indexeddb)');
  } else {
    await prova('salva, elenca ed elimina', async () => {
      const arch = SA.apriArchivio('prova-' + Date.now(), new idb.IDBFactory());
      assert.deepStrictEqual(await arch.elenco(), []);
      await arch.salva({ id: 'a1', nome: 'Uno', data: '2026-10-18' });
      await arch.salva({ id: 'a2', nome: 'Due', data: '2026-10-19' });
      assert.strictEqual((await arch.elenco()).length, 2);
      await arch.salva({ id: 'a1', nome: 'Uno bis', data: '2026-10-18' }); // sovrascrive
      const lista = await arch.elenco();
      assert.strictEqual(lista.length, 2);
      assert.strictEqual(lista.find(x => x.id === 'a1').nome, 'Uno bis');
      await arch.elimina('a1');
      assert.deepStrictEqual((await arch.elenco()).map(x => x.id), ['a2']);
    });
  }

  console.log('\n' + ok + ' ok, ' + ko + ' falliti');
  process.exit(ko ? 1 : 0);
})();
