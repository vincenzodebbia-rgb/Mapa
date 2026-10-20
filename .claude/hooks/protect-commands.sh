#!/bin/bash
# PreToolUse (Bash): blocca i comandi Supabase che toccano progetti, credenziali o il database remoto.
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

# "supabase" seguito (anche dopo flag come --debug) da un sottocomando vietato.
SUB='(db[[:space:]]+(push|reset)|link|login|projects|secrets|orgs)'
if printf '%s' "$FLAT" | grep -Eq "supabase([[:space:]]+[^[:space:]]+)*[[:space:]]+${SUB}([[:space:];&|)]|$)"; then
  block "supabase db push/reset, link, login, projects, secrets and orgs are run only by the founder from the terminal."
fi

exit 0
