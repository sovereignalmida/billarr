#!/bin/bash

echo "⚓ Billarr - Quick Start"
echo "=============================="
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    echo "Visit: https://docs.docker.com/get-docker/"
    exit 1
fi

# Check if Docker Compose is available (try v2 first, then v1)
if docker compose version &> /dev/null; then
    COMPOSE_CMD="docker compose"
    echo "✅ Docker and Docker Compose v2 are installed"
elif command -v docker-compose &> /dev/null; then
    COMPOSE_CMD="docker-compose"
    echo "✅ Docker and Docker Compose v1 are installed"
else
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    echo "Visit: https://docs.docker.com/compose/install/"
    exit 1
fi

echo ""

# Create docker-compose.yml from the example if it doesn't exist yet
if [ ! -f "./docker-compose.yml" ]; then
    cp docker-compose.example.yml docker-compose.yml
    echo "📄 Created docker-compose.yml from docker-compose.example.yml"
fi

# Create data directory if it doesn't exist
if [ ! -d "./data" ]; then
    mkdir -p ./data
    echo "📁 Created data directory"
fi

echo "🏗️  Pulling pre-built images and starting containers..."
echo ""

# Pull pre-built images and start (docker-compose.example.yml uses ghcr.io
# images by default — no build step needed unless you've swapped in a
# build: block yourself)
$COMPOSE_CMD pull
$COMPOSE_CMD up -d

# Wait for services to be ready
echo ""
echo "⏳ Waiting for services to be ready..."
sleep 5

# Check if containers are running
if $COMPOSE_CMD ps | grep -q "Up\|running"; then
    echo ""
    echo "✅ Billarr is now running!"
    echo ""
    echo "⚓ Access your app at: http://localhost:8080"
    echo "🔧 Backend API at: http://localhost:3001"
    echo ""
    echo "To stop the app: $COMPOSE_CMD down"
    echo "To view logs: $COMPOSE_CMD logs -f"
    echo ""
else
    echo ""
    echo "❌ Something went wrong. Check the logs with: $COMPOSE_CMD logs"
    exit 1
fi
