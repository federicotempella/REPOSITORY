// Configurazione Supabase
const SUPABASE_URL = 'https://gtqeebtjsyutglsxmfmf.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd0cWVlYnRqc3l1dGdsc3hmZm1mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM5NDQ0NzAsImV4cCI6MjEwOTUyMDQ3MH0.DgtcW8UO6z4Wv3iyWSw1RSTfxnEs_qi1Le0i-WDyT1E';
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
