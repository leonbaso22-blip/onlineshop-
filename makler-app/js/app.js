/* ===========================================================================
   app.js – UI-Logik & Ansichten des Makler-KI-Assistenten
   Reines JavaScript, keine Abhängigkeiten. Ansichten: Dashboard, Anfragen
   (KI-Kommunikation), Kalender, Objekte, Analysen.
   =========================================================================== */

const state = MaklerData.loadState();
const EURf = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });

/* --- Lucide-artige SVG-Icons (keine Emojis als Icons) ---------------------- */
const icon = (name) => {
  const paths = {
    dashboard: '<rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/>',
    inbox: '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>',
    calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    building: '<rect x="4" y="2" width="16" height="20" rx="1"/><path d="M9 22v-4h6v4M8 6h.01M12 6h.01M16 6h.01M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M16 14h.01"/>',
    chart: '<path d="M3 3v18h18"/><path d="M18 17V9M13 17V5M8 17v-3"/>',
    sparkle: '<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/>',
    send: '<path d="m22 2-7 20-4-9-9-4z"/><path d="M22 2 11 13"/>',
    clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21v-1a8 8 0 0 1 16 0v1"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    refresh: '<path d="M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5M21 12a9 9 0 0 1-15 6.7L3 16M3 21v-5h5"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    arrow: '<path d="M5 12h14M12 5l7 7-7 7"/>',
    mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/>',
    phone: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/>',
  };
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || ''}</svg>`;
};

/* --- Hilfsfunktionen ------------------------------------------------------- */
const $ = (sel, root = document) => root.querySelector(sel);
const objById = (id) => state.objects.find((o) => o.id === id);
const leadById = (id) => state.leads.find((l) => l.id === id);

function statusClass(status) {
  return 'st-' + status.replace(/\s+/g, '-').replace(/ä/g, 'ae').toLowerCase();
}
function formatDate(iso, opts = { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) {
  return new Date(iso).toLocaleString('de-DE', opts);
}
function relTime(iso) {
  const diff = (Date.now() - new Date(iso)) / 36e5; // Stunden
  if (diff < 1) return 'vor wenigen Minuten';
  if (diff < 24) return `vor ${Math.round(diff)} Std.`;
  return `vor ${Math.round(diff / 24)} Tg.`;
}
function escapeHtml(s) {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}
function toast(msg) {
  let t = $('#toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'toast';
    t.className = 'toast';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('show'), 2600);
}

/* ===========================================================================
   ANSICHT: Dashboard
   =========================================================================== */
function renderDashboard() {
  const open = state.leads.filter((l) => !['abgeschlossen', 'verloren'].includes(l.status)).length;
  const todayStr = new Date().toISOString().slice(0, 10);
  const todays = state.appointments.filter((a) => a.date === todayStr);
  const upcoming = [...state.appointments]
    .filter((a) => a.date >= todayStr)
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
    .slice(0, 4);
  const newLeads = state.leads.filter((l) => l.status === 'neu').length;
  const avgResp = '3,2 Std.';

  const kpis = [
    { label: 'Offene Anfragen', value: open, sub: `${newLeads} neu heute`, ic: 'inbox' },
    { label: 'Termine heute', value: todays.length, sub: `${state.appointments.length} gesamt geplant`, ic: 'calendar' },
    { label: 'Aktive Objekte', value: state.objects.filter((o) => o.status === 'verfügbar').length, sub: `${state.objects.length} im Portfolio`, ic: 'building' },
    { label: 'Ø Antwortzeit', value: avgResp, sub: 'KI-gestützt', ic: 'clock' },
  ];

  const recent = [...state.leads]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 5);

  return `
    <header class="view-head">
      <div>
        <h1>Guten Tag 👋</h1>
        <p class="muted">Hier ist Ihr Überblick für heute, ${new Date().toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: 'long' })}.</p>
      </div>
      <button class="btn btn-primary" data-nav="leads">${icon('sparkle')} Anfragen mit KI beantworten</button>
    </header>

    <div class="kpi-grid">
      ${kpis.map((k) => `
        <div class="kpi card">
          <div class="kpi-ic">${icon(k.ic)}</div>
          <div class="kpi-val">${k.value}</div>
          <div class="kpi-label">${k.label}</div>
          <div class="kpi-sub muted">${k.sub}</div>
        </div>`).join('')}
    </div>

    <div class="cols">
      <section class="card">
        <div class="card-head"><h2>Neueste Anfragen</h2><button class="link" data-nav="leads">Alle ansehen ${icon('arrow')}</button></div>
        <ul class="lead-list">
          ${recent.map((l) => {
            const o = objById(l.objectId);
            return `<li class="lead-row" data-lead="${l.id}" tabindex="0" role="button">
              <span class="avatar">${icon('user')}</span>
              <div class="lead-row-main">
                <strong>${escapeHtml(l.name)}</strong>
                <span class="muted small">${o ? escapeHtml(o.title) : 'Allgemein'}</span>
              </div>
              <span class="badge ${statusClass(l.status)}">${l.status}</span>
              <span class="muted small nowrap">${relTime(l.createdAt)}</span>
            </li>`;
          }).join('')}
        </ul>
      </section>

      <section class="card">
        <div class="card-head"><h2>Anstehende Termine</h2><button class="link" data-nav="calendar">Kalender ${icon('arrow')}</button></div>
        <ul class="apt-list">
          ${upcoming.length ? upcoming.map((a) => {
            const o = objById(a.objectId);
            const l = leadById(a.leadId);
            return `<li class="apt-row">
              <div class="apt-date"><span class="apt-day">${new Date(a.date).toLocaleDateString('de-DE', { day: '2-digit' })}</span><span class="apt-mon">${new Date(a.date).toLocaleDateString('de-DE', { month: 'short' })}</span></div>
              <div class="apt-main">
                <strong>${a.type} · ${a.time} Uhr</strong>
                <span class="muted small">${l ? escapeHtml(l.name) : ''} · ${o ? escapeHtml(o.address) : ''}</span>
              </div>
            </li>`;
          }).join('') : '<li class="empty muted">Keine anstehenden Termine.</li>'}
        </ul>
      </section>
    </div>`;
}

/* ===========================================================================
   ANSICHT: Anfragen / KI-Kommunikation
   =========================================================================== */
let activeLeadId = null;

function renderLeads() {
  if (!activeLeadId && state.leads.length) activeLeadId = state.leads[0].id;
  return `
    <header class="view-head">
      <div><h1>Anfragen & KI-Kommunikation</h1><p class="muted">Beantworten Sie Interessenten mit einem KI-Entwurf – Sie prüfen und senden.</p></div>
    </header>
    <div class="inbox">
      <aside class="inbox-list" id="inboxList">${renderLeadList()}</aside>
      <section class="inbox-detail card" id="inboxDetail">${renderLeadDetail(activeLeadId)}</section>
    </div>`;
}

function renderLeadList() {
  const ordered = [...state.leads].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return ordered.map((l) => {
    const o = objById(l.objectId);
    const last = l.messages[l.messages.length - 1];
    return `<button class="inbox-item ${l.id === activeLeadId ? 'active' : ''}" data-lead="${l.id}">
      <div class="inbox-item-top"><strong>${escapeHtml(l.name)}</strong><span class="badge ${statusClass(l.status)}">${l.status}</span></div>
      <span class="muted small">${o ? escapeHtml(o.title) : 'Allgemein'}</span>
      <span class="preview muted small">${last ? escapeHtml(last.text.slice(0, 70)) : ''}…</span>
    </button>`;
  }).join('');
}

function renderLeadDetail(id) {
  const l = leadById(id);
  if (!l) return '<div class="empty muted">Wählen Sie eine Anfrage aus.</div>';
  const o = objById(l.objectId);
  const statusOptions = MaklerData.STATUS_FLOW.map((s) => `<option value="${s}" ${s === l.status ? 'selected' : ''}>${s}</option>`).join('');

  return `
    <div class="detail-head">
      <div>
        <h2>${escapeHtml(l.name)}</h2>
        <div class="contact-line muted small">
          <span>${icon('mail')} ${escapeHtml(l.email)}</span>
          <span>${icon('phone')} ${escapeHtml(l.phone)}</span>
        </div>
      </div>
      <select class="status-select" id="statusSelect" aria-label="Status ändern">${statusOptions}</select>
    </div>

    ${o ? `<div class="object-chip">
        <span class="badge st-info">${o.type}</span>
        <strong>${escapeHtml(o.title)}</strong>
        <span class="muted small">${escapeHtml(o.address)}, ${escapeHtml(o.city)} · ${MaklerAI.priceLabel(o)}</span>
      </div>` : ''}

    <div class="thread" id="thread">
      ${l.messages.map((m) => `
        <div class="msg ${m.from === 'kunde' ? 'in' : 'out'}">
          <div class="msg-bubble">${escapeHtml(m.text).replace(/\n/g, '<br>')}</div>
          <div class="msg-meta muted small">${m.from === 'kunde' ? l.contact : 'Sie'} · ${formatDate(m.time)}</div>
        </div>`).join('')}
    </div>

    <div class="composer">
      <div class="composer-actions">
        <button class="btn btn-primary" id="genDraft">${icon('sparkle')} KI-Antwort entwerfen</button>
        <button class="btn btn-ghost" id="makeApt">${icon('calendar')} Besichtigung anlegen</button>
      </div>
      <textarea id="replyBox" class="reply-box" rows="6" placeholder="Antwort schreiben oder „KI-Antwort entwerfen" klicken…"></textarea>
      <div class="composer-bar">
        <span class="muted small" id="draftHint"></span>
        <button class="btn btn-send" id="sendReply">${icon('send')} Senden</button>
      </div>
    </div>`;
}

function mountLeadDetailEvents() {
  const detail = $('#inboxDetail');
  if (!detail) return;
  const l = leadById(activeLeadId);
  if (!l) return;

  $('#genDraft', detail)?.addEventListener('click', () => {
    const o = objById(l.objectId);
    const { draft, intent, suggestedSlot } = MaklerAI.generateReplyDraft(l, o, state.appointments);
    $('#replyBox', detail).value = draft;
    const hint = $('#draftHint', detail);
    hint.textContent = `KI-Entwurf erstellt · erkanntes Anliegen: ${intent}` + (suggestedSlot ? ` · Terminvorschlag: ${suggestedSlot.human}` : '');
    detail.querySelector('#replyBox').focus();
    toast('KI-Antwort entworfen – bitte prüfen und senden.');
  });

  $('#sendReply', detail)?.addEventListener('click', () => {
    const box = $('#replyBox', detail);
    const text = box.value.trim();
    if (!text) { toast('Bitte zuerst eine Antwort verfassen.'); return; }
    l.messages.push({ from: 'makler', time: new Date().toISOString(), text });
    if (l.status === 'neu') l.status = 'in Kontakt';
    MaklerData.saveState(state);
    rerenderLeads();
    toast('Antwort gesendet.');
  });

  $('#makeApt', detail)?.addEventListener('click', () => openApptModal(l.id));

  $('#statusSelect', detail)?.addEventListener('change', (e) => {
    l.status = e.target.value;
    MaklerData.saveState(state);
    rerenderLeads();
    toast(`Status: ${l.status}`);
  });
}

function rerenderLeads() {
  const list = $('#inboxList');
  const detail = $('#inboxDetail');
  if (list) list.innerHTML = renderLeadList();
  if (detail) detail.innerHTML = renderLeadDetail(activeLeadId);
  mountLeadDetailEvents();
  const thread = $('#thread');
  if (thread) thread.scrollTop = thread.scrollHeight;
}

/* ===========================================================================
   ANSICHT: Kalender
   =========================================================================== */
let calMonth = new Date().getMonth();
let calYear = new Date().getFullYear();

function renderCalendar() {
  const first = new Date(calYear, calMonth, 1);
  const startWd = (first.getDay() + 6) % 7; // Montag = 0
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const monthName = first.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
  const todayStr = new Date().toISOString().slice(0, 10);
  const wd = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

  let cells = '';
  for (let i = 0; i < startWd; i++) cells += '<div class="cal-cell empty"></div>';
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const apts = state.appointments.filter((a) => a.date === dateStr).sort((a, b) => a.time.localeCompare(b.time));
    cells += `<div class="cal-cell ${dateStr === todayStr ? 'today' : ''}" data-date="${dateStr}">
      <span class="cal-num">${d}</span>
      ${apts.slice(0, 3).map((a) => {
        const l = leadById(a.leadId);
        return `<span class="cal-apt ${statusClass(a.type)}" title="${a.time} ${a.type} – ${l ? escapeHtml(l.name) : ''}">${a.time} ${a.type}</span>`;
      }).join('')}
      ${apts.length > 3 ? `<span class="cal-more muted">+${apts.length - 3} mehr</span>` : ''}
    </div>`;
  }

  return `
    <header class="view-head">
      <div><h1>Kalender</h1><p class="muted">Alle Besichtigungen, Beratungen und Telefonate auf einen Blick.</p></div>
      <button class="btn btn-primary" id="newApt">${icon('plus')} Termin anlegen</button>
    </header>
    <div class="card">
      <div class="cal-toolbar">
        <button class="btn btn-ghost" id="calPrev" aria-label="Vorheriger Monat">‹</button>
        <h2>${monthName}</h2>
        <button class="btn btn-ghost" id="calNext" aria-label="Nächster Monat">›</button>
      </div>
      <div class="cal-grid cal-head">${wd.map((w) => `<div class="cal-wd">${w}</div>`).join('')}</div>
      <div class="cal-grid">${cells}</div>
    </div>`;
}

/* ===========================================================================
   ANSICHT: Objekte
   =========================================================================== */
function renderObjects() {
  return `
    <header class="view-head">
      <div><h1>Objekte</h1><p class="muted">Ihr Portfolio – die Datenbasis, auf die sich der KI-Assistent bezieht.</p></div>
    </header>
    <div class="obj-grid">
      ${state.objects.map((o) => {
        const leadCount = state.leads.filter((l) => l.objectId === o.id).length;
        return `<article class="card obj-card">
          <div class="obj-top">
            <span class="badge st-info">${o.type}</span>
            <span class="badge ${statusClass(o.status)}">${o.status}</span>
          </div>
          <h3>${escapeHtml(o.title)}</h3>
          <p class="muted small">${escapeHtml(o.address)}, ${escapeHtml(o.city)}</p>
          <div class="obj-stats">
            <span><strong>${o.rooms}</strong> Zi.</span>
            <span><strong>${o.area}</strong> m²</span>
            <span class="price">${MaklerAI.priceLabel(o)}</span>
          </div>
          <p class="obj-desc muted small">${escapeHtml(o.description)}</p>
          <div class="chips">${o.features.map((f) => `<span class="chip">${escapeHtml(f)}</span>`).join('')}</div>
          <div class="obj-foot muted small">${icon('inbox')} ${leadCount} Anfrage${leadCount === 1 ? '' : 'n'}</div>
        </article>`;
      }).join('')}
    </div>`;
}

/* ===========================================================================
   ANSICHT: Analysen
   =========================================================================== */
function renderAnalytics() {
  // Trichter: Anfragen -> Kontakt -> Besichtigung -> Angebot -> Abschluss
  const counts = {
    Anfragen: state.leads.length,
    'In Kontakt': state.leads.filter((l) => ['in Kontakt', 'Besichtigung geplant', 'Angebot', 'abgeschlossen'].includes(l.status)).length,
    Besichtigung: state.leads.filter((l) => ['Besichtigung geplant', 'Angebot', 'abgeschlossen'].includes(l.status)).length,
    Angebot: state.leads.filter((l) => ['Angebot', 'abgeschlossen'].includes(l.status)).length,
    Abschluss: state.leads.filter((l) => l.status === 'abgeschlossen').length,
  };

  // Anfragen je Objekt
  const perObject = state.objects.map((o) => ({
    label: o.title.length > 22 ? o.title.slice(0, 22) + '…' : o.title,
    value: state.leads.filter((l) => l.objectId === o.id).length,
  }));

  // Anfragen je Wochentag (synthetisch aus createdAt)
  const wdNames = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
  const perWeekday = [1, 2, 3, 4, 5, 6, 0].map((wd) => ({
    label: wdNames[wd],
    value: state.leads.filter((l) => new Date(l.createdAt).getDay() === wd).length + (wd % 2),
  }));

  const statusDist = MaklerData.STATUS_FLOW.map((s) => ({
    label: s, value: state.leads.filter((l) => l.status === s).length,
  })).filter((x) => x.value > 0);

  return `
    <header class="view-head">
      <div><h1>Analysen</h1><p class="muted">Wie entwickeln sich Anfragen, Termine und Abschlüsse?</p></div>
    </header>

    <div class="kpi-grid">
      <div class="kpi card"><div class="kpi-val">${counts.Anfragen}</div><div class="kpi-label">Anfragen gesamt</div></div>
      <div class="kpi card"><div class="kpi-val">${state.appointments.length}</div><div class="kpi-label">Geplante Termine</div></div>
      <div class="kpi card"><div class="kpi-val">${Math.round((counts.Besichtigung / Math.max(counts.Anfragen, 1)) * 100)}%</div><div class="kpi-label">Anfrage → Besichtigung</div></div>
      <div class="kpi card"><div class="kpi-val">${Math.round((counts.Angebot / Math.max(counts.Anfragen, 1)) * 100)}%</div><div class="kpi-label">Angebotsquote</div></div>
    </div>

    <div class="cols">
      <section class="card"><div class="card-head"><h2>Verkaufstrichter</h2></div>${funnelChart(counts)}</section>
      <section class="card"><div class="card-head"><h2>Status-Verteilung</h2></div>${barChart(statusDist)}</section>
    </div>
    <div class="cols">
      <section class="card"><div class="card-head"><h2>Anfragen je Objekt</h2></div>${barChart(perObject)}</section>
      <section class="card"><div class="card-head"><h2>Anfragen je Wochentag</h2></div>${lineChart(perWeekday)}</section>
    </div>`;
}

/* --- Diagramme als Inline-SVG (ohne Bibliothek) ---------------------------- */
function funnelChart(counts) {
  const entries = Object.entries(counts);
  const max = Math.max(...entries.map(([, v]) => v), 1);
  return `<div class="funnel">${entries.map(([label, v]) => {
    const pct = Math.round((v / max) * 100);
    return `<div class="funnel-row">
      <span class="funnel-label">${label}</span>
      <div class="funnel-bar-wrap"><div class="funnel-bar" style="width:${Math.max(pct, 6)}%">${v}</div></div>
    </div>`;
  }).join('')}</div>`;
}

function barChart(data) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return `<div class="bars">${data.map((d) => `
    <div class="bar-row">
      <span class="bar-label muted small">${escapeHtml(d.label)}</span>
      <div class="bar-track"><div class="bar-fill" style="width:${Math.round((d.value / max) * 100)}%"></div></div>
      <span class="bar-val">${d.value}</span>
    </div>`).join('')}</div>`;
}

function lineChart(data) {
  const w = 320, h = 140, pad = 24;
  const max = Math.max(...data.map((d) => d.value), 1);
  const step = (w - pad * 2) / (data.length - 1);
  const pts = data.map((d, i) => {
    const x = pad + i * step;
    const y = h - pad - (d.value / max) * (h - pad * 2);
    return [x, y];
  });
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0]},${p[1]}`).join(' ');
  const area = `${line} L${pts[pts.length - 1][0]},${h - pad} L${pts[0][0]},${h - pad} Z`;
  return `<svg class="linechart" viewBox="0 0 ${w} ${h}" role="img" aria-label="Liniendiagramm">
    <path d="${area}" class="lc-area"/>
    <path d="${line}" class="lc-line"/>
    ${pts.map((p) => `<circle cx="${p[0]}" cy="${p[1]}" r="3.5" class="lc-dot"/>`).join('')}
    ${data.map((d, i) => `<text x="${pad + i * step}" y="${h - 6}" class="lc-x">${d.label}</text>`).join('')}
  </svg>`;
}

/* ===========================================================================
   Termin-Modal
   =========================================================================== */
function openApptModal(leadId = null) {
  const lead = leadId ? leadById(leadId) : null;
  const leadOpts = state.leads.map((l) => `<option value="${l.id}" ${l.id === leadId ? 'selected' : ''}>${escapeHtml(l.name)}</option>`).join('');
  const slot = MaklerAI.suggestSlot(state.appointments);
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal card" role="dialog" aria-modal="true" aria-label="Termin anlegen">
      <h2>${icon('calendar')} Termin anlegen</h2>
      <label>Interessent<select id="mLead">${leadOpts}</select></label>
      <label>Art<select id="mType">
        <option>Besichtigung</option><option>Beratung</option><option>Telefonat</option><option>Notartermin</option>
      </select></label>
      <div class="modal-row">
        <label>Datum<input type="date" id="mDate" value="${slot ? slot.date : ''}"></label>
        <label>Uhrzeit<input type="time" id="mTime" value="${slot ? slot.time : '10:00'}"></label>
      </div>
      <label>Notiz<input type="text" id="mNote" placeholder="z. B. Erstbesichtigung"></label>
      ${slot ? `<p class="muted small">${icon('sparkle')} KI-Vorschlag: nächster freier Slot am ${slot.human}.</p>` : ''}
      <div class="modal-actions">
        <button class="btn btn-ghost" id="mCancel">Abbrechen</button>
        <button class="btn btn-primary" id="mSave">${icon('check')} Speichern</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
  const close = () => modal.remove();
  modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
  $('#mCancel', modal).addEventListener('click', close);
  document.addEventListener('keydown', function esc(e) { if (e.key === 'Escape') { close(); document.removeEventListener('keydown', esc); } });
  $('#mSave', modal).addEventListener('click', () => {
    const lId = $('#mLead', modal).value;
    const date = $('#mDate', modal).value;
    const time = $('#mTime', modal).value;
    if (!date || !time) { toast('Bitte Datum und Uhrzeit angeben.'); return; }
    const lObj = leadById(lId);
    state.appointments.push({
      id: 'apt-' + Date.now(),
      leadId: lId,
      objectId: lObj ? lObj.objectId : null,
      type: $('#mType', modal).value,
      date, time,
      notes: $('#mNote', modal).value,
    });
    if (lObj && lObj.status === 'in Kontakt' && $('#mType', modal).value === 'Besichtigung') {
      lObj.status = 'Besichtigung geplant';
    }
    MaklerData.saveState(state);
    close();
    toast('Termin gespeichert.');
    navigate(currentView);
  });
}

/* ===========================================================================
   Router & Navigation
   =========================================================================== */
let currentView = 'dashboard';
const views = {
  dashboard: renderDashboard,
  leads: renderLeads,
  calendar: renderCalendar,
  objects: renderObjects,
  analytics: renderAnalytics,
};

function navigate(view) {
  currentView = view;
  const main = $('#main');
  main.innerHTML = views[view]();
  main.scrollTop = 0;
  document.querySelectorAll('.nav-item').forEach((n) => n.classList.toggle('active', n.dataset.view === view));
  mountViewEvents(view);
}

function mountViewEvents(view) {
  // Globale Klicks: Navigation per data-nav, Lead-Auswahl per data-lead
  $('#main').querySelectorAll('[data-nav]').forEach((el) =>
    el.addEventListener('click', () => navigate(el.dataset.nav)));
  $('#main').querySelectorAll('[data-lead]').forEach((el) => {
    const go = () => { activeLeadId = el.dataset.lead; navigate('leads'); };
    el.addEventListener('click', go);
    el.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
  });

  if (view === 'leads') {
    $('#inboxList')?.querySelectorAll('.inbox-item').forEach((b) =>
      b.addEventListener('click', () => { activeLeadId = b.dataset.lead; rerenderLeads(); }));
    mountLeadDetailEvents();
    const thread = $('#thread');
    if (thread) thread.scrollTop = thread.scrollHeight;
  }
  if (view === 'calendar') {
    $('#calPrev')?.addEventListener('click', () => { calMonth--; if (calMonth < 0) { calMonth = 11; calYear--; } navigate('calendar'); });
    $('#calNext')?.addEventListener('click', () => { calMonth++; if (calMonth > 11) { calMonth = 0; calYear++; } navigate('calendar'); });
    $('#newApt')?.addEventListener('click', () => openApptModal());
    $('#main').querySelectorAll('.cal-cell[data-date]').forEach((c) =>
      c.addEventListener('click', () => openApptModal()));
  }
}

/* --- App-Hülle (Sidebar) aufbauen ----------------------------------------- */
function buildShell() {
  const nav = [
    ['dashboard', 'Dashboard', 'dashboard'],
    ['leads', 'Anfragen', 'inbox'],
    ['calendar', 'Kalender', 'calendar'],
    ['objects', 'Objekte', 'building'],
    ['analytics', 'Analysen', 'chart'],
  ];
  document.body.innerHTML = `
    <button class="menu-toggle" id="menuToggle" aria-label="Menü">${icon('dashboard')}</button>
    <aside class="sidebar" id="sidebar">
      <div class="brand">
        <span class="brand-mark">${icon('building')}</span>
        <div><strong>ImmoAssist</strong><span class="brand-sub">KI für Makler</span></div>
      </div>
      <nav class="nav">
        ${nav.map(([v, label, ic]) => `<button class="nav-item ${v === 'dashboard' ? 'active' : ''}" data-view="${v}">${icon(ic)}<span>${label}</span></button>`).join('')}
      </nav>
      <div class="sidebar-foot">
        <button class="nav-item subtle" id="resetBtn">${icon('refresh')}<span>Demo zurücksetzen</span></button>
        <div class="agent">
          <span class="avatar">${icon('user')}</span>
          <div><strong>Max Maklermann</strong><span class="muted small">Immobilien München</span></div>
        </div>
      </div>
    </aside>
    <main class="content" id="main"></main>`;

  document.querySelectorAll('.nav-item[data-view]').forEach((n) =>
    n.addEventListener('click', () => { navigate(n.dataset.view); $('#sidebar').classList.remove('open'); }));
  $('#menuToggle').addEventListener('click', () => $('#sidebar').classList.toggle('open'));
  $('#resetBtn').addEventListener('click', () => {
    if (confirm('Alle Demo-Daten auf den Ausgangszustand zurücksetzen?')) {
      const fresh = MaklerData.resetState();
      Object.assign(state, fresh);
      activeLeadId = null;
      navigate('dashboard');
      toast('Demo-Daten zurückgesetzt.');
    }
  });

  navigate('dashboard');
}

document.addEventListener('DOMContentLoaded', buildShell);
