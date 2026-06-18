#!/usr/bin/env bash
# ============================================================
#  KI-Design-Tools in EIN Projekt installieren
#  ------------------------------------------------------------
#  Installiert in das AKTUELLE Projekt:
#    1) ui-ux-pro-max  – Claude-Skill (Design-Wissensdatenbank)
#    2) Magic MCP       – @21st-dev/magic (.mcp.json)
#
#  Benutzung (im Wurzelordner des Projekts ausführen):
#    bash setup-ai-tools.sh
#
#  Voraussetzungen: git, node/npm
# ============================================================
set -euo pipefail

SKILL_REPO="https://github.com/nextlevelbuilder/ui-ux-pro-max-skill.git"

echo "→ 1/3  ui-ux-pro-max Skill installieren …"
mkdir -p .claude/skills
tmp="$(mktemp -d)"
git clone --depth 1 "$SKILL_REPO" "$tmp/skill" >/dev/null 2>&1
rm -rf .claude/skills/ui-ux-pro-max
cp -rL "$tmp/skill/.claude/skills/ui-ux-pro-max" .claude/skills/ui-ux-pro-max
cp "$tmp/skill/LICENSE" .claude/skills/ui-ux-pro-max/LICENSE 2>/dev/null || true
rm -rf "$tmp"

echo "→ 2/3  Magic MCP (.mcp.json) anlegen …"
cat > .mcp.json <<'JSON'
{
  "mcpServers": {
    "magic": {
      "command": "npx",
      "args": ["-y", "@21st-dev/magic@latest"],
      "env": { "API_KEY": "${MAGIC_API_KEY}" }
    }
  }
}
JSON

echo "→ 3/3  .gitignore absichern (Key bleibt draußen) …"
touch .gitignore
for line in ".env" ".env.local" "__pycache__/" "*.pyc" "node_modules/"; do
  grep -qxF "$line" .gitignore 2>/dev/null || echo "$line" >> .gitignore
done

cat <<'DONE'

✅ Fertig! In diesem Projekt sind jetzt beide Tools eingerichtet.

Noch nötig, damit Magic wirklich Komponenten erzeugt:
  • MAGIC_API_KEY setzen (in .env oder als Projekt-Secret)
  • In der Cloud (Web): 21st.dev zur Netzwerk-Freigabe (Allowlist) hinzufügen
  • Danach die Claude-Session neu starten

Der UI/UX-Skill funktioniert sofort (offline, kein Key nötig).
DONE
