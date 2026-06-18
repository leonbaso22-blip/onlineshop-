# KI-Design-Tools immer & überall nutzen

Du nutzt zwei Tools, die du in **jedem** Projekt haben willst:

1. **ui-ux-pro-max** – ein Claude-Skill (Design-Wissensdatenbank: Styles, Farben, Typografie, UX-Regeln). Funktioniert offline, kein Key nötig.
2. **Magic MCP** (`@21st-dev/magic`) – generiert UI-Komponenten. Braucht API-Key + Internetzugriff auf `21st.dev`.

> 🔒 **Sicherheit:** Der API-Key gehört **nie** ins Git. Immer als Umgebungsvariable `MAGIC_API_KEY` (z. B. in `.env` oder als Projekt-Secret).

---

## A) Auf deinem eigenen PC (lokal) – wirklich global

Einmal einrichten, gilt dann für **alle** lokalen Projekte:

```bash
# 1) Skill global installieren
mkdir -p ~/.claude/skills
git clone --depth 1 https://github.com/nextlevelbuilder/ui-ux-pro-max-skill.git /tmp/uupm
cp -rL /tmp/uupm/.claude/skills/ui-ux-pro-max ~/.claude/skills/ui-ux-pro-max

# 2) Magic MCP global registrieren (Key durch deinen NEUEN ersetzen)
claude mcp add magic --scope user --env API_KEY="DEIN_NEUER_KEY" -- npx -y @21st-dev/magic@latest
```

Fertig – beide Tools stehen in jedem Projekt auf deinem Rechner zur Verfügung.

---

## B) In der Cloud (Claude Code on the web)

Hier ist jede Session frisch. Zwei Wege:

**Pro Projekt (einfachster Weg):** Im Projektordner einmal ausführen:

```bash
bash setup-ai-tools.sh
```

Das legt den Skill unter `.claude/skills/` und die `.mcp.json` an – beim Commit
reisen sie mit dem Repo und laden in jeder weiteren Session automatisch.

**Für alle Cloud-Projekte global:** In den **Umgebungseinstellungen** deiner
Claude-Code-Umgebung hinterlegen:
- `MAGIC_API_KEY` als Umgebungs-Secret
- `21st.dev` zur **Netzwerk-Freigabe (Allowlist)** hinzufügen
- optional ein **Setup-Skript**, das `setup-ai-tools.sh` ausführt

Doku: <https://code.claude.com/docs/en/claude-code-on-the-web>

---

## Damit Magic wirklich läuft (Checkliste)

- [ ] Neuen API-Key bei 21st.dev erzeugt (alten widerrufen)
- [ ] `MAGIC_API_KEY` gesetzt (`.env` oder Secret)
- [ ] `21st.dev` im Netzwerk freigegeben (nur Cloud/Web)
- [ ] Session neu gestartet

> Hinweis: Magic erzeugt **React/Tailwind**-Komponenten. Für reine HTML/CSS/JS-
> Projekte (wie diesen Shop) müssen die Ausgaben angepasst werden.
