# Mapa (working name)

A free, open-source map of what small cultural and social associations, collectives and professionals
in Madrid are doing today — and the threads between them. No ads, no algorithms, no tracking.
The final name and visual identity are not chosen yet.

**Created by Vincenzo De Biase** — idea, concept and project. See NOTICE.md (copyright) and TRADEMARKS.md (name and logo).

- Product: [docs/SPEC.md](docs/SPEC.md) · Data: [docs/DATA_MODEL.md](docs/DATA_MODEL.md) · Architecture: [ARCHITECTURE.md](ARCHITECTURE.md)
- Rules for humans and AI agents: [AGENTS.md](AGENTS.md)

## Run it locally
Requirements: Node.js 22, a Supabase project (EU region) for development.
```bash
cp .env.example .env.local   # fill in the DEV project values
npm install
npm run dev                  # http://localhost:3000
npm run check                # typecheck + lint + tests
```
Database changes: see "Commands" in AGENTS.md. Never change the schema from the Supabase dashboard.

## License
Code: GNU AGPL-3.0 (see LICENSE and NOTICE.md). The name and logo are not covered by the code license (see TRADEMARKS.md).
Map data © OpenStreetMap contributors. Municipal open data © Ayuntamiento de Madrid (attribution in /legal).
