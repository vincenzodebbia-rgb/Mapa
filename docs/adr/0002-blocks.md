# Nine blocks that never import each other

Status: accepted (2026-10)

## Decision
Nine blocks that never import each other

## Why
Changing one feature touches one folder; lint and dependency-cruiser make the rule mechanical; pages compose, views and SQL functions handle cross-block reads and writes.

## Consequences
Some small duplication is accepted. No event bus, no service classes, no barrel files.
