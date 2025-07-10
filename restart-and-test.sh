#!/bin/bash

# SecureShare - Quick Restart and Test Script
echo "🔄 SecureShare Quick Restart and Test"
echo "======================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is running
if ! docker info >/dev/null 2>&1; then
    print_error "Docker is not running. Please start Docker first."
    exit 1
fi

print_status "Docker is running ✓"

# Stop existing services
print_status "Stopping existing services..."
docker compose down

# Start services
print_status "Starting services..."
docker compose up -d

# Wait for services to start
print_status "Waiting for services to start..."
sleep 10

# Check service status
print_status "Checking service status..."
if docker compose ps | grep -q "Up"; then
    print_success "Services are running"
else
    print_error "Some services failed to start"
    docker compose logs
    exit 1
fi

# Test MongoDB
print_status "Testing MongoDB connection..."
sleep 5
if docker compose logs mongo 2>/dev/null | grep -q "Waiting for connections"; then
    print_success "MongoDB is running"
else
    print_warning "MongoDB might still be starting..."
fi

# Test Backend
print_status "Testing backend connectivity..."
sleep 5

# Try multiple times as backend might still be starting
for i in {1..6}; do
    if curl -f http://localhost:5000/health >/dev/null 2>&1; then
        print_success "Backend is accessible at http://localhost:5000"
        break
    else
        if [ $i -eq 6 ]; then
            print_error "Backend is not accessible at http://localhost:5000"
            print_error "Check backend logs: docker compose logs backend"
            exit 1
        else
            print_status "Backend not ready yet, waiting... (attempt $i/6)"
            sleep 5
        fi
    fi
done

# Test Backend API endpoints
print_status "Testing backend API endpoints..."
if curl -f http://localhost:5000/api/test >/dev/null 2>&1; then
    print_success "Backend API test endpoint is working"
else
    print_warning "Backend API test endpoint is not responding"
fi

if curl -f -X POST http://localhost:5000/api/auth/challenge -H "Content-Type: application/json" >/dev/null 2>&1; then
    print_success "Authentication challenge endpoint is working"
else
    print_warning "Authentication challenge endpoint is not responding"
fi

# Test Frontend
print_status "Testing frontend..."
if curl -f http://localhost:3000 >/dev/null 2>&1; then
    print_success "Frontend is accessible at http://localhost:3000"
else
    print_warning "Frontend is not yet accessible at http://localhost:3000"
    print_status "Frontend might still be building, this can take a few minutes..."
fi

# Show service status
print_status "Service Status:"
docker compose ps

# Show useful information
echo ""
echo "🎉 Setup Complete!"
echo "=================="
echo "• Frontend: http://localhost:3000"
echo "• Backend:  http://localhost:5000"
echo "• Health:   http://localhost:5000/health"
echo ""
echo "📝 Next Steps:"
echo "1. Open http://localhost:3000 in your browser"
echo "2. Use the 'Test Backend Connection' button on login/register pages"
echo "3. If issues persist, check the troubleshooting guide: TROUBLESHOOTING.md"
echo ""
echo "🔍 Debugging Commands:"
echo "• View all logs:     docker compose logs"
echo "• View backend logs: docker compose logs backend"
echo "• View frontend logs: docker compose logs frontend"
echo "• Stop services:     docker compose down"
echo ""
echo "⚠️  If you're still having issues:"
echo "1. Check TROUBLESHOOTING.md"
echo "2. Ensure ports 3000 and 5000 are not in use by other applications"
echo "3. Try running: docker compose down -v && docker compose up --build -d"