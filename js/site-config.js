/* ============================================================
   air up Store — Zentrale Konfiguration
   ------------------------------------------------------------
   HIER trägst du dein Business ein. Diese Daten erscheinen
   dezent oben in der Leiste und im Footer ("erstellt von …").
   Einfach die Werte zwischen den Anführungszeichen ändern.
   ============================================================ */

const SITE = {
  business: {
    name: "Dein Studio",                       // ← dein Business-/Künstlername
    tagline: "Moderne Websites & Online-Shops", // ← kurzer Slogan
    email: "hallo@deinstudio.de",              // ← deine Kontakt-E-Mail
    phone: "",                                  // ← optional, z. B. "+49 123 456789"
    website: "#",                               // ← optional, z. B. "https://deinstudio.de"
  },

  /* ----------------------------------------------------------
     Foto-Quellen (echte Bilder).
     Werden über einem Farbverlauf angezeigt – lädt ein Bild
     nicht, bleibt der Verlauf sichtbar (sieht trotzdem gut aus).
     Zum Tauschen einfach eine andere Bild-URL einsetzen.
     ---------------------------------------------------------- */
  photos: {
    hero:      "https://images.unsplash.com/photo-1523362628745-0c100150b504?auto=format&fit=crop&w=1600&q=80",
    fruits:    "https://images.unsplash.com/photo-1490474418585-ba9bad8fd0ea?auto=format&fit=crop&w=1600&q=80",
    lifestyle: "https://images.unsplash.com/photo-1522770179533-24471fcdba45?auto=format&fit=crop&w=1600&q=80",
    water:     "https://images.unsplash.com/photo-1502740479091-635887520276?auto=format&fit=crop&w=1600&q=80",
    pour:      "https://images.unsplash.com/photo-1548839140-29a749e1cf4d?auto=format&fit=crop&w=1600&q=80",
  },
};
