/* ============================================================
   Change Together — Zwei-Spieler-Koop-Biom-Abenteuer
   Reines Canvas/JS, kein Build-Schritt.

   Prinzip (wie "Change Together"):
   - Zwei Figuren teilen sich eine Tastatur.
       Lumen (🔥, Feuer)  : A / D bewegen, W springen
       Aqua  (💧, Wasser) : ◀ ▶ bewegen, ▲ springen
   - Jedes Element hat eine eigene Schwäche:
       Wasser ~ tötet Lumen, ist aber sicher für Aqua
       Feuer  ^ tötet Aqua,  ist aber sicher für Lumen
       Säure  x tötet beide  -> gemeinsam drumherum
   - Druckplatten (1/2) öffnen Tore (q/w) -> nur im Team lösbar.
   - Beide müssen GLEICHZEITIG in ihrer Tür stehen, um das Level
     zu schaffen. Edelsteine sind optionaler Bonus.
   ============================================================ */

(() => {
  "use strict";

  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const W = canvas.width;   // 960
  const H = canvas.height;  // 600
  const TILE = 40;
  const COLS = 24;
  const ROWS = 15;

  // ---- Physik ----
  const GRAVITY = 0.6;
  const MOVE_SPEED = 3.2;
  const JUMP_VELOCITY = -12.6;
  const MAX_FALL = 15;
  const FRICTION = 0.78;

  // ---- Tile-Legende ----
  // '#' fest | '~' Wasser | '^' Feuer | 'x' Säure
  // 'L' Lumen-Start | 'A' Aqua-Start | 'O' Lumen-Tür | 'P' Aqua-Tür
  // 'r' roter Stein | 'b' blauer Stein | '1''2' Platten | 'q''w' Tore
  const GATE_CHARS = "qw";
  const HAZARD_CHARS = "~^x";

  const GATE_COLOR = { q: "#ffb84d", w: "#5ad1ff" };

  // ============================================================
  //  LEVELS
  // ============================================================
  const LEVELS = [
    {
      name: "Lichtung",
      biome: "forest",
      links: {},
      grid: [
        "",
        "",
        "",
        "",
        "",
        "                   OP",
        "                  ####",
        "               rb",
        "              ####",
        "          rb",
        "         ####",
        "     rb",
        "    ####",
        "  L A",
        "########################",
      ],
    },
    {
      name: "Dünenpfad",
      biome: "desert",
      links: {},
      grid: [
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "    #####  #####",
        "",
        "  L A             rb OP",
        "#####~~~~##^^^^#########",
      ],
    },
    {
      name: "Frostkluft",
      biome: "ice",
      links: { 1: "q", 2: "w" },
      grid: [
        "",
        "",
        "",
        "          w",
        "          w",
        "          w",
        "          w",
        "Lr   ^^ 1 w   r  O",
        "########################",
        "        q",
        "        q",
        "        q",
        "        q",
        "Ab   ~~ q b  2    P",
        "########################",
      ],
    },
    {
      name: "Schlund des Vulkans",
      biome: "volcano",
      links: { 1: "q", 2: "w" },
      grid: [
        "",
        "",
        "",
        "             w",
        "             w",
        "             w",
        "             w",
        "L  ^  x  1   w   r  O",
        "########################",
        "         q",
        "         q",
        "         q",
        "         q",
        "A  ~  x  q b  2     b  P",
        "########################",
      ],
    },
  ];

  // ============================================================
  //  STATE
  // ============================================================
  let levelIndex = 0;
  let level = null;        // geparstes Level
  let players = [];
  let gems = [];
  let particles = [];
  let openGates = new Set();
  let state = "start";     // start | play | levelcomplete | win
  let deathFlash = 0;
  let winFlash = 0;
  let time = 0;

  const keys = Object.create(null);

  // ============================================================
  //  INPUT
  // ============================================================
  const ACTION_KEYS = new Set([
    "arrowleft", "arrowright", "arrowup", "arrowdown", " ",
  ]);

  window.addEventListener("keydown", (e) => {
    const k = e.key.toLowerCase();
    if (ACTION_KEYS.has(k)) e.preventDefault();
    keys[k] = true;

    if (k === "enter") {
      if (state === "start") startGame();
      else if (state === "levelcomplete") nextLevel();
      else if (state === "win") { levelIndex = 0; startGame(); }
    }
    if (k === "r" && state === "play") loadLevel(levelIndex);
  });
  window.addEventListener("keyup", (e) => { keys[e.key.toLowerCase()] = false; });

  // ============================================================
  //  LEVEL PARSING
  // ============================================================
  function pad(row) {
    return (row + " ".repeat(COLS)).slice(0, COLS);
  }

  function loadLevel(idx) {
    const def = LEVELS[idx];
    const rows = [];
    for (let r = 0; r < ROWS; r++) rows.push(pad(def.grid[r] || ""));

    const solid = [];
    const gate = [];
    const hazard = [];
    gems = [];
    particles = [];
    const plates = [];
    const exits = [];
    let lumenSpawn = { c: 1, r: ROWS - 2 };
    let aquaSpawn = { c: 2, r: ROWS - 2 };

    for (let r = 0; r < ROWS; r++) {
      solid[r] = [];
      gate[r] = [];
      hazard[r] = [];
      for (let c = 0; c < COLS; c++) {
        const ch = rows[r][c];
        solid[r][c] = ch === "#";
        gate[r][c] = GATE_CHARS.includes(ch) ? ch : null;
        hazard[r][c] = HAZARD_CHARS.includes(ch) ? ch : null;

        switch (ch) {
          case "L": lumenSpawn = { c, r }; break;
          case "A": aquaSpawn = { c, r }; break;
          case "O": exits.push({ type: "L", c, r }); break;
          case "P": exits.push({ type: "A", c, r }); break;
          case "r": gems.push({ c, r, type: "r", got: false }); break;
          case "b": gems.push({ c, r, type: "b", got: false }); break;
          case "1": case "2": plates.push({ c, r, ch }); break;
        }
      }
    }

    level = {
      def, name: def.name, biome: def.biome, links: def.links || {},
      solid, gate, hazard, plates, exits,
    };

    players = [
      makePlayer("lumen", lumenSpawn),
      makePlayer("aqua", aquaSpawn),
    ];

    openGates = new Set();
    deathFlash = 0;

    // HUD
    document.getElementById("biomeLabel").textContent = biomeTitle(def.biome);
    document.getElementById("levelLabel").textContent =
      "Level " + (idx + 1) + " · " + def.name;
    updateGemHud();
  }

  function biomeTitle(b) {
    return ({
      forest: "🌲 Wald", desert: "🏜️ Wüste",
      ice: "❄️ Eis", volcano: "🌋 Vulkan",
    })[b] || b;
  }

  function makePlayer(type, spawn) {
    const w = 24, h = 32;
    return {
      type,                       // "lumen" | "aqua"
      spawn,
      x: spawn.c * TILE + (TILE - w) / 2,
      y: spawn.r * TILE + (TILE - h),
      w, h,
      vx: 0, vy: 0,
      onGround: false,
      facing: 1,
      atExit: false,
      anim: 0,
      wheel: 0,
    };
  }

  // ============================================================
  //  COLLISION HELPERS
  // ============================================================
  function isSolidCell(c, r) {
    if (c < 0 || c >= COLS || r < 0) return true;          // Wände / Decke
    if (r >= ROWS) return true;                            // Boden
    if (level.solid[r][c]) return true;
    const g = level.gate[r][c];
    if (g && !openGates.has(g)) return true;               // geschlossenes Tor
    return false;
  }

  function rectHitsSolid(x, y, w, h) {
    const c0 = Math.floor(x / TILE);
    const c1 = Math.floor((x + w - 1) / TILE);
    const r0 = Math.floor(y / TILE);
    const r1 = Math.floor((y + h - 1) / TILE);
    for (let r = r0; r <= r1; r++)
      for (let c = c0; c <= c1; c++)
        if (isSolidCell(c, r)) return true;
    return false;
  }

  // ============================================================
  //  UPDATE
  // ============================================================
  function update(dt) {
    if (state !== "play") return;

    // --- Druckplatten auswerten -> offene Tore bestimmen ---
    openGates = new Set();
    for (const p of level.plates) {
      const px = p.c * TILE, py = p.r * TILE;
      let pressed = false;
      for (const pl of players)
        if (aabb(pl.x, pl.y, pl.w, pl.h, px + 4, py + 4, TILE - 8, TILE - 8))
          pressed = true;
      if (pressed && level.links[p.ch]) openGates.add(level.links[p.ch]);
    }

    let someoneDied = false;

    for (const pl of players) {
      stepPlayer(pl);
      pl.anim += Math.abs(pl.vx) * 0.15 + 0.04;
      pl.wheel += pl.vx * 0.14;   // Räder drehen sich mit der Fahrt

      // Edelsteine einsammeln
      for (const g of gems) {
        if (g.got) continue;
        const matches = (g.type === "r" && pl.type === "lumen") ||
                        (g.type === "b" && pl.type === "aqua");
        if (!matches) continue;
        const gx = g.c * TILE + TILE / 2, gy = g.r * TILE + TILE / 2;
        if (aabb(pl.x, pl.y, pl.w, pl.h, gx - 12, gy - 12, 24, 24)) {
          g.got = true;
          spawnBurst(gx, gy, g.type === "r" ? "#ff8a4c" : "#4cc3ff", 14);
          updateGemHud();
        }
      }

      // Gefahren prüfen
      if (touchesDeadly(pl)) someoneDied = true;
    }

    if (someoneDied) {
      for (const pl of players)
        spawnBurst(pl.x + pl.w / 2, pl.y + pl.h / 2,
          pl.type === "lumen" ? "#ff7a3c" : "#36b8ff", 22);
      deathFlash = 1;
      state = "dying";
      setTimeout(() => {
        if (state === "dying") { loadLevel(levelIndex); state = "play"; }
      }, 420);
      return;
    }

    // --- Türen prüfen ---
    for (const pl of players) pl.atExit = false;
    for (const ex of level.exits) {
      const ex_cx = ex.c * TILE + TILE / 2;
      const ex_cy = ex.r * TILE + TILE / 2;
      for (const pl of players) {
        const wantType = ex.type === "L" ? "lumen" : "aqua";
        if (pl.type !== wantType) continue;
        const cx = pl.x + pl.w / 2, cy = pl.y + pl.h / 2;
        if (Math.abs(cx - ex_cx) < TILE * 0.5 && Math.abs(cy - ex_cy) < TILE * 0.7)
          pl.atExit = true;
      }
    }
    if (players.every((p) => p.atExit)) {
      winFlash = 1;
      spawnBurst(players[0].x, players[0].y, "#ffd86b", 30);
      state = "levelcomplete";
      showLevelComplete();
    }

    updateParticles();
  }

  function stepPlayer(pl) {
    // Eingaben
    let left, right, jump;
    if (pl.type === "lumen") {
      left = keys["a"]; right = keys["d"]; jump = keys["w"];
    } else {
      left = keys["arrowleft"]; right = keys["arrowright"]; jump = keys["arrowup"];
    }

    if (left)  { pl.vx -= 0.9; pl.facing = -1; }
    if (right) { pl.vx += 0.9; pl.facing = 1; }
    if (!left && !right) pl.vx *= FRICTION;
    pl.vx = clamp(pl.vx, -MOVE_SPEED, MOVE_SPEED);

    if (jump && pl.onGround) { pl.vy = JUMP_VELOCITY; pl.onGround = false; }

    pl.vy += GRAVITY;
    if (pl.vy > MAX_FALL) pl.vy = MAX_FALL;

    // X-Achse
    const nx = pl.x + pl.vx;
    if (rectHitsSolid(nx, pl.y, pl.w, pl.h)) {
      const step = Math.sign(pl.vx);
      const dist = Math.abs(pl.vx);
      let moved = 0;
      while (moved < dist && !rectHitsSolid(pl.x + step, pl.y, pl.w, pl.h)) {
        pl.x += step; moved++;
      }
      pl.vx = 0;
    } else {
      pl.x = nx;
    }

    // Y-Achse
    pl.onGround = false;
    const ny = pl.y + pl.vy;
    if (rectHitsSolid(pl.x, ny, pl.w, pl.h)) {
      const step = Math.sign(pl.vy);
      const dist = Math.abs(pl.vy);
      let moved = 0;
      while (moved < dist && !rectHitsSolid(pl.x, pl.y + step, pl.w, pl.h)) {
        pl.y += step; moved++;
      }
      if (pl.vy > 0) pl.onGround = true;
      pl.vy = 0;
    } else {
      pl.y = ny;
    }

    // Im Bildschirm halten
    pl.x = clamp(pl.x, 0, W - pl.w);
    if (pl.y > H + 200) loadLevel(levelIndex);
  }

  function touchesDeadly(pl) {
    // Verkleinerte "Kern"-Hitbox: streift man nur den Rand einer Gefahr
    // (z. B. beim Sprung über Säure), ist das verziehen -> faireres Gefühl.
    const hx = pl.x + 8, hy = pl.y + 6, hw = pl.w - 16, hh = pl.h - 10;
    const c0 = Math.floor(hx / TILE);
    const c1 = Math.floor((hx + hw - 1) / TILE);
    const r0 = Math.floor(hy / TILE);
    const r1 = Math.floor((hy + hh - 1) / TILE);
    for (let r = r0; r <= r1; r++) {
      if (r < 0 || r >= ROWS) continue;
      for (let c = c0; c <= c1; c++) {
        if (c < 0 || c >= COLS) continue;
        const hz = level.hazard[r][c];
        if (!hz) continue;
        if (hz === "x") return true;                      // Säure: beide
        if (hz === "~" && pl.type === "lumen") return true; // Wasser tötet Lumen
        if (hz === "^" && pl.type === "aqua") return true;  // Feuer tötet Aqua
      }
    }
    return false;
  }

  // ============================================================
  //  PARTICLES
  // ============================================================
  function spawnBurst(x, y, color, n) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = 1 + Math.random() * 4;
      particles.push({
        x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 1.5,
        life: 1, color, size: 2 + Math.random() * 3,
      });
    }
  }
  function updateParticles() {
    for (const p of particles) {
      p.x += p.vx; p.y += p.vy; p.vy += 0.18; p.life -= 0.025;
    }
    particles = particles.filter((p) => p.life > 0);
  }

  // ============================================================
  //  RENDER
  // ============================================================
  function render() {
    drawBackground(level ? level.biome : "forest");
    if (!level) return;

    drawTiles();
    drawGates();
    drawHazards();
    drawPlates();
    drawExits();
    drawGems();
    drawPlayers();
    drawParticles();

    if (deathFlash > 0) {
      ctx.fillStyle = `rgba(255,80,80,${deathFlash * 0.35})`;
      ctx.fillRect(0, 0, W, H);
      deathFlash -= 0.04;
    }
    if (winFlash > 0) {
      ctx.fillStyle = `rgba(255,225,120,${winFlash * 0.3})`;
      ctx.fillRect(0, 0, W, H);
      winFlash -= 0.03;
    }
  }

  function drawBackground(biome) {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    const palettes = {
      forest:  ["#7ec8e3", "#b8e0a0", "#7cc24b"],
      desert:  ["#ffd98a", "#ffb45e", "#e98c45"],
      ice:     ["#bfe9ff", "#86c8f0", "#5a9fd6"],
      volcano: ["#3a1220", "#7a1f1f", "#c23a1c"],
    };
    const pal = palettes[biome] || palettes.forest;
    g.addColorStop(0, pal[0]);
    g.addColorStop(0.55, pal[1]);
    g.addColorStop(1, pal[2]);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    ctx.save();
    if (biome === "forest") {
      // Sonne + Hügel + Bäume
      drawSun("#fff6c8", 0.18);
      drawHills("#6fb33f", 0.45);
      drawHills("#5a9e33", 0.62, 90);
      for (let i = 0; i < 6; i++) drawTree(70 + i * 160, H - 70 + (i % 2) * 18);
    } else if (biome === "desert") {
      drawSun("#fff0c0", 0.20);
      drawHills("#e89a4c", 0.5);
      drawHills("#d98439", 0.66, 70);
    } else if (biome === "ice") {
      drawSun("#ffffff", 0.12);
      drawMountains("#9fd0ef", H * 0.5);
      drawMountains("#7fb6dd", H * 0.62);
    } else if (biome === "volcano") {
      drawMountains("#5a1414", H * 0.45);
      drawMountains("#7a1d1d", H * 0.6);
      // glühender Dunst
      const gg = ctx.createRadialGradient(W / 2, H, 50, W / 2, H, W * 0.7);
      gg.addColorStop(0, "rgba(255,120,40,0.35)");
      gg.addColorStop(1, "rgba(255,120,40,0)");
      ctx.fillStyle = gg;
      ctx.fillRect(0, 0, W, H);
    }
    ctx.restore();
  }

  function drawSun(color, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha + 0.05 * Math.sin(time * 1.5);
    const grd = ctx.createRadialGradient(W * 0.8, 90, 10, W * 0.8, 90, 130);
    grd.addColorStop(0, color);
    grd.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(W * 0.8, 90, 130, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawHills(color, yFactor, height = 110) {
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.55;
    ctx.beginPath();
    const baseY = H * yFactor;
    ctx.moveTo(0, H);
    for (let x = 0; x <= W; x += 40) {
      const y = baseY + Math.sin(x * 0.012 + yFactor * 10) * height * 0.4;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(W, H);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  function drawMountains(color, baseY) {
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.6;
    ctx.beginPath();
    ctx.moveTo(0, H);
    let x = 0;
    let up = true;
    while (x <= W) {
      const peak = baseY - (up ? 90 + (x % 160) : 30);
      ctx.lineTo(x, peak);
      x += 120; up = !up;
    }
    ctx.lineTo(W, H);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  function drawTree(x, y) {
    ctx.fillStyle = "#6b4226";
    ctx.fillRect(x - 6, y - 30, 12, 40);
    ctx.fillStyle = "#3f8f33";
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(x, y - 80 + i * 22);
      ctx.lineTo(x - 32 + i * 4, y - 30 + i * 22);
      ctx.lineTo(x + 32 - i * 4, y - 30 + i * 22);
      ctx.closePath();
      ctx.fill();
    }
  }

  function biomeBlockColors(biome) {
    return ({
      forest:  ["#7b5a3a", "#6a4a2e", "#52c24b"],   // erde, schatten, gras
      desert:  ["#caa066", "#b98a4c", "#e7c98a"],
      ice:     ["#cfeefc", "#a9d6ef", "#ffffff"],
      volcano: ["#3a2326", "#27171a", "#6a2b22"],
    })[biome] || ["#7b5a3a", "#6a4a2e", "#52c24b"];
  }

  function drawTiles() {
    const [face, shadow, top] = biomeBlockColors(level.biome);
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (!level.solid[r][c]) continue;
        const x = c * TILE, y = r * TILE;
        ctx.fillStyle = face;
        ctx.fillRect(x, y, TILE, TILE);
        ctx.fillStyle = shadow;
        ctx.fillRect(x, y + TILE - 6, TILE, 6);
        // Grasdecke nur wenn oben frei
        const open = r === 0 || !level.solid[r - 1][c];
        if (open) {
          ctx.fillStyle = top;
          ctx.fillRect(x, y, TILE, 8);
          ctx.fillRect(x, y + 8, TILE, 3);
        }
        ctx.globalAlpha = 1;
        ctx.strokeStyle = "rgba(0,0,0,0.10)";
        ctx.strokeRect(x + 0.5, y + 0.5, TILE - 1, TILE - 1);
      }
    }
  }

  function drawGates() {
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const g = level.gate[r][c];
        if (!g) continue;
        const x = c * TILE, y = r * TILE;
        const col = GATE_COLOR[g] || "#ffffff";
        const isOpen = openGates.has(g);
        if (isOpen) {
          // Rahmen, durchlässig
          ctx.strokeStyle = hexA(col, 0.5);
          ctx.setLineDash([5, 5]);
          ctx.strokeRect(x + 4, y + 2, TILE - 8, TILE - 4);
          ctx.setLineDash([]);
        } else {
          // Energiebarriere
          ctx.fillStyle = hexA(col, 0.22);
          ctx.fillRect(x + 3, y, TILE - 6, TILE);
          ctx.fillStyle = hexA(col, 0.9);
          for (let i = 0; i < 4; i++) {
            const yy = y + 4 + i * 9 + Math.sin(time * 4 + i) * 2;
            ctx.fillRect(x + 6, yy, TILE - 12, 3);
          }
          ctx.strokeStyle = col;
          ctx.lineWidth = 2;
          ctx.strokeRect(x + 3, y, TILE - 6, TILE);
          ctx.lineWidth = 1;
        }
      }
    }
  }

  function drawHazards() {
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const hz = level.hazard[r][c];
        if (!hz) continue;
        const x = c * TILE, y = r * TILE;
        if (hz === "~") drawLiquid(x, y, "#2f93e0", "#7cc6ff");
        else if (hz === "^") drawFire(x, y);
        else if (hz === "x") drawLiquid(x, y, "#5fbf2e", "#b6f06a", true);
      }
    }
  }

  function drawLiquid(x, y, deep, light, bubbles) {
    ctx.fillStyle = deep;
    ctx.fillRect(x, y + 6, TILE, TILE - 6);
    ctx.fillStyle = light;
    ctx.beginPath();
    ctx.moveTo(x, y + 10);
    for (let i = 0; i <= TILE; i += 8) {
      ctx.lineTo(x + i, y + 8 + Math.sin((x + i) * 0.2 + time * 3) * 3);
    }
    ctx.lineTo(x + TILE, y + 16);
    ctx.lineTo(x, y + 16);
    ctx.closePath();
    ctx.fill();
    if (bubbles) {
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      for (let i = 0; i < 2; i++) {
        const bx = x + 8 + ((i * 17 + time * 20) % (TILE - 12));
        const by = y + 14 + Math.sin(time * 2 + i) * 4;
        ctx.beginPath(); ctx.arc(bx, by, 2.2, 0, Math.PI * 2); ctx.fill();
      }
    }
  }

  function drawFire(x, y) {
    ctx.fillStyle = "#5a1e0a";
    ctx.fillRect(x, y + TILE - 8, TILE, 8);
    for (let i = 0; i < 3; i++) {
      const fx = x + 7 + i * 12;
      const fh = 22 + Math.sin(time * 8 + i * 2) * 8;
      const grd = ctx.createLinearGradient(fx, y + TILE, fx, y + TILE - fh);
      grd.addColorStop(0, "#ffd24d");
      grd.addColorStop(0.6, "#ff7a1c");
      grd.addColorStop(1, "rgba(255,60,0,0.2)");
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.moveTo(fx - 7, y + TILE - 2);
      ctx.quadraticCurveTo(fx - 6, y + TILE - fh * 0.6, fx, y + TILE - fh);
      ctx.quadraticCurveTo(fx + 6, y + TILE - fh * 0.6, fx + 7, y + TILE - 2);
      ctx.closePath();
      ctx.fill();
    }
  }

  function drawPlates() {
    for (const p of level.plates) {
      const x = p.c * TILE, y = p.r * TILE;
      const col = GATE_COLOR[level.links[p.ch]] || "#ffffff";
      const active = openGates.has(level.links[p.ch]);
      ctx.fillStyle = "#2a2f44";
      roundRect(x + 6, y + TILE - 12, TILE - 12, 9, 3); ctx.fill();
      ctx.fillStyle = active ? col : hexA(col, 0.45);
      const h = active ? 5 : 8;
      roundRect(x + 9, y + TILE - 12 + (8 - h), TILE - 18, h, 3); ctx.fill();
      if (active) {
        ctx.fillStyle = hexA(col, 0.4);
        ctx.beginPath();
        ctx.arc(x + TILE / 2, y + TILE - 8, 14, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  function drawExits() {
    for (const ex of level.exits) {
      const x = ex.c * TILE, y = ex.r * TILE;
      const isLumen = ex.type === "L";
      const col = isLumen ? "#ff7a3c" : "#36b8ff";
      const glow = isLumen ? "#ffb066" : "#8fe0ff";
      // Standing player?
      const lit = players.some((p) =>
        p.atExit && p.type === (isLumen ? "lumen" : "aqua"));
      ctx.save();
      ctx.shadowColor = glow;
      ctx.shadowBlur = lit ? 30 : 14;
      // Türrahmen
      ctx.fillStyle = col;
      roundRect(x + 4, y - TILE + 6, TILE - 8, TILE * 2 - 10, 8); ctx.fill();
      ctx.shadowBlur = 0;
      // Inneres
      const grd = ctx.createLinearGradient(x, y - TILE, x, y + TILE);
      grd.addColorStop(0, lit ? "#ffffff" : hexA(glow, 0.7));
      grd.addColorStop(1, hexA(col, 0.55));
      ctx.fillStyle = grd;
      roundRect(x + 8, y - TILE + 10, TILE - 16, TILE * 2 - 18, 6); ctx.fill();
      // Symbol
      ctx.fillStyle = "#0c1020";
      ctx.font = "16px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(isLumen ? "🔥" : "💧", x + TILE / 2, y + 2);
      ctx.restore();
    }
  }

  function drawGems() {
    for (const g of gems) {
      if (g.got) continue;
      const cx = g.c * TILE + TILE / 2;
      const cy = g.r * TILE + TILE / 2 + Math.sin(time * 3 + g.c) * 4;
      const col = g.type === "r" ? "#ff8a4c" : "#4cc3ff";
      const glow = g.type === "r" ? "#ffd0a8" : "#bfe9ff";
      ctx.save();
      ctx.translate(cx, cy);
      const sx = Math.cos(time * 3 + g.c);  // "Rotation"
      ctx.shadowColor = glow; ctx.shadowBlur = 14;
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(0, -10);
      ctx.lineTo(7 * sx, 0);
      ctx.lineTo(0, 10);
      ctx.lineTo(-7 * sx, 0);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      ctx.beginPath();
      ctx.moveTo(0, -10); ctx.lineTo(3 * sx, -2); ctx.lineTo(0, 0);
      ctx.closePath(); ctx.fill();
      ctx.restore();
    }
  }

  function drawPlayers() {
    for (const pl of players) drawPlayer(pl);
  }

  function drawWheel(wx, wy, ang) {
    ctx.save();
    ctx.translate(wx, wy);
    ctx.fillStyle = "#22252f";                       // Reifen
    ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#8b909c"; ctx.lineWidth = 1;  // Speichen (drehend)
    for (let i = 0; i < 3; i++) {
      const a = ang + i * (Math.PI / 3);
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 1.5, Math.sin(a) * 1.5);
      ctx.lineTo(Math.cos(a) * 4.3, Math.sin(a) * 4.3);
      ctx.stroke();
    }
    ctx.fillStyle = "#c9ced8";                        // Nabe
    ctx.beginPath(); ctx.arc(0, 0, 1.8, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  function drawPlayer(pl) {
    const isLumen = pl.type === "lumen";
    const body = isLumen ? "#ff7a3c" : "#36b8ff";
    const dark = isLumen ? "#d8542a" : "#1f8fd6";
    const glow = isLumen ? "#ffb066" : "#8fe0ff";
    const deckCol = isLumen ? "#b23c1c" : "#166a9e";  // Roller-Rahmen
    const x = pl.x, y = pl.y, w = pl.w, h = pl.h;
    const dir = pl.facing >= 0 ? 1 : -1;
    const cx = x + w / 2;
    const bob = pl.onGround ? Math.sin(pl.anim) * 0.8 : 0;
    const wheelAng = pl.wheel || 0;

    const backWX = cx - dir * 7, frontWX = cx + dir * 7;
    const wheelY = y + h - 3;    // Räder am Boden
    const deckY = y + h - 7;     // Trittbrett-Oberkante

    ctx.save();

    // Schatten
    ctx.fillStyle = "rgba(0,0,0,0.22)";
    ctx.beginPath();
    ctx.ellipse(cx, y + h + 1, w * 0.52, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // ---- Roller ----
    drawWheel(backWX, wheelY, wheelAng);
    drawWheel(frontWX, wheelY, wheelAng);

    // Trittbrett
    ctx.fillStyle = deckCol;
    roundRect(cx - 8, deckY, 16, 4, 2); ctx.fill();

    // Lenkstange + Lenker (auf der Fahrtrichtungsseite)
    ctx.strokeStyle = deckCol; ctx.lineWidth = 3; ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(frontWX, deckY + 1);
    ctx.lineTo(frontWX, y + 6 + bob);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(frontWX - 4, y + 6 + bob);
    ctx.lineTo(frontWX + 4, y + 6 + bob);
    ctx.stroke();

    // ---- Fahrer (Element-Figur) auf dem Trittbrett ----
    const bx = cx - dir * 1;
    const bw = 15, bTop = y + 2 + bob, bBot = deckY;
    const bh = bBot - bTop;
    ctx.shadowColor = glow; ctx.shadowBlur = 14;
    ctx.fillStyle = body;
    roundRect(bx - bw / 2, bTop, bw, bh, 7); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = dark;
    roundRect(bx - bw / 2, bTop + bh * 0.62, bw, bh * 0.38, 7); ctx.fill();
    ctx.fillStyle = body;
    roundRect(bx - bw / 2, bTop, bw, bh * 0.66, 7); ctx.fill();

    // Arm zum Lenker
    ctx.strokeStyle = dark; ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(bx + dir * 3, bTop + 9);
    ctx.lineTo(frontWX, y + 7 + bob);
    ctx.stroke();
    ctx.lineWidth = 1;

    // Element-Krone
    if (isLumen) {
      ctx.fillStyle = "#ffd24d";
      for (let i = 0; i < 3; i++) {
        const fx = bx - 6 + i * 6;
        const fh = 7 + Math.sin(time * 9 + i) * 3;
        ctx.beginPath();
        ctx.moveTo(fx, bTop);
        ctx.quadraticCurveTo(fx + 3, bTop - fh, fx + 6, bTop);
        ctx.closePath(); ctx.fill();
      }
    } else {
      ctx.fillStyle = "#bfeaff";
      const dxx = bx + Math.sin(time * 3) * 2;
      ctx.beginPath();
      ctx.moveTo(dxx, bTop - 7);
      ctx.quadraticCurveTo(dxx + 5, bTop + 1, dxx, bTop + 3);
      ctx.quadraticCurveTo(dxx - 5, bTop + 1, dxx, bTop - 7);
      ctx.closePath(); ctx.fill();
    }

    // Augen
    ctx.fillStyle = "#fff";
    const eo = dir * 1.5, eyeY = bTop + 10;
    ctx.beginPath();
    ctx.arc(bx - 3 + eo, eyeY, 3.3, 0, Math.PI * 2);
    ctx.arc(bx + 3 + eo, eyeY, 3.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#1a1f33";
    ctx.beginPath();
    ctx.arc(bx - 3 + eo + dir, eyeY, 1.7, 0, Math.PI * 2);
    ctx.arc(bx + 3 + eo + dir, eyeY, 1.7, 0, Math.PI * 2);
    ctx.fill();

    // "Geschafft"-Häkchen
    if (pl.atExit) {
      ctx.fillStyle = "#7CFFB0";
      ctx.font = "bold 14px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("✓", cx, y - 8 + bob);
    }
    ctx.restore();
  }

  function drawParticles() {
    for (const p of particles) {
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // ============================================================
  //  HELPERS
  // ============================================================
  function aabb(ax, ay, aw, ah, bx, by, bw, bh) {
    return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
  }
  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
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
  function hexA(hex, a) {
    const n = parseInt(hex.slice(1), 16);
    const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    return `rgba(${r},${g},${b},${a})`;
  }

  function updateGemHud() {
    const total = gems.length;
    const got = gems.filter((g) => g.got).length;
    document.getElementById("gemLabel").textContent = `💎 ${got} / ${total}`;
  }

  // ============================================================
  //  OVERLAYS / FLOW
  // ============================================================
  const overlay = document.getElementById("overlay");
  const overlayCard = document.getElementById("overlayCard");

  function showOverlay(html) {
    overlayCard.innerHTML = html;
    overlay.classList.remove("hidden");
    const btn = overlayCard.querySelector(".btn");
    if (btn) btn.onclick = () => {
      if (state === "start") startGame();
      else if (state === "levelcomplete") nextLevel();
      else if (state === "win") { levelIndex = 0; startGame(); }
    };
  }
  function hideOverlay() { overlay.classList.add("hidden"); }

  function showStart() {
    state = "start";
    showOverlay(`
      <h1>Change&nbsp;Together</h1>
      <p>Ein Koop-Abenteuer für <b>zwei Spieler an einer Tastatur</b>.
         <b>Lumen</b> und <b>Aqua</b> flitzen auf ihren <b>Rollern 🛴</b>
         gemeinsam durch vier Biome – nur im Team erreicht ihr beide Türen.</p>
      <div class="legend">
        <div class="row"><span class="swatch" style="background:#ff7a3c"></span> 🔥 Lumen — <kbd>A</kbd><kbd>D</kbd><kbd>W</kbd></div>
        <div class="row"><span class="swatch" style="background:#36b8ff"></span> 💧 Aqua — <kbd>◀</kbd><kbd>▶</kbd><kbd>▲</kbd></div>
        <div class="row"><span class="swatch" style="background:#2f93e0"></span> Wasser tötet Lumen</div>
        <div class="row"><span class="swatch" style="background:#ff7a1c"></span> Feuer tötet Aqua</div>
        <div class="row"><span class="swatch" style="background:#5fbf2e"></span> Säure tötet beide</div>
        <div class="row"><span class="swatch" style="background:#ffb84d"></span> Platte öffnet Tor</div>
      </div>
      <p>Sammelt unterwegs eure farbigen Edelsteine ein. Stirbt einer,
         startet das Level neu (<kbd>R</kbd>).</p>
      <button class="btn">Spiel starten ▶</button>
    `);
  }

  function showLevelComplete() {
    const got = gems.filter((g) => g.got).length;
    const total = gems.length;
    const last = levelIndex === LEVELS.length - 1;
    if (last) { showWin(); return; }
    setTimeout(() => {
      showOverlay(`
        <div class="big">🎉</div>
        <h2>${level.name} geschafft!</h2>
        <p>Edelsteine: <b>${got} / ${total}</b></p>
        <p>Weiter geht's ins nächste Biom.</p>
        <button class="btn">Nächstes Level ▶</button>
      `);
    }, 600);
  }

  function showWin() {
    state = "win";
    setTimeout(() => {
      showOverlay(`
        <div class="big">🏆</div>
        <h1>Gemeinsam geschafft!</h1>
        <p>Lumen und Aqua haben alle vier Biome durchquert.
           Echtes Teamwork!</p>
        <button class="btn">Nochmal spielen ↺</button>
      `);
    }, 600);
  }

  function startGame() {
    hideOverlay();
    loadLevel(levelIndex);
    state = "play";
  }

  function nextLevel() {
    levelIndex = Math.min(levelIndex + 1, LEVELS.length - 1);
    hideOverlay();
    loadLevel(levelIndex);
    state = "play";
  }

  // ============================================================
  //  MAIN LOOP
  // ============================================================
  let lastT = performance.now();
  function loop(now) {
    const dt = Math.min((now - lastT) / 1000, 0.05);
    lastT = now;
    time = now / 1000;
    update(dt);
    render();
    requestAnimationFrame(loop);
  }

  // Vorab ein Level laden, damit der Hintergrund schon hübsch ist
  loadLevel(0);
  showStart();
  requestAnimationFrame(loop);
})();
