// Configurazione Supabase
const SUPABASE_URL = 'https://gtqeebtjsyutglsxmfmf.supabase.co';
const SUPABASE_KEY = 'sb_publishable_VRNtdasasO99nACvPVaJtA_Qa7nh0dG';
const TABLE = 'content_tracking';

// Invia un evento di tracciamento a Supabase.
//
// L'attesa prima dell'invio NON sta più qui: la decide app.js, che registra
// solo se la pagina è stata in primo piano e non sono stati aperti altri
// documenti nello stesso istante. Qui si invia e basta.
async function trackEvent(event, lead, doc, src, referrer, session) {
  const data = {
    timestamp_client: new Date().toISOString(),
    event,
    lead,
    doc,
    src,
    referrer,
    session,
    user_agent: navigator.userAgent,
    probable_bot: /bot|crawler|spider|preview|scanner|headless|curl|wget|python|slurp|facebookexternalhit|embedly|monitor/i.test(navigator.userAgent)
  };

  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/${TABLE}`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      console.error('Tracking error:', await response.text());
    }
  } catch (error) {
    console.error('Tracking error:', error);
    return { ok: false, error: String(error) };            // <-- e questa
  }
}
