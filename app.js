(function () {
  "use strict";

  var cfg = window.SITE_CONFIG || {};
  var params = new URLSearchParams(window.location.search);

  // Valori ammessi nei parametri: lettere, numeri, punto, trattino, trattino basso, tilde.
  function clean(value, max) {
    return String(value || "").replace(/[^A-Za-z0-9._~-]/g, "").slice(0, max);
  }

  var lead = clean(params.get("u"), 80);       // identificativo del lead
  var source = clean(params.get("s"), 20);     // "hub" se il clic parte dall'elenco
  var debug = params.get("debug") === "1";     // modalità test: niente redirect, mostra il payload

  function $(id) { return document.getElementById(id); }

  function referrerOrigin() {
    try { return document.referrer ? new URL(document.referrer).origin : ""; }
    catch (e) { return ""; }
  }

  // Registrazione: usa la funzione trackEvent da tracking.js per inviare a Supabase.
  function track(eventName, docId) {
    var sessionId = sessionStorage.getItem('session_id') || 'session-' + Date.now();
    sessionStorage.setItem('session_id', sessionId);
    return trackEvent(eventName, lead, docId, source, referrerOrigin(), sessionId);
  }

  // ---------------------------------------------------------------
  // FILTRI ANTI-APERTURA AUTOMATICA
  //
  // Il 24/11/2026 un invio di prova ha prodotto hub_view + tre doc_click
  // sui tre documenti allo stesso millisecondo, senza che nessuno cliccasse.
  // Qualcosa carica la pagina, esegue il JavaScript e segue tutti i link.
  //
  // Due controlli, entrambi aggirabili ma che coprono i casi osservati:
  //   1. la pagina deve essere stata in primo piano
  //   2. non devono essersi aperti altri documenti nello stesso istante
  // ---------------------------------------------------------------

  var CHIAVE_BURST = "dt_caricamenti";
  var FINESTRA_BURST = 5000;   // ms entro cui due aperture sono "insieme"
  var ATTESA = 3000;           // ms di permanenza prima di registrare

  function segnalaCaricamento(docId) {
    try {
      var ora = Date.now();
      var lista = JSON.parse(localStorage.getItem(CHIAVE_BURST) || "[]")
        .filter(function (x) { return ora - x.t < 30000; });
      lista.push({ d: docId, t: ora });
      localStorage.setItem(CHIAVE_BURST, JSON.stringify(lista));
    } catch (e) { /* localStorage non disponibile: si prosegue */ }
  }

  function altriDocumentiInsieme(docId) {
    try {
      var ora = Date.now();
      return JSON.parse(localStorage.getItem(CHIAVE_BURST) || "[]")
        .some(function (x) { return x.d !== docId && ora - x.t < FINESTRA_BURST; });
    } catch (e) { return false; }
  }

  function inPrimoPiano() {
    if (document.prerendering) return false;          // prerender del browser
    return document.visibilityState === "visible";
  }

  // ---------- PAGINA DOCUMENTO: /<id>/ ----------
  function renderDoc(body) {
    var d = {
      id: body.getAttribute("data-doc-id"),
      url: body.getAttribute("data-doc-url"),
      tag: body.getAttribute("data-doc-tag"),
      title: body.getAttribute("data-doc-title"),
      description: body.getAttribute("data-doc-desc")
    };

    $("view-redirect").hidden = false;
    $("r-tag").textContent = d.tag || "Documento";
    $("r-title").textContent = d.title;
    $("r-desc").textContent = d.description || "";
    $("r-link").setAttribute("href", d.url);
    $("r-hub").setAttribute("href", "../" + (lead ? "?u=" + encodeURIComponent(lead) : ""));

    segnalaCaricamento(d.id);

    var started = Date.now();
    var eventName = source === "hub" ? "doc_click" : "doc_open";
    var valutato = false;

    function apriDocumento() {
      if (debug) return;
      var wait = Math.max(0, (cfg.minDelayMs || 500) - (Date.now() - started));
      setTimeout(function () { window.location.replace(d.url); }, wait);
    }

    function mostraDebug(testo) {
      if (!debug) return;
      var box = $("debug");
      box.hidden = false;
      box.textContent = testo;
    }

    function valuta(motivo) {
      if (valutato) return;
      valutato = true;

      var scarto = null;
      if (!inPrimoPiano()) scarto = "pagina mai in primo piano";
      else if (altriDocumentiInsieme(d.id)) scarto = "altri documenti aperti nello stesso momento";

      if (scarto) {
        mostraDebug("NON registrato: " + scarto);
        apriDocumento();
        return;
      }

      track(eventName, d.id).then(function (result) {
        mostraDebug(JSON.stringify(result, null, 2) +
          "\n\nregistrato (" + motivo + ")\nRedirect verso: " + d.url +
          (debug ? " (disattivato in debug)" : ""));
        apriDocumento();
      });
    }

    // Un gesto umano accorcia l'attesa.
    ["pointerdown", "keydown", "scroll", "touchstart"].forEach(function (ev) {
      window.addEventListener(ev, function () { valuta("interazione: " + ev); },
        { once: true, passive: true });
    });

    // Altrimenti si registra dopo ATTESA ms, se la pagina è in primo piano.
    setTimeout(function () { valuta("permanenza"); }, ATTESA);
  }

  // ---------- HUB: elenco documenti letto da documents.json ----------
  function renderHub(docs) {
    $("view-hub").hidden = false;
    $("brand").setAttribute("href", lead ? "./?u=" + encodeURIComponent(lead) : "./");
    var grid = $("docs");
    grid.textContent = "";

    if (!docs.length) {
      var empty = document.createElement("p");
      empty.className = "section-sub";
      empty.textContent = "Nessun documento disponibile al momento.";
      grid.appendChild(empty);
    }

    docs.forEach(function (d) {
      var a = document.createElement("a");
      a.className = "card";
      a.href = "./" + encodeURIComponent(d.id) + "/?s=hub" + (lead ? "&u=" + encodeURIComponent(lead) : "");
      // Evita che il browser precarichi da solo le pagine dei documenti.
      a.setAttribute("rel", "noopener nofollow");

      var tag = document.createElement("span");
      tag.className = "chip";
      tag.textContent = d.tag || "Documento";

      var h3 = document.createElement("h3");
      h3.textContent = d.title;

      var p = document.createElement("p");
      p.textContent = d.description || "";

      var more = document.createElement("span");
      more.className = "card-cta";
      more.textContent = "Apri il documento →";

      a.appendChild(tag);
      a.appendChild(h3);
      a.appendChild(p);
      a.appendChild(more);
      grid.appendChild(a);
    });

    if ((lead || cfg.trackAnonymous) && inPrimoPiano()) {
      track("hub_view", "");
    }
  }

  var body = document.body;
  if (body.getAttribute("data-doc-id")) {
    renderDoc(body);
  } else {
    fetch("documents.json", { cache: "no-store" })
      .then(function (r) { return r.json(); })
      .then(function (j) { renderHub((j && j.documents) || []); })
      .catch(function () { renderHub([]); });
  }
})();
