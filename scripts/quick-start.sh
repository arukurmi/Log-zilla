#!/bin/bash

set -e

echo "🔧 Log-zilla Quick Start Setup"
echo "==============================="

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Check if fluent-bit is installed
if ! command -v fluent-bit > /dev/null 2>&1; then
    echo "📦 Fluent-bit not found. Installing via Homebrew..."
    
    # Check if brew is installed
    if ! command -v brew > /dev/null 2>&1; then
        echo "❌ Homebrew is not installed. Please install Homebrew first:"
        echo "   /bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
        exit 1
    fi
    
    # Install fluent-bit
    brew install fluent-bit
    echo "✅ Fluent-bit installed successfully!"
else
    echo "✅ Fluent-bit is already installed"
fi

# Build the image
echo "📦 Building logzilla Docker image..."
docker build -f Dockerfile.logzilla -t repo/logzilla .

# Stop and remove existing container if it exists
echo "🧹 Cleaning up existing containers..."
docker stop logzilla-server 2>/dev/null || true
docker rm logzilla-server 2>/dev/null || true

# Start the server
echo "🚀 Starting logzilla server..."
docker run -d --name logzilla-server -p 5454:5454 -v ~/.logzilla:/data repo/logzilla

# Wait for server to start
echo "⏳ Waiting for server to start..."
sleep 5

# Setup the logzilla command using build-logzilla.sh
echo "🔧 Setting up logzilla command..."
./scripts/build-logzilla.sh

echo ""
echo "✅ Log-zilla is ready!"
echo ""
echo "🌐 Web interface: http://localhost:5454"
echo "📊 Database location: ~/.logzilla/logzilla.db"
echo ""
echo "💡 Usage example:"
echo "   cd your-service-directory"
echo "   logzilla go run main.go"
echo "   #or"
echo "   go run main.go | logzilla"
echo ""
echo "🛠️  Management commands:"
echo "   docker logs logzilla-server       # View server logs"
echo "   docker stop logzilla-server       # Stop server"
echo "   docker start logzilla-server      # Start server"
echo "   docker restart logzilla-server    # Restart server" 