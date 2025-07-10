#!/bin/bash

echo "🚀 Starting SecureShare Application..."
echo "====================================="

# Function to check if a service is running
check_service() {
    local service_name=$1
    local port=$2
    local max_attempts=$3
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s "http://localhost:$port" > /dev/null 2>&1; then
            echo "✅ $service_name is running on port $port"
            return 0
        fi
        echo "⏳ Waiting for $service_name to start... (attempt $attempt/$max_attempts)"
        sleep 2
        ((attempt++))
    done
    
    echo "❌ $service_name failed to start on port $port"
    return 1
}

# Function to start MongoDB
start_mongodb() {
    echo "📊 Starting MongoDB..."
    
    # Check if MongoDB is already running
    if pgrep mongod > /dev/null; then
        echo "✅ MongoDB is already running"
        return 0
    fi
    
    # Create data directory if it doesn't exist
    sudo mkdir -p /data/db
    sudo chown -R mongodb:mongodb /data/db
    
    # Start MongoDB
    sudo -u mongodb mongod --dbpath /data/db --logpath /var/log/mongodb/mongod.log --fork
    
    # Wait for MongoDB to start
    local attempt=1
    while [ $attempt -le 10 ]; do
        if mongosh --eval "db.adminCommand('ismaster')" > /dev/null 2>&1; then
            echo "✅ MongoDB started successfully"
            return 0
        fi
        echo "⏳ Waiting for MongoDB to start... (attempt $attempt/10)"
        sleep 2
        ((attempt++))
    done
    
    echo "❌ MongoDB failed to start"
    return 1
}

# Function to start backend
start_backend() {
    echo "🔧 Starting Backend Server..."
    
    # Check if backend is already running
    if curl -s "http://localhost:5000/health" > /dev/null 2>&1; then
        echo "✅ Backend is already running"
        return 0
    fi
    
    # Kill any existing node processes
    pkill -f "node server.js" 2>/dev/null || true
    
    # Start backend in background
    cd backend
    nohup npm start > ../backend.log 2>&1 &
    cd ..
    
    # Wait for backend to start
    check_service "Backend" "5000" "15"
}

# Function to start frontend
start_frontend() {
    echo "🎨 Starting Frontend Server..."
    
    # Check if frontend is already running
    if curl -s "http://localhost:3000" > /dev/null 2>&1; then
        echo "✅ Frontend is already running"
        return 0
    fi
    
    # Kill any existing React processes
    pkill -f "react-scripts start" 2>/dev/null || true
    
    # Start frontend in background
    cd frontend
    nohup npm start > ../frontend.log 2>&1 &
    cd ..
    
    # Wait for frontend to start
    check_service "Frontend" "3000" "30"
}

# Function to test the complete application
test_application() {
    echo "🧪 Testing Application..."
    
    # Test backend health
    if curl -s "http://localhost:5000/health" | grep -q "OK"; then
        echo "✅ Backend health check passed"
    else
        echo "❌ Backend health check failed"
        return 1
    fi
    
    # Test frontend
    if curl -s "http://localhost:3000" | grep -q "SecureShare"; then
        echo "✅ Frontend is serving content"
    else
        echo "❌ Frontend test failed"
        return 1
    fi
    
    # Test MongoDB connection
    if mongosh --eval "db.adminCommand('ismaster')" > /dev/null 2>&1; then
        echo "✅ MongoDB connection successful"
    else
        echo "❌ MongoDB connection failed"
        return 1
    fi
    
    echo "✅ All tests passed!"
    return 0
}

# Main execution
main() {
    # Check prerequisites
    echo "🔍 Checking prerequisites..."
    
    # Check if MongoDB is installed
    if ! command -v mongod &> /dev/null; then
        echo "❌ MongoDB is not installed. Please install it first:"
        echo "   curl -fsSL https://pgp.mongodb.com/server-7.0.asc | sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor"
        echo "   echo 'deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse' | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list"
        echo "   sudo apt update && sudo apt install -y mongodb-org"
        exit 1
    fi
    
    # Check if Node.js is available
    if ! command -v node &> /dev/null; then
        echo "❌ Node.js is not installed. Please install it first."
        exit 1
    fi
    
    # Check if npm is available
    if ! command -v npm &> /dev/null; then
        echo "❌ npm is not installed. Please install it first."
        exit 1
    fi
    
    echo "✅ Prerequisites check passed"
    
    # Install dependencies if needed
    echo "📦 Installing dependencies..."
    
    if [ ! -d "backend/node_modules" ]; then
        echo "Installing backend dependencies..."
        cd backend && npm install && cd ..
    fi
    
    if [ ! -d "frontend/node_modules" ]; then
        echo "Installing frontend dependencies..."
        cd frontend && npm install && cd ..
    fi
    
    echo "✅ Dependencies installed"
    
    # Start services
    start_mongodb || exit 1
    start_backend || exit 1
    start_frontend || exit 1
    
    # Test application
    sleep 5  # Give services time to fully initialize
    test_application || exit 1
    
    echo ""
    echo "🎉 SecureShare Application Started Successfully!"
    echo "=============================================="
    echo "📱 Frontend:  http://localhost:3000"
    echo "🔧 Backend:   http://localhost:5000"
    echo "📊 MongoDB:   localhost:27017"
    echo ""
    echo "📋 Usage:"
    echo "1. Go to http://localhost:3000"
    echo "2. Register a new account"
    echo "3. Download your private key file"
    echo "4. Login with username + private key file"
    echo "5. Start sharing files securely!"
    echo ""
    echo "📝 Logs:"
    echo "- Backend logs: ./backend.log"
    echo "- Frontend logs: ./frontend.log"
    echo ""
    echo "🛑 To stop all services: ./stop_all.sh"
    echo ""
}

# Handle script interruption
trap 'echo ""; echo "🛑 Script interrupted. Services may still be running."; exit 1' INT

# Run main function
main