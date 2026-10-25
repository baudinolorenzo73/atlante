# Atlante di campo — PWA

> Dalla v3.6 l'app si chiama **Atlante di campo**. I dati restano gli stessi: il database nel telefono e il formato dei backup non cambiano, quindi i backup vecchi si importano senza problemi.

Atlante di campo (nato per il Lago Piccolo di Avigliana, ora per qualsiasi luogo): catalogo di punti con foto, audio e GPS, percorsi, mappe con legenda, avvisi «Vicino a te», capitoli dei luoghi, sincronizzazione con Google Drive, esportazioni PDF ed Excel. **by Lollo ®2026**

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
| `js/03-gps-tracce.js` | GPS dal vivo, fix mediato, registrazione tracce; statistiche (v4.4: distanza senza tremolii, dislivello a soglia 5 m, tempo in movimento, velocità, tipo stimato) e profilo altimetrico | |
| `js/04-punti.js` | Punti sulla mappa e nel Catalogo, dettaglio del punto | |
| `js/05-scheda.js` | Scheda nuovo/modifica punto (foto, audio, specie, «Scheda sito») | |
| `js/06-esporta.js` | Esportazioni GPX, KML, GeoJSON, CSV, schede stampabili, ZIP, importazione | |
| `js/07-esplora.js` | Scheda Esplora (meteo, iNaturalist, GBIF, Wikipedia, Wikidata, OpenStreetMap) | |
| `js/08-dossier.js` | **Testi del Dossier**, fonti, checklist delle specie, calendario | aggiornare la ricerca |
| `js/09-vicino.js` | Avvisi «Vicino a te» e archivio della zona | cambiare la zona o le regole degli avvisi |
| `js/10-pwa.js` | Aggiornamenti, installazione, preparazione offline e mappe | |
| `js/11-altro.js` | Scheda Altro e menu dei livelli | |
| `js/12-bussola.js` | Bussola (nord e mappa orientata secondo la direzione) e freccia rossa verso la specie più vicina | |
| `js/14-fonti.js` | **Ricerca e fonti**: studi (OpenAlex), foto storiche (Wikimedia Commons, Panoramax), canti (Xeno-canto), diario delle stagioni, biblioteca delle fonti, macchina del tempo (Esri Wayback), livelli WMS/XYZ tuoi, confronto con Natura 2000 | aggiungere una fonte o una scheda di ricerca |
| `data/n2000.js` | Habitat e specie del formulario Natura 2000 IT1110007 (con codici); le specie entrano nella checklist del Dossier | correggere i nomi comuni |
| `js/19-novita.js` | **Aggiornamento automatico** (all'avvio controlla se sul sito c'è una versione nuova e propone «Aggiorna ora») e finestra **Novità** dopo ogni aggiornamento |
| `css/app.css` | Stile **chiaro e scuro** (v4.1): colori come variabili in cima al file, il tema scuro vale con il telefono in modalità scura o con Altro → Impostazioni → Aspetto |
| `js/21-gpslogger.js` + `gpslogger/atlante.properties` | **GPSLogger** di mendhak (v4.2; dalla v4.4 l'unica app esterna, perché si comanda dall'Atlante): profilo «atlante» caricato con il link `gpslogger://properties/…`, registrazione a schermo spento, ritorno dei GPX con «Condividi → Atlante di campo» (share target in `manifest.webmanifest` e `sw.js`) |
| `js/22-astro.js` + `data/wmm.js` | **Calcoli senza rete (v4.5)**: alba, tramonto, crepuscolo, ora d'oro, luna (formule di Meeus) e declinazione magnetica con il modello WMM2025 (valido fino al 2030). Funzioni pure, provate contro `ephem` e `pygeomag` |
| `js/23-campo.js` | **Strumenti da campo (v4.5)**: scheda in Uscita, Sole e luna, Declinazione (corregge la bussola della mappa), Rientro prima del buio (`RIE`), Clinometro (`CLINO`: altezza alberi e pendenza, scrive nel campo `alt_alb` della scheda Albero) |
| `js/24-soste.js` | **Dividi alle soste (v4.5)**: trova le soste (entro 30 m per N minuti, anche come «buco» senza punti) e divide la traccia in tratti |
| `js/27-crescita.js` | **Tipo di crescita / estensione (v5.0)**: 3 tipologie della guida, specie d'esempio, osservazione guidata, diario del germoglio, ipotesi AI; sempre col «perché» |
| `js/26-supericerca.js` | **Super ricerca (v4.9)**: nome (anche con refusi) + Pl@ntNet + AI con foto, verifica GBIF, presenza nei dintorni, Wikipedia, liste locali; percentuali mai mediate |
| `js/25-ai.js` | **Assistente AI (v4.7-4.8)**: «Compila dai dati» (Wikipedia → riassunto AI in italiano, solo dal testo) e chat «Chiedi all'AI» con il contesto della scheda; caricamento da open.env; provider Gemini, Groq, Cerebras, OpenRouter, Together con ripiego sul successivo; chiavi solo sul dispositivo |
| `js/20-interfaccia.js` | **Organizzazione delle schede (v4.0)**: Uscita (registrazione, percorso, tracce, diario), Luogo (Capitolo · Esplora · Ricerca e fonti), Esporta unico, filtri del Catalogo |
| `js/18-capitoli.js` | **Capitoli del Dossier**: il Lago Piccolo ha il suo capitolo scritto a mano; per ogni altro luogo l'app scarica e salva un capitolo automatico (Wikipedia, Wikidata, clima Open-Meteo, specie iNaturalist, OpenStreetMap, geologia Macrostrat) che funziona anche senza rete |
| `js/17-percorsi.js` | **Percorsi** (uscite con le loro schede, foto e tracce: nuovo, apri, chiudi, aggiungi punti per giorno) ed esportazioni del percorso in ZIP, PDF con schema ed **Excel .xlsx con le foto** (scrittore XLSX interno, senza librerie) |
| `js/16-drive.js` | **Sincronizzazione con Google Drive** (cartella «Atlante di campo»; quella vecchia «Atlante Lago Piccolo» viene rinominata da sola: dati.json, foto, audio, esporta/), unione per elemento e «lapidi» per le eliminazioni |
| `js/15-luoghi.js` | **Luoghi di lavoro** (il lago e altri luoghi, ognuno con archivio e mappe senza rete) e **casella di ricerca** 🔍 (luoghi online, punti, note, specie, diario, fonti, coordinate) | cambiare le dimensioni dell'area o il servizio di ricerca |
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
2. Crea un repository nuovo, per esempio **`atlante-lago-piccolo`** (se esiste già, usa quello: il nome del repository non deve per forza cambiare con il nome dell'app, e cambiandolo cambierebbe l'indirizzo).
3. Carica il file ZIP `atlante-di-campo-v<versione>.zip` (per esempio `atlante-di-campo-v3.6.zip`; fino alla v3.5 si chiamava `atlante-lago-piccolo-v<versione>.zip`). I file sono già alla radice: `index.html` deve finire nella radice del repository, non in una sottocartella.
4. Su GitHub apri il repository, poi **Settings → Pages**.
5. In **Source** scegli **Deploy from a branch**. Come branch scegli **main** e come cartella **/ (root)**, poi premi **Save**.
6. Aspetta 1–2 minuti. L'indirizzo sarà:
   **https://baudinolorenzo73.github.io/atlante-lago-piccolo/**

## 3. Installare sul telefono

1. Prima di sostituire la versione precedente, crea un **Backup completo** in Altro → Esporta e importa.
2. Estrai tutti i file di questo ZIP nella stessa cartella della versione precedente, oppure pubblicali nello stesso sito. Mantieni indirizzo, porta e browser: i dati del browser dipendono dall’origine. Non disinstallare la vecchia app e non cancellare i dati del sito.
3. Apri esplicitamente `index.html` tramite HTTPS oppure localhost (anche 127.0.0.1). Ricarica la pagina e verifica **Versione 5.4** in Altro → Installazione e aggiornamenti. Non installare partendo dal solo indirizzo della cartella.
4. **Installa sulla Home** chiede al browser di aggiungere l’icona. Se non compare la richiesta: menu di Chrome → Installa app / Aggiungi a schermata Home; su Safari iPhone: Condividi → Aggiungi a Home.
5. **Prepara app offline** salva i file dell’app e attiva il servizio offline. In caso di errore viene indicato il singolo file: niente messaggio di completamento se ne manca uno.
6. **Mappe senza rete**: seleziona le carte e lo zoom desiderati, poi Scarica mappe selezionate. Il conteggio generale include tessere di tutti i luoghi; non certifica la copertura completa. Le mappe di altri luoghi già salvate rimangono disponibili.
7. Prima dell’uscita, chiudi e riapri la pagina in modalità aereo e controlla le carte nell’area e agli zoom desiderati. Le funzioni di ricerca, AI e Pl@ntNet richiedono la rete.

Il pulsante Aggiorna verifica solo i file all’indirizzo corrente. Se usi un server locale sul telefono, prima sostituisci i file nella cartella servita con quelli dello ZIP nuovo. Non scarica autonomamente gli allegati della chat.

Se l’icona mostra `FORBIDDEN: No directory listing`, la vecchia installazione sta aprendo la cartella anziché `index.html`. Apri da Chrome l’indirizzo completo che termina con `/index.html`, prepara l’app offline, elimina la vecchia icona/app installata e installala nuovamente da quella pagina. La v5.3.1 imposta `index.html` come pagina di avvio.

Pl@ntNet: la chiave viene verificata tramite `/v2/quota/daily` e la disponibilità si legge da `quota.identify.remaining`. Un 403 significa accesso negato: controlla chiave, stato dell’account e restrizioni sui domini/IP. Un errore di rete non dimostra che la chiave sia sbagliata. La chiave personale non è inclusa nello ZIP.

Configurazione: in Altro → Esporta e importa, **Esporta configurazione** crea un file `.atlcfg` cifrato con la password scelta. Comprende preferenze, ID client Google, chiave Pl@ntNet e chiavi/modelli AI; non comprende il token temporaneo di accesso a Google. **Importa configurazione** ripristina il file e richiede poi un nuovo accesso a Google. La password non viene salvata e non può essere recuperata.

Fonti tecniche: [quota Pl@ntNet](https://my.plantnet.org/doc/api/quota), [account e restrizioni](https://my.plantnet.org/doc/api/contract), [policy tessere OpenStreetMap](https://operations.osmfoundation.org/policies/tiles/). Il server pubblico OSM non viene usato per il download anticipato; resta disponibile per consultare la mappa.

Verifica di questa versione: sintassi dei file JavaScript; cifratura AES-GCM, decifratura, importazione e rifiuto della password errata controllati con Web Crypto; avvio e rendering DOM dell’app con IndexedDB simulato; salvataggio file, 403 parziale, quota API e conteggi mappe con risposte simulate; log mantenuto navigando tra schede. Service worker verificato in simulazione: navigazione offline con query, richieste di aggiornamento dirette alla rete e conservazione della cache precedente quando un file manca. Il test su browser reale Android e con chiavi personali rimane da fare: il browser di test non è disponibile in questo ambiente.

### Verifica e riparazione delle mappe (v5.3)

Controlli v5.3 con servizi e memoria simulati: verifica senza chiamate di rete; distinzione per area e zoom; riconoscimento di risposte XML salvate come tessere; riparazione delle sole lacune; conservazione dei file validi; seconda riparazione senza richieste aggiuntive; gestione del 403 e verifica interrotta.

In **Altro → Mappe senza rete** seleziona le carte e lo zoom massimo, quindi:

- **Verifica copertura**: controlla solo i file locali, anche senza rete. Mostra il luogo, l’area e le tessere presenti/attese. Apri ogni carta per vedere i risultati per zoom. Una risposta salvata che non sia un’immagine valida secondo lo stato HTTP e il tipo di contenuto viene considerata da riparare; la verifica non decodifica né certifica il contenuto cartografico dell’immagine.
- **Ripara mancanti**: richiede una verifica della selezione corrente; ricontrolla la memoria e scarica solo le tessere mancanti o non valide, conservando le altre. Se un servizio rifiuta la prima richiesta, passa alla carta successiva. Alla fine verifica nuovamente i file e segnala eventuali lacune.
- **Interrompi**: ferma le richieste in corso; le tessere già salvate rimangono. Ripeti la verifica per conoscere la copertura dopo un’interruzione.

La selezione e i rapporti rimangono nella sessione, distinti per luogo, area, livelli e zoom. Una modifica della selezione richiede una nuova verifica, salvo esista già un rapporto per la stessa selezione. I rapporti hanno data e ora: altre schede del browser o la cancellazione della memoria possono renderli superati. La riparazione ricontrolla sempre la memoria prima di procedere.

Il controllo riguarda l’area offline del luogo già definita dall’app, non tutto il territorio visibile sulla mappa. OpenStreetMap dal server pubblico resta escluso dal download anticipato. Per avere la mappa all’avvio senza rete serve anche **Prepara app offline**. Verifica le carte in modalità aereo prima dell’uscita.

## 4. Modificare e aggiornare

1. Modifica il file che ti serve (vedi la tabella sopra).
2. In Termux, dalla cartella del progetto, lancia:
   ```
   python tools/build.py --zip
   ```
   Questo comando cambia il codice build e crea `../atlante-di-campo-v<versione>.zip`. Per cambiare anche il numero di versione scrivi per esempio `python tools/build.py 1.4 --zip`.
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
Crea `dist/atlante_di_campo.html` con tutto dentro, come le versioni precedenti. È comodo da mandare a qualcuno. Per la PWA si pubblica invece la cartella intera.

---

Dati e mappe: © OpenStreetMap, Esri, Regione Piemonte, ISPRA, iNaturalist, GBIF, Wikipedia/Wikidata (vedi il Dossier per le fonti).
