#!/bin/bash
# PreToolUse (Edit|Write): blocks edits to secrets and to migrations already merged into main.
# Fails closed: if the input cannot be checked (no jq, unreadable input), the edit is blocked.
block() { echo "Blocked: $1" >&2; exit 2; }

command -v jq >/dev/null 2>&1 \
  || block "jq is not installed, so protect-files.sh cannot check this edit. Install it (winget install jqlang.jq) and restart Claude."
INPUT=$(cat)
[ -n "$INPUT" ] || block "empty hook input, so protect-files.sh cannot check this edit."
FILE_PATH=$(printf '%s' "$INPUT" | jq -r '.tool_input.file_path // empty' 2>/dev/null) \
  || block "hook input is not valid JSON, so protect-files.sh cannot check this edit."
FILE_PATH="${FILE_PATH//$'\r'/}"   # jq on Windows may print CRLF
FILE_PATH="${FILE_PATH//\\//}"
[ -n "$FILE_PATH" ] || block "no tool_input.file_path in the hook input, so protect-files.sh cannot check this edit."
ROOT="${CLAUDE_PROJECT_DIR:-$(pwd)}"
ROOT="${ROOT//\\//}"
REL="${FILE_PATH#"$ROOT"/}"
case "$REL" in
  .env.example) ;;
  .env|.env.*|*/.env|*/.env.*)
    block "$REL is a secrets file. Ask the human." ;;
  supabase/migrations/*)
    BASE=$(git -C "$ROOT" rev-parse --verify -q origin/main >/dev/null && echo origin/main || echo main)
    if git -C "$ROOT" cat-file -e "$BASE:$REL" 2>/dev/null; then
      block "$REL is already merged into $BASE. Create a new migration: supabase migration new <name>."
    fi ;;
esac
exit 0
