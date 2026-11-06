// Configurazione Supabase
const SUPABASE_URL = 'https://gtqeebtjsyutglsxmfmf.supabase.co';
const SUPABASE_KEY = 'sb_publishable_VRNtdasasO99nACvPVaJtA_Qa7nh0dG';
const TABLE = 'content_tracking';

// Funzione per inviare tracking a Supabase
// Funzione per inviare tracking a Supabase
async function trackEvent(event, lead, doc, src, referrer, session) {
  // Aspetta 3 secondi per dare tempo all'utente di accettare il popup
  await new Promise(resolve => setTimeout(resolve, 3000));
  
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
  }
}
