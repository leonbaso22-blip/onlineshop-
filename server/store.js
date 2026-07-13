/* ===========================================================================
   store.js – winziger JSON-Datei-Datenspeicher (ohne externe Abhängigkeiten)
   Speichert Nutzer und deren App-Zustand in server/data.json.
   Für Demo/kleine Installationen ausreichend; für größere Lasten später auf
   eine echte Datenbank (z. B. PostgreSQL) umstellen.
   =========================================================================== */

const fs = require('fs');
const path = require('path');

const FILE = process.env.DATA_FILE || path.join(__dirname, 'data.json');
let db = { users: {}, states: {} };

function load() {
  try {
    db = JSON.parse(fs.readFileSync(FILE, 'utf8'));
    if (!db.users) db.users = {};
    if (!db.states) db.states = {};
  } catch {
    db = { users: {}, states: {} };
  }
}

let saveTimer = null;
function save() {
  // Debounced write, damit häufige Speichervorgänge die Platte nicht fluten.
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      fs.writeFileSync(FILE, JSON.stringify(db));
    } catch (err) {
      console.error('store save error:', err.message);
    }
  }, 150);
}

load();

module.exports = {
  get db() { return db; },
  save,
};
