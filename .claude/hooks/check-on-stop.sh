#!/bin/bash
# Stop hook: Claude cannot end its turn while typecheck or lint fail.
INPUT=$(cat)
[ "$(echo "$INPUT" | jq -r '.stop_hook_active')" = "true" ] && exit 0
cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0
OUT=$( { npm run -s typecheck && npm run -s lint; } 2>&1 )
if [ $? -ne 0 ]; then
  printf 'Typecheck or lint failed. Fix the root cause. Do not use @ts-ignore, eslint-disable or "as any".\n%s\n' "$OUT" | head -c 4000 >&2
  exit 2
fi
exit 0
