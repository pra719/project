# Secure File Sharing Application

A modern, secure file sharing application with end-to-end encryption, digital signatures, and PKI-based authentication.

## 🚀 Features

- **PKI-based Authentication**: RSA key pairs and X.509 certificates
- **End-to-End Encryption**: AES-256 symmetric encryption with RSA key exchange
- **Digital Signatures**: Message integrity and authenticity verification
- **Certificate Authority**: Self-signed CA for certificate management
- **Secure File Sharing**: Encrypted file upload, download, and sharing
- **Real-time Messaging**: Encrypted messaging between users
- **Modern UI**: Responsive design with glassmorphism effects

## 🔧 Technology Stack

### Backend
- **Node.js** with Express framework
- **MongoDB** for data persistence
- **JSON Web Tokens** for session management
- **node-forge** for cryptographic operations
- **Helmet** and rate limiting for security

### Frontend
- **React 18** with modern hooks
- **React Router** for navigation
- **Tailwind CSS** for styling
- **Axios** for API communication
- **node-forge** for client-side cryptography

## � Security Features

- **RSA-2048** key pairs for asymmetric cryptography
- **AES-256-CBC** for symmetric encryption
- **SHA-256** for digital signatures and hashing
- **Certificate-based authentication** with CA validation
- **Rate limiting** on authentication endpoints
- **Input validation** and sanitization
- **CORS protection** and security headers

## 📋 Prerequisites

- Docker and Docker Compose
- Node.js 16+ (for local development)
- MongoDB (handled by Docker)

## 🚀 Quick Start

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd secure-file-sharing
   ```

2. **Start with Docker**
   ```bash
   docker-compose up
   ```

3. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000

## 🔑 Authentication Flow

### Registration
1. Navigate to `/register`
2. Enter username (3-20 characters, alphanumeric + underscores)
3. Enter a valid email address
4. Click "Create Account"
5. **Important**: Save the downloaded private key file (.pem) securely
6. Certificate is automatically generated and downloaded

### Login
1. Navigate to `/login`
2. Enter your username
3. Upload your private key file (.pem)
4. The system will:
   - Generate a cryptographic challenge
   - Sign the challenge with your private key
   - Verify the signature on the server
   - Issue a JWT token for session management

## 📁 Project Structure

```
secure-file-sharing/
├── backend/
│   ├── routes/          # API endpoints
│   ├── models/          # MongoDB schemas
│   ├── middleware/      # Authentication middleware
│   ├── utils/           # Cryptographic utilities
│   ├── ca/              # Certificate Authority files
│   └── server.js        # Express server
├── frontend/
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── utils/       # Client-side utilities
│   │   └── App.js       # Main application
│   └── public/          # Static assets
└── docker-compose.yml   # Container orchestration
```

## � API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/challenge` - Get authentication challenge
- `GET /api/auth/publickey/:username` - Get user's public key
- `GET /api/auth/ca-certificate` - Get CA certificate

### File Management
- `POST /api/file/upload` - Upload encrypted file
- `GET /api/file/list` - List user's files
- `GET /api/file/download/:id` - Download file
- `POST /api/file/share/:id` - Share file with another user
- `DELETE /api/file/:id` - Delete file

### Messaging
- `POST /api/message/send` - Send encrypted message
- `GET /api/message/list` - Get user's messages
- `DELETE /api/message/:id` - Delete message

## 🔒 Security Best Practices

### For Users
1. **Secure Key Storage**: Store your private key file in a secure location
2. **Backup Keys**: Keep secure backups of your private key
3. **Strong Usernames**: Use unique, non-guessable usernames
4. **Valid Email**: Use a valid email for certificate generation

### For Developers
1. **Environment Variables**: Set proper JWT secrets in production
2. **MongoDB Security**: Enable authentication in production
3. **HTTPS**: Always use HTTPS in production
4. **Rate Limiting**: Adjust rate limits based on requirements

## 🐛 Recent Fixes

### Authentication Issue Resolution ✅
- **Fixed signature verification mismatch** between frontend (base64) and backend (hex)
- **Enhanced error handling** with specific error messages
- **Improved input validation** and sanitization
- **Optimized user experience** with better loading states

See [AUTHENTICATION_FIX_SUMMARY.md](./AUTHENTICATION_FIX_SUMMARY.md) for detailed information.

## 🧪 Testing

### Manual Testing
1. **Registration Flow**: Create account and verify file downloads
2. **Login Flow**: Authenticate with private key file
3. **File Operations**: Upload, download, and share files
4. **Messaging**: Send and receive encrypted messages

### Automated Testing
```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test
```

## 🔄 Development Setup

### Backend Development
```bash
cd backend
npm install
npm run dev  # Starts with nodemon
```

### Frontend Development
```bash
cd frontend
npm install
npm start    # Starts React development server
```

### Environment Variables
Create `.env` files for configuration:

**Backend (.env)**
```
MONGO_URI=mongodb://localhost:27017/secure_app
JWT_SECRET=your_secure_jwt_secret_here
NODE_ENV=development
PORT=5000
FRONTEND_URL=http://localhost:3000
```

**Frontend (.env)**
```
REACT_APP_API_URL=http://localhost:5000
```

## 📊 Performance

- **Fast Authentication**: Optimized signature verification
- **Efficient Encryption**: Hybrid cryptography (RSA + AES)
- **Minimal Dependencies**: Only essential packages
- **Responsive UI**: Modern React with optimized rendering

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For issues and questions:
1. Check the troubleshooting section below
2. Review the authentication fix summary
3. Open an issue on GitHub

## 🔧 Troubleshooting

### Common Issues

**Q: Login fails with 401 error**
A: This has been fixed. Ensure you're using the latest version with the signature verification fix.

**Q: Private key file not working**
A: Ensure you're uploading the correct `.pem` file downloaded during registration.

**Q: Registration not downloading files**
A: Check browser settings for download blocking. Ensure pop-ups are allowed.

**Q: Docker containers not starting**
A: Check Docker daemon is running and ports 3000, 5000, 27017 are available.

### Getting Help

If you encounter issues:
1. Check the logs: `docker-compose logs`
2. Verify all containers are running: `docker-compose ps`
3. Restart containers: `docker-compose restart`

---

**🎉 The authentication system has been fully fixed and optimized for production use!**
