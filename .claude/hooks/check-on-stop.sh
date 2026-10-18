#!/bin/bash
# Stop hook: Claude cannot end its turn while typecheck or lint fail.
# Without jq (or with unreadable input) we cannot read stop_hook_active, and blocking could loop forever:
# in that case warn and let the turn end.
warn_and_allow() { echo "Warning: $1 Typecheck and lint were NOT checked at stop." >&2; exit 0; }

command -v jq >/dev/null 2>&1 || warn_and_allow "jq is missing (install it: winget install jqlang.jq)."
INPUT=$(cat)
[ -n "$INPUT" ] || warn_and_allow "the Stop hook input is empty."
ACTIVE=$(printf '%s' "$INPUT" | jq -r '.stop_hook_active' 2>/dev/null) \
  || warn_and_allow "the Stop hook input is not valid JSON."
ACTIVE="${ACTIVE//$'\r'/}"   # jq on Windows may print CRLF
[ "$ACTIVE" = "true" ] && exit 0
cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0
OUT=$( { npm run -s typecheck && npm run -s lint; } 2>&1 )
if [ $? -ne 0 ]; then
  printf 'Typecheck or lint failed. Fix the root cause. Do not use @ts-ignore, eslint-disable or "as any".\n%s\n' "$OUT" | head -c 4000 >&2
  exit 2
fi
exit 0
