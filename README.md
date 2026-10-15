# Atlante Lago Piccolo — PWA

Atlante di campo del Lago Piccolo di Avigliana: catalogo di punti con foto, audio e GPS, mappe con legenda, avvisi «Vicino a te», dossier di ricerca, esportazioni. **by Lollo ®2026**

L'app è divisa in moduli: ogni parte sta in un file separato, così una modifica tocca solo il file che serve.

---

## 1. Cosa c'è nelle cartelle

| File o cartella | Cosa contiene | Aprilo per… |
|---|---|---|
| `index.html` | La struttura della pagina (pulsanti, schede in basso) e l'elenco dei moduli da caricare | aggiungere un pulsante o un modulo |
| `css/app.css` | Colori, dimensioni, aspetto | cambiare l'aspetto |
| `js/version.js` | Numero di versione, codice build ed elenco dei file. **Lo genera `tools/build.py`** | — (non serve toccarlo) |
| `js/01-base.js` | Configurazione (marchio, centro del lago), utilità, database del telefono, impostazioni, **categorie** e campi delle schede | aggiungere una categoria o un campo |
| `js/02-mappa.js` | Mappa, **mappe di base e livelli**, **legenda** | aggiungere una mappa o un livello WMS |
| `js/03-gps-tracce.js` | GPS dal vivo, fix mediato, registrazione tracce | |
| `js/04-punti.js` | Punti sulla mappa e nel Catalogo, dettaglio del punto | |
| `js/05-scheda.js` | Scheda nuovo/modifica punto (foto, audio, specie, «Scheda sito») | |
| `js/06-esporta.js` | Esportazioni GPX, KML, GeoJSON, CSV, schede stampabili, ZIP, importazione | |
| `js/07-esplora.js` | Scheda Esplora (meteo, iNaturalist, GBIF, Wikipedia, Wikidata, OpenStreetMap) | |
| `js/08-dossier.js` | **Testi del Dossier**, fonti, checklist delle specie, calendario | aggiornare la ricerca |
| `js/09-vicino.js` | Avvisi «Vicino a te» e archivio della zona | cambiare la zona o le regole degli avvisi |
| `js/10-pwa.js` | Pulsanti Aggiorna e Installa tutto, mappe senza rete | |
| `js/11-altro.js` | Scheda Altro e menu dei livelli | |
| `js/12-bussola.js` | Bussola (nord e mappa orientata secondo la direzione) e freccia rossa verso la specie più vicina | |
| `js/13-avvio.js` | Navigazione tra le schede e avvio dell'app (**deve restare l'ultimo**) | |
| `data/alberi.js` | Catalogo dei 144 alberi del corso | |
| `data/schede_ricerca.js` | Le 81 schede iniziali della ricerca (flora, fauna, rocce, acque, storia, folclore, curiosità, sentieri) con fonti | aggiungere schede per tutti (vedi sotto) |

**Schede della ricerca:**
- Entrano nel Catalogo **una sola volta**, al primo avvio, con il tag «ricerca». Da lì le modifichi nell'app come qualsiasi punto: il testo «Dalla ricerca» è modificabile e le tue note restano separate.
- Se elimini una scheda, non torna da sola. Per riaverla vai su Dossier → «Ripristina le mancanti».
- Per aggiungere schede nuove valide per chiunque installi l'app:
  1. Apri `data/schede_ricerca.js` e aggiungi una voce con una chiave `k` mai usata.
  2. Aumenta `v` di 1.
  3. Lancia `python tools/build.py`.

  Al prossimo avvio entrano solo le voci nuove.
- **Posizioni indicative:** il segnaposto tratteggiato indica una posizione messa a tavolino, che non fa scattare gli avvisi. Quando scarichi l'archivio della zona (🔔), l'app sposta da sola quelle che trova per nome (per esempio San Bartolomeo e il Monte Cuneo). Le altre le sposti tu sul posto con «Aggiorna dal GPS».
| `lib/leaflet/` | Libreria delle mappe Leaflet 1.9.4 e il plugin leaflet-rotate 0.2.8 (rotazione della mappa) | — |
| `icons/` | Icone dell'app | cambiare l'icona |
| `manifest.webmanifest` | Nome, colori e icone dell'app installata | cambiare il nome sulla Home |
| `sw.js` | Service worker: fa funzionare l'app senza rete | — |
| `tools/build.py` | Rigenera `js/version.js` (e se vuoi lo ZIP) | da lanciare dopo ogni modifica |
| `tools/build_single.py` | Crea la versione in un unico file HTML | |

**Regole per i moduli:**
- I file `js/` si caricano nell'ordine dei numeri. Ogni funzione si può usare da qualsiasi modulo, purché la si chiami dopo l'avvio.
- Per aggiungere un modulo:
  1. Crea per esempio `js/14-nuovo.js` e scrivi `'use strict';` come prima riga.
  2. In `index.html` aggiungi `<script src="js/14-nuovo.js"></script>` **prima** della riga di `13-avvio.js`.
  3. Lancia `python tools/build.py`.
- Non rinominare una funzione senza cercarla in tutti i file: può essere usata da altri moduli.

---

## 2. Pubblicare la prima volta (con «Pubblica» e GitHub Pages)

1. Apri la tua app «Pubblica».
2. Crea un repository nuovo, per esempio **`atlante-lago-piccolo`**.
3. Carica il file ZIP `atlante-lago-piccolo.zip`. I file sono già alla radice: `index.html` deve finire nella radice del repository, non in una sottocartella.
4. Su GitHub apri il repository, poi **Settings → Pages**.
5. In **Source** scegli **Deploy from a branch**. Come branch scegli **main** e come cartella **/ (root)**, poi premi **Save**.
6. Aspetta 1–2 minuti. L'indirizzo sarà:
   **https://baudinolorenzo73.github.io/atlante-lago-piccolo/**

## 3. Installare sul telefono

1. Apri l'indirizzo con **Chrome**.
2. Vai su **Altro → App: aggiornamento e installazione → ⬇️ Installa tutto**. Questo pulsante:
   - aggiunge l'icona alla schermata Home;
   - salva l'app nel telefono;
   - scarica le mappe dell'area del lago, se confermi (conviene il Wi-Fi).
3. Se il browser non mostra la richiesta di installazione, usa il menu **⋮** di Chrome e scegli **Installa app**.
4. Dal pulsante 🔔 sulla mappa scarica una volta l'**archivio della zona** per gli avvisi «Vicino a te».

Da quel momento l'app si apre anche senza rete.

## 4. Modificare e aggiornare

1. Modifica il file che ti serve (vedi la tabella sopra).
2. In Termux, dalla cartella del progetto, lancia:
   ```
   python tools/build.py --zip
   ```
   Questo comando cambia il codice build e crea `../atlante-lago-piccolo.zip`. Per cambiare anche il numero di versione scrivi per esempio `python tools/build.py 1.4 --zip`.
3. Pubblica lo ZIP con «Pubblica» nello stesso repository.
4. Sul telefono vai su **Altro → 🔄 Aggiorna**. L'app trova la nuova build, scarica i file nuovi e si riavvia.

**Punti, foto, audio e tracce non vengono mai toccati dagli aggiornamenti.** Stanno nel database del browser, separato dai file dell'app. Il backup resta comunque importante: Altro → Crea backup.

## 5. Provare in locale prima di pubblicare (Termux)

```
cd percorso/della/cartella/atlante-lago-piccolo
python -m http.server 8000
```
Apri **http://localhost:8000** in Chrome sul telefono. Su `localhost` funzionano anche il service worker, il GPS e il microfono. Per fermare il server premi **Ctrl+C** in Termux.

> Non aprire `index.html` toccandolo da un'app di gestione file. I moduli si caricano lo stesso, ma il browser non salva i dati e non installa la PWA. Serve un indirizzo `http://localhost` oppure `https://`.

## 6. Versione in un unico file

```
python tools/build_single.py
```
Crea `dist/atlante_lago_piccolo.html` con tutto dentro, come le versioni precedenti. È comodo da mandare a qualcuno. Per la PWA si pubblica invece la cartella intera.

---

Dati e mappe: © OpenStreetMap, Esri, Regione Piemonte, ISPRA, iNaturalist, GBIF, Wikipedia/Wikidata (vedi il Dossier per le fonti).
