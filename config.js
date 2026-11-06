/*
  CONFIGURAZIONE DEL TRACCIAMENTO
  I documenti NON stanno qui: stanno in documents.json.
  Attenzione: il file è pubblico (come tutto il repository). Nessun dato riservato qui dentro.
*/
window.SITE_CONFIG = {

  // URL del webhook n8n (nodo Webhook, metodo GET, URL di produzione).
  // Finché resta "INCOLLA_QUI..." nulla viene registrato.
  webhook: "http://localhost:5678/webhook/dt-track",

  // Tempo massimo di attesa della registrazione prima di aprire comunque il documento (millisecondi).
  timeoutMs: 1200,

  // Tempo minimo in cui resta visibile la schermata "apertura in corso" (millisecondi).
  minDelayMs: 500,

  // false = non registra le visite all'hub senza identificativo del lead (?u=...). Meno rumore nei dati.
  trackAnonymous: true
};
