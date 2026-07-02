# Log-zilla — Local Development Setup

This guide is for hacking on Log-zilla itself. If you just want to *use* it, follow the [readme](readme.md) or [COMPLETE_SETUP.md](COMPLETE_SETUP.md).

## Prerequisites

- Node.js 20+
- Docker (only needed for the containerized server)
- fluent-bit (`brew install fluent-bit`) if you want the host `logzilla` command

## Run the console from source

```bash
npm install
npm run dev
```

The console starts on http://localhost:5959. The SQLite database is created as `logs.db` in the project root (override with `DB_PATH`).

## Project layout

```
src/
  app/            Next.js app router — pages and API routes
    api/otel/     Ingestion endpoint (POST logs, GET query, DELETE purge)
    api/db-size/  Reports the SQLite file size
  ui/             React components
    StreamConsole.tsx   The main console (graph, table, drawer)
    QueryBar.tsx        Search + level/service filters
    ThemeProvider.tsx   Dark/light mode context
    ZillaMark.tsx       The dorsal-fin logo
  core/           Server-side logic
    eventVault.ts       SQLite persistence + querying
    queryEngine.ts      Structured search syntax parser
    eventBuffer.ts      In-memory buffer + StreamEvent type
    livewire.ts         Socket.IO plumbing
fluent/           fluent-bit configs and Lua filters
docker/           Container entrypoint, log processor, logzilla shim
scripts/          quick-start.sh and build-logzilla.sh
```

## Send yourself some test logs

With the dev server running:

```bash
curl -X POST http://localhost:5959/api/otel \
  -H 'Content-Type: application/json' \
  -H 'service.name: my-service' \
  -d '{"level":"info","message":"hello from curl"}'
```

Or use the bundled generators:

```bash
node test-logs.js
```

## Theming

Colors live as CSS variables in `src/app/globals.css` (one block per theme, switched by `data-theme` on `<html>`). Ant Design and recharts get their literal values from the `PALETTE` map in `src/ui/StreamConsole.tsx` — keep the two in sync if you change the palette.

## Checks

```bash
npx tsc --noEmit   # types
npm run lint       # eslint
npm run format     # prettier
```

## Docker build

```bash
docker build -f Dockerfile.logzilla -t repo/logzilla .
```

The image builds the Next.js app, bundles the fluent-bit configs, and exposes port 5959. See [docker/README.md](docker/README.md) for runtime options.
