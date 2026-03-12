# ArvyaX Journal + Emotion Insights

A full-stack nature-themed journaling app with emotion analysis and mental-state insights.

---

## Features

- **Journal entries** — create entries with text, ambience, and auto-generated emotion analysis
- **Emotion analysis** — run on-demand analysis for any arbitrary text
- **Aggregate insights** — view mental-state trends across all your entries
- **Nature-themed UI** — forest 🌲, ocean 🌊, mountain ⛰️ ambience modes
- **SQLite persistence** — lightweight local database (`data.sqlite`)
- **Analysis caching** — avoid redundant LLM calls for repeated text
- **Rate limiting** — basic in-memory protection against abuse
- **Graceful fallback** — works without any API key using built-in heuristics

---

## Stack

| Layer    | Technology                                                     |
|----------|----------------------------------------------------------------|
| Backend  | Node.js HTTP server (port 3000)                                |
| Frontend | Next.js 16 + React 19 + TypeScript + Tailwind CSS (port 3001) |
| Database | SQLite via `sqlite3`                                           |
| LLM      | OpenRouter (optional)                                          |

---

## File Structure

```
ace/
├── src/
│   ├── server.js          # HTTP server, API routes, static file serving
│   ├── analysis.js        # Emotion analysis — LLM (OpenRouter) + heuristic fallback + cache
│   ├── db.js              # SQLite setup, schema, query helpers
│   └── data.sqlite        # Local database (auto-created on first run)
├── public/
│   └── index.html         # Legacy static frontend (kept for reference)
├── frontend/              # Next.js app (primary frontend)
│   ├── src/
│   │   └── app/
│   │       ├── layout.tsx     # Root layout — fonts, metadata
│   │       ├── page.tsx       # Main journal page (compose, analyze, insights, entries)
│   │       └── globals.css    # Tailwind + custom animations & theme tokens
│   ├── next.config.ts         # API proxy: /api/* → localhost:3000
│   └── package.json
├── test/
│   └── analysis.test.js   # Unit tests for the analysis module
├── package.json           # Root scripts (backend)
└── README.md
```

---

## Getting Started

### Backend (API server)

```bash
node src/server.js
```

### Frontend (Next.js dev server)

```bash
cd frontend
npm run dev
```

Open: [http://localhost:3001](http://localhost:3001)

> The frontend proxies all `/api/*` requests to the backend at `http://localhost:3000`.

---

## API Reference

### `POST /api/journal`
Create a journal entry. Emotion analysis runs automatically on the provided text.

```bash
curl -X POST http://localhost:3000/api/journal \
  -H 'Content-Type: application/json' \
  -d '{"userId":"123","ambience":"forest","text":"I felt calm today after listening to the rain."}'
```

**Body parameters:**

| Field      | Type   | Required | Description                                    |
|------------|--------|----------|------------------------------------------------|
| `userId`   | string | ✓        | Unique identifier for the user                 |
| `text`     | string | ✓        | Journal entry text                             |
| `ambience` | string |          | Nature context — `forest`, `ocean`, `mountain` |

---

### `POST /api/journal/analyze`
Run emotion analysis on arbitrary text without creating an entry.

```bash
curl -X POST http://localhost:3000/api/journal/analyze \
  -H 'Content-Type: application/json' \
  -d '{"text":"I felt calm today after listening to the rain."}'
```

---

### `GET /api/journal/:userId`
Fetch all journal entries for a user.

```bash
curl http://localhost:3000/api/journal/123
```

---

### `GET /api/journal/insights/:userId`
Fetch aggregate mental-state insights derived from all of a user's entries.

```bash
curl http://localhost:3000/api/journal/insights/123
```

---

## LLM Configuration (Optional)

By default, the app uses a built-in heuristic analyzer — no API key required.

To enable richer analysis via a free hosted LLM through [OpenRouter](https://openrouter.ai):

```bash
export OPENROUTER_API_KEY=your_key
export OPENROUTER_MODEL=meta-llama/llama-3.2-3b-instruct:free
node src/server.js
```

> If the API call fails for any reason, analysis automatically falls back to heuristics — no errors surface to the user.