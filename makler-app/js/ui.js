/* ===========================================================================
   ui.js – Animations- & Interaktions-Helfer (premium feel)
   countUp, typeWriter, Konfetti, Command-Palette, Dark Mode, Intro-Splash.
   Alle Helfer sind defensiv: fehlt eine Browser-API, wird sauber abgekürzt.
   =========================================================================== */

function prefersReduced() {
  try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; }
  catch { return false; }
}
function raf(cb) {
  if (typeof requestAnimationFrame === 'function') return requestAnimationFrame(cb);
  return setTimeout(() => cb(Date.now()), 16);
}

/* Zahl von 0 auf Zielwert hochzählen --------------------------------------- */
function countUp(el, target, opts = {}) {
  const { duration = 1100, suffix = '', decimals = 0 } = opts;
  if (prefersReduced() || typeof requestAnimationFrame !== 'function') {
    el.textContent = target.toLocaleString('de-DE', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) + suffix;
    return;
  }
  const start = performance.now();
  const ease = (t) => 1 - Math.pow(1 - t, 3);
  function tick(now) {
    const p = Math.min((now - start) / duration, 1);
    const val = target * ease(p);
    el.textContent = val.toLocaleString('de-DE', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) + suffix;
    if (p < 1) raf(tick);
  }
  raf(tick);
}

/* KI-Tippeffekt in ein Textfeld -------------------------------------------- */
function typeWriter(el, text, opts = {}) {
  const { speed = 12, onDone } = opts;
  let cancelled = false;
  if (prefersReduced() || typeof requestAnimationFrame !== 'function') {
    el.value = text;
    onDone && onDone();
    return { skip() {} };
  }
  el.value = '';
  let i = 0;
  function step() {
    if (cancelled) return;
    // mehrere Zeichen pro Frame für flüssiges, schnelles Tippen
    const chunk = Math.max(1, Math.round(speed / 6));
    i = Math.min(i + chunk, text.length);
    el.value = text.slice(0, i);
    el.scrollTop = el.scrollHeight;
    if (i < text.length) raf(step); else onDone && onDone();
  }
  raf(step);
  return {
    skip() { cancelled = true; el.value = text; onDone && onDone(); },
  };
}

/* Balken-/Trichter-Animation: Breite von 0 auf data-w -------------------- */
function animateBars(root) {
  const bars = root.querySelectorAll('[data-w]');
  bars.forEach((b) => {
    const target = b.getAttribute('data-w');
    if (prefersReduced()) { b.style.width = target; return; }
    b.style.width = '0%';
    raf(() => raf(() => { b.style.width = target; }));
  });
  // Liniendiagramm zeichnen
  root.querySelectorAll('.lc-line').forEach((path) => {
    if (prefersReduced() || typeof path.getTotalLength !== 'function') return;
    try {
      const len = path.getTotalLength();
      path.style.strokeDasharray = len;
      path.style.strokeDashoffset = len;
      raf(() => raf(() => { path.style.transition = 'stroke-dashoffset 1.1s ease'; path.style.strokeDashoffset = '0'; }));
    } catch { /* ignore */ }
  });
}

/* Konfetti-Effekt (Erfolg) -------------------------------------------------- */
function confetti() {
  if (prefersReduced()) return;
  const colors = ['#0f766e', '#0d9488', '#0369a1', '#f59e0b', '#7c3aed', '#15803d'];
  const layer = document.createElement('div');
  layer.className = 'confetti-layer';
  document.body.appendChild(layer);
  const N = 90;
  for (let i = 0; i < N; i++) {
    const piece = document.createElement('span');
    piece.className = 'confetti-piece';
    const size = 6 + Math.random() * 8;
    piece.style.cssText = `left:${Math.random() * 100}%;width:${size}px;height:${size * 0.5}px;background:${colors[i % colors.length]};`;
    layer.appendChild(piece);
    if (typeof piece.animate === 'function') {
      piece.animate(
        [
          { transform: `translateY(-10vh) rotate(0deg)`, opacity: 1 },
          { transform: `translateY(110vh) rotate(${720 + Math.random() * 360}deg)`, opacity: 1, offset: 0.9 },
          { transform: `translateY(115vh)`, opacity: 0 },
        ],
        { duration: 2200 + Math.random() * 1200, easing: 'cubic-bezier(.2,.6,.3,1)', delay: Math.random() * 400 }
      );
    }
  }
  setTimeout(() => layer.remove(), 4200);
}

/* Dark Mode ----------------------------------------------------------------- */
const THEME_KEY = 'makler-theme';
function initTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  if (saved) document.documentElement.setAttribute('data-theme', saved);
}
function toggleTheme() {
  const cur = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', cur);
  localStorage.setItem(THEME_KEY, cur);
  return cur;
}
function currentTheme() { return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light'; }

/* Intro-Splash -------------------------------------------------------------- */
function splash(onDone) {
  if (prefersReduced()) { onDone && onDone(); return; }
  const el = document.createElement('div');
  el.className = 'splash';
  el.innerHTML = `
    <div class="splash-inner">
      <div class="splash-mark">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="2" width="16" height="20" rx="1"/><path d="M9 22v-4h6v4M8 6h.01M12 6h.01M16 6h.01M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M16 14h.01"/></svg>
      </div>
      <div class="splash-title">ImmoAssist</div>
      <div class="splash-sub">Ihr KI-Assistent für Immobilien</div>
      <div class="splash-bar"><span></span></div>
    </div>`;
  document.body.appendChild(el);
  setTimeout(() => {
    el.classList.add('out');
    setTimeout(() => { el.remove(); onDone && onDone(); }, 600);
  }, 1700);
}

/* Command-Palette (Strg/Cmd+K) --------------------------------------------- */
function commandPalette(actions) {
  let open = false, overlay = null;
  function show() {
    if (open) return;
    open = true;
    overlay = document.createElement('div');
    overlay.className = 'cmd-overlay';
    overlay.innerHTML = `
      <div class="cmd-box" role="dialog" aria-modal="true" aria-label="Befehle">
        <input class="cmd-input" type="text" placeholder="Befehl oder Ansicht suchen…" autocomplete="off" />
        <ul class="cmd-list"></ul>
      </div>`;
    document.body.appendChild(overlay);
    const input = overlay.querySelector('.cmd-input');
    const list = overlay.querySelector('.cmd-list');
    let filtered = actions, sel = 0;
    function render() {
      list.innerHTML = filtered.map((a, i) =>
        `<li class="cmd-item ${i === sel ? 'active' : ''}" data-i="${i}">${a.icon || ''}<span>${a.label}</span><kbd>↵</kbd></li>`).join('') ||
        '<li class="cmd-empty">Kein Treffer</li>';
    }
    function run(i) { hide(); actions === filtered ? actions[i]?.run() : filtered[i]?.run(); }
    input.addEventListener('input', () => {
      const q = input.value.toLowerCase();
      filtered = actions.filter((a) => a.label.toLowerCase().includes(q));
      sel = 0; render();
    });
    overlay.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') { sel = Math.min(sel + 1, filtered.length - 1); render(); e.preventDefault(); }
      else if (e.key === 'ArrowUp') { sel = Math.max(sel - 1, 0); render(); e.preventDefault(); }
      else if (e.key === 'Enter') { run(sel); }
      else if (e.key === 'Escape') { hide(); }
    });
    list.addEventListener('click', (e) => {
      const li = e.target.closest('.cmd-item'); if (li) run(+li.dataset.i);
    });
    overlay.addEventListener('click', (e) => { if (e.target === overlay) hide(); });
    render();
    setTimeout(() => input.focus(), 30);
  }
  function hide() { if (overlay) { overlay.remove(); overlay = null; } open = false; }
  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); open ? hide() : show(); }
  });
  return { show, hide };
}

/* Ripple-Effekt auf Buttons (delegiert) ------------------------------------ */
function enableRipples() {
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn, .nav-item');
    if (!btn || prefersReduced()) return;
    const r = document.createElement('span');
    r.className = 'ripple';
    const rect = btn.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    r.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX - rect.left - size / 2}px;top:${e.clientY - rect.top - size / 2}px;`;
    btn.appendChild(r);
    setTimeout(() => r.remove(), 600);
  });
}

window.MaklerUI = {
  countUp, typeWriter, animateBars, confetti, splash,
  initTheme, toggleTheme, currentTheme, commandPalette, enableRipples, prefersReduced,
};
