# Log-zilla Docker Setup

This Docker setup combines fluent-bit with the logzilla service to provide easy log monitoring for any application.

## Building the Image

```bash
docker build -f Dockerfile.logzilla -t repo/logzilla .
```

## Running the Container

### Basic Usage

```bash
# Run with default settings (port 5454, db at ~/.logzilla/logzilla.db)
docker run -d -p 5454:5454 -v ~/.logzilla:/data repo/logzilla

# Run with custom port and database location
docker run -d -p 8080:8080 -v ~/.logzilla:/data repo/logzilla --port 8080 --db /data/custom.db
```

### Using logzilla command

1. First, make the logzilla command available on your host:

```bash
# Create a wrapper script
cat > /usr/local/bin/logzilla << 'EOF'
#!/bin/sh
docker run --rm -i --network host \
  -e LOGZILLA_HOST=localhost \
  -e LOGZILLA_PORT=5454 \
  -v "$(pwd):/workdir" \
  -w /workdir \
  repo/logzilla logzilla
EOF

chmod +x /usr/local/bin/logzilla
```

2. Then use it in any project directory:

```bash
cd offer-service
logzilla go run main.go
go run main.go | logzilla

logzilla npm run start
npm run start | logzilla
```

## How it works

1. The `logzilla` command detects the current directory name as the service name
2. It creates a fluent-bit configuration from the template
3. It replaces the service name and server details in the config
4. It pipes the input through fluent-bit to your logzilla server

## Environment Variables

- `LOGZILLA_HOST`: Host where the logzilla server is running (default: localhost)
- `LOGZILLA_PORT`: Port where the logzilla server is running (default: 5454)
- `PORT`: Port for the logzilla web interface (default: 5454)
- `DB_PATH`: Path to SQLite database file (default: ~/.logzilla/logzilla.db)

## Accessing the Web Interface

Once the container is running, access the log viewer at:

- http://localhost:5454 (or your custom port)
