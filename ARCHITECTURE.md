# ArvyaX Journal — Architecture

---

## 1. System Overview

ArvyaX Journal is a full-stack emotion-aware journaling application. Users write journal entries under a nature ambience context (forest, ocean, mountain). Each entry is automatically analyzed for emotional tone, keywords, and a summary using either a live LLM or a local heuristic fallback.

```
┌────────────────────────────────────────────────────────────────┐
│  Browser (Next.js — port 3001)                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  page.tsx  ─  Single-page React app                      │  │
│  │  • Compose journal entry (userId, ambience, text)        │  │
│  │  • Trigger on-demand analysis                            │  │
│  │  • View past entries and aggregate insights              │  │
│  └───────────────────────────┬──────────────────────────────┘  │
│                              │  /api/* (Next.js rewrite proxy)  │
└──────────────────────────────┼─────────────────────────────────┘
                               │ HTTP
┌──────────────────────────────▼─────────────────────────────────┐
│  Node.js HTTP Server  (port 3000)  —  src/server.js            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │  POST        │  │  GET         │  │  POST                │  │
│  │  /api/journal│  │  /api/journal│  │  /api/journal/analyze│  │
│  │  (save entry)│  │  /:userId    │  │  (ad-hoc analysis)   │  │
│  └──────┬───────┘  │  /insights/  │  └──────────┬───────────┘  │
│         │          │  /:userId    │             │               │
│         │          └──────┬───────┘             │               │
│         │                 │                     │               │
│  ┌──────▼─────────────────┼─────────────────────▼───────────┐  │
│  │             src/analysis.js                               │  │
│  │  analyzeWithCache(text)                                   │  │
│  │  1. Hash text + provider scope → check analysis_cache    │  │
│  │  2. Cache hit → return immediately (cached: true)        │  │
│  │  3. Cache miss → llmAnalysis(text)                       │  │
│  │     ├─ OPENAI_API_KEY set?  → OpenAI API                 │  │
│  │     ├─ OPENROUTER_API_KEY set? → OpenRouter API          │  │
│  │     └─ no key → heuristicAnalysis (regex word matching)  │  │
│  │  4. Store result in analysis_cache                        │  │
│  └───────────────────────────┬───────────────────────────────┘  │
│                              │                                   │
│  ┌───────────────────────────▼───────────────────────────────┐  │
│  │             src/db.js  (SQLite via sqlite3 CLI)            │  │
│  │  Tables: journal_entries | analysis_cache                  │  │
│  └────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────┘
                               │ HTTPS (optional)
              ┌────────────────▼──────────────────┐
              │    OpenAI API  /  OpenRouter API   │
              └───────────────────────────────────┘
```

---

## 2. Directory Structure

```
ace/
├── src/
│   ├── server.js       # HTTP server — routing, rate limiting, CORS, static serving
│   ├── analysis.js     # Analysis pipeline — LLM dispatch, heuristics, cache layer
│   ├── db.js           # SQLite helper — run(), all(), initDb(), schema definitions
│   └── data.sqlite     # Auto-created SQLite database (git-ignored in production)
├── frontend/
│   ├── next.config.ts  # Next.js config — /api/* proxy to localhost:3000
│   └── src/app/
│       ├── layout.tsx  # Root layout — Playfair Display + Inter fonts, metadata
│       ├── page.tsx    # Full single-page app (compose, analyze, entries, insights)
│       └── globals.css # Tailwind v4 + theme tokens, particle animation, glass UI
├── public/
│   └── index.html      # Legacy static frontend (kept for reference only)
├── test/
│   └── analysis.test.js  # Node built-in test runner — heuristic and hash unit tests
├── package.json        # Root — backend scripts (dev, start, test)
├── README.md
└── ARCHITECTURE.md
```

---

## 3. Data Flow

### 3a. Saving a Journal Entry

```
Browser
  └─ POST /api/journal  { userId, ambience, text }
       └─ server.js validates fields
            └─ analyzeWithCache(text)
                 ├─ cache hit  → { emotion, keywords, summary, cached: true }
                 └─ cache miss → llmAnalysis / heuristicAnalysis
                      └─ stored in analysis_cache
            └─ INSERT into journal_entries (userId, ambience, text, emotion, keywords, summary)
  ← 201 { success: true, analysis }
```

### 3b. On-Demand Analysis

```
Browser
  └─ POST /api/journal/analyze  { text }
       └─ analyzeWithCache(text)
  ← 200 { emotion, keywords, summary, cached }
```

### 3c. Loading Insights

```
Browser
  └─ GET /api/journal/insights/:userId
       └─ SQL aggregation:
            COUNT(*)                           → totalEntries
            GROUP BY emotion ORDER BY count    → topEmotion
            GROUP BY ambience ORDER BY count   → mostUsedAmbience
            last 5 entries → flatten keywords  → recentKeywords
  ← 200 { totalEntries, topEmotion, mostUsedAmbience, recentKeywords }
```

---

## 4. Components In Detail

### 4a. `src/server.js`

| Concern | Implementation |
|---|---|
| Routing | Manual `req.method` + `req.url` matching (no framework) |
| Rate limiting | In-memory `Map` — 120 req/min per IP, rolling 60 s window |
| CORS | Permissive `*` on all responses + preflight `OPTIONS` handler |
| Body parsing | Streaming `req.on('data')` with 1 MB hard limit |
| Static serving | `fs.readFileSync` from `public/` directory |

### 4b. `src/analysis.js`

| Concern | Implementation |
|---|---|
| Provider selection | `getAnalysisProfile()` — OpenAI first, OpenRouter second, heuristic fallback |
| Cache key | `sha256(provider:model\ntext)` — prevents cross-provider cache pollution |
| LLM call | `fetch` with `response_format: { type: "json_object" }` — strict JSON output |
| Heuristic fallback | Regex term scoring across 5 emotion categories; top-scoring wins |
| Cache storage | `analysis_cache` SQLite table with `INSERT OR REPLACE` |

### 4c. `src/db.js`

| Concern | Implementation |
|---|---|
| Driver | `execFileSync('sqlite3', [...])` — shells out to the `sqlite3` CLI binary |
| Parameterization | Manual `?` replacement with single-quote escaping |
| Schema | Two tables auto-created at startup via `initDb()` |

> **Note:** The manual parameter substitution in `db.js` is functional but does not use prepared statements. For production, migrate to the `better-sqlite3` Node package for true prepared statement support.

### 4d. `frontend/src/app/page.tsx`

Single-page React app with four logical sections driven by local component state:

| Section | State | API calls |
|---|---|---|
| Compose | `text`, `userId`, `ambience` | POST `/api/journal` |
| Analyze | `analysis` | POST `/api/journal/analyze` |
| Entries | `entries` | GET `/api/journal/:userId` |
| Insights | `insights` | GET `/api/journal/insights/:userId` |

The `requestJson()` helper tries the optional `NEXT_PUBLIC_API_URL` first (for deployed environments), then falls through to the relative `/api/*` path served by the Next.js proxy.

---

## 5. Database Schema

### `journal_entries`

| Column | Type | Notes |
|---|---|---|
| `id` | INTEGER PK | Auto-increment |
| `user_id` | TEXT | Caller-supplied; no auth enforced yet |
| `ambience` | TEXT | `forest` / `ocean` / `mountain` |
| `text` | TEXT | Raw journal text |
| `emotion` | TEXT | Single word output from analysis |
| `keywords` | TEXT | JSON array — up to 5 words |
| `summary` | TEXT | One-sentence summary |
| `created_at` | TEXT | `CURRENT_TIMESTAMP` (UTC) |

### `analysis_cache`

| Column | Type | Notes |
|---|---|---|
| `text_hash` | TEXT PK | `sha256(provider:model\ntext)` |
| `emotion` | TEXT | |
| `keywords` | TEXT | JSON array |
| `summary` | TEXT | |
| `created_at` | TEXT | `CURRENT_TIMESTAMP` (UTC) |

---

## 6. LLM Provider Strategy

```
analyzeWithCache(text)
        │
        ├─ OPENAI_API_KEY set?
        │       └─ POST https://api.openai.com/v1/chat/completions
        │              model: gpt-4o-mini (default, override via OPENAI_MODEL)
        │
        ├─ OPENROUTER_API_KEY set?
        │       └─ POST https://openrouter.ai/api/v1/chat/completions
        │              model: meta-llama/llama-3.2-3b-instruct:free (default)
        │
        └─ No key / API error
                └─ heuristicAnalysis(text)
                       regex term-scoring across 5 emotion categories
                       deterministic, zero cost, zero latency
```

All three paths return the same shape: `{ emotion, keywords, summary }`.

---

## 7. How to Scale to 100 k Users

| Problem | Solution |
|---|---|
| Single-process Node server | Horizontal replicas behind a load balancer (e.g. nginx / ALB) |
| SQLite single-file DB | Migrate to PostgreSQL with connection pooling (pg + pgBouncer) |
| Synchronous LLM call on write path | Move analysis to an async worker queue (BullMQ / SQS); write entry immediately, update emotion later |
| In-memory rate limiter | Move to Redis with sliding-window counters shared across replicas |
| No auth | Add JWT / session tokens; row-level security on `user_id` |
| Analysis cache in SQLite | Promote to Redis; SQLite as warm fallback |

---

## 8. How to Reduce LLM Cost

1. **Cache-first** — `sha256`-keyed cache eliminates duplicate calls for identical text.
2. **Smallest capable model** — `gpt-4o-mini` is ~20× cheaper than `gpt-4o` for this task.
3. **Strict JSON output** — `response_format: json_object` + capped token count avoids wasteful prose.
4. **Heuristic pre-filter** — run heuristics first; only call LLM when confidence is below a threshold.
5. **Batch offline** — for bulk re-analysis or backfill, batch requests (OpenAI supports batch API at 50 % discount).
6. **Per-user quotas** — limit LLM calls per user per day to prevent runaway usage.

---

## 9. How to Protect Sensitive Journal Data

| Layer | Control |
|---|---|
| Transport | HTTPS / TLS everywhere; HSTS header |
| Storage | Encrypted volumes; SQLite WAL file permissions `600` |
| Auth | No identity layer today — add JWT with short expiry + refresh tokens |
| Access control | Enforce `WHERE user_id = ?` on every query; never expose cross-user data |
| Secrets | API keys via environment variables or a secrets manager (AWS Secrets Manager / Vault); never committed to repo |
| LLM data | Consider redacting PII from text before sending to external APIs |
| Audit log | Append-only log of reads/writes per user_id |
| Retention | User-triggered self-delete endpoint; configurable retention policy |
