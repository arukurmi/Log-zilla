<div align="center">
<p align="center">
  <img src="public/favicon.svg" width="150" height="150">
</p>

<h1 align="center"><b>Log-zilla</b></h1>
<h4 align="center" style="color: #666666; font-weight: normal;">New Relic for localhost</h4>

<p align="center">
  <a href="https://www.docker.com/"><img src="https://img.shields.io/badge/docker-ready-blue.svg" alt="Docker"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-green.svg" alt="License"></a>
  <a href="https://nextjs.org"><img src="https://img.shields.io/badge/next.js-14.0-black.svg" alt="Next.js"></a>
  <a href="http://makeapullrequest.com"><img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg" alt="PRs Welcome"></a>
</p>

<p align="center">Beautiful log monitoring for any application, powered by fluent-bit and Next.js.</p>
</div>

![Log-zilla Dashboard](https://github.com/user-attachments/assets/271644cc-5e8b-404e-8d8f-a51c577b902f)

## Features

- 🚀 **Zero Configuration**: Just pipe your logs to `logzilla`
- 🏷️ **Auto Service Detection**: Service name from directory name
- 🌐 **Beautiful Web UI**: Modern, responsive log viewer
- 🔍 **Smart Search**: Filter logs by level, service, message content
- 📊 **Real-time Updates**: See logs as they arrive
- 💾 **Persistent Storage**: SQLite database for log history
- 🐳 **Docker Native**: Everything runs in containers

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

## How It Works

1. **Service Detection**: The `logzilla` command automatically detects your service name from the current directory
2. **Dynamic Configuration**: It creates a fluent-bit config file with your service name
3. **Log Processing**: Fluent-bit processes your logs and sends them to the logzilla server
4. **Web Interface**: View and analyze your logs at http://localhost:5959

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

**Need help?** Check the logs with `docker logs logzilla-server` or visit the web interface at http://localhost:5959
