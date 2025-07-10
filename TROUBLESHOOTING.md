# SecureShare Troubleshooting Guide

## Network Connection Issues

If you're seeing "Network error. Please check your connection and try again." during login or registration, follow these steps:

### 1. Verify Services are Running

Check if all Docker services are up and running:

```bash
# Check if all services are running
docker compose ps

# If services are not running, start them
docker compose up -d

# Check logs for any errors
docker compose logs backend
docker compose logs frontend
docker compose logs mongo
```

### 2. Test Backend Connectivity

Test if the backend is accessible:

```bash
# Test from your host machine
curl http://localhost:5000/health

# Should return: {"status":"OK","timestamp":"...","uptime":...,"environment":"development"}
```

If this fails, the backend is not accessible. Check the backend logs.

### 3. Test Frontend Connectivity

1. Open your browser and go to `http://localhost:3000`
2. Open Developer Tools (F12)
3. Go to the Console tab
4. Click the "Test Backend Connection" button on the login/register page
5. Check for any error messages in the console

### 4. Common Issues and Solutions

#### Issue: Backend not starting
**Symptoms:** `curl: (7) Failed to connect to localhost port 5000`

**Solutions:**
1. Check if port 5000 is already in use: `lsof -i :5000`
2. Restart Docker services: `docker compose down && docker compose up -d`
3. Check backend logs: `docker compose logs backend`

#### Issue: MongoDB connection failed
**Symptoms:** Backend logs show "Database connection error"

**Solutions:**
1. Wait for MongoDB to fully start (may take 30-60 seconds)
2. Check MongoDB health: `docker compose logs mongo`
3. Restart services: `docker compose restart`

#### Issue: CORS errors in browser
**Symptoms:** Browser console shows "CORS error" or "Cross-Origin Request Blocked"

**Solutions:**
1. Ensure frontend is accessing `http://localhost:3000` (not other IPs)
2. Check that backend is configured with correct CORS origins
3. Clear browser cache and cookies

#### Issue: Frontend can't reach backend
**Symptoms:** "Unable to connect to server" message

**Solutions:**
1. Verify backend is running: `curl http://localhost:5000/api/test`
2. Check if firewall is blocking port 5000
3. Ensure you're not using a VPN that might block local connections
4. Try accessing from a different browser

### 5. Manual API Testing

Test the authentication endpoints manually:

```bash
# Test challenge generation
curl -X POST http://localhost:5000/api/auth/challenge \
  -H "Content-Type: application/json"

# Test connectivity
curl http://localhost:5000/api/test
```

### 6. Environment Configuration

Verify your environment variables:

**Backend (.env or docker-compose.yml):**
```
MONGO_URI=mongodb://mongo:27017/secure_app
JWT_SECRET=your_jwt_secret_change_this_in_production
NODE_ENV=development
PORT=5000
FRONTEND_URL=http://localhost:3000
```

**Frontend (docker-compose.yml):**
```
REACT_APP_API_URL=http://localhost:5000
CHOKIDAR_USEPOLLING=true
GENERATE_SOURCEMAP=false
```

### 7. Reset Everything

If all else fails, reset the entire setup:

```bash
# Stop all services
docker compose down

# Remove volumes (will delete data!)
docker compose down -v

# Remove images
docker compose down --rmi all

# Rebuild and start
docker compose up --build -d
```

### 8. Debug Mode

Enable debug logging:

1. Set `NODE_ENV=development` in backend
2. Open browser Developer Tools
3. Check Network tab for failed requests
4. Check Console for detailed error messages

### 9. Alternative Access Methods

If Docker networking issues persist:

1. **Run backend locally:**
   ```bash
   cd backend
   npm install
   npm start
   ```

2. **Run frontend locally:**
   ```bash
   cd frontend
   npm install
   npm start
   ```

### 10. Common Error Messages

| Error Message | Likely Cause | Solution |
|---------------|--------------|----------|
| "Network error" | Backend not reachable | Check if backend is running on port 5000 |
| "CORS blocked" | Cross-origin policy | Verify CORS configuration in backend |
| "Connection refused" | Port not accessible | Check if port 5000 is open and not blocked |
| "Timeout" | Slow connection | Increase timeout in frontend API config |
| "Authentication failed" | Wrong credentials | Verify username and private key file |

### Need More Help?

1. Check the application logs in detail
2. Ensure your system meets the requirements
3. Try running the application outside of Docker first
4. Check if any antivirus software is blocking connections

---

## Performance Issues

### Slow Loading
- Increase Docker memory allocation
- Check if system resources are sufficient
- Disable unnecessary browser extensions

### File Upload Issues
- Check file size limits (default: 10MB)
- Verify available disk space
- Check backend logs for upload errors

---

*Last updated: [Current Date]*