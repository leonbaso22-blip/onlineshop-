/* ===========================================================================
   auth.js – schlanke Authentifizierung ohne externe Abhängigkeiten
   Passwörter werden mit scrypt gehasht (salt:hash), Sitzungstoken sind
   HMAC-signiert (JWT-ähnlich). Für Demo/kleine Installationen geeignet.
   In Produktion: AUTH_SECRET sicher setzen und HTTPS erzwingen.
   =========================================================================== */

const crypto = require('crypto');
const { db, save } = require('./store');

const SECRET = process.env.AUTH_SECRET || 'immoassist-dev-secret-bitte-aendern';
const TOKEN_DAYS = 30;

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}
function verifyPassword(password, stored) {
  const [salt, hash] = String(stored).split(':');
  if (!salt || !hash) return false;
  const candidate = crypto.scryptSync(password, salt, 64).toString('hex');
  const a = Buffer.from(hash, 'hex');
  const b = Buffer.from(candidate, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function makeToken(email) {
  const payload = Buffer.from(JSON.stringify({ email, exp: Date.now() + TOKEN_DAYS * 864e5 })).toString('base64url');
  const sig = crypto.createHmac('sha256', SECRET).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}
function verifyToken(token) {
  if (!token || typeof token !== 'string') return null;
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return null;
  const expected = crypto.createHmac('sha256', SECRET).update(payload).digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!data.exp || data.exp < Date.now()) return null;
    return data.email;
  } catch {
    return null;
  }
}

function register({ email, password, name }) {
  email = String(email || '').trim().toLowerCase();
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error('Bitte eine gültige E-Mail angeben.');
  if (!password || password.length < 6) throw new Error('Passwort muss mindestens 6 Zeichen haben.');
  if (db.users[email]) throw new Error('Diese E-Mail ist bereits registriert.');
  db.users[email] = { email, name: String(name || '').trim() || email.split('@')[0], pw: hashPassword(password), createdAt: Date.now(), plan: 'trial' };
  save();
  return { token: makeToken(email), user: publicUser(email) };
}

function login({ email, password }) {
  email = String(email || '').trim().toLowerCase();
  const u = db.users[email];
  if (!u || !verifyPassword(password, u.pw)) throw new Error('E-Mail oder Passwort ist falsch.');
  return { token: makeToken(email), user: publicUser(email) };
}

function publicUser(email) {
  const u = db.users[email];
  if (!u) return null;
  return { email: u.email, name: u.name, plan: u.plan || 'trial' };
}

/* Express-Middleware: liest Bearer-Token, setzt req.userEmail (oder 401). */
function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const email = verifyToken(header.replace(/^Bearer\s+/i, ''));
  if (!email || !db.users[email]) return res.status(401).json({ error: 'Nicht angemeldet.' });
  req.userEmail = email;
  next();
}

module.exports = { register, login, requireAuth, verifyToken, publicUser };
