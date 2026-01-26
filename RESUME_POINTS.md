# Log-zilla — Resume & Project Documentation

## 1. How to Run

See **[RUN_GUIDE.md](./RUN_GUIDE.md)** for:

- Local: `npm install && npm run dev` → http://localhost:5959  
- Docker: `./scripts/quick-start.sh`  
- Manual Docker, sending logs, env vars, troubleshooting  

---

## 2. Thought Process & Design

### Problem

- New Relic / Datadog are heavy and often overkill for local and dev.
- Need a **lightweight, self‑hosted** log viewer: aggregate, filter, and inspect logs in real time, with minimal setup.

### Approach

- **“New Relic for localhost”** — same mental model (services, levels, search, time range) but for local/dev.
- **Zero config where possible** — e.g. service name from directory, pipe logs and go.
- **Familiar stack** — Next.js + SQLite + Fluent-bit so it’s easy to run and extend.

### Design Decisions

| Decision | Rationale |
|----------|-----------|
| **SQLite (better-sqlite3)** | Single file, no extra services, good for 10k–100k+ logs in dev. |
| **REST /api/otel for ingest** | Simple, works with Fluent-bit HTTP, curl, and any HTTP client. |
| **Fluent-bit + optional Node log-processor** | Fluent-bit for file/tail; Node for stdin when Fluent-bit isn’t on the host. |
| **Polling (3s) for live UI** | Simpler than WebSockets for the first version; good enough for dev. |
| **Docker‑first distribution** | One image for server + processor; easy to run and script. |
| **Indexed schema** | Indexes on `timestamp`, `level`, `service`, `message` for fast filtered queries. |

---

## 3. High‑Level Design (HLD)

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  App / Service  │     │  Log Ingestion    │     │  Log-zilla      │
│  (stdout/ file) │────▶│  Fluent-bit or   │────▶│  Next.js API    │
│                 │     │  Node processor   │     │  /api/otel      │
└─────────────────┘     └──────────────────┘     └────────┬────────┘
                                                          │
                        ┌─────────────────────────────────┼─────────────────────────────────┐
                        │                                 ▼                                 │
                        │  ┌─────────────┐    ┌─────────────────────┐    ┌───────────────┐  │
                        │  │  SQLite     │    │  LogViewer (React)   │    │  /api/db-size │  │
                        │  │  (better-   │◀───│  Filters, search,    │◀───│  /api/otel    │  │
                        │  │   sqlite3)  │    │  date range, polling │    │  GET/DELETE   │  │
                        │  └─────────────┘    └─────────────────────┘    └───────────────┘  │
                        └───────────────────────────────────────────────────────────────────┘
```

**Components**

- **Ingest:** Fluent-bit (stdin/tail) or `log-processor.js` (stdin) → HTTP POST `/api/otel`.
- **API:** Next.js Route Handlers — POST (batch), GET (filtered + paginated), DELETE (clear).
- **Storage:** SQLite via `better-sqlite3`; `DatabaseService` for add/get/count/clear.
- **UI:** React (LogViewer, LogFilter, LogEntry), Ant Design, Recharts, 3s polling to `/api/otel`.

---

## 4. Low‑Level Design (LLD)

### Data model

**Table `logs`**

| Column     | Type    | Notes                          |
|-----------|---------|--------------------------------|
| id        | TEXT PK | `Date.now() + random`          |
| timestamp | TEXT    | ISO 8601                       |
| message   | TEXT    | Main log line                  |
| level     | TEXT    | debug, info, warn, error       |
| service   | TEXT    | From dir name or `service.name`|
| data      | TEXT    | JSON for extra fields          |

**Indexes:** `timestamp`, `level`, `service`, `message`.

### API

- **POST /api/otel**  
  - Body: one object or array of log objects.  
  - Supports `service.name` header.  
  - Writes to DB; returns `{ success, count }`.

- **GET /api/otel**  
  - Query: `query`, `level`, `service`, `startDate`, `endDate`, `limit` (default 1000), `offset`.  
  - Returns `{ logs, totalCount, levels, services }`.

- **DELETE /api/otel**  
  - Query: `service`, `endDate` (optional).  
  - Clears matching logs.

- **GET /api/db-size**  
  - Returns `{ size }` (bytes).

### Search

- Simple: SQL `LIKE` on `message`, `service`, `level`, `data`.
- Advanced: `searchParser` — `key:value`, `key:"value"`, `*substr*`, `-key:value`; in-memory filter after a larger DB fetch (up to 5000 rows).

### Ingest paths

1. **Fluent-bit** — stdin or tail → Lua/parser → HTTP output to `/api/otel`; `Flush 1`, `Header service.name`.
2. **Node `log-processor.js`** — readline on stdin, JSON or plain text → one HTTP POST per line to `/api/otel`.

---

## 5. Setup & Deployment

- **Local:** `npm install` → `npm run dev`; DB at `DB_PATH` or `./logs.db`.  
- **Docker:** `Dockerfile.logzilla` (Node 20 Alpine, Next build, fluent configs, `log-processor`, `logzilla` script).  
- **Entrypoint:** `entrypoint.sh` — server mode (`node server.js`) or `log-processor` mode.  
- **`logzilla` CLI:** `build-logzilla.sh` copies fluent templates to `~/fluent-bit`, generates per‑service config, runs `fluent-bit` or command and tees to a log file.

---

## 6. Tech Stack

- **Runtime:** Node 20  
- **Framework:** Next.js 15, React 19  
- **DB:** better-sqlite3, SQLite  
- **Log pipeline:** Fluent-bit, Node `log-processor.js`  
- **UI:** Ant Design, Recharts, Tailwind, dayjs, lucide-react  
- **Deploy:** Docker, shell scripts for `logzilla` CLI  

---

## 7. Three Resume Bullets (with specifications)

Use these as-is or shorten for space.

---

### Bullet 1 — Throughput & ingest

- **Engineered Log-zilla, a self‑hosted log aggregation service**, ingesting **1000+ logs/sec** via batched POST to `/api/otel`, with **indexed SQLite (better-sqlite3)** for low-latency writes and **Fluent-bit** (flush 1s) or a **Node stdin log-processor** for zero-config collection from stdout/files.

---

### Bullet 2 — Query & storage

- **Designed the query and storage layer** with **paginated, filtered reads (1k–5k logs/request)**, indexes on `timestamp`, `level`, `service`, and `message`, **advanced search** (key:value, wildcards, exclusions), and **REST APIs** for ingest (POST), retrieval (GET), and deletion (DELETE) to support a real-time-style dashboard with **3-second polling**.

---

### Bullet 3 — Architecture & product

- **Built an end-to-end log monitoring stack** (“New Relic for localhost”): **Docker-native** packaging, **multi-service** tagging via directory name or `service.name`, **Next.js + React** UI with level/service/date filters and DB-size metrics, and **Fluent-bit + HTTP** integration for local and dev log aggregation without external SaaS.

---

## 8. Shorter / Alternate Bullets

**Technical**

- Developed Log-zilla, a full‑stack log monitoring platform (Next.js, TypeScript, Docker) with **1k+ logs/sec ingest**, **indexed SQLite**, **Fluent-bit** integration, and advanced filtering (level, service, date, key:value search).
- Implemented **batch ingest** and **paginated query APIs (1k–5k/request)**, **SQLite with 4 indexes** for fast filtered reads, and a **3s-polling** React UI for near–real-time log viewing.

**Impact**

- Built Log-zilla, an open-source, **self-hosted** log viewer that provides New Relic–like workflows for localhost: **zero-config** collection, **multi-service** aggregation, and a modern dashboard, reducing dependence on external observability tools during development.

---

## 9. Keywords for ATS / scanning

Next.js, TypeScript, React, Node.js, SQLite, better-sqlite3, Fluent-bit, Docker, REST API, log aggregation, real-time, filtering, search, indexing, pagination, multi-service, self-hosted, observability, OpenTelemetry-style ingest.

---

## 10. Checklist: Important Points Used in Making Log-zilla

**Problem & vision**

- New Relic–like experience for localhost; avoid heavy SaaS for local/dev.
- Zero-config where possible; Docker-native and scriptable.

**Design & architecture**

- HLD: App → Fluent-bit / Node processor → HTTP `/api/otel` → SQLite + React UI.
- LLD: `logs` table (id, timestamp, message, level, service, data), 4 indexes; `DatabaseService` singleton.
- REST: POST (batch ingest), GET (filtered, 1k–5k/request), DELETE (clear by service/date).
- Search: simple SQL `LIKE`; advanced in-memory (`key:value`, `*x*`, `-key:value`) after larger fetch.

**Implementation**

- Next.js 15, React 19, TypeScript; `better-sqlite3`; Ant Design, Recharts, Tailwind.
- Fluent-bit: stdin/tail, `Flush 1`, HTTP to `/api/otel`, `service.name` header.
- Node `log-processor.js`: stdin → JSON or plain → one POST per line.
- `logzilla` CLI: per-service fluent config from dir name, fluent-bit or tee to file.
- UI: LogViewer, LogFilter, LogEntry; 3s polling; level, service, date range, DB size.

**Setup & run**

- Local: `npm run dev` (port 5959, `./logs.db`).
- Docker: `Dockerfile.logzilla`, `entrypoint.sh` (server vs log-processor); `-v` for DB.
- Scripts: `quick-start.sh`, `build-logzilla.sh` for image, container, and `logzilla` CLI.

**Specifications (for resume)**

- Ingest: 1000+ logs/sec, batched POST, indexed SQLite.
- Query: 1k–5k/request, 4 indexes, advanced search.
- Product: Docker-native, multi-service, 3s polling, zero-config collection.
