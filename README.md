# Hub documenti con tracciamento — istruzioni operative

Pagina statica su GitHub Pages che condivide documenti (Canva, PDF, link) e registra chi li apre. I dati vengono salvati direttamente in Supabase, e un workflow n8n Cloud permette di interrogarli.

- Sito: `https://federicotempella.github.io/REPOSITORY/`
- Hub (elenco documenti): `https://federicotempella.github.io/REPOSITORY/?u=<id-lead>`
- Link di un documento: `https://federicotempella.github.io/REPOSITORY/<id-documento>/?u=<id-lead>`

Questo file sta in un repository pubblico. Non scriverci mai URL riservati, password o elenchi di lead.

## 1. Come funziona

Il lead clicca il link `…/agenti-ai/?u=silvia-bordo-0a2885144`.
La pagina legge `u`, invia l'evento a Supabase tramite `tracking.js` e dopo circa mezzo secondo apre il documento (Canva, PDF…).
I dati vengono salvati in Supabase nella tabella `content_tracking`.
Un workflow n8n Cloud permette di interrogare i dati per analisi e correlazione con i contatti.

**Architettura:**
GitHub Pages → tracking.js → Supabase (content_tracking)
↓
n8n Cloud (content-tracking-reader)
↓
Claude Code mostra dati

Perché una pagina per documento: la card che LinkedIn mostra nel messaggio viene costruita dalla pagina a cui punta il link. Con un redirect HTTP (Dub, bit.ly) LinkedIn seguiva il redirect e la card portava direttamente a Canva, saltando il tracciamento. Qui la pagina risponde normalmente e il redirect lo fa il JavaScript, che il crawler di LinkedIn non esegue.

**Eventi registrati:**

| event | Quando |
|-------|--------|
| `doc_open` | Il lead apre direttamente il link del documento |
| `doc_click` | Il lead arriva al documento dall'hub (il link contiene `s=hub`) |
| `hub_view` | Il lead apre l'hub. Senza `u` non viene registrato |

**Tracking multi-contenuto:** Se un lead atterra sull'hub e clicca su più documenti, ogni click viene tracciato separatamente, permettendo di vedere l'intero percorso di navigazione.

## 2. File del progetto

| File | A cosa serve | Lo modifichi? |
|------|---------------|---------------|
| `documents.json` | Elenco dei documenti e indirizzo del sito | Sì, a ogni nuovo documento |
| `tracking.js` | Invia eventi a Supabase (credenziali inline) | Una volta sola (per credenziali) |
| `build.py` | Genera le pagine dei documenti dai dati di `documents.json` | No, lo esegui |
| `<id>/index.html` | Pagina del singolo documento (generata da `build.py`) | No |
| `cards/<id>.png` | Immagine 1200×630 mostrata nella card | Sì, una per documento |
| `cards/default.png` | Immagine di riserva e dell'hub | Raramente |
| `index.html`, `app.js`, `style.css` | Hub, logica, grafica | No |
| `Claude_TrackingDoc.md` | Documentazione per l'agente Claude | No (ma tienilo nel repo per riferimento) |

## 3. Attivazione iniziale (una sola volta)

### 3.1 GitHub Pages
Repository → Settings → Pages.
Source: Deploy from a branch, branch `main`, cartella `/ (root)`. Salva.
Dopo 1-2 minuti il sito risponde su `https://federicotempella.github.io/REPOSITORY/`.
Gli indirizzi sono sensibili a maiuscole e minuscole: scrivili sempre come sopra.

### 3.2 Supabase
Crea un progetto Supabase e crea la tabella `content_tracking` con le colonne:
`id`, `timestamp_server`, `timestamp_client`, `event`, `lead`, `doc`, `src`, `referrer`, `session`, `user_agent`, `probable_bot`

Abilita RLS con policy per INSERT e SELECT anon.

### 3.3 tracking.js
Nel file `tracking.js`, inserisci le credenziali Supabase:
- `SUPABASE_URL`: URL del progetto Supabase
- `SUPABASE_KEY`: Publishable API key (anon/public key)

### 3.4 Workflow n8n Cloud
In n8n Cloud, crea il workflow `content-tracking-reader`:
- Webhook per interrogare i dati
- Nodo Postgres per leggere da Supabase
- Nodo Log per registrare le query
- Endpoint per Claude Code

Configura le credenziali Supabase nel nodo Postgres.

### 3.5 Test di attivazione
Apri `…/agenti-ai/?u=test1` e controlla che compaia una riga in Supabase.

## 4. Aggiungere un nuovo documento

Prepara il documento:
- Canva: usa il link pubblico di visualizzazione (`canva.link/...`)
- PDF: caricalo in una cartella `docs/` del repository. Il repository è pubblico: chi conosce l'indirizzo del file lo apre senza passare dalla pagina e senza essere tracciato. Niente materiale riservato.
- Link esterno: l'URL completo

Aggiungi un blocco in `documents.json`, dentro `documents`, separato da una virgola:
```json
{
  "id": "brochure-p2p",
  "tag": "PDF",
  "title": "Brochure Procure-to-Pay",
  "description": "Panoramica della soluzione in 4 pagine.",
  "url": "docs/brochure-p2p.pdf"
}

id: solo minuscole, numeri e trattini. Finisce nel link e non va più cambiato.
title e description sono anche il testo della card in LinkedIn. Titolo breve, descrizione sotto i 200 caratteri circa.
Per un link esterno o Canva, url è l'indirizzo completo (https://…).
Immagine della card: Salva cards/<id>.png, 1200×630 px, peso sotto 1 MB. Per Canva: Condividi → Scarica → PNG, dopo aver impostato il formato 1200×630. Se manca, viene usata cards/default.png.

Genera la pagina: Nella cartella del progetto: python3 build.py. Stampa il link tracciabile e si ferma con un errore se id o campi non sono validi. Si crea la cartella <id>/ con la sua index.html.

Carica su GitHub (Add file → Upload files): documents.json, la cartella <id>/, cards/<id>.png, e il PDF se c'è. Dopo 1-2 minuti è pubblicato.

5. Come costruire il link da mettere nel messaggio
Formato: https://federicotempella.github.io/REPOSITORY/<id>/?u=<identificativo>

Il parametro u è l'identificativo del lead. Valori ammessi: lettere, numeri, punto, trattino, trattino basso. Gli altri caratteri vengono eliminati: un nome come "Niccolò" diventa "Niccol".

Template per LinkedIn Helper (blocco IF/THEN/ELSE):

IF {publicId} → THEN https://federicotempella.github.io/REPOSITORY/agenti-ai/?u={publicId}
ELSE (lascia vuoto il testo) con un IF annidato:
IF {lastName} → THEN https://federicotempella.github.io/REPOSITORY/agenti-ai/?u={firstName}_{lastName}
ELSE → https://federicotempella.github.io/REPOSITORY/agenti-ai/
I campi "Optional text" restano vuoti, altrimenti il testo si aggiunge dopo il link. Il link deve comparire una volta sola nel messaggio.

Cosa vedrai nella colonna lead in Supabase:

Caso normale: lo slug del profilo (silvia-bordo-0a2885144)
Senza slug: Nome_Cognome
Vuoto: link senza parametro, non attribuibile a nessuno
Se vuoi mandare l'hub invece di un documento, usa …/REPOSITORY/?u={publicId}.

6. Test (prima di ogni documento nuovo e prima di ogni campagna)
Pagina e tracking: Apri …/<id>/?u=test1 e controlla che compaia una riga in Supabase.

Card su LinkedIn (il test che conta): Manda a te stesso o a un collega un messaggio con il link.

La card mostra la tua immagine e il tuo titolo, non quelli di Canva.
Clicca la card, non il testo del link. Nella schermata You're leaving LinkedIn l'indirizzo deve essere …/REPOSITORY/<id>/?u=…. Se compare canva.com, la card sta saltando la pagina e il tracciamento non regge sul clic della card.
In Supabase deve comparire una riga per quel clic.
Tracking multi-contenuto: Apri l'hub, clicca su un documento, torna indietro, clicca su un altro. Supabase registrerà ogni click separatamente.

7. Leggere i risultati
Tramite Supabase:
SELECT * FROM public.content_tracking 
WHERE probable_bot = false 
ORDER BY timestamp_server DESC 
LIMIT 100;

Tramite n8n Cloud:
Chiama il webhook content-tracking-reader con parametri:

lead: Filtra per lead specifico
doc: Filtra per documento specifico
event: Filtra per tipo di evento
start_date, end_date: Filtra per periodo
Tramite Claude Code:
Vedi Claude_TrackingDoc.md per i comandi dell'agente:

"Mostrami il tracking per il lead [NOME]"
"Analizza i segnali di interesse"
"Correla con i contatti nel database prospects"

8. Se qualcosa non funziona
| Sintomo | Causa probabile | Cosa fare |
| --- | --- | --- |
| Il sito dà 404 | Pages non attivo, o indirizzo con maiuscole diverse | Sezione 3.1, controlla l'indirizzo esatto |
| Un documento nuovo dà 404 | Cartella <id>/ non caricata, o Pages in pubblicazione | Controlla che <id>/index.html sia nel repository, aspetta 2 minuti |
| L'hub non mostra il documento | Manca il blocco in documents.json o c'è un errore di sintassi (virgola) | Valida il file su un validatore JSON |
| Il documento si apre, nessuna riga in Supabase | tracking.js non caricato, credenziali sbagliate, o ad blocker | Controlla console del browser per errori "Tracking error" |
| Riga con lead vuoto | Il link è arrivato senza ?u= | Controlla il template del messaggio |
| lead tronco (es. Niccol) | Caratteri non ammessi eliminati | Usa lo slug (publicId) invece di firstName_lastName |
| La card punta a Canva | Sul link c'è ancora un redirect (Dub, bit.ly), o il tag og:url è stato aggiunto | Usa direttamente l'indirizzo della pagina, senza accorciatori |
| La card è vuota o vecchia | Cache di LinkedIn, og:image con indirizzo errato o immagine troppo pesante | Controlla l'indirizzo dell'immagine aprendolo nel browser; peso sotto 1 MB |

9. Limiti e privacy
Le credenziali Supabase sono in tracking.js, leggibile da chiunque. Considera i dati come indicativi, non come prova.
Il repository è pubblico (richiesto da Pages gratuito). Nel repository non vanno elenchi di lead, esportazioni LinkedIn Helper o materiale riservato.
Dati personali: Registri chi apre cosa: in Supabase ci sono slug del profilo, orario e user-agent. L'indirizzo IP non viene salvato. Fai verificare a chi gestisce il GDPR in DT la riga di informativa nel footer e per quanto tempo conservare i dati.
noindex: Le pagine escludono i motori di ricerca.
10. Manutenzione
Cambiare le credenziali Supabase: modifica tracking.js e caricalo.
Sostituire un documento senza cambiare il link: mantieni l'id, cambia url in documents.json, lancia build.py e ricarica documents.json e <id>/index.html.
Ritirare un documento: togli il blocco da documents.json e ricarica. La cartella <id>/ resta raggiungibile dai link già inviati, quindi o la tieni (il documento si apre ancora) o la cancelli e chi clicca vede un errore 404.
Cambiare l'indirizzo del sito: aggiorna siteUrl, lancia build.py e ricarica tutto. I link già inviati con il vecchio indirizzo smettono di funzionare.
11. Agente Claude Code
Per interrogare i dati di tracking e correlarli con i contatti, usa Claude Code con il file Claude_TrackingDoc.md. L'agente può:

Mostrare riepiloghi di attività
Filtrare per lead, documento, periodo
Correlare con la tabella prospects in Supabase
Identificare segnali di interesse (lead caldi, tiepidi, potenziali)
Suggerire azioni di follow-up
```
11. Backlog
Tracciamento del percorso tra più documenti

Stato: da fare. Quando: appena ci sono almeno due documenti pubblicati. Con un solo documento un percorso non esiste, quindi oggi non si può né implementare né provare.

Situazione attuale. Ogni arrivo su una pagina del sito è un evento (hub_view, doc_open, doc_click) con lead, doc e orario. La sequenza dei documenti consultati da un lead si ricostruisce ordinando gli eventi per orario. Non sono tracciati:

tutto ciò che avviene dopo il redirect (tempo, pagine viste e scorrimento stanno su Canva, che la pagina non può leggere);
il tasto indietro: non genera eventi, e l'hub ripristinato dal browser può non rieseguire gli script;
la continuità della visita: session cambia a ogni pagina caricata.

Interventi, dal più economico:

#	Intervento	Cosa risolve	Note
1	Identificativo di visita salvato nel browser (sessionStorage) e usato in tutti gli eventi	Hub e documenti risultano la stessa visita	Una modifica in app.js
2	Evento hub_return quando l'hub viene ripristinato con il tasto indietro (evento pageshow con persisted)	Il ritorno dal documento all'hub	Il comportamento cambia per browser: da provare su desktop e mobile
3	Evento all'uscita dall'hub con la durata	Tempo passato sull'hub	Solo l'hub, non i documenti
4	Documento incorporato nella pagina, con pulsante "Torna ai documenti" e misura del tempo di visibilità	Tempo sul documento	Cambia l'esperienza del destinatario. Per Canva non si vedrebbero comunque le pagine lette. Da valutare solo se il tempo di lettura serve davvero. Non verificato il comportamento nell'app mobile di LinkedIn

Prima di implementare, test di riferimento con un lead di prova (test_percorso1):

Apri …/<sito>/?u=test_percorso1, clicca un documento, torna indietro con il tasto del browser, riclicca, poi apri il link diretto …/<id>/?u=test_percorso1.
Leggi le righe di quel lead in ordine di orario (event, doc, src, session, orario).
Ripeti da desktop e da telefono.
Confronta con la sequenza attesa e annota cosa manca.

Dopo l'implementazione:

Aggiorna la riga di informativa nel footer (build.py e index.html): oggi dichiara solo l'apertura dei documenti, non tempi e ritorni. Fai ricontrollare il testo a chi gestisce il GDPR.
Aggiorna Claude_TrackingDoc.md con le regole per leggere un percorso (per esempio come trattare gli eventi ravvicinati della stessa visita).
