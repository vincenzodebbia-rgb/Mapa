# Recurring events expanded only in SQL (event_occurrences) in Europe/Madrid local time

Status: accepted (2026-10)

## Decision
Recurring events expanded only in SQL (event_occurrences) in Europe/Madrid local time

## Why
One implementation used by views and pages; local-time arithmetic keeps 19:00 at 19:00 across DST.

## Consequences
Logic tested with pgTAP rather than Vitest.
