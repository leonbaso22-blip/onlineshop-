/* ===========================================================================
   cloud.js – Konten & Cloud-Sync gegen das Backend
   Speichert Login-Token lokal, synchronisiert den App-Zustand pro Nutzer mit
   dem Server. Ohne Backend/Anmeldung passiert nichts – die App arbeitet dann
   wie gehabt nur mit localStorage.
   =========================================================================== */

const API = (typeof window !== 'undefined' && window.MAKLER_API_URL) || '';
const TOKEN_KEY = 'makler-token';
const USER_KEY = 'makler-user';

function token() { try { return localStorage.getItem(TOKEN_KEY); } catch { return null; } }
function isLoggedIn() { return !!token(); }
function currentUser() { try { return JSON.parse(localStorage.getItem(USER_KEY) || 'null'); } catch { return null; } }

async function api(path, method, body, useAuth) {
  if (typeof fetch === 'undefined') return null;
  const headers = { 'Content-Type': 'application/json' };
  if (useAuth && token()) headers.Authorization = `Bearer ${token()}`;
  try {
    const res = await fetch(`${API}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Fehler ${res.status}`);
    return data;
  } catch (err) {
    if (err.message && !/Failed to fetch|NetworkError/i.test(err.message)) throw err;
    return null; // Netzwerk-/Backend-Fehler → App läuft offline weiter
  }
}

function setSession(data) {
  if (!data || !data.token) return null;
  localStorage.setItem(TOKEN_KEY, data.token);
  localStorage.setItem(USER_KEY, JSON.stringify(data.user || null));
  return data.user;
}

async function register(email, password, name) {
  const data = await api('/api/auth/register', 'POST', { email, password, name }, false);
  if (!data) throw new Error('Kein Server erreichbar. Bitte Backend starten.');
  return setSession(data);
}
async function login(email, password) {
  const data = await api('/api/auth/login', 'POST', { email, password }, false);
  if (!data) throw new Error('Kein Server erreichbar. Bitte Backend starten.');
  return setSession(data);
}
function logout() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

/* Zustand vom Server holen (oder null). */
async function pull() {
  if (!isLoggedIn()) return null;
  const data = await api('/api/state', 'GET', null, true);
  return data ? data.state : null;
}

/* Zustand zum Server schreiben (debounced, fehlertolerant). */
let pushTimer = null;
function push(state) {
  if (!isLoggedIn() || typeof fetch === 'undefined') return;
  clearTimeout(pushTimer);
  pushTimer = setTimeout(() => { api('/api/state', 'PUT', { state }, true).catch(() => {}); }, 600);
}

/* Stripe-Checkout starten. Liefert {url} oder {message}. */
async function checkout(plan) {
  const data = await api('/api/checkout', 'POST', { plan }, false);
  return data; // { configured, url } | { configured:false, message } | null
}

window.MaklerCloud = { isLoggedIn, currentUser, register, login, logout, pull, push, checkout };
