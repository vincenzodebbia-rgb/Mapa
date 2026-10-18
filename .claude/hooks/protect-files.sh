#!/bin/bash
# PreToolUse (Edit|Write): blocks edits to secrets, to the Supabase CLI link state (supabase/.temp)
# and to migrations already merged into main.
# Fails closed: if the input cannot be checked (no jq, unreadable input), the edit is blocked.
block() { echo "Blocked: $1" >&2; exit 2; }

command -v jq >/dev/null 2>&1 \
  || block "jq is not installed, so protect-files.sh cannot check this edit. Install it (winget install jqlang.jq) and restart Claude."
INPUT=$(cat)
[ -n "$INPUT" ] || block "empty hook input, so protect-files.sh cannot check this edit."
FILE_PATH=$(printf '%s' "$INPUT" | jq -r '.tool_input.file_path // empty' 2>/dev/null) \
  || block "hook input is not valid JSON, so protect-files.sh cannot check this edit."
FILE_PATH="${FILE_PATH//$'\r'/}"   # jq on Windows may print CRLF
[ -n "$FILE_PATH" ] || block "no tool_input.file_path in the hook input, so protect-files.sh cannot check this edit."
# Stessa grafia per i due percorsi su Windows: "C:\x", "c:/x" e "/c/x" diventano tutti "C:/x".
# Altrimenti REL resterebbe assoluto e ogni regola qui sotto mancherebbe il bersaglio in silenzio.
normalize() {
  local p="${1//\\//}"
  if [[ $p =~ ^/([a-zA-Z])/(.*)$ ]]; then p="${BASH_REMATCH[1]}:/${BASH_REMATCH[2]}"; fi
  if [[ $p =~ ^([a-zA-Z]):(.*)$ ]]; then p="${BASH_REMATCH[1]^^}:${BASH_REMATCH[2]}"; fi
  printf '%s' "$p"
}
FILE_PATH=$(normalize "$FILE_PATH")
ROOT=$(normalize "${CLAUDE_PROJECT_DIR:-$(pwd)}")
REL="${FILE_PATH#"$ROOT"/}"
case "$FILE_PATH" in
  */supabase/.temp|*/supabase/.temp/*)
    block "$REL is the Supabase CLI link state (which project is linked). Only the founder changes it." ;;
esac
case "$REL" in
  .env.example) ;;
  .env|.env.*|*/.env|*/.env.*)
    block "$REL is a secrets file. Ask the human." ;;
  supabase/.temp|supabase/.temp/*)
    block "$REL is the Supabase CLI link state (which project is linked). Only the founder changes it." ;;
  supabase/migrations/*)
    BASE=$(git -C "$ROOT" rev-parse --verify -q origin/main >/dev/null && echo origin/main || echo main)
    if git -C "$ROOT" cat-file -e "$BASE:$REL" 2>/dev/null; then
      block "$REL is already merged into $BASE. Create a new migration: supabase migration new <name>."
    fi ;;
esac
exit 0
