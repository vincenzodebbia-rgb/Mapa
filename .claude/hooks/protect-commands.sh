#!/bin/bash
# PreToolUse (Bash): blocca i comandi Supabase che toccano progetti, credenziali o il database remoto,
# e ogni comando che nomina un file .env* (tranne .env.example): cat, type, Get-Content, grep, cp, node -e…
# Il fondatore lavora in modalità automatica: questo hook è una delle protezioni, non un promemoria.
# Il push delle migrazioni su mapa-dev lo lancia solo il fondatore dal suo terminale.
# Restano permessi: migration new, gen types (npm run db:types), db query --linked (test su mapa-dev).
# Fail-closed: se l'input non si può controllare (niente jq, input illeggibile), il comando è bloccato.
# Limite noto: non vede dentro script lanciati da file (bash script.sh); quelli li controlla la revisione.
block() { echo "Blocked: $1" >&2; exit 2; }

command -v jq >/dev/null 2>&1 \
  || block "jq is not installed, so protect-commands.sh cannot check this command. Install it (winget install jqlang.jq) and restart Claude."
INPUT=$(cat)
[ -n "$INPUT" ] || block "empty hook input, so protect-commands.sh cannot check this command."
CMD=$(printf '%s' "$INPUT" | jq -r '.tool_input.command // empty' 2>/dev/null) \
  || block "hook input is not valid JSON, so protect-commands.sh cannot check this command."
CMD="${CMD//$'\r'/}"   # jq su Windows può stampare CRLF
[ -n "$CMD" ] || block "no tool_input.command in the hook input, so protect-commands.sh cannot check this command."

# Una riga sola e minuscole: così "timeout 60 npx Supabase  db  push" o un comando su più righe non sfuggono.
FLAT=$(printf '%s' "$CMD" | tr '\n\t' '  ' | tr '[:upper:]' '[:lower:]')

# Ovunque nel comando, con o senza "supabase" davanti.
for needle in '--project-ref' '--db-url' 'api.supabase.com' 'supabase/.temp' 'supabase\.temp'; do
  case "$FLAT" in
    *"$needle"*) block "the command contains '$needle'. Supabase projects and credentials are the founder's: ask the human." ;;
  esac
done

# File di segreti: qualunque comando che nomina un file .env* è bloccato, qualunque sia il programma che lo legge
# (cat, type, Get-Content, more, less, head, tail, grep, sed, cp, node -e, dotenv…). Così non serve elencare i lettori.
# Si toglie prima .env.example (si può leggere); "process.env" non conta, perché il punto segue una lettera.
# Anche i glob come ".env*" o ".env.*" contano come riferimento. Limite noto: un nome costruito a pezzi
# (".e""nv", variabili) non si vede; per questo restano anche il deny Read(.env*) e la revisione.
SECRETS=$(printf '%s' "$FLAT" | sed -E 's/\.env\.example([^a-z0-9_.*?-]|$)/\1/g')
if printf '%s' "$SECRETS" | grep -Eq '(^|[^a-z0-9_])\.env([^a-z0-9_]|$)'; then
  block "the command names a .env* file (only .env.example may be read). Secrets are the founder's: ask the human."
fi
if printf '%s' "$FLAT" | grep -Eq '(^|[^a-z0-9_])dotenv([^a-z0-9_]|$)'; then
  block "the command loads dotenv, which reads .env files. Secrets are the founder's: ask the human."
fi

# "supabase" seguito (anche dopo flag come --debug) da un sottocomando vietato.
SUB='(db[[:space:]]+(push|reset)|link|login|projects|secrets|orgs)'
if printf '%s' "$FLAT" | grep -Eq "supabase([[:space:]]+[^[:space:]]+)*[[:space:]]+${SUB}([[:space:];&|)]|$)"; then
  block "supabase db push/reset, link, login, projects, secrets and orgs are run only by the founder from the terminal."
fi

exit 0
