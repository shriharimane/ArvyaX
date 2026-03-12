# Architecture

## Current design
- HTTP server provides REST APIs and serves a static React page.
- SQLite persists journal entries and an analysis cache.
- On `POST /api/journal`, analysis is computed (or fetched from cache) and stored with the entry.
- Insights endpoint uses SQL aggregation to compute totals, dominant emotion, dominant ambience, and recent keywords.

## How to scale to 100k users
1. **Split services**: separate API, analysis worker, and frontend.
2. **Move DB**: migrate SQLite to PostgreSQL with read replicas.
3. **Queue analysis**: make journal writes fast by enqueuing LLM analysis jobs (Kafka/SQS/RabbitMQ), then update entry asynchronously.
4. **Horizontal scaling**: run API replicas behind a load balancer.
5. **Observability**: traces, structured logs, and per-endpoint SLOs.
6. **Data partitioning**: partition entries by user hash/date for faster analytics.

## How to reduce LLM cost
1. **Use cache-first strategy** by hashing normalized text and reusing prior analyses.
2. **Tiered models**: run a cheap local/small model first; escalate only low-confidence cases.
3. **Prompt minimization**: short prompts, strict JSON response, low max tokens.
4. **Batch offline analysis** for non-urgent summaries.
5. **Token budgeting** and per-user quotas.

## How to cache repeated analysis
- Compute `sha256(normalized_text)`.
- Store `{hash, emotion, keywords, summary}` in `analysis_cache`.
- On analyze request, check cache first.
- Add TTL + hit-rate metrics in production.
- For distributed systems, move cache to Redis and keep DB as fallback.

## How to protect sensitive journal data
1. **Encryption in transit**: force HTTPS/TLS.
2. **Encryption at rest**: encrypted volumes + DB-level encryption.
3. **Access control**: JWT auth, RBAC, row-level user isolation.
4. **Secrets management**: keys in vault/KMS, never in repo.
5. **PII controls**: redact sensitive entities before external LLM calls.
6. **Audit logging** and anomaly detection.
7. **Data lifecycle**: retention policy + user-triggered deletion.
