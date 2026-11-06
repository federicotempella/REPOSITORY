#!/usr/bin/env python3
"""
Genera le pagine dei documenti a partire da documents.json.

Uso (dalla cartella che contiene questo file):
    python3 build.py

Cosa fa:
  - per ogni documento crea <id>/index.html con i tag Open Graph (la card che LinkedIn mostra)
  - aggiorna i tag Open Graph di index.html (l'hub)
  - stampa il link tracciabile di ogni documento

Immagine della card: cards/<id>.png (1200x630). Se manca, usa cards/default.png.
Non richiede librerie esterne.
"""
import json
import os
import re
import sys
from html import escape

HERE = os.path.dirname(os.path.abspath(__file__))

PAGE = """<!doctype html>
<html lang="it">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{title} · Digital Technologies</title>
  <meta name="description" content="{desc}">
  <meta name="robots" content="noindex, nofollow">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Digital Technologies">
  <meta property="og:title" content="{title}">
  <meta property="og:description" content="{desc}">
  <meta property="og:image" content="{image}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="stylesheet" href="../style.css">
</head>
<body data-doc-id="{id}" data-doc-url="{url}" data-doc-tag="{tag}" data-doc-title="{title}" data-doc-desc="{desc}">

  <header class="top">
    <div class="wrap">
      <a class="brand" href="../">Digital Technologies<span> · Risorse</span></a>
      <a class="btn btn-small" href="https://www.digtechs.com/en/contacts#contact" target="_blank" rel="noopener">Parla con un esperto</a>
    </div>
  </header>

  <main>
    <div id="view-redirect" hidden>
      <section class="redirect">
        <div class="wrap narrow">
          <div class="spinner" aria-hidden="true"></div>
          <span class="eyebrow eyebrow-dark" id="r-tag">{tag}</span>
          <h1 id="r-title">{title}</h1>
          <p class="lead lead-dark" id="r-desc">{desc}</p>
          <a class="btn btn-primary" id="r-link" href="{url}">Apri il documento</a>
          <p class="small">Se il documento non si apre da solo entro un secondo, usa il pulsante qui sopra.</p>
          <p class="small"><a href="../" id="r-hub">Vedi tutti i documenti</a></p>
          <pre id="debug" class="debug" hidden></pre>
        </div>
      </section>
    </div>

    <noscript>
      <section class="redirect"><div class="wrap narrow">
        <h1>{title}</h1>
        <p class="lead lead-dark">{desc}</p>
        <a class="btn btn-primary" href="{url}">Apri il documento</a>
      </div></section>
    </noscript>
  </main>

  <footer class="foot">
    <div class="wrap">
      <p><strong>Digital Technologies S.r.l. Società Benefit.</strong> Questa è una pagina di condivisione documenti, non il sito istituzionale. Il sito ufficiale è <a href="https://www.digtechs.com/" target="_blank" rel="noopener">digtechs.com</a>.</p>
      <p class="foot-small">Questa pagina registra l'apertura dei documenti (identificativo del link, documento, data e ora) per sapere quali materiali sono utili. Informativa completa: <a href="https://www.digtechs.com/en/privacy-policy/" target="_blank" rel="noopener">Privacy Policy</a>.</p>
    </div>
  </footer>

  <script src="../config.js"></script>
  <script src="../app.js"></script>
</body>
</html>
"""


def fail(msg):
    print("ERRORE: " + msg)
    sys.exit(1)


def main():
    with open(os.path.join(HERE, "documents.json"), encoding="utf-8") as f:
        data = json.load(f)

    site = (data.get("siteUrl") or "").rstrip("/")
    placeholder = "UTENTE" in site or "REPOSITORY" in site
    if not site.startswith("https://") or (placeholder and "--allow-placeholder" not in sys.argv):
        fail('in documents.json "siteUrl" va impostato, per esempio https://mario.github.io/risorse')

    docs = data.get("documents") or []
    seen = set()
    links = []

    for d in docs:
        doc_id = d.get("id", "")
        if not re.fullmatch(r"[a-z0-9][a-z0-9-]{0,59}", doc_id):
            fail('id "%s" non valido: usa solo minuscole, numeri e trattini' % doc_id)
        if doc_id in seen:
            fail('id "%s" duplicato' % doc_id)
        seen.add(doc_id)
        for key in ("tag", "title", "description", "url"):
            if not d.get(key):
                fail('documento "%s": manca il campo "%s"' % (doc_id, key))

        url = d["url"]
        if re.match(r"https?://", url):
            page_url = url
        else:
            # percorso relativo alla radice del sito (es. docs/brochure.pdf): dalla cartella del documento serve "../"
            page_url = "../" + url.lstrip("./")

        card = "cards/%s.png" % doc_id
        if not os.path.exists(os.path.join(HERE, card)):
            card = "cards/default.png"
            print('Attenzione: cards/%s.png non trovata, uso cards/default.png' % doc_id)

        html = PAGE.format(
            id=escape(doc_id, quote=True),
            url=escape(page_url, quote=True),
            tag=escape(d["tag"], quote=True),
            title=escape(d["title"], quote=True),
            desc=escape(d["description"], quote=True),
            image=escape(site + "/" + card, quote=True),
        )
        folder = os.path.join(HERE, doc_id)
        os.makedirs(folder, exist_ok=True)
        with open(os.path.join(folder, "index.html"), "w", encoding="utf-8") as f:
            f.write(html)
        links.append((doc_id, "%s/%s/?u=" % (site, doc_id)))

    # Tag Open Graph dell'hub
    path = os.path.join(HERE, "index.html")
    with open(path, encoding="utf-8") as f:
        hub = f.read()
    hub = re.sub(
        r'(<meta property="og:image" content=")[^"]*(">)',
        lambda m: m.group(1) + site + "/cards/default.png" + m.group(2),
        hub,
        count=1,
    )
    with open(path, "w", encoding="utf-8") as f:
        f.write(hub)

    print("\nGenerate %d pagine. Link tracciabili (aggiungi l'identificativo del lead in fondo):\n" % len(links))
    for doc_id, link in links:
        print("  %-24s %s" % (doc_id, link))
    print("\nLink dell'hub: %s/?u=" % site)


if __name__ == "__main__":
    main()
