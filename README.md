# Hub documenti con tracciamento — istruzioni operative

Pagina statica su GitHub Pages che condivide documenti (Canva, PDF, link) e registra chi li apre, tramite un webhook n8n che scrive su un Google Sheet.

- **Sito:** `https://federicotempella.github.io/REPOSITORY/`
- **Hub (elenco documenti):** `https://federicotempella.github.io/REPOSITORY/?u=<id-lead>`
- **Link di un documento:** `https://federicotempella.github.io/REPOSITORY/<id-documento>/?u=<id-lead>`

> Questo file sta in un repository pubblico. Non scriverci mai URL riservati, password o elenchi di lead.

---

## 1. Come funziona

1. Il lead clicca il link `…/agenti-ai/?u=silvia-bordo-0a2885144`.
2. La pagina legge `u`, manda l'evento al webhook n8n e dopo circa mezzo secondo apre il documento (Canva, PDF…).
3. n8n valida l'evento e aggiunge una riga al foglio **Eventi**.

Perché una pagina per documento: la card che LinkedIn mostra nel messaggio viene costruita dalla pagina a cui punta il link. Con un redirect HTTP (Dub, bit.ly) LinkedIn seguiva il redirect e la card portava direttamente a Canva, saltando il tracciamento. Qui la pagina risponde normalmente e il redirect lo fa il JavaScript, che il crawler di LinkedIn non esegue. **Da confermare con il test della card (sezione 5): non è stato verificato su LinkedIn.**

### Eventi registrati

| `event` | Quando |
|---|---|
| `doc_open` | Il lead apre direttamente il link del documento |
| `doc_click` | Il lead arriva al documento dall'hub (il link contiene `s=hub`) |
| `hub_view` | Il lead apre l'hub. Senza `u` non viene registrato |

### File del progetto

| File | A cosa serve | Lo modifichi? |
|---|---|---|
| `documents.json` | Elenco dei documenti e indirizzo del sito | **Sì**, a ogni nuovo documento |
| `config.js` | URL del webhook n8n e tempi di attesa | Una volta sola |
| `build.py` | Genera le pagine dei documenti dai dati di `documents.json` | No, lo esegui |
| `<id>/index.html` | Pagina del singolo documento (generata da `build.py`) | No |
| `cards/<id>.png` | Immagine 1200×630 mostrata nella card | Sì, una per documento |
| `cards/default.png` | Immagine di riserva e dell'hub | Raramente |
| `index.html`, `app.js`, `style.css` | Hub, logica, grafica | No |
| `n8n/workflow-tracking.json` | Workflow n8n da importare | Una volta sola |

---

## 2. Attivazione iniziale (una sola volta)

### 2.1 GitHub Pages
1. Repository → **Settings → Pages**.
2. Source: *Deploy from a branch*, branch `main`, cartella `/ (root)`. Salva.
3. Dopo 1-2 minuti il sito risponde su `https://federicotempella.github.io/REPOSITORY/`.
4. Gli indirizzi sono sensibili a maiuscole e minuscole: scrivili sempre come sopra.

### 2.2 Google Sheet
1. Crea un foglio Google e rinomina la prima scheda in **`Eventi`**.
2. Nella riga 1, una per colonna e con questi nomi esatti:
   `timestamp_server`, `timestamp_client`, `event`, `lead`, `doc`, `src`, `referrer`, `session`, `user_agent`, `probable_bot`
3. Copia l'ID del foglio: la parte dell'URL tra `/d/` e `/edit`.

### 2.3 Workflow n8n
1. In n8n: **Workflows → Import from file** → `n8n/workflow-tracking.json`.
2. Nodo **Aggiungi riga**: scegli o crea le credenziali Google Sheets, incolla l'ID del foglio e seleziona la scheda `Eventi`. Il file è stato scritto a mano e **non è stato provato in n8n**: se l'importazione segnala parametri non validi su questo nodo, ricrea solo quel nodo (*Google Sheets → Append row*, mappatura automatica delle colonne).
3. Nodo **Webhook**: apri la scheda **Production URL** e copia l'indirizzo. Ha la forma `https://<tua-istanza-n8n>/webhook/dt-track`.
4. **Attiva il workflow** (interruttore in alto a destra). Se resta inattivo, solo l'URL di test risponde e non registra nulla.

Se preferisci non usare Google Sheets, sostituisci l'ultimo nodo con una **Data table** di n8n o un altro archivio. Il nodo precedente produce già una riga pulita con le dieci colonne sopra.

### 2.4 Collegare pagina e webhook
1. In `config.js` sostituisci `INCOLLA_QUI_URL_WEBHOOK_N8N` con l'URL di produzione.
2. In `documents.json` controlla che `siteUrl` sia `https://federicotempella.github.io/REPOSITORY` (senza barra finale).
3. Sul tuo PC, nella cartella del progetto: `python3 build.py`. Aggiorna le pagine e i tag delle card con l'indirizzo giusto.
4. Carica su GitHub i file cambiati (sezione 3, passo 5).

### 2.5 Test di attivazione
Vedi la sezione 5. In breve: apri `…/agenti-ai/?u=test1&debug=1` e controlla che compaia una riga nel foglio.

---

## 3. Aggiungere un nuovo documento

1. **Prepara il documento.**
   - Canva: usa il link pubblico di visualizzazione (`canva.link/...`).
   - PDF: caricalo in una cartella `docs/` del repository. **Il repository è pubblico**: chi conosce l'indirizzo del file lo apre senza passare dalla pagina e senza essere tracciato. Niente materiale riservato.
   - Link esterno: l'URL completo.

2. **Aggiungi un blocco in `documents.json`**, dentro `documents`, separato da una virgola:
   ```json
   {
     "id": "brochure-p2p",
     "tag": "PDF",
     "title": "Brochure Procure-to-Pay",
     "description": "Panoramica della soluzione in 4 pagine.",
     "url": "docs/brochure-p2p.pdf"
   }
   ```
   - `id`: solo minuscole, numeri e trattini. Finisce nel link e non va più cambiato.
   - `title` e `description` sono anche il testo della card in LinkedIn. Titolo breve, descrizione sotto i 200 caratteri circa.
   - Per un link esterno o Canva, `url` è l'indirizzo completo (`https://…`).

3. **Immagine della card.** Salva `cards/<id>.png`, 1200×630 px, peso sotto 1 MB. Per Canva: Condividi → Scarica → PNG, dopo aver impostato il formato 1200×630. Se manca, viene usata `cards/default.png`.

4. **Genera la pagina.** Nella cartella del progetto: `python3 build.py`.
   Stampa il link tracciabile e si ferma con un errore se `id` o campi non sono validi. Si crea la cartella `<id>/` con la sua `index.html`.

5. **Carica su GitHub** (Add file → Upload files): `documents.json`, la cartella `<id>/`, `cards/<id>.png`, e il PDF se c'è. Dopo 1-2 minuti è pubblicato.

6. **Testa** con la sezione 5 prima di inviarlo a qualcuno.

### Senza Python (alternativa manuale)
Copia la cartella di un documento esistente, rinominala con il nuovo `id` e nel suo `index.html` cambia, in tutte le occorrenze: titolo, descrizione, `og:title`, `og:description`, `og:image` (con il nuovo nome file), e gli attributi `data-doc-id`, `data-doc-url`, `data-doc-tag`, `data-doc-title`, `data-doc-desc`. Il testo visibile nei tag `r-tag`, `r-title`, `r-desc` e il link `r-link`. Aggiungi comunque il blocco a `documents.json`, altrimenti l'hub non lo mostra. È facile sbagliare: usa `build.py` appena puoi.

---

## 4. Come costruire il link da mettere nel messaggio

Formato: `https://federicotempella.github.io/REPOSITORY/<id>/?u=<identificativo>`

Il parametro `u` è l'identificativo del lead. Valori ammessi: lettere, numeri, punto, trattino, trattino basso. Gli altri caratteri vengono eliminati: **un nome come "Niccolò" diventa "Niccol"**.

### Template per LinkedIn Helper (blocco IF/THEN/ELSE)
- **IF** `{publicId}` → **THEN** `https://federicotempella.github.io/REPOSITORY/agenti-ai/?u={publicId}`
- **ELSE** (lascia vuoto il testo) con un IF annidato:
  - **IF** `{lastName}` → **THEN** `https://federicotempella.github.io/REPOSITORY/agenti-ai/?u={firstName}_{lastName}`
  - **ELSE** → `https://federicotempella.github.io/REPOSITORY/agenti-ai/`
- I campi "Optional text" restano vuoti, altrimenti il testo si aggiunge dopo il link.
- Il link deve comparire **una volta sola** nel messaggio. Se è doppio, controlla di non aver scritto `?u=` anche fuori dal blocco.

### Cosa vedrai nella colonna `lead`
- Caso normale: lo slug del profilo (`silvia-bordo-0a2885144`). Il profilo è `linkedin.com/in/<lead>`.
- Senza slug: `Nome_Cognome`.
- Vuoto: link senza parametro, non attribuibile a nessuno.

Se vuoi mandare l'hub invece di un documento, usa `…/REPOSITORY/?u={publicId}`.

---

## 5. Test (prima di ogni documento nuovo e prima di ogni campagna)

1. **Pagina e webhook.** Apri `…/<id>/?u=test1&debug=1`.
   - Non c'è il redirect e compare un riquadro con i dati inviati.
   - In n8n → **Executions** c'è una nuova esecuzione riuscita, e nel foglio una riga con `lead = test1`.
   - Se il riquadro dice `webhook non configurato`, `config.js` non è stato aggiornato o caricato.
2. **Redirect.** Apri lo stesso link senza `&debug=1`: dopo circa mezzo secondo si apre il documento. Controlla anche che nel foglio ci sia la riga.
3. **Card su LinkedIn** (il test che conta). Manda a te stesso o a un collega un messaggio con il link.
   - La card mostra la tua immagine e il tuo titolo, non quelli di Canva.
   - Clicca la **card**, non il testo del link. Nella schermata *You're leaving LinkedIn* l'indirizzo deve essere `…/REPOSITORY/<id>/?u=…`. Se compare `canva.com`, la card sta saltando la pagina e il tracciamento non regge sul clic della card.
   - Nel foglio deve comparire una riga per quel clic.
4. **Rete aziendale e mobile.** Ripeti il punto 2 da un PC aziendale e dal telefono con dati mobili. Un blocco della chiamata al webhook fa perdere l'evento, ma il documento si apre lo stesso.
5. **Pulizia.** Cancella dal foglio le righe di test (`lead` che inizia per `test`).

Se la card è vuota, vecchia o sbagliata, LinkedIn può aver messo in cache il primo tentativo. Non è noto un modo per forzare l'aggiornamento nei messaggi privati: prova con un indirizzo leggermente diverso (per esempio un valore `u` nuovo) e verifica se cambia.

---

## 6. Leggere i risultati

Foglio **Eventi**, una riga per evento. Colonne utili:

| Colonna | Significato |
|---|---|
| `event` | `doc_open`, `doc_click`, `hub_view` |
| `lead` | Identificativo dal link |
| `doc` | Documento aperto |
| `probable_bot` | `si` se lo user-agent somiglia a un crawler. Filtra su `no` |
| `referrer` | Origine della visita, se il browser la fornisce |

**Riepilogo per lead e documento.** In una nuova scheda `Riepilogo`, cella A1:

```
=QUERY(Eventi!A1:J,"select D, E, count(H) where C <> 'hub_view' and J = 'no' and D <> '' group by D, E order by count(H) desc label D 'Lead', E 'Documento', count(H) 'Aperture'",1)
```
La formula non è stata provata sul tuo foglio: se segnala un errore, controlla che le intestazioni siano quelle della sezione 2.2 e nell'ordine indicato.

**Come leggere i numeri.** Sono un minimo, non l'elenco completo. Chi compare ha aperto. Chi manca può aver aperto lo stesso, per esempio con un blocco sulla chiamata al webhook o con un ad blocker. **Non usare l'assenza di una riga come segnale di disinteresse nei follow-up.** Un conteggio alto sullo stesso lead nello stesso minuto può essere un'anteprima automatica: confrontalo con `probable_bot` e con lo user-agent.

---

## 7. Se qualcosa non funziona

| Sintomo | Causa probabile | Cosa fare |
|---|---|---|
| Il sito dà 404 | Pages non attivo, o indirizzo con maiuscole diverse | Sezione 2.1, controlla l'indirizzo esatto |
| Un documento nuovo dà 404 | Cartella `<id>/` non caricata, o Pages in pubblicazione | Controlla che `<id>/index.html` sia nel repository, aspetta 2 minuti |
| L'hub non mostra il documento | Manca il blocco in `documents.json` o c'è un errore di sintassi (virgola) | Valida il file su un validatore JSON |
| Il documento si apre, nessuna riga nel foglio | Workflow non attivo, `config.js` con il segnaposto, ad blocker, o URL di test invece di quello di produzione | Esegui il test 1 con `debug=1` e guarda Executions in n8n |
| Riga con `lead` vuoto | Il link è arrivato senza `?u=` | Controlla il template del messaggio |
| `lead` tronco (es. `Niccol`) | Caratteri non ammessi eliminati | Usa lo slug (`publicId`) invece di `firstName_lastName` |
| La card punta a Canva | Sul link c'è ancora un redirect (Dub, bit.ly), o il tag `og:url` è stato aggiunto | Usa direttamente l'indirizzo della pagina, senza accorciatori |
| La card è vuota o vecchia | Cache di LinkedIn, `og:image` con indirizzo errato o immagine troppo pesante | Controlla l'indirizzo dell'immagine aprendolo nel browser; peso sotto 1 MB |
| Righe duplicate dello stesso lead | Più clic o apertura da più dispositivi | Normale; filtra per `session` se vuoi un solo evento per visita |

---

## 8. Limiti e privacy

- **Il webhook è pubblico.** L'URL sta in `config.js`, leggibile da chiunque. Non c'è autenticazione possibile in una pagina statica. Chiunque potrebbe inviare eventi falsi: il nodo di validazione scarta solo i formati non previsti. Considera i dati come indicativi, non come prova.
- **Il repository è pubblico** (richiesto da Pages gratuito). Nel repository non vanno elenchi di lead, esportazioni LinkedIn Helper o materiale riservato.
- **Dati personali.** Registri chi apre cosa: nel foglio ci sono slug del profilo, orario e user-agent. L'indirizzo IP non viene salvato. Fai verificare a chi gestisce il GDPR in DT la riga di informativa nel footer e per quanto tempo conservare il foglio. Questo file non è un parere legale.
- **`noindex`.** Le pagine escludono i motori di ricerca. Non è stato verificato se influisca sulle anteprime di LinkedIn: se la card non compare mai, prova a toglierlo da `build.py` e da `index.html`.
- **Quota n8n.** Ogni evento è un'esecuzione. Su un piano cloud con quota mensile, una campagna ampia può consumarla: controlla il limite del tuo piano.

---

## 9. Manutenzione

- **Cambiare il webhook:** modifica `config.js` e caricalo.
- **Sostituire un documento senza cambiare il link:** mantieni l'`id`, cambia `url` in `documents.json`, lancia `build.py` e ricarica `documents.json` e `<id>/index.html`.
- **Ritirare un documento:** togli il blocco da `documents.json` e ricarica. La cartella `<id>/` resta raggiungibile dai link già inviati, quindi o la tieni (il documento si apre ancora) o la cancelli e chi clicca vede un errore 404.
- **Cambiare l'indirizzo del sito:** aggiorna `siteUrl`, lancia `build.py` e ricarica tutto. I link già inviati con il vecchio indirizzo smettono di funzionare.
