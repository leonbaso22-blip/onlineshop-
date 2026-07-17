/* ============================================================
   Straßenheld — Fahrzeug-Ausweichspiel
   ------------------------------------------------------------
   Crossy-Road / Frogger-Prinzip: Der air-up-Held hüpft Reihe
   für Reihe nach vorn und weicht dem Verkehr aus. Je weiter,
   desto schneller. Alles Vektor auf Canvas, kein Build, offline.

   Steuerung:  ↑ / W  vor   ·  ↓ / S  zurück
               ← / A  links ·  → / D  rechts
               Touch: Wischen oder Steuerkreuz
   ============================================================ */
(function () {
  "use strict";

  // ---------- Konfiguration ----------
  const COLS = 9;             // Spalten im sichtbaren Feld
  const BOTTOM_OFFSET = 3.2;  // Reihen zwischen Held und unterem Rand
  const HOP_MS = 120;         // Dauer einer Hüpfbewegung

  // Markenpalette
  const C = {
    grassA: "#bfe6b3", grassB: "#b3e0a6",
    road:   "#3a4048", roadEdge: "#2c3138",
    rail:   "#6b5240", railTie: "#503d30",
    water:  "#8fd3e8",
    lane:   "#f4d35e",
    brand:  "#00b8a9", brandDark: "#009b8e",
    coral:  "#ff7a59",
  };
  // Auswahl an Karosseriefarben (klar, flach, freundlich)
  const CAR_COLORS = ["#ff7a59", "#00b8a9", "#ffb703", "#7c6cf0", "#ef476f", "#4d96ff"];

  // Fahrzeugtypen: len = Länge in Kacheln
  const VEHICLES = {
    car:   { len: 1.7, wheels: 2 },
    truck: { len: 2.9, wheels: 3 },
    bus:   { len: 2.7, wheels: 2 },
    train: { len: 4.5, wheels: 0 },
  };

  // ---------- Canvas ----------
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  let W = 0, H = 0, TILE = 0, DPR = 1;

  function resize() {
    const rect = canvas.getBoundingClientRect();
    DPR = Math.min(window.devicePixelRatio || 1, 2.5);
    W = rect.width; H = rect.height;
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    TILE = W / COLS;
  }

  // ---------- Spielzustand ----------
  let lanes = new Map();   // row -> lane definition
  let player, camRow, score, best, state, lastT, spawnedTo;

  best = parseInt(localStorage.getItem("strassenheld_best") || "0", 10) || 0;

  const rand = (a, b) => a + Math.random() * (b - a);
  const choice = (arr) => arr[(Math.random() * arr.length) | 0];
  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  // Schwierigkeit steigt mit der Distanz (sanft gedeckelt)
  function difficulty(row) { return clamp(row / 140, 0, 1); }

  // ---------- Lane-Generierung ----------
  function makeLane(row) {
    if (row <= 0) return { type: "grass", row, tint: 0, trees: new Set() };

    const d = difficulty(row);
    const roll = Math.random();
    let type;
    // Sichere Startzone
    if (row < 3) type = "grass";
    else if (roll < 0.30) type = "grass";
    else if (roll < 0.86) type = "road";
    else type = "rail";

    const lane = { type, row, vehicles: [], tint: row % 2 };

    if (type === "grass") {
      // Bäume blockieren einzelne Spalten (nie zu viele -> immer passierbar)
      lane.trees = new Set();
      const n = Math.random() < 0.55 ? (Math.random() < 0.5 ? 1 : 2) : 0;
      let guard = 0;
      while (lane.trees.size < n && guard++ < 20) {
        lane.trees.add((Math.random() * COLS) | 0);
      }
    }

    if (type === "road" || type === "rail") {
      const dir = Math.random() < 0.5 ? 1 : -1;
      const isRail = type === "rail";
      const baseSpeed = isRail ? rand(6.5, 8.5) : rand(1.6, 2.6);
      lane.dir = dir;
      lane.speed = (baseSpeed + d * (isRail ? 3 : 2.2)) * dir;
      lane.signal = 0; // Bahnschranken-Blinken

      const kinds = isRail ? ["train"]
                           : (Math.random() < 0.25 ? ["truck", "car"]
                              : Math.random() < 0.25 ? ["bus", "car"]
                              : ["car", "car", "truck"]);
      // Fahrzeuge mit fairen Lücken platzieren
      const gapMin = isRail ? 6 : lerp(3.2, 1.9, d);
      const gapMax = isRail ? 11 : lerp(6, 3.4, d);
      let x = rand(-2, 1);
      const count = isRail ? 1 : 3;
      for (let i = 0; i < count; i++) {
        const kind = choice(kinds);
        const len = VEHICLES[kind].len;
        lane.vehicles.push({
          x, len, kind,
          color: isRail ? C.brandDark : choice(CAR_COLORS),
        });
        x += len + rand(gapMin, gapMax);
      }
      lane._gap = [gapMin, gapMax];
    }
    return lane;
  }

  function laneAt(row) {
    let l = lanes.get(row);
    if (!l) { l = makeLane(row); lanes.set(row, l); }
    return l;
  }

  // Reihen im Voraus erzeugen / alte aufräumen
  function ensureLanes() {
    const top = Math.ceil(camRow) + Math.ceil(H / TILE) + 4;
    while (spawnedTo < top) { spawnedTo++; laneAt(spawnedTo); }
    const cutoff = Math.floor(camRow) - 6;
    for (const key of lanes.keys()) if (key < cutoff) lanes.delete(key);
  }

  // ---------- Spiel starten ----------
  function reset() {
    lanes = new Map();
    spawnedTo = -1;
    player = {
      col: (COLS / 2) | 0, row: 0,
      fromCol: (COLS / 2) | 0, fromRow: 0,
      animT: 1, hopH: 0, face: "up", dead: false, deathT: 0,
    };
    camRow = player.row - BOTTOM_OFFSET;
    score = 0;
    for (let r = -6; r <= 0; r++) laneAt(r);
    ensureLanes();
  }

  // ---------- Eingabe ----------
  function tryMove(dc, dr, face) {
    if (state !== "play" || player.animT < 1) return;
    const nc = player.col + dc;
    const nr = player.row + dr;
    if (nc < 0 || nc >= COLS) return;           // Rand
    if (nr < 0) return;                          // nicht hinter den Start
    const target = laneAt(nr);
    if (target.type === "grass" && target.trees && target.trees.has(nc)) return; // Baum blockiert
    player.fromCol = player.col; player.fromRow = player.row;
    player.col = nc; player.row = nr;
    player.animT = 0; player.face = face;
    if (player.row > score) score = player.row;
  }

  const MOVES = {
    up:    () => tryMove(0, 1, "up"),
    down:  () => tryMove(0, -1, "down"),
    left:  () => tryMove(-1, 0, "left"),
    right: () => tryMove(1, 0, "right"),
  };

  window.addEventListener("keydown", (e) => {
    let m = null;
    switch (e.key) {
      case "ArrowUp": case "w": case "W": m = "up"; break;
      case "ArrowDown": case "s": case "S": m = "down"; break;
      case "ArrowLeft": case "a": case "A": m = "left"; break;
      case "ArrowRight": case "d": case "D": m = "right"; break;
      case " ": case "Enter":
        if (state !== "play") { startGame(); e.preventDefault(); return; }
        break;
    }
    if (m) {
      e.preventDefault();
      if (state === "play") MOVES[m]();
      else if (state === "over" || state === "start") { /* Neustart via Space oben */ }
    }
  }, { passive: false });

  // Steuerkreuz
  document.querySelectorAll(".dpad button").forEach((b) => {
    const dir = b.dataset.dir;
    b.addEventListener("click", () => MOVES[dir] && MOVES[dir]());
  });

  // Wisch- & Tap-Steuerung auf dem Canvas
  let touchStart = null;
  canvas.addEventListener("touchstart", (e) => {
    const t = e.changedTouches[0];
    touchStart = { x: t.clientX, y: t.clientY, t: performance.now() };
  }, { passive: true });
  canvas.addEventListener("touchend", (e) => {
    if (!touchStart) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStart.x, dy = t.clientY - touchStart.y;
    const adx = Math.abs(dx), ady = Math.abs(dy);
    if (adx < 24 && ady < 24) { MOVES.up(); }            // Tap = vor
    else if (adx > ady) { (dx > 0 ? MOVES.right : MOVES.left)(); }
    else { (dy < 0 ? MOVES.up : MOVES.down)(); }
    touchStart = null;
  }, { passive: true });

  // ---------- Update ----------
  function update(dt) {
    // Kamera folgt dem Helden (nur vorwärts)
    const targetCam = Math.max(player.row - BOTTOM_OFFSET, camRow);
    camRow = lerp(camRow, targetCam, 1 - Math.pow(0.0016, dt));

    ensureLanes();

    // Hüpf-Animation
    if (player.animT < 1) {
      player.animT = Math.min(1, player.animT + dt / (HOP_MS / 1000));
      player.hopH = Math.sin(Math.PI * player.animT);
    } else {
      player.hopH = 0;
    }

    if (state !== "play") return;

    // Fahrzeuge bewegen + recyceln
    for (const lane of lanes.values()) {
      if (!lane.vehicles || !lane.vehicles.length) continue;
      for (const v of lane.vehicles) v.x += lane.speed * dt;

      const dir = lane.dir;
      // Signal blinkt, wenn ein Zug in Sicht ist
      if (lane.type === "rail") {
        const near = lane.vehicles.some((v) => v.x > -3 && v.x < COLS + 3);
        lane.signal = near ? (lane.signal + dt) : 0;
      }
      for (const v of lane.vehicles) {
        if (dir > 0 && v.x > COLS + 1.5) {
          const minX = Math.min(...lane.vehicles.map((o) => o.x));
          v.x = minX - v.len - rand(lane._gap[0], lane._gap[1]);
        } else if (dir < 0 && v.x + v.len < -1.5) {
          const maxX = Math.max(...lane.vehicles.map((o) => o.x));
          v.x = maxX + rand(lane._gap[0], lane._gap[1]);
        }
      }
    }

    // Kollision prüfen (an der aktuellen Ziel-Reihe)
    const checkRow = player.animT < 0.5 ? player.fromRow : player.row;
    const lane = laneAt(checkRow);
    if (lane.vehicles && lane.vehicles.length) {
      const cx = player.col + 0.5;
      for (const v of lane.vehicles) {
        if (cx > v.x + 0.18 && cx < v.x + v.len - 0.18) { die(); break; }
      }
    }
  }

  function die() {
    if (player.dead) return;
    player.dead = true;
    player.deathT = 0;
    if (score > best) { best = score; localStorage.setItem("strassenheld_best", String(best)); }
    setTimeout(() => showOver(), 520);
    state = "dying";
  }

  // ---------- Rendering ----------
  function rowY(row) {
    // obere Kante der Kachel in Screen-Koordinaten
    return H - (row - camRow + 1) * TILE;
  }

  function roundRect(x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function drawLane(lane) {
    const y = rowY(lane.row);
    if (y > H || y < -TILE) return;

    if (lane.type === "grass") {
      ctx.fillStyle = lane.tint ? C.grassA : C.grassB;
      ctx.fillRect(0, y, W, TILE);
    } else if (lane.type === "road") {
      ctx.fillStyle = C.road;
      ctx.fillRect(0, y, W, TILE);
      ctx.fillStyle = C.roadEdge;
      ctx.fillRect(0, y, W, 2);
      ctx.fillRect(0, y + TILE - 2, W, 2);
      // Mittelstreifen
      ctx.fillStyle = "rgba(244,211,94,.9)";
      const dash = TILE * 0.5;
      for (let x = 0; x < W; x += dash * 1.7) {
        ctx.fillRect(x, y + TILE / 2 - 2, dash, 4);
      }
    } else if (lane.type === "rail") {
      ctx.fillStyle = "#7d6250";
      ctx.fillRect(0, y, W, TILE);
      // Schwellen
      ctx.fillStyle = C.railTie;
      for (let x = 0; x < W; x += TILE * 0.5) ctx.fillRect(x + 4, y + TILE * 0.2, TILE * 0.34, TILE * 0.6);
      // Schienen
      ctx.fillStyle = "#c9ccd1";
      ctx.fillRect(0, y + TILE * 0.30, W, 3);
      ctx.fillRect(0, y + TILE * 0.66, W, 3);
      // Blink-Signal
      if (lane.signal > 0) {
        const on = Math.floor(lane.signal * 5) % 2 === 0;
        ctx.fillStyle = on ? "#ef476f" : "rgba(239,71,111,.25)";
        ctx.beginPath(); ctx.arc(TILE * 0.4, y + TILE * 0.28, 5, 0, 7); ctx.fill();
        ctx.beginPath(); ctx.arc(W - TILE * 0.4, y + TILE * 0.28, 5, 0, 7); ctx.fill();
      }
    }

    // Bäume auf Gras
    if (lane.type === "grass" && lane.trees) {
      for (const col of lane.trees) drawTree(col * TILE, y);
    }
  }

  function drawTree(x, y) {
    const cx = x + TILE / 2;
    ctx.fillStyle = "rgba(0,0,0,.10)";
    ctx.beginPath(); ctx.ellipse(cx, y + TILE * 0.86, TILE * 0.28, TILE * 0.09, 0, 0, 7); ctx.fill();
    ctx.fillStyle = "#7a5a3c";
    roundRect(cx - TILE * 0.06, y + TILE * 0.45, TILE * 0.12, TILE * 0.42, 3); ctx.fill();
    ctx.fillStyle = "#3f9d52";
    ctx.beginPath(); ctx.arc(cx, y + TILE * 0.38, TILE * 0.30, 0, 7); ctx.fill();
    ctx.fillStyle = "#4bb563";
    ctx.beginPath(); ctx.arc(cx - TILE * 0.10, y + TILE * 0.30, TILE * 0.17, 0, 7); ctx.fill();
  }

  // Ein Fahrzeug (flacher Vektor-Stil, Draufsicht von schräg vorn)
  function drawVehicle(v, laneY, dir) {
    const x = v.x * TILE;
    const w = v.len * TILE;
    const pad = TILE * 0.12;
    const bx = x + pad, by = laneY + TILE * 0.18;
    const bw = w - pad * 2, bh = TILE * 0.64;

    // Schatten
    ctx.fillStyle = "rgba(0,0,0,.16)";
    roundRect(bx + 3, by + bh - 4, bw, 8, 6); ctx.fill();

    if (v.kind === "train") return drawTrain(v, laneY, dir);

    // Räder
    ctx.fillStyle = "#20242a";
    const wr = TILE * 0.11;
    const wy = by + bh - wr * 0.3;
    const nW = VEHICLES[v.kind].wheels;
    for (let i = 0; i < nW; i++) {
      const wx = bx + bw * (0.22 + (0.56 * i) / Math.max(1, nW - 1));
      ctx.beginPath(); ctx.arc(wx, wy, wr, 0, 7); ctx.fill();
    }

    // Karosserie
    ctx.fillStyle = v.color;
    roundRect(bx, by, bw, bh, TILE * 0.16); ctx.fill();
    // oberer Glanz
    ctx.fillStyle = "rgba(255,255,255,.16)";
    roundRect(bx, by, bw, bh * 0.42, TILE * 0.16); ctx.fill();

    // Kabine / Fenster
    ctx.fillStyle = "rgba(255,255,255,.85)";
    if (v.kind === "car") {
      const cw = bw * 0.42;
      const cxx = dir > 0 ? bx + bw * 0.30 : bx + bw * 0.28;
      roundRect(cxx, by + bh * 0.14, cw, bh * 0.44, TILE * 0.08); ctx.fill();
    } else if (v.kind === "truck") {
      const cw = bw * 0.26;
      const cxx = dir > 0 ? bx + bw - cw - bw * 0.04 : bx + bw * 0.04;
      // Fahrerhaus abheben
      ctx.fillStyle = v.color;
      roundRect(cxx - 2, by - bh * 0.10, cw + 4, bh * 0.5, TILE * 0.1); ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,.9)";
      roundRect(cxx, by - bh * 0.04, cw, bh * 0.30, TILE * 0.06); ctx.fill();
      // Ladefläche
      ctx.fillStyle = "rgba(255,255,255,.14)";
      const lx = dir > 0 ? bx + bw * 0.04 : bx + bw * 0.30;
      roundRect(lx, by + bh * 0.14, bw * 0.62, bh * 0.6, TILE * 0.06); ctx.fill();
    } else if (v.kind === "bus") {
      const n = 4;
      const gap = bw * 0.055;
      const ww = (bw * 0.8 - gap * (n - 1)) / n;
      for (let i = 0; i < n; i++) {
        roundRect(bx + bw * 0.1 + i * (ww + gap), by + bh * 0.16, ww, bh * 0.4, TILE * 0.05);
        ctx.fill();
      }
    }

    // Scheinwerfer in Fahrtrichtung
    ctx.fillStyle = "#fff3b0";
    const hx = dir > 0 ? bx + bw - 3 : bx + 3;
    ctx.beginPath(); ctx.arc(hx, by + bh * 0.66, TILE * 0.045, 0, 7); ctx.fill();
  }

  function drawTrain(v, laneY, dir) {
    const x = v.x * TILE, w = v.len * TILE;
    const bx = x + TILE * 0.06, by = laneY + TILE * 0.12;
    const bw = w - TILE * 0.12, bh = TILE * 0.74;
    ctx.fillStyle = C.brandDark;
    roundRect(bx, by, bw, bh, TILE * 0.2); ctx.fill();
    // Nase
    ctx.fillStyle = C.brand;
    const nx = dir > 0 ? bx + bw * 0.8 : bx;
    roundRect(nx, by, bw * 0.2, bh, TILE * 0.2); ctx.fill();
    // Fensterband
    ctx.fillStyle = "rgba(255,255,255,.9)";
    roundRect(bx + bw * 0.06, by + bh * 0.2, bw * 0.88, bh * 0.34, TILE * 0.08); ctx.fill();
    ctx.fillStyle = C.brandDark;
    for (let i = 0; i < 7; i++) ctx.fillRect(bx + bw * (0.12 + i * 0.11), by + bh * 0.2, 3, bh * 0.34);
    // Front-Licht
    ctx.fillStyle = "#fff3b0";
    const hx = dir > 0 ? bx + bw - 4 : bx + 4;
    ctx.beginPath(); ctx.arc(hx, by + bh * 0.72, TILE * 0.06, 0, 7); ctx.fill();
  }

  // Der Held: air-up-Fläschchen (Marken-Look) mit Hüpf-Squash
  function drawPlayer() {
    const dr = lerp(player.fromRow, player.row, easeOut(player.animT));
    const dc = lerp(player.fromCol, player.col, easeOut(player.animT));
    const cx = dc * TILE + TILE / 2;
    const baseY = rowY(dr) + TILE / 2;
    const lift = player.hopH * TILE * 0.5;
    let cy = baseY - lift;

    if (player.dead) {
      player.deathT += 1 / 60;
      const t = Math.min(1, player.deathT * 2.2);
      // plattgedrückt
      drawShadow(cx, baseY, 1 + t * 0.5);
      drawBottle(cx, baseY, 1 + t * 0.6, 1 - t * 0.75, 0.4);
      return;
    }

    // Schatten kleiner, wenn in der Luft
    drawShadow(cx, baseY, 1 - player.hopH * 0.4);
    const squash = player.animT < 1 ? 1 - player.hopH * 0.12 : 1;
    drawBottle(cx, cy, 1 / squash, squash, 1);
  }

  function drawShadow(cx, cy, s) {
    ctx.fillStyle = "rgba(0,0,0,.16)";
    ctx.beginPath();
    ctx.ellipse(cx, cy + TILE * 0.28, TILE * 0.26 * s, TILE * 0.09 * s, 0, 0, 7);
    ctx.fill();
  }

  function drawBottle(cx, cy, sx, sy, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(cx, cy);
    ctx.scale(sx, sy);
    const bw = TILE * 0.44, bh = TILE * 0.64;
    // Korpus
    ctx.fillStyle = C.brand;
    roundRect(-bw / 2, -bh * 0.55, bw, bh, bw * 0.42); ctx.fill();
    // Glanzstreifen
    ctx.fillStyle = "rgba(255,255,255,.45)";
    roundRect(-bw * 0.34, -bh * 0.45, bw * 0.14, bh * 0.7, bw * 0.07); ctx.fill();
    // Pod-Ring (Geschmack) — coral
    ctx.fillStyle = C.coral;
    ctx.beginPath(); ctx.ellipse(0, -bh * 0.55, bw * 0.5, bh * 0.14, 0, 0, 7); ctx.fill();
    // Deckel
    ctx.fillStyle = "#2b2f36";
    roundRect(-bw * 0.24, -bh * 0.78, bw * 0.48, bh * 0.26, bw * 0.12); ctx.fill();
    roundRect(-bw * 0.10, -bh * 0.92, bw * 0.20, bh * 0.2, bw * 0.07); ctx.fill();
    // Gesicht
    ctx.fillStyle = "#1d1d1f";
    ctx.beginPath(); ctx.arc(-bw * 0.16, -bh * 0.14, bw * 0.06, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(bw * 0.16, -bh * 0.14, bw * 0.06, 0, 7); ctx.fill();
    ctx.strokeStyle = "#1d1d1f";
    ctx.lineWidth = Math.max(1.5, bw * 0.05);
    ctx.lineCap = "round";
    ctx.beginPath(); ctx.arc(0, -bh * 0.05, bw * 0.14, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
    ctx.restore();
  }

  function easeOut(t) { return 1 - Math.pow(1 - t, 2.5); }

  // ---------- Zeichnen des Frames ----------
  function render() {
    ctx.clearRect(0, 0, W, H);
    const minRow = Math.floor(camRow) - 1;
    const maxRow = Math.ceil(camRow + H / TILE) + 1;

    // Lanes von hinten nach vorn
    for (let r = maxRow; r >= minRow; r--) drawLane(laneAt(r));
    // Fahrzeuge darüber
    for (let r = maxRow; r >= minRow; r--) {
      const lane = laneAt(r);
      if (!lane.vehicles) continue;
      const y = rowY(r);
      if (y > H || y < -TILE) continue;
      for (const v of lane.vehicles) drawVehicle(v, y, lane.dir);
    }
    drawPlayer();

    document.getElementById("score").textContent = score;
  }

  // ---------- Hauptschleife ----------
  function frame(t) {
    const dt = Math.min(0.05, (t - lastT) / 1000 || 0);
    lastT = t;
    update(dt);
    render();
    requestAnimationFrame(frame);
  }

  // ---------- UI ----------
  const startOverlay = document.getElementById("start");
  const overOverlay = document.getElementById("over");

  function startGame() {
    reset();
    state = "play";
    startOverlay.classList.add("hidden");
    overOverlay.classList.add("hidden");
  }

  function showOver() {
    state = "over";
    document.getElementById("finalScore").textContent = score;
    document.getElementById("finalBest").textContent = best;
    document.getElementById("bestVal").textContent = best;
    overOverlay.classList.remove("hidden");
  }

  document.getElementById("startBtn").addEventListener("click", startGame);
  document.getElementById("againBtn").addEventListener("click", startGame);

  // ---------- Boot ----------
  window.addEventListener("resize", () => { resize(); });
  resize();
  reset();
  state = "start";
  document.getElementById("bestVal").textContent = best;
  lastT = performance.now();
  requestAnimationFrame(frame);
})();
