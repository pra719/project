#!/bin/bash

echo "🛑 Stopping SecureShare Application..."
echo "======================================"

# Function to stop a service by process name
stop_service() {
    local service_name=$1
    local process_pattern=$2
    
    echo "Stopping $service_name..."
    
    # Find and kill processes
    local pids=$(pgrep -f "$process_pattern")
    
    if [ -n "$pids" ]; then
        echo "Found $service_name processes: $pids"
        kill $pids 2>/dev/null
        
        # Wait for graceful shutdown
        sleep 3
        
        # Force kill if still running
        local remaining_pids=$(pgrep -f "$process_pattern")
        if [ -n "$remaining_pids" ]; then
            echo "Force killing remaining $service_name processes: $remaining_pids"
            kill -9 $remaining_pids 2>/dev/null
        fi
        
        echo "✅ $service_name stopped"
    else
        echo "✅ $service_name was not running"
    fi
}

# Stop frontend (React dev server)
stop_service "Frontend" "react-scripts start"

# Stop backend (Node.js server)
stop_service "Backend" "node server.js"

# Stop MongoDB (if started by us)
echo "Stopping MongoDB..."
if pgrep mongod > /dev/null; then
    # Try graceful shutdown first
    mongosh --eval "db.adminCommand({shutdown: 1})" > /dev/null 2>&1 || true
    
    # Wait a moment
    sleep 3
    
    # Force stop if still running
    if pgrep mongod > /dev/null; then
        echo "Force stopping MongoDB..."
        sudo pkill -f mongod
    fi
    
    echo "✅ MongoDB stopped"
else
    echo "✅ MongoDB was not running"
fi

# Clean up log files
echo "🧹 Cleaning up log files..."
rm -f backend.log frontend.log

# Final check
echo ""
echo "🔍 Final status check:"

if ! pgrep -f "react-scripts start" > /dev/null; then
    echo "✅ Frontend stopped"
else
    echo "⚠️  Frontend may still be running"
fi

if ! pgrep -f "node server.js" > /dev/null; then
    echo "✅ Backend stopped"
else
    echo "⚠️  Backend may still be running"
fi

if ! pgrep mongod > /dev/null; then
    echo "✅ MongoDB stopped"
else
    echo "⚠️  MongoDB may still be running"
fi

echo ""
echo "✅ SecureShare Application stopped successfully!"
echo "To start again, run: ./start_all.sh"