/* ===========================================================================
   api.js – Brücke zum Claude-Backend
   Versucht, die KI-Funktionen über das Backend (server/) zu nutzen. Ist kein
   Backend erreichbar (z. B. App direkt per Datei geöffnet), wird null
   zurückgegeben und die App fällt auf die lokale Logik in ai.js zurück.

   Backend-URL: standardmäßig dieselbe Origin (das Backend liefert die App aus).
   Per window.MAKLER_API_URL überschreibbar.
   =========================================================================== */

const API_BASE = (typeof window !== 'undefined' && window.MAKLER_API_URL) || '';

async function postJSON(path, payload) {
  if (typeof fetch === 'undefined') return null;
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null; // kein Backend / offline → Fallback auf lokale Logik
  }
}

/* Liefert den KI-Antwortentwurf als Text oder null (dann lokalen Fallback nutzen). */
async function draft(lead, object) {
  const data = await postJSON('/api/ai/draft', { lead, object });
  return data && data.draft ? data.draft : null;
}

/* Liefert den KI-Exposé-Text als Text oder null. */
async function expose(object) {
  const data = await postJSON('/api/ai/expose', { object });
  return data && data.expose ? data.expose : null;
}

window.MaklerAPI = { draft, expose };
