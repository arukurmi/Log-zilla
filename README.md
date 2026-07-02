<div align="center">
  <img src="public/favicon.svg" width="120" height="120" alt="Log-zilla">

# LOG-ZILLA

**The kaiju that eats your localhost logs.**

Run any command through `logzilla` and every service on your machine streams into one searchable console at `localhost:5454`.

</div>

---

![Log-zilla console](screenshots/dashboard-dark.png)

## What it does

Working on a few services at once means juggling terminal tabs and losing anything that scrolled past. Log-zilla swallows all of it:

```bash
cd my-node-service
logzilla npm start        # prefix any command…
go run main.go | logzilla # …or pipe into it
```

Each service is tagged with the directory you ran it from, stored in SQLite so history survives restarts, and served up in a console with structured search, severity filters, an activity graph, and dark/light themes.

## Getting started

### The short way

```bash
./scripts/quick-start.sh
```

Builds the Docker image, starts the server on port 5454, installs the `logzilla` command, and prints usage examples. Then open **http://localhost:5454**.

### The long way

**Run the server:**

```bash
docker build -f Dockerfile.logzilla -t repo/logzilla .
docker run -d --name logzilla-server -p 5454:5454 -v ~/.logzilla:/data repo/logzilla
```

**Install the CLI:**

```bash
./scripts/build-logzilla.sh
```

## Everyday usage

```bash
# prefix any process
logzilla npm run start:dev
logzilla go run main.go
logzilla python app.py

# or pipe
./my-app | logzilla
```

The source name in the console comes from your working directory — running inside `payments-service/` shows up as `payments-service`.

## The console

Click any event to open the inspector — copy an attribute or turn it into a filter with one click:

![Event inspector](screenshots/log-details.png)

Prefer daylight? The sun/moon switch lives in the top-right:

![Light theme](screenshots/dashboard-light.png)

### Search syntax

| Query | Matches |
|---|---|
| `key:"value"` | field equals value |
| `key:*value*` | field contains value |
| `-key:value` | field does **not** equal value |
| `"text"` | any field contains text |
| `"a" "b"` | both terms, any fields |

### View controls

The pills next to the filters control the console itself: **live** (auto-refresh), **follow** (auto-scroll), **pulse** (activity graph). The **Purge** button in the header deletes stored logs by source and age.

## Configuration

| Variable | Default | What it controls |
|---|---|---|
| `PORT` | `5454` | console port |
| `DB_PATH` | `/data/logzilla.db` | SQLite location inside the container |
| `LOGZILLA_HOST` | `localhost` | where the CLI ships logs |
| `LOGZILLA_PORT` | `5454` | port the CLI targets |

```bash
# custom port + database location
docker run -d --name logzilla-server -p 8080:8080 \
  -v /path/to/data:/data \
  repo/logzilla --port 8080 --db /data/logs.db
```

## Managing the server

```bash
docker logs logzilla-server      # what is it doing
docker stop logzilla-server      # pause it
docker start logzilla-server     # resume (data persists)
docker rm logzilla-server        # remove (volume data survives)
```

## When something's off

- **Console loads but shows offline** — the API can't reach its database. Check `docker logs logzilla-server`; if you see SQLite I/O errors, make sure the `-v` mount points at a plain directory like `~/.logzilla` (macOS privacy-protected folders such as `~/Documents` can break Docker file sharing).
- **`logzilla: command not found`** — re-run `./scripts/build-logzilla.sh` from this repo.
- **Logs not arriving** — confirm fluent-bit is installed (`fluent-bit --version`) and the server answers: `curl localhost:5454/api/otel?limit=1`.

## Developing

See [SETUP.md](SETUP.md) for running from source, project layout, and theming. Full install walkthrough in [COMPLETE_SETUP.md](COMPLETE_SETUP.md).

---

<div align="center">
  <sub>MIT licensed · runs on Docker + Next.js · contributions welcome</sub>
</div>
