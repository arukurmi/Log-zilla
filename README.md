<div align="center">
<p align="center">
  <img src="public/favicon.svg" width="140" height="140" alt="Log-zilla logo">
</p>

<h1 align="center"><b>LOG-ZILLA</b></h1>
<h4 align="center" style="color: #666666; font-weight: normal;">The kaiju that eats your localhost logs</h4>

<p align="center">
  <a href="https://www.docker.com/"><img src="https://img.shields.io/badge/docker-ready-blue.svg" alt="Docker"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-green.svg" alt="License"></a>
  <a href="https://nextjs.org"><img src="https://img.shields.io/badge/next.js-15-black.svg" alt="Next.js"></a>
  <a href="http://makeapullrequest.com"><img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg" alt="PRs Welcome"></a>
</p>

<p align="center">Pipe any process into <code>logzilla</code> and watch every service on your machine stream into one console.</p>
</div>

![Log-zilla console (dark mode)](screenshots/dashboard-dark.png)

## Why Log-zilla?

Running four microservices locally means four terminal tabs, four scrollback buffers, and zero searchability. Log-zilla swallows all of them: prefix any command with `logzilla` (or pipe into it) and the output lands in a single searchable, filterable, persistent console at `http://localhost:5959`.

## Features

- 🦖 **Zero configuration** — just pipe your logs to `logzilla`
- 🏷️ **Auto service detection** — service name is taken from the directory you run in
- 🌗 **Dark & light mode** — toggle from the header, remembered across sessions
- 🔍 **Structured search** — `key:"value"`, wildcards, negation, free text
- 📈 **Log volume graph** — spot bursts and gaps at a glance
- 📊 **Real-time updates** — the console polls as logs arrive
- 💾 **Persistent storage** — SQLite keeps your history between restarts
- 🐳 **Docker native** — the whole server runs in one container

## Quick Start

The fastest way to get started:

```bash
./scripts/quick-start.sh
```

This will:

1. Build the Docker image
2. Start the logzilla server
3. Set up the `logzilla` command
4. Show you how to use it

## Manual Setup

If you prefer to set things up manually:

### 1. Build the Image

```bash
docker build -f Dockerfile.logzilla -t repo/logzilla .
```

### 2. Start the Server

```bash
# Basic setup (port 5959, database at ~/Documents/logzilla.db)
docker run -d --name logzilla-server -p 5959:5959 -v ~/Documents:/data repo/logzilla

# Custom port and database location
docker run -d --name logzilla-server -p 8080:8080 -v ~/Documents:/data repo/logzilla --port 8080 --db /data/custom.db
```

### 3. Set up the logzilla command

```bash
./scripts/build-logzilla.sh
```

## Usage

Once set up, you can use logzilla with any application:

```bash
# Go application
cd my-go-service
logzilla go run main.go
go run main.go | logzilla

# Node.js application
cd my-node-service
logzilla npm start
npm start | logzilla

# Python application
cd my-python-service
logzilla python app.py
python app.py | logzilla

# Any application that outputs logs
cd any-service
./my-app | logzilla
```

### Visit the web interface on http://localhost:5959

## The Console

Click any row to open the detail drawer — every attribute is one click away from becoming a filter, and one click away from your clipboard:

![Log detail drawer](screenshots/log-details.png)

Prefer daylight? Hit the sun/moon toggle in the header:

![Log-zilla console (light mode)](screenshots/dashboard-light.png)

## How It Works

1. **Service detection**: the `logzilla` command reads your service name from the current directory
2. **Dynamic configuration**: it generates a fluent-bit config for that service on the fly
3. **Ingestion**: fluent-bit ships each line to the Log-zilla server over HTTP
4. **Console**: the web UI at http://localhost:5959 queries the SQLite-backed event vault

## Configuration

### Environment Variables

- `LOGZILLA_HOST`: Server host (default: localhost)
- `LOGZILLA_PORT`: Server port (default: 5959)
- `PORT`: Web interface port (default: 5959)
- `DB_PATH`: Database file path (default: ~/Documents/logzilla.db)

### Custom Database Location

```bash
docker run -d --name logzilla-server -p 5959:5959 \
  -v /path/to/your/data:/data \
  repo/logzilla --db /data/logs.db
```

### Custom Port

```bash
docker run -d --name logzilla-server -p 8080:8080 \
  repo/logzilla --port 8080
```

## Management

```bash
# View server logs
docker logs logzilla-server

# Stop server
docker stop logzilla-server

# Start server
docker start logzilla-server

# Restart server
docker restart logzilla-server

# Remove server (keeps data if using volumes)
docker rm logzilla-server
```

## Troubleshooting

### Server not starting

```bash
docker logs logzilla-server
```

### Can't connect to server

1. Check if container is running: `docker ps`
2. Check port mapping: `docker port logzilla-server`
3. Test connection: `curl http://localhost:5959/api/health`

### logzilla command not found

Make sure you ran the setup script or manually created the command as shown above.

## Advanced Usage

### Multiple Services

Each service automatically gets its own configuration based on the directory name:

```bash
cd payments-service
go run main.go | logzilla  # Shows as "payments-service"

cd user-service
python app.py | logzilla   # Shows as "user-service"
```

### Custom Service Names

You can override the service name by setting the directory name or using a custom approach in your application.

---

**Need help?** Check the logs with `docker logs logzilla-server` or visit the console at http://localhost:5959
