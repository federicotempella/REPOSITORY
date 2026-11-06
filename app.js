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
  var sid = Math.random().toString(36).slice(2, 10);

  function $(id) { return document.getElementById(id); }

  function referrerOrigin() {
    try { return document.referrer ? new URL(document.referrer).origin : ""; }
    catch (e) { return ""; }
  }

  // Registrazione: richiesta GET verso il webhook n8n. Non richiede CORS e non blocca la pagina.
  function track(eventName, docId) {
    var sessionId = sessionStorage.getItem('session_id') || 'session-' + Date.now();
    sessionStorage.setItem('session_id', sessionId);
    return trackEvent(eventName, lead, docId, source, referrerOrigin(), sessionId);
  }

    var hook = cfg.webhook || "";
    if (!hook || hook.indexOf("INCOLLA") === 0) {
      return Promise.resolve({ sent: false, reason: "webhook non configurato", payload: payload });
    }

    var qs = Object.keys(payload).map(function (k) {
      return encodeURIComponent(k) + "=" + encodeURIComponent(payload[k]);
    }).join("&");
    var url = hook + (hook.indexOf("?") > -1 ? "&" : "?") + qs;

    return new Promise(function (resolve) {
      var finished = false;
      function finish(sent, reason) {
        if (finished) return;
        finished = true;
        resolve({ sent: sent, reason: reason || "", payload: payload });
      }
      function pingImage() {
        var img = new Image();
        img.onload = img.onerror = function () { finish(true); };
        img.src = url;
      }
      setTimeout(function () { finish(false, "timeout"); }, cfg.timeoutMs || 1200);
      if (window.fetch) {
        fetch(url, { method: "GET", mode: "no-cors", keepalive: true, cache: "no-store" })
          .then(function () { finish(true); })
          .catch(pingImage);
      } else {
        pingImage();
      }
    });
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

    var started = Date.now();
    var eventName = source === "hub" ? "doc_click" : "doc_open";

    track(eventName, d.id).then(function (result) {
      if (debug) {
        var box = $("debug");
        box.hidden = false;
        box.textContent = JSON.stringify(result, null, 2) + "\n\nRedirect verso: " + d.url + " (disattivato in debug)";
        return;
      }
      var wait = Math.max(0, (cfg.minDelayMs || 500) - (Date.now() - started));
      setTimeout(function () { window.location.replace(d.url); }, wait);
    });
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

    if (lead || cfg.trackAnonymous) {
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
