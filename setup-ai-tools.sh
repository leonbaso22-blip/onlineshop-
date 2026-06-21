#!/usr/bin/env bash
#
# setup-ai-tools.sh
#
# Bootstraps the developer/AI tooling for the air up Store demo shop.
#
# The shipped site stays exactly as the README promises — pure HTML/CSS/JS,
# no build step, no runtime dependencies. Everything installed here lives in
# devDependencies and is only used for linting, formatting and serving the
# site locally (e.g. when Claude Code or a contributor works on the project).
#
# The script is idempotent: existing config files are never overwritten, so
# you can safely re-run it.
#
# Usage:
#   bash setup-ai-tools.sh            # full setup (config + npm install)
#   bash setup-ai-tools.sh --no-install   # only create config files
#
set -euo pipefail

# --- pretty output -----------------------------------------------------------
if [ -t 1 ]; then
  BOLD=$'\033[1m'; GREEN=$'\033[32m'; YELLOW=$'\033[33m'; BLUE=$'\033[34m'; RED=$'\033[31m'; RESET=$'\033[0m'
else
  BOLD=""; GREEN=""; YELLOW=""; BLUE=""; RED=""; RESET=""
fi

info()  { printf '%s\n' "${BLUE}›${RESET} $*"; }
ok()    { printf '%s\n' "${GREEN}✓${RESET} $*"; }
warn()  { printf '%s\n' "${YELLOW}!${RESET} $*"; }
err()   { printf '%s\n' "${RED}✗${RESET} $*" >&2; }

# Resolve to the script's directory so it works from anywhere.
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

DO_INSTALL=1
for arg in "$@"; do
  case "$arg" in
    --no-install) DO_INSTALL=0 ;;
    -h|--help)
      grep -E '^#( |$)' "$0" | sed -E 's/^# ?//'
      exit 0 ;;
    *) warn "Unknown argument: $arg" ;;
  esac
done

printf '\n%s\n\n' "${BOLD}🛠  air up Store — AI / dev tooling setup${RESET}"

# --- prerequisite checks -----------------------------------------------------
info "Checking prerequisites…"

if command -v node >/dev/null 2>&1; then
  ok "node $(node --version)"
else
  err "Node.js is required but was not found. Install Node 18+ and re-run."
  exit 1
fi

if command -v npm >/dev/null 2>&1; then
  ok "npm $(npm --version)"
else
  err "npm is required but was not found."
  exit 1
fi

if command -v python3 >/dev/null 2>&1; then
  ok "python3 $(python3 --version 2>&1 | awk '{print $2}') (optional, used for the dev server fallback)"
else
  warn "python3 not found — the 'npm run serve' fallback will be unavailable."
fi

# --- helper: create a file only if it does not already exist -----------------
write_if_absent() {
  # $1 = path, stdin = contents
  local path="$1"
  if [ -e "$path" ]; then
    warn "$path already exists — leaving it untouched."
    cat >/dev/null   # drain stdin
  else
    cat > "$path"
    ok "Created $path"
  fi
}

# --- package.json ------------------------------------------------------------
info "Setting up project metadata and scripts…"

write_if_absent package.json <<'JSON'
{
  "name": "air-up-store",
  "version": "1.0.0",
  "private": true,
  "description": "Apple-inspired demo online shop — pure HTML/CSS/JS, no build step.",
  "scripts": {
    "serve": "http-server . -p 8000 -c-1 -o || python3 -m http.server 8000",
    "format": "prettier --write \"**/*.{html,css,js,json,md}\"",
    "format:check": "prettier --check \"**/*.{html,css,js,json,md}\"",
    "lint:js": "eslint \"js/**/*.js\"",
    "lint:css": "stylelint \"css/**/*.css\"",
    "lint:html": "html-validate \"*.html\"",
    "lint": "npm run lint:js && npm run lint:css && npm run lint:html",
    "check": "npm run format:check && npm run lint"
  },
  "devDependencies": {
    "eslint": "^9.0.0",
    "html-validate": "^9.0.0",
    "http-server": "^14.1.1",
    "prettier": "^3.0.0",
    "stylelint": "^16.0.0",
    "stylelint-config-standard": "^36.0.0"
  }
}
JSON

# --- tool configs ------------------------------------------------------------
info "Writing tool configuration (only where missing)…"

write_if_absent .prettierrc.json <<'JSON'
{
  "printWidth": 100,
  "singleQuote": false,
  "semi": true,
  "tabWidth": 2
}
JSON

write_if_absent .prettierignore <<'TXT'
node_modules
package-lock.json
TXT

# ESLint flat config. The site is plain browser scripts (no modules, no build),
# so each js/ file shares one global scope. The globals below reflect that:
# standard browser APIs plus the few cross-file globals the project defines
# (PRODUCTS + CATEGORIES in products.js, renderArt exposed from illustrations.js).
write_if_absent eslint.config.js <<'JS'
"use strict";

module.exports = [
  {
    files: ["js/**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "script",
      globals: {
        // Browser environment
        window: "readonly",
        document: "readonly",
        localStorage: "readonly",
        console: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
        requestAnimationFrame: "readonly",
        cancelAnimationFrame: "readonly",
        IntersectionObserver: "readonly",
        MutationObserver: "readonly",
        fetch: "readonly",
        navigator: "readonly",
        location: "readonly",
        // Cross-file project globals
        PRODUCTS: "readonly",
        CATEGORIES: "readonly",
        renderArt: "readonly",
      },
    },
    rules: {
      // Data/dispatcher globals are defined in one file and used in another,
      // which per-file analysis cannot see — don't flag their definitions.
      "no-unused-vars": ["warn", { varsIgnorePattern: "^(PRODUCTS|CATEGORIES|renderArt)$" }],
      "no-undef": "error",
      "prefer-const": "warn",
      eqeqeq: ["warn", "smart"],
    },
  },
];
JS

# Stylelint: keep the error-catching rules from the standard config, but relax
# the purely stylistic ones that conflict with the project's own conventions
# (BEM class names like .footer__cols, compact single-line rules, intentional
# vendor prefixes). Formatting is Prettier's job, not the linter's.
write_if_absent .stylelintrc.json <<'JSON'
{
  "extends": "stylelint-config-standard",
  "rules": {
    "selector-class-pattern": null,
    "keyframes-name-pattern": null,
    "declaration-block-single-line-max-declarations": null,
    "rule-empty-line-before": null,
    "at-rule-empty-line-before": null,
    "declaration-empty-line-before": null,
    "custom-property-empty-line-before": null,
    "comment-empty-line-before": null,
    "color-function-notation": null,
    "alpha-value-notation": null,
    "media-feature-range-notation": null,
    "property-no-vendor-prefix": null,
    "value-no-vendor-prefix": null,
    "no-descending-specificity": null
  }
}
JSON

write_if_absent .htmlvalidate.json <<'JSON'
{
  "extends": ["html-validate:recommended"],
  "rules": {
    "void-style": "off",
    "no-trailing-whitespace": "off"
  }
}
JSON

# Keep node_modules out of git.
if [ -f .gitignore ]; then
  if ! grep -qxF "node_modules" .gitignore; then
    printf '\n# AI / dev tooling\nnode_modules\n' >> .gitignore
    ok "Appended node_modules to .gitignore"
  else
    warn ".gitignore already ignores node_modules — leaving it untouched."
  fi
else
  write_if_absent .gitignore <<'TXT'
# AI / dev tooling
node_modules
TXT
fi

# --- install dependencies ----------------------------------------------------
if [ "$DO_INSTALL" -eq 1 ]; then
  info "Installing devDependencies with npm (this needs network access)…"
  attempt=1
  max=4
  delay=2
  until npm install; do
    if [ "$attempt" -ge "$max" ]; then
      warn "npm install failed after ${max} attempts."
      warn "Config files are in place — re-run 'bash setup-ai-tools.sh' once you have network access,"
      warn "or run 'npm install' manually."
      break
    fi
    warn "npm install failed (attempt ${attempt}/${max}); retrying in ${delay}s…"
    sleep "$delay"
    attempt=$((attempt + 1))
    delay=$((delay * 2))
  done
  if [ -d node_modules ]; then
    ok "Dependencies installed."
  fi
else
  info "Skipping npm install (--no-install)."
fi

# --- done --------------------------------------------------------------------
printf '\n%s\n' "${BOLD}${GREEN}Setup complete.${RESET}"
cat <<EOF

Available commands:
  ${BOLD}npm run serve${RESET}         Serve the shop at http://localhost:8000
  ${BOLD}npm run format${RESET}        Auto-format HTML/CSS/JS/JSON/Markdown with Prettier
  ${BOLD}npm run lint${RESET}          Lint JS (ESLint), CSS (Stylelint) and HTML (html-validate)
  ${BOLD}npm run check${RESET}         Format-check + lint (good for CI / pre-commit)

The shipped site stays dependency-free — these tools only run during development.
EOF
