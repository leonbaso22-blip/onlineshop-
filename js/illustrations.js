/* ============================================================
   air up Store — SVG-Illustrationen ("Produktbilder")
   ------------------------------------------------------------
   Alle Produktvisuals sind handgebaute, gestochen scharfe
   SVG-Vektorgrafiken. Keine externen Bilder, kein Build-Schritt,
   funktioniert komplett offline.

   Öffentliche API:
     ILLU.bottle({ body, cap, pod, metallic })
     ILLU.pods({ color })
     ILLU.set({ body, cap, pod, metallic })
     ILLU.strap({ color })
     ILLU.brush()
     ILLU.lid({ cap, pod })
     renderArt(art)   // Dispatcher anhand product.art
   ============================================================ */

(function (global) {
  "use strict";

  // Eindeutige IDs, damit inline-SVG-Gradienten sich nicht überschreiben
  let _uid = 0;
  const uid = () => "a" + ++_uid;
  const strip = (svg) =>
    svg.replace(/^\s*<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "");

  /* ---------- Flasche ---------- */
  function bottle({ body = "#5ec8c8", cap = "#2b2f36", pod = "#ff7a59", metallic = false } = {}) {
    const id = uid();
    const bodyFill = metallic ? `url(#steel${id})` : body;
    return `<svg viewBox="0 0 200 460" class="illu illu--bottle" role="img" aria-label="air up Trinkflasche">
  <defs>
    <linearGradient id="sheen${id}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#000" stop-opacity=".14"/>
      <stop offset=".15" stop-color="#fff" stop-opacity=".55"/>
      <stop offset=".34" stop-color="#fff" stop-opacity="0"/>
      <stop offset=".72" stop-color="#fff" stop-opacity="0"/>
      <stop offset="1" stop-color="#000" stop-opacity=".20"/>
    </linearGradient>
    ${metallic ? `<linearGradient id="steel${id}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#97a1ab"/><stop offset=".22" stop-color="#eef2f6"/>
      <stop offset=".5" stop-color="#b2bbc4"/><stop offset=".78" stop-color="#e0e6eb"/>
      <stop offset="1" stop-color="#7f8a94"/></linearGradient>` : ""}
  </defs>
  <ellipse cx="100" cy="448" rx="52" ry="9" fill="rgba(0,0,0,.10)"/>
  <!-- Korpus -->
  <rect x="48" y="104" width="104" height="338" rx="40" fill="${bodyFill}"/>
  <rect x="48" y="104" width="104" height="338" rx="40" fill="url(#sheen${id})"/>
  <rect x="64" y="128" width="12" height="290" rx="6" fill="#fff" opacity=".5"/>
  <!-- Label-Band -->
  <rect x="48" y="266" width="104" height="56" fill="#fff" opacity=".15"/>
  <text x="100" y="300" text-anchor="middle" font-family="inherit" font-weight="700" font-size="15" letter-spacing=".5" fill="#fff" opacity=".9">air up</text>
  <!-- Deckel / Kragen -->
  <rect x="70" y="62" width="60" height="56" rx="14" fill="${cap}"/>
  <rect x="70" y="62" width="60" height="56" rx="14" fill="#fff" opacity=".06"/>
  <!-- Trinktülle -->
  <rect x="88" y="30" width="24" height="34" rx="8" fill="${cap}"/>
  <rect x="93" y="22" width="14" height="14" rx="5" fill="${cap}"/>
  <!-- Pod-Ring (Geschmack) -->
  <ellipse cx="100" cy="76" rx="44" ry="15" fill="${pod}"/>
  <ellipse cx="100" cy="72" rx="24" ry="8.5" fill="${cap}"/>
  <ellipse cx="84" cy="71" rx="12" ry="3.6" fill="#fff" opacity=".4"/>
</svg>`;
  }

  /* ---------- Pods (3er-Pack Ringe) ---------- */
  function pods({ color = "#ff9f1c" } = {}) {
    const ring = (cx, cy, r) => `
    <g>
      <ellipse cx="${cx}" cy="${cy + r * 0.92}" rx="${r * 0.92}" ry="${r * 0.22}" fill="rgba(0,0,0,.06)"/>
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="${color}"/>
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#000" stroke-opacity=".08" stroke-width="1.5"/>
      <circle cx="${cx}" cy="${cy}" r="${r * 0.4}" fill="#fff"/>
      <circle cx="${cx}" cy="${cy}" r="${r * 0.4}" fill="none" stroke="${color}" stroke-opacity=".25" stroke-width="2"/>
      <path d="M ${cx - r * 0.72} ${cy - r * 0.28} A ${r} ${r} 0 0 1 ${cx + r * 0.18} ${cy - r * 0.82}"
            fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="${r * 0.17}" stroke-linecap="round"/>
    </g>`;
    return `<svg viewBox="0 0 200 200" class="illu illu--pods" role="img" aria-label="air up Geschmacks-Pods">
  <ellipse cx="100" cy="178" rx="68" ry="11" fill="rgba(0,0,0,.08)"/>
  ${ring(60, 116, 40)}
  ${ring(140, 116, 40)}
  ${ring(100, 88, 46)}
</svg>`;
  }

  /* ---------- Starter-Set (Flasche + Pods) ---------- */
  function set(opts = {}) {
    const b = strip(bottle(opts));
    const pod = opts.pod || "#ff7a59";
    const miniPod = (cx, cy, r) => `
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="${pod}"/>
      <circle cx="${cx}" cy="${cy}" r="${r * 0.4}" fill="#fff"/>
      <path d="M ${cx - r * 0.7} ${cy - r * 0.3} A ${r} ${r} 0 0 1 ${cx + r * 0.15} ${cy - r * 0.8}"
            fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="${r * 0.18}" stroke-linecap="round"/>`;
    return `<svg viewBox="0 0 280 260" class="illu illu--set" role="img" aria-label="air up Starter-Set">
  <g transform="translate(96 -4) scale(.52)">${b}</g>
  <ellipse cx="68" cy="214" rx="58" ry="10" fill="rgba(0,0,0,.07)"/>
  ${miniPod(44, 196, 26)}
  ${miniPod(92, 196, 26)}
  ${miniPod(68, 168, 30)}
</svg>`;
  }

  /* ---------- Zubehör: Trageband ---------- */
  function strap({ color = "#00b8a9" } = {}) {
    return `<svg viewBox="0 0 200 200" class="illu illu--strap" role="img" aria-label="air up Trageband">
  <ellipse cx="100" cy="182" rx="48" ry="8" fill="rgba(0,0,0,.08)"/>
  <path d="M70 44 C40 70 40 150 70 176 M130 44 C160 70 160 150 130 176"
        fill="none" stroke="${color}" stroke-width="16" stroke-linecap="round"/>
  <rect x="78" y="150" width="44" height="30" rx="10" fill="${color}"/>
  <rect x="80" y="36" width="40" height="26" rx="9" fill="#3a4048"/>
  <rect x="88" y="22" width="24" height="22" rx="7" fill="#3a4048"/>
  <circle cx="100" cy="33" r="5" fill="#aeb6bf"/>
  <path d="M82 60 q18 -10 36 0" fill="none" stroke="#fff" stroke-opacity=".4" stroke-width="4" stroke-linecap="round"/>
</svg>`;
  }

  /* ---------- Zubehör: Reinigungsbürste ---------- */
  function brush() {
    return `<svg viewBox="0 0 200 200" class="illu illu--brush" role="img" aria-label="air up Reinigungsbürste">
  <ellipse cx="100" cy="184" rx="40" ry="7" fill="rgba(0,0,0,.08)"/>
  <rect x="92" y="96" width="16" height="86" rx="8" fill="#00b8a9"/>
  <rect x="80" y="170" width="40" height="14" rx="7" fill="#009b8e"/>
  <g stroke="#cfd6dd" stroke-width="4" stroke-linecap="round">
    ${Array.from({ length: 9 }, (_, i) => {
      const y = 24 + i * 8;
      return `<line x1="100" y1="${y}" x2="74" y2="${y - 5}"/><line x1="100" y1="${y}" x2="126" y2="${y - 5}"/>`;
    }).join("")}
  </g>
  <rect x="96" y="20" width="8" height="80" rx="4" fill="#8a939d"/>
</svg>`;
  }

  /* ---------- Zubehör: Ersatzdeckel ---------- */
  function lid({ cap = "#3a4048", pod = "#00b8a9" } = {}) {
    return `<svg viewBox="0 0 200 200" class="illu illu--lid" role="img" aria-label="air up Ersatzdeckel">
  <ellipse cx="100" cy="170" rx="50" ry="9" fill="rgba(0,0,0,.08)"/>
  <rect x="58" y="92" width="84" height="66" rx="20" fill="${cap}"/>
  <rect x="58" y="92" width="84" height="66" rx="20" fill="#fff" opacity=".06"/>
  <ellipse cx="100" cy="92" rx="42" ry="12" fill="${pod}"/>
  <ellipse cx="100" cy="89" rx="22" ry="7" fill="${cap}"/>
  <rect x="86" y="50" width="28" height="40" rx="9" fill="${cap}"/>
  <rect x="92" y="40" width="16" height="16" rx="6" fill="${cap}"/>
  <ellipse cx="84" cy="88" rx="11" ry="3.4" fill="#fff" opacity=".4"/>
</svg>`;
  }

  const ILLU = { bottle, pods, set, strap, brush, lid };

  /* ---------- Dispatcher ---------- */
  function renderArt(art) {
    if (!art || !ILLU[art.type]) return "";
    return ILLU[art.type](art);
  }

  global.ILLU = ILLU;
  global.renderArt = renderArt;
})(window);
