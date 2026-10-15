#!/bin/bash
# PreToolUse (Edit|Write): blocks edits to secrets and to migrations already merged into main.
INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')
FILE_PATH="${FILE_PATH//\\//}"
[ -z "$FILE_PATH" ] && exit 0
ROOT="${CLAUDE_PROJECT_DIR:-$(pwd)}"
ROOT="${ROOT//\\//}"
REL="${FILE_PATH#"$ROOT"/}"
case "$REL" in
  .env.example) ;;
  .env|.env.*|*/.env|*/.env.*)
    echo "Blocked: $REL is a secrets file. Ask the human." >&2; exit 2 ;;
  supabase/migrations/*)
    BASE=$(git -C "$ROOT" rev-parse --verify -q origin/main >/dev/null && echo origin/main || echo main)
    if git -C "$ROOT" cat-file -e "$BASE:$REL" 2>/dev/null; then
      echo "Blocked: $REL is already merged into $BASE. Create a new migration: supabase migration new <name>." >&2
      exit 2
    fi ;;
esac
exit 0
