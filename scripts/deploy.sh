#!/bin/bash

# Production deployment script for Book Analytics Platform
# This script builds and deploys the application using Docker

set -e

# Configuration
IMAGE_NAME="book-analytics"
TAG="${1:-latest}"
ENVIRONMENT="${2:-production}"

echo "🚀 Starting deployment process..."
echo "Image: $IMAGE_NAME:$TAG"
echo "Environment: $ENVIRONMENT"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
print_status "Checking prerequisites..."

if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    print_error "Docker Compose is not installed"
    exit 1
fi

# Check if running on correct branch (optional)
if [ "$ENVIRONMENT" = "production" ]; then
    CURRENT_BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
    if [ "$CURRENT_BRANCH" != "main" ] && [ "$CURRENT_BRANCH" != "master" ]; then
        print_warning "Not on main/master branch. Current branch: $CURRENT_BRANCH"
        read -p "Continue anyway? (y/N) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
fi

# Pre-deployment checks
print_status "Running pre-deployment checks..."

# Check if required files exist
REQUIRED_FILES=(
    "package.json"
    "Dockerfile"
    "docker-compose.yml"
    "server/index.ts"
    "src/App.tsx"
)

for file in "${REQUIRED_FILES[@]}"; do
    if [ ! -f "$file" ]; then
        print_error "Required file not found: $file"
        exit 1
    fi
done

# Check data directory
if [ ! -d "data_cleaned" ]; then
    print_warning "data_cleaned directory not found. Creating..."
    mkdir -p data_cleaned/logs
fi

# Build the application
print_status "Building React application..."
npm run build

# Build Docker image
print_status "Building Docker image..."
docker build -t "$IMAGE_NAME:$TAG" .

# Stop existing containers
print_status "Stopping existing containers..."
docker-compose down || true

# Start new deployment
print_status "Starting new deployment..."
docker-compose up -d

# Wait for services to be ready
print_status "Waiting for services to start..."
sleep 10

# Health checks
print_status "Running health checks..."

# Check API health
MAX_RETRIES=30
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if curl -f http://localhost:3001/health &> /dev/null; then
        print_status "API health check passed"
        break
    fi
    
    RETRY_COUNT=$((RETRY_COUNT + 1))
    print_warning "Health check attempt $RETRY_COUNT/$MAX_RETRIES failed. Retrying in 5 seconds..."
    sleep 5
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    print_error "API health check failed after $MAX_RETRIES attempts"
    docker-compose logs book-analytics
    exit 1
fi

# Check MongoDB connection
if ! docker-compose exec -T mongodb mongosh --eval "db.adminCommand('ping')" &> /dev/null; then
    print_warning "MongoDB health check failed"
fi

# Check frontend accessibility
if curl -f http://localhost/ &> /dev/null; then
    print_status "Frontend accessibility check passed"
else
    print_warning "Frontend accessibility check failed"
fi

# Show deployment summary
print_status "Deployment completed successfully!"
echo ""
echo "📊 Service Status:"
docker-compose ps

echo ""
echo "🔗 Service URLs:"
echo "  Frontend: http://localhost/"
echo "  API: http://localhost:3001/"
echo "  API Health: http://localhost:3001/health"
echo "  MongoDB: mongodb://localhost:27017/"

echo ""
echo "📋 Useful commands:"
echo "  View logs: docker-compose logs -f"
echo "  Stop services: docker-compose down"
echo "  Restart: docker-compose restart"
echo "  Update: ./scripts/deploy.sh"

# Optional: Run basic smoke tests
if [ "$ENVIRONMENT" = "production" ]; then
    print_status "Running smoke tests..."
    
    # Test API endpoints
    API_TESTS=(
        "/health"
        "/query/genre-stats"
        "/query/top-rated?limit=5"
    )
    
    for endpoint in "${API_TESTS[@]}"; do
        if curl -f "http://localhost:3001$endpoint" &> /dev/null; then
            print_status "✓ API test passed: $endpoint"
        else
            print_warning "✗ API test failed: $endpoint"
        fi
    done
fi

print_status "🎉 Deployment process completed!"