# Deployment Guide
## Secure File Sharing & Messaging Application

### Complete Project Structure

```
secure-file-sharing/
├── README.md                          # Comprehensive project documentation
├── SECURITY_ANALYSIS.md               # Detailed security analysis
├── DEPLOYMENT_GUIDE.md                # This deployment guide
├── docker-compose.yml                 # Docker orchestration
├── .gitignore                         # Git ignore rules
│
├── backend/                           # Node.js Express Backend
│   ├── server.js                      # Main server with security middleware
│   ├── package.json                   # Backend dependencies
│   ├── Dockerfile.backend             # Backend Docker configuration
│   ├── .env.example                   # Environment variables template
│   │
│   ├── ca/                           # Certificate Authority (auto-created)
│   │   ├── ca-key.pem                # CA private key (generated)
│   │   └── ca-cert.pem               # CA certificate (generated)
│   │
│   ├── utils/                        # Cryptographic utilities
│   │   ├── crypto.js                 # RSA, AES, signatures, certificates
│   │   └── ca.js                     # Certificate Authority implementation
│   │
│   ├── models/                       # MongoDB schemas
│   │   ├── User.js                   # User model with PKI fields
│   │   ├── File.js                   # Encrypted file storage
│   │   └── Message.js                # Encrypted messaging
│   │
│   ├── middleware/                   # Express middleware
│   │   └── auth.js                   # JWT authentication & validation
│   │
│   └── routes/                       # API endpoints
│       ├── auth.js                   # Registration, login, PKI
│       ├── file.js                   # File upload/download/sharing
│       └── message.js                # Encrypted messaging
│
├── frontend/                         # React Frontend
│   ├── package.json                  # Frontend dependencies
│   ├── Dockerfile.frontend           # Frontend Docker configuration
│   ├── tailwind.config.js            # Tailwind CSS configuration
│   │
│   ├── public/                       # Static assets
│   │   └── index.html                # Main HTML template
│   │
│   └── src/                          # React source code
│       ├── index.js                  # React entry point
│       ├── App.js                    # Main application router
│       ├── styles.css                # Tailwind CSS styles
│       │
│       ├── utils/                    # Client-side utilities
│       │   ├── crypto.js             # Client-side cryptography
│       │   └── keyStorage.js         # Secure key management
│       │
│       └── components/               # React components
│           ├── Register.js           # User registration
│           ├── Login.js              # PKI authentication
│           ├── FileShare.js          # File sharing interface
│           └── Messaging.js          # Encrypted messaging
│
└── docs/                             # Additional documentation
    ├── API_DOCUMENTATION.md           # API endpoint documentation
    ├── CRYPTOGRAPHY_GUIDE.md          # Cryptographic implementation details
    └── USER_MANUAL.md                 # End-user instructions
```

## 🚀 Quick Deployment (Docker)

### Prerequisites
- Docker 20.10+
- Docker Compose 2.0+
- 4GB RAM minimum
- 10GB disk space

### Step 1: Clone and Setup
```bash
# Clone the repository
git clone <repository-url>
cd secure-file-sharing

# Copy environment template
cp backend/.env.example backend/.env
```

### Step 2: Configure Environment
```bash
# Edit backend/.env
nano backend/.env

# Add your configuration:
MONGO_URI=mongodb://mongo:27017/secure_app
JWT_SECRET=your-super-secure-jwt-secret-here
NODE_ENV=production
FRONTEND_URL=http://localhost:3000
```

### Step 3: Deploy with Docker
```bash
# Build and start all services
docker-compose up --build -d

# Check service status
docker-compose ps

# View logs
docker-compose logs -f backend
docker-compose logs -f frontend
```

### Step 4: Access Application
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **Health Check**: http://localhost:5000/health

## 🔧 Manual Deployment

### Backend Setup

1. **Install Dependencies**
```bash
cd backend
npm install
```

2. **Configure Environment**
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. **Start MongoDB**
```bash
# Using Docker
docker run -d -p 27017:27017 --name mongodb mongo:latest

# Or install MongoDB locally
# https://docs.mongodb.com/manual/installation/
```

4. **Run Backend**
```bash
# Development
npm run dev

# Production
npm start
```

### Frontend Setup

1. **Install Dependencies**
```bash
cd frontend
npm install
```

2. **Configure API URL**
```javascript
// src/utils/api.js (create if needed)
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
```

3. **Run Frontend**
```bash
# Development
npm start

# Production build
npm run build
npm install -g serve
serve -s build -p 3000
```

## 🐳 Docker Configuration Details

### Backend Dockerfile
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 5000
USER node
CMD ["npm", "start"]
```

### Frontend Dockerfile
```dockerfile
FROM node:18-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 3000
CMD ["nginx", "-g", "daemon off;"]
```

### Docker Compose Services
```yaml
version: '3.8'

services:
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile.backend
    ports:
      - "5000:5000"
    environment:
      - MONGO_URI=mongodb://mongo:27017/secure_app
      - JWT_SECRET=${JWT_SECRET}
    depends_on:
      - mongo
    volumes:
      - ./backend:/app
      - /app/node_modules

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.frontend
    ports:
      - "3000:3000"
    volumes:
      - ./frontend:/app
      - /app/node_modules

  mongo:
    image: mongo:5.0
    ports:
      - "27017:27017"
    volumes:
      - mongo_data:/data/db
    environment:
      - MONGO_INITDB_DATABASE=secure_app

volumes:
  mongo_data:
```

## 🔒 Production Security Configuration

### HTTPS Setup (nginx)
```nginx
server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    ssl_prefer_server_ciphers off;

    location / {
        proxy_pass http://frontend:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /api {
        proxy_pass http://backend:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### Environment Variables (Production)
```bash
# backend/.env
MONGO_URI=mongodb://mongo:27017/secure_app
JWT_SECRET=your-256-bit-secret-key-here
NODE_ENV=production
FRONTEND_URL=https://yourdomain.com
PORT=5000

# Security headers
HELMET_CSP_ENABLED=true
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100
```

## 📊 Monitoring & Logging

### Health Checks
```bash
# Backend health
curl http://localhost:5000/health

# Response:
{
  "status": "OK",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 3600,
  "environment": "production"
}
```

### Log Management
```bash
# Docker logs
docker-compose logs --tail=100 -f backend
docker-compose logs --tail=100 -f frontend

# Application logs
tail -f backend/logs/app.log
tail -f backend/logs/security.log
```

### Monitoring Setup
```yaml
# docker-compose.monitoring.yml
version: '3.8'

services:
  prometheus:
    image: prom/prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml

  grafana:
    image: grafana/grafana
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
```

## 🧪 Testing Deployment

### Backend API Tests
```bash
# Test registration
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@example.com"}'

# Test authentication challenge
curl -X POST http://localhost:5000/api/auth/challenge

# Test file upload (requires authentication)
curl -X POST http://localhost:5000/api/file/upload \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@testfile.txt"
```

### Frontend Tests
```bash
cd frontend
npm test
npm run test:e2e
```

## 🔄 Database Backup & Recovery

### MongoDB Backup
```bash
# Create backup
docker exec mongodb mongodump --db secure_app --out /backup

# Copy backup from container
docker cp mongodb:/backup ./backup_$(date +%Y%m%d)

# Automated backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
docker exec mongodb mongodump --db secure_app --out /backup/backup_$DATE
docker cp mongodb:/backup/backup_$DATE ./backups/
```

### MongoDB Restore
```bash
# Restore from backup
docker exec mongodb mongorestore --db secure_app /backup/backup_20240101
```

## 🚨 Troubleshooting

### Common Issues

1. **CA Certificate Generation Fails**
```bash
# Check CA directory permissions
ls -la backend/ca/
# Should be: drwxr-xr-x

# Manually initialize CA
docker exec backend-container npm run init-ca
```

2. **Frontend Can't Connect to Backend**
```bash
# Check backend health
curl http://localhost:5000/health

# Check CORS configuration
# Verify FRONTEND_URL in backend/.env
```

3. **MongoDB Connection Issues**
```bash
# Check MongoDB status
docker-compose ps mongo

# Test connection
docker exec backend-container npm run test-db
```

4. **Certificate Validation Errors**
```bash
# Check CA certificate
openssl x509 -in backend/ca/ca-cert.pem -text -noout

# Verify user certificate
openssl x509 -in user-cert.pem -text -noout
```

### Debug Mode
```bash
# Enable debug logging
export DEBUG=secure-file-sharing:*
docker-compose up

# Backend debug mode
cd backend
npm run debug
```

## 📱 Mobile & Browser Compatibility

### Supported Browsers
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

### Mobile Responsive Design
- Progressive Web App (PWA) capabilities
- Touch-optimized interface
- Responsive file upload
- Mobile-friendly authentication

## 🔐 Security Checklist

### Pre-Production Security Review
- [ ] Change default JWT secret
- [ ] Enable HTTPS/TLS
- [ ] Configure proper CORS origins
- [ ] Set up rate limiting
- [ ] Enable security headers
- [ ] Configure MongoDB authentication
- [ ] Set up proper file permissions
- [ ] Enable audit logging
- [ ] Configure backup procedures
- [ ] Test certificate validation
- [ ] Verify encryption algorithms
- [ ] Test signature verification

### Post-Deployment Verification
- [ ] SSL/TLS certificate valid
- [ ] All API endpoints secured
- [ ] File upload/download working
- [ ] Message encryption functional
- [ ] User registration/login operational
- [ ] Certificate authority responding
- [ ] Database connections secure
- [ ] Monitoring systems active

---

**Deployment completed successfully!**

Access your secure file sharing application at:
- **Frontend**: https://yourdomain.com (or http://localhost:3000)
- **Backend API**: https://yourdomain.com/api (or http://localhost:5000)

For support, refer to the documentation or create an issue in the repository.