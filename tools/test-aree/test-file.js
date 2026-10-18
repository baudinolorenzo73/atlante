// Prove di lib/area-file.js (esporta/importa un'area come ZIP) — si lanciano con:  node tools/test-aree/test-file.js
// Servono Node 20+ e python3 (per controllare che lo ZIP sia valido anche per un altro programma).
'use strict';
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const AF = require('../../lib/area-file.js');

let ok = 0, ko = 0;
async function prova(nome, fn) {
  try { await fn(); ok++; console.log('  ok   ' + nome); }
  catch (e) { ko++; console.log('  FAIL ' + nome + '\n       ' + e.message); }
}
function cacheFinta() {
  const m = new Map();
  return { m, match: async (u) => m.get(u) && m.get(u).clone(), put: async (u, r) => { m.set(u, r); }, delete: async (u) => m['delete'](u) };
}
function tessera(i, tipo) {
  const u8 = new Uint8Array(500 + i * 7);
  for (let k = 0; k < u8.length; k++) { u8[k] = (k * 31 + i * 17) & 255; }
  return new Response(u8, { status: 200, headers: { 'Content-Type': tipo || 'image/png' } });
}
const URLS = Array.from({ length: 30 }, (_, i) => 'https://tile.esempio.org/19/' + (1000 + i) + '/2000.png');
async function cachePiena() { const c = cacheFinta(); for (let i = 0; i < URLS.length; i++) { await c.put(URLS[i], tessera(i)); } return c; }
const AREA = { id: 'a-1', nome: 'Lago Piccolo · prova', data: '2026-10-18T05:00:00.000Z', bounds: { s: 45.05, w: 7.39, n: 45.054, e: 7.397 },
  zMin: 13, zMax: 19, livelli: ['osm'], tileTotali: URLS.length, tileOk: URLS.length, errori: 0, stato: 'completa', versione: '1.2', urls: URLS };
const buf = async (blob) => new Uint8Array(await blob.arrayBuffer());
const comeFile = (u8, nome) => new File([u8], nome || 'x.zip', { type: 'application/zip' });
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'areafile-'));

(async function () {
  console.log('Esporta');
  let esp, bytes;
  await prova('esporta tutte le tessere in uno ZIP con nome chiaro', async () => {
    esp = await AF.esporta(AREA, await cachePiena());
    bytes = await buf(esp.blob);
    assert.strictEqual(esp.tileEsportati, 30);
    assert.strictEqual(esp.tileMancanti, 0);
    assert.strictEqual(esp.nome, 'atlante-area-Lago-Piccolo-prova.zip');
    assert.ok(bytes.length > 15000);
  });
  await prova('lo ZIP è valido anche per un altro programma (python zipfile) e il CRC torna', async () => {
    const f = path.join(tmp, 'a.zip'); fs.writeFileSync(f, bytes);
    const out = execFileSync('python3', ['-c', 'import zipfile,sys,json;z=zipfile.ZipFile(sys.argv[1]);assert z.testzip() is None;m=json.loads(z.read("manifest.json"));print(len(z.namelist()),m["formato"],len(m["tiles"]))', f]).toString().trim();
    assert.strictEqual(out, '31 atlante-area 30');
  });
  await prova('tessere mancanti dalla cache: esportate le altre, segnalate le mancanti', async () => {
    const c = await cachePiena(); await c.delete(URLS[3]); await c.delete(URLS[9]);
    const e = await AF.esporta(AREA, c);
    assert.strictEqual(e.tileEsportati, 28); assert.strictEqual(e.tileMancanti, 2);
  });
  await prova('cache vuota: errore chiaro, nessun file', async () => {
    await assert.rejects(AF.esporta(AREA, cacheFinta()), /nessuna tessera/);
  });
  await prova('area senza indirizzi: errore chiaro', async () => {
    const a = Object.assign({}, AREA); delete a.urls;
    await assert.rejects(AF.esporta(a, await cachePiena()), /Nessun indirizzo/);
  });

  console.log('Importa');
  await prova('round trip: esporta, svuota, importa → stessi byte e stesso tipo', async () => {
    const orig = await cachePiena();
    const e = await AF.esporta(AREA, orig);
    const nuova = cacheFinta();
    const r = await AF.importa(comeFile(await buf(e.blob)), nuova, { origine: 'https://atlante.esempio.it' });
    assert.strictEqual(r.importati, 30); assert.strictEqual(r.errori, 0); assert.strictEqual(r.scartati, 0);
    for (const u of URLS) {
      const a = await buf(await (await orig.match(u)).blob()), b = await buf(await (await nuova.match(u)).blob());
      assert.deepStrictEqual(Array.from(b), Array.from(a));
      assert.strictEqual((await nuova.match(u)).headers.get('content-type'), 'image/png');
    }
    assert.strictEqual(r.area.nome, AREA.nome); assert.strictEqual(r.area.id, 'a-1');
    assert.strictEqual(r.area.stato, 'completa'); assert.strictEqual(r.area.urls.length, 30);
    assert.deepStrictEqual(r.area.bounds, AREA.bounds); assert.strictEqual(r.area.importata, true);
  });
  await prova('importare due volte non duplica: la seconda volta salta le tessere già presenti', async () => {
    const e = await AF.esporta(AREA, await cachePiena());
    const nuova = cacheFinta(); const f = comeFile(await buf(e.blob));
    await AF.importa(f, nuova, {});
    const r2 = await AF.importa(f, nuova, {});
    assert.strictEqual(r2.importati, 0); assert.strictEqual(r2.saltati, 30); assert.strictEqual(nuova.m.size, 30);
  });
  await prova('una tessera con un byte cambiato (copia rovinata) viene rifiutata, le altre entrano', async () => {
    const e = await AF.esporta(AREA, await cachePiena());
    const b = await buf(e.blob); b[45] ^= 0xFF; // dentro i dati della prima tessera
    const nuova = cacheFinta();
    const r = await AF.importa(comeFile(b), nuova, {});
    assert.strictEqual(r.errori, 1); assert.strictEqual(r.importati, 29);
    assert.strictEqual(r.area.stato, 'incompleta'); assert.ok(!nuova.m.has(URLS[0]));
  });
  await prova('file tagliato (copia interrotta): errore chiaro', async () => {
    const e = await AF.esporta(AREA, await cachePiena());
    const b = await buf(e.blob);
    await assert.rejects(AF.importa(comeFile(b.slice(0, b.length - 100)), cacheFinta(), {}), /completo|danneggiato|tagliato/);
  });
  await prova('file qualunque o vuoto: errore chiaro', async () => {
    await assert.rejects(AF.importa(comeFile(new Uint8Array(5)), cacheFinta(), {}), /valido/);
    await assert.rejects(AF.importa(comeFile(new TextEncoder().encode('ciao '.repeat(100))), cacheFinta(), {}), /ZIP completo/);
  });
  await prova('ZIP di altri (compresso, senza il nostro elenco): rifiutato senza toccare la cache', async () => {
    const f = path.join(tmp, 'altro.zip');
    execFileSync('python3', ['-c', 'import zipfile,sys;z=zipfile.ZipFile(sys.argv[1],"w",zipfile.ZIP_DEFLATED);z.writestr("manifest.json","{\\"formato\\":\\"altro\\"}"*50);z.close()', f]);
    const c = cacheFinta();
    await assert.rejects(AF.importa(comeFile(fs.readFileSync(f)), c, {}), /compresso/);
    const g = path.join(tmp, 'altro2.zip');
    execFileSync('python3', ['-c', 'import zipfile,sys;z=zipfile.ZipFile(sys.argv[1],"w",zipfile.ZIP_STORED);z.writestr("manifest.json","{\\"formato\\":\\"altro\\"}");z.close()', g]);
    await assert.rejects(AF.importa(comeFile(fs.readFileSync(g)), c, {}), /Non è un file area/);
    assert.strictEqual(c.m.size, 0);
  });
  await prova('SICUREZZA: indirizzi http, dell\'app stessa o tipi non immagine vengono scartati', async () => {
    const c = cacheFinta();
    const cattivi = ['http://tile.esempio.org/1/1/1.png', 'https://atlante.esempio.it/js/01-base.js', 'https://tile.esempio.org/svg/1.png', 'javascript:alert(1)', 'https://tile.esempio.org/ok/1.png'];
    for (let i = 0; i < cattivi.length; i++) { await c.put(cattivi[i], tessera(i, i === 2 ? 'image/svg+xml' : 'image/png')); }
    const a = Object.assign({}, AREA, { urls: cattivi, tileTotali: 5 });
    const e = await AF.esporta(a, c);
    const nuova = cacheFinta();
    const r = await AF.importa(comeFile(await buf(e.blob)), nuova, { origine: 'https://atlante.esempio.it' });
    assert.strictEqual(r.importati, 1); assert.strictEqual(r.scartati, 4);
    assert.deepStrictEqual([...nuova.m.keys()], ['https://tile.esempio.org/ok/1.png']);
    assert.strictEqual(r.area.stato, 'incompleta');
  });
  await prova('nomi di file: accenti e simboli diventano un nome sicuro', () => {
    assert.strictEqual(AF.nomeFile('Là, c\'è un Lago/Piccolo?'), 'atlante-area-La-c-e-un-Lago-Piccolo.zip');
    assert.strictEqual(AF.nomeFile(''), 'atlante-area-area.zip');
  });
  await prova('area grande (3000 tessere da ~20 KB): esporta e importa senza problemi', async () => {
    const c = cacheFinta(); const urls = [];
    for (let i = 0; i < 3000; i++) { const u = 'https://tile.esempio.org/19/' + i + '/1.png'; urls.push(u); await c.put(u, tessera(i % 50 + 2000)); }
    const e = await AF.esporta(Object.assign({}, AREA, { urls }), c);
    const n = cacheFinta();
    const t0 = Date.now();
    const r = await AF.importa(comeFile(await buf(e.blob)), n, {});
    assert.strictEqual(r.importati, 3000); assert.strictEqual(n.m.size, 3000);
    console.log('       -> ' + Math.round(e.blob.size / 1048576 * 10) / 10 + ' MB, import in ' + (Date.now() - t0) + ' ms');
  });

  fs.rmSync(tmp, { recursive: true, force: true });
  console.log('\n' + ok + ' ok, ' + ko + ' falliti');
  process.exit(ko ? 1 : 0);
})();
