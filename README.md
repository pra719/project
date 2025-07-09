# Secure File Sharing Application

A modern, secure file sharing application with end-to-end encryption, digital signatures, and certificate-based authentication.

## 🚀 Features

- **End-to-End Encryption**: Files are encrypted using AES-256 before uploading
- **Digital Signatures**: All files and messages are digitally signed for integrity verification
- **Certificate-Based Authentication**: PKI-based authentication using X.509 certificates
- **Secure Messaging**: Encrypted messaging system with RSA encryption
- **File Sharing**: Share encrypted files securely with other users
- **Modern UI**: Beautiful, responsive interface built with React and Tailwind CSS
- **Real-time Security**: Rate limiting, CORS protection, and security headers

## 🏗️ Technology Stack

### Backend
- **Node.js** with Express.js
- **MongoDB** for data storage
- **node-forge** for cryptographic operations
- **JWT** for session management
- **Helmet** for security headers
- **Morgan** for logging

### Frontend
- **React 18** with functional components
- **React Router** for navigation
- **Tailwind CSS** for styling
- **Axios** for API communication
- **node-forge** for client-side cryptography

## 🔧 Installation & Setup

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (v4.4 or higher)
- npm or yarn

### 1. Clone the Repository
```bash
git clone <repository-url>
cd secure-file-sharing-app
```

### 2. Install Dependencies
```bash
# Install all dependencies (root, backend, and frontend)
npm run install-all

# Or install manually:
npm install
cd backend && npm install
cd ../frontend && npm install
```

### 3. Environment Configuration

Create a `.env` file in the backend directory:
```bash
cp .env.example .env
```

Update the environment variables:
```env
# Database Configuration
MONGO_URI=mongodb://localhost:27017/secure_file_sharing

# Server Configuration
PORT=5000
NODE_ENV=development

# Security Configuration
JWT_SECRET=your_super_secure_jwt_secret_key_here_change_in_production

# Frontend Configuration
FRONTEND_URL=http://localhost:3000
```

### 4. Start MongoDB

Make sure MongoDB is running on your system:
```bash
# On macOS with Homebrew
brew services start mongodb-community

# On Ubuntu/Debian
sudo systemctl start mongod

# Or using Docker
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

### 5. Start the Application

#### Development Mode (Recommended)
```bash
# Start both backend and frontend concurrently
npm run dev
```

#### Manual Start
```bash
# Terminal 1: Start Backend
npm run server

# Terminal 2: Start Frontend
npm run client
```

### 6. Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **API Documentation**: http://localhost:5000/health

## 📋 Usage Guide

### 1. User Registration
1. Navigate to the registration page
2. Enter a username and email address
3. Click "Create Account"
4. Download and save your private key and certificate files securely
5. You'll be redirected to the login page

### 2. User Login
1. Enter your username
2. Upload your private key file (downloaded during registration)
3. The system will use challenge-response authentication
4. Successfully authenticated users are redirected to the dashboard

### 3. File Operations

#### Upload Files
1. Navigate to the "Files" section
2. Select a file (max 10MB)
3. File is automatically encrypted with AES-256
4. Click "Upload File"

#### Share Files
1. Select a file from your uploaded files
2. Enter the recipient's username
3. Click "Share File"
4. The file's encryption key is encrypted with the recipient's public key

#### Download Files
1. Click the download button on any file you own or that's shared with you
2. The file is automatically decrypted using your private key
3. Digital signature is verified for integrity

### 4. Secure Messaging
1. Navigate to the "Messages" section
2. Enter recipient username and your message
3. Message is encrypted with recipient's public key
4. Digital signature is created for authentication

## 🔒 Security Features

### Cryptographic Implementation
- **RSA-2048**: For key exchange and digital signatures
- **AES-256-CBC**: For symmetric encryption of files and data
- **SHA-256**: For hashing and integrity verification
- **X.509 Certificates**: For identity verification
- **Certificate Authority**: Self-signed CA for certificate management

### Authentication Flow
1. **Registration**: Generate RSA key pair and X.509 certificate
2. **Challenge-Response**: Server sends random challenge
3. **Digital Signature**: Client signs challenge with private key
4. **Verification**: Server verifies signature with user's public key
5. **JWT Token**: Issued for subsequent API calls

### File Security
1. **Client-Side Encryption**: Files encrypted before upload
2. **Key Management**: AES keys encrypted with RSA public keys
3. **Digital Signatures**: All files signed for integrity
4. **Access Control**: Role-based access to shared files

## 🛡️ Security Considerations

### Production Deployment
- Change all default secrets and passwords
- Use HTTPS/TLS for all communications
- Implement proper key storage (HSM recommended)
- Regular security audits and updates
- Implement proper logging and monitoring

### Key Management
- Private keys should never be stored on the server
- Users are responsible for keeping their private keys secure
- Consider implementing key escrow for enterprise deployments
- Regular key rotation policies

## � Project Structure

```
secure-file-sharing-app/
├── backend/
│   ├── ca/                 # Certificate Authority files
│   ├── config/            # Database configuration
│   ├── middleware/        # Authentication middleware
│   ├── models/           # MongoDB schemas
│   ├── routes/           # API routes
│   ├── utils/            # Utility functions (crypto, CA)
│   ├── server.js         # Main server file
│   └── package.json      # Backend dependencies
├── frontend/
│   ├── public/           # Static files
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── utils/        # Client-side utilities
│   │   ├── App.js        # Main App component
│   │   └── index.js      # Entry point
│   ├── tailwind.config.js
│   └── package.json      # Frontend dependencies
├── .env                  # Environment variables
├── package.json          # Root package.json
└── README.md            # This file
```

## 🐛 Troubleshooting

### Common Issues

1. **MongoDB Connection Error**
   - Ensure MongoDB is running
   - Check connection string in `.env`
   - Verify network connectivity

2. **Certificate/Key Issues**
   - Ensure private key file is in correct PEM format
   - Check file permissions
   - Verify certificate hasn't expired

3. **File Upload Issues**
   - Check file size limits (10MB default)
   - Verify disk space availability
   - Check upload permissions

4. **Frontend Build Issues**
   - Clear node_modules and reinstall
   - Check Node.js version compatibility
   - Verify all dependencies are installed

### Debug Mode
```bash
# Enable debug logging
NODE_ENV=development npm run dev
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## ⚠️ Disclaimer

This application is for educational and demonstration purposes. For production use, please conduct a thorough security audit and implement additional security measures as required by your use case.
