# ArvyaX Journal + Emotion Insights

A minimal full-stack app for immersive journaling after nature sessions.

## Features
- `POST /api/journal` create journal entries (stores text, ambience, and analysis).
- `GET /api/journal/:userId` fetch all entries for a user.
- `POST /api/journal/analyze` run emotion analysis for arbitrary text.
- `GET /api/journal/insights/:userId` fetch aggregate mental-state insights.
- Simple React frontend (single page) to create entries, analyze text, and view history/insights.
- SQLite-backed persistence (`data.sqlite`) and analysis result caching.
- Basic in-memory rate limiting.

## Stack
- Backend: Node.js HTTP server
- Frontend: React (CDN)
- Database: SQLite (via `sqlite3` CLI)

## Run
```bash
node src/server.js
```
Open: `http://localhost:3000`

## API Examples
### Create Entry
```bash
curl -X POST http://localhost:3000/api/journal \
  -H 'Content-Type: application/json' \
  -d '{"userId":"123","ambience":"forest","text":"I felt calm today after listening to the rain."}'
```

### Analyze Text
```bash
curl -X POST http://localhost:3000/api/journal/analyze \
  -H 'Content-Type: application/json' \
  -d '{"text":"I felt calm today after listening to the rain."}'
```

### Get Entries
```bash
curl http://localhost:3000/api/journal/123
```

### Get Insights
```bash
curl http://localhost:3000/api/journal/insights/123
```

## LLM configuration (optional)
By default the app uses a built-in heuristic analyzer if no key is present.
To use a free hosted LLM route through OpenRouter:

```bash
export OPENROUTER_API_KEY=your_key
export OPENROUTER_MODEL=meta-llama/llama-3.2-3b-instruct:free
node src/server.js
```

If the API call fails, analysis gracefully falls back to heuristics.
