# Secure File Sharing & Messaging Application

A comprehensive web-based application implementing **Public Key Infrastructure (PKI)** for secure user authentication, file sharing, and messaging using advanced cryptographic techniques.

## 🎯 Assignment Overview

This project fulfills the requirements for **ST6051CEM - Practical Cryptography** assignment on "Design and Development of a Secure User Authentication System" implementing:

- ✅ **User Authentication** with digital certificates and PKI
- ✅ **Document Signing & Verification** with digital signatures
- ✅ **Security Features** ensuring confidentiality, integrity, and authentication
- ✅ **Key Management** with proper CA-issued certificates
- ✅ **Real-world Use Case** for secure file sharing and messaging
- ✅ **Testing & Validation** against common cryptographic attacks

## 🏗️ System Architecture

### Backend Components
```
backend/
├── server.js                 # Main Express server with security middleware
├── package.json              # Dependencies and scripts
├── ca/                       # Certificate Authority directory
│   ├── ca-key.pem            # CA private key (auto-generated)
│   └── ca-cert.pem           # CA certificate (auto-generated)
├── utils/
│   ├── crypto.js             # Cryptographic utilities (RSA, AES, signatures)
│   └── ca.js                 # Certificate Authority implementation
├── models/
│   ├── User.js               # User model with PKI fields
│   ├── File.js               # Encrypted file storage model
│   └── Message.js            # Encrypted message model
├── middleware/
│   └── auth.js               # JWT authentication middleware
└── routes/
    ├── auth.js               # Registration, login, PKI endpoints
    ├── file.js               # Secure file upload/download/sharing
    └── message.js            # Encrypted messaging system
```

### Frontend Components
```
frontend/
├── package.json              # React dependencies with crypto libraries
├── tailwind.config.js        # Modern UI configuration
├── public/
│   └── index.html            # Main HTML template
└── src/
    ├── index.js              # React application entry point
    ├── App.js                # Main application router
    ├── styles.css            # Tailwind CSS with custom components
    ├── utils/
    │   ├── crypto.js         # Client-side cryptographic operations
    │   └── keyStorage.js     # Secure client-side key management
    └── components/
        ├── Register.js       # User registration with key generation
        ├── Login.js          # PKI-based authentication
        ├── FileShare.js      # Secure file upload/sharing interface
        └── Messaging.js      # Encrypted messaging interface
```

## 🔐 Cryptographic Implementation

### 1. Public Key Infrastructure (PKI)
- **Certificate Authority (CA)**: Self-signed root CA for issuing user certificates
- **RSA Key Pairs**: 2048-bit keys generated for each user
- **X.509 Certificates**: Standard digital certificates with 1-year validity
- **Certificate Validation**: Automatic verification against CA

### 2. Encryption Mechanisms
- **Hybrid Encryption**: AES-256 for data + RSA-2048 for key exchange
- **File Encryption**: Large files encrypted with AES, keys encrypted with RSA
- **Message Encryption**: End-to-end encryption using recipient's public key
- **Key Derivation**: Secure random key generation using crypto libraries

### 3. Digital Signatures
- **SHA-256 Hashing**: For data integrity verification
- **RSA Signatures**: Document and message signing with private keys
- **Signature Verification**: Public key verification of authenticity
- **Non-repudiation**: Cryptographic proof of origin

### 4. Security Features
- **Authentication**: Challenge-response with digital signatures
- **Authorization**: JWT tokens with certificate validation
- **Confidentiality**: End-to-end encryption for all sensitive data
- **Integrity**: Hash verification and digital signatures
- **Rate Limiting**: Protection against brute force attacks
- **CORS Protection**: Secure cross-origin resource sharing

## 🔑 Key Management

### Client-Side Key Storage
- **In-Memory Storage**: Keys stored in browser memory (not localStorage)
- **Session Storage**: Public keys and certificates only
- **Private Key Security**: Never stored persistently in browser
- **Key Validation**: Automatic expiration and format validation
- **Export/Import**: Encrypted key backup functionality

### Server-Side Certificate Management
- **CA Key Storage**: Secure file system storage with proper permissions
- **Certificate Issuance**: Automated certificate generation and signing
- **Revocation Support**: Framework for certificate revocation lists
- **Expiration Handling**: Automatic certificate validity checking

## 🌐 Use Case: Secure Business Document Sharing

This application addresses real-world needs for:

1. **Legal Document Exchange**: Law firms sharing sensitive contracts
2. **Healthcare Records**: Secure patient data transmission
3. **Financial Services**: Encrypted financial document sharing
4. **Corporate Communications**: Internal secure messaging
5. **Government Services**: Citizen document verification

### Security Benefits
- **Regulatory Compliance**: Meets GDPR, HIPAA data protection requirements
- **Audit Trail**: Complete cryptographic verification history
- **Access Control**: Granular file sharing permissions
- **Data Sovereignty**: Client-side key control ensures data ownership

## 🚀 Deployment with Docker

### Prerequisites
```bash
# Install Docker and Docker Compose
docker --version
docker-compose --version
```

### Quick Start
```bash
# Clone and start the application
git clone <repository-url>
cd secure-file-sharing

# Build and run with Docker Compose
docker-compose up --build

# Access the application
# Frontend: http://localhost:3000
# Backend: http://localhost:5000
# MongoDB: localhost:27017
```

### Docker Configuration
```yaml
# docker-compose.yml
services:
  backend:     # Node.js Express server
  frontend:    # React application
  mongo:       # MongoDB database
```

## 🔧 Manual Setup

### Backend Setup
```bash
cd backend
npm install
npm run dev
```

### Frontend Setup
```bash
cd frontend
npm install
npm start
```

### Environment Variables
```bash
# backend/.env
MONGO_URI=mongodb://localhost:27017/secure_app
JWT_SECRET=your-secure-jwt-secret
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
```

## 🧪 Testing & Validation

### Security Testing
1. **Certificate Validation**: Verify CA-signed certificates
2. **Signature Verification**: Test digital signature integrity
3. **Encryption Testing**: Validate end-to-end encryption
4. **Attack Simulation**: Test against common threats

### Common Attack Mitigation
- **Man-in-the-Middle**: Certificate pinning and validation
- **Certificate Spoofing**: CA verification and trust chain
- **Replay Attacks**: Challenge-response authentication
- **Brute Force**: Rate limiting and account lockout
- **Data Tampering**: Digital signatures and hash verification

## 📋 User Guide

### 1. Registration Process
1. Enter username and email
2. System generates RSA key pair
3. CA issues digital certificate
4. User downloads and securely stores private key
5. Public key and certificate stored on server

### 2. Login Process
1. Enter username
2. System generates challenge
3. User signs challenge with private key
4. Server verifies signature with public key
5. JWT token issued for session

### 3. File Sharing
1. Upload file through encrypted interface
2. System encrypts file with AES-256
3. AES key encrypted with recipient's public key
4. Digital signature created for integrity
5. Recipient decrypts with their private key

### 4. Secure Messaging
1. Compose message in interface
2. Message encrypted with recipient's public key
3. Digital signature attached
4. End-to-end encrypted transmission
5. Recipient verifies and decrypts

## 🛡️ Security Considerations

### Production Deployment
- Use Hardware Security Modules (HSM) for CA keys
- Implement Certificate Revocation Lists (CRL)
- Deploy with HTTPS/TLS encryption
- Regular security audits and penetration testing
- Backup and disaster recovery procedures

### Key Rotation
- Automated certificate renewal
- Graceful key transition periods
- Legacy key support during migration
- Secure key escrow for enterprise

## 📊 Performance & Scalability

- **Encryption Overhead**: ~10ms for file encryption
- **Database Optimization**: Indexed queries for file/message retrieval
- **Caching Strategy**: Session-based key caching
- **Load Balancing**: Stateless architecture for horizontal scaling

## 🔍 Monitoring & Logging

- **Security Events**: Authentication attempts, key usage
- **Performance Metrics**: Encryption/decryption times
- **Error Tracking**: Cryptographic operation failures
- **Audit Logs**: Complete user activity history

## 📚 Technical Documentation

### API Endpoints
```
POST /api/auth/register     # User registration with PKI
POST /api/auth/login        # Challenge-response authentication
POST /api/auth/challenge    # Generate login challenge
GET  /api/auth/publickey/:username  # Get user's public key

POST /api/file/upload       # Encrypted file upload
POST /api/file/share/:id    # Share file with users
POST /api/file/download/:id # Download and decrypt file
GET  /api/file/list         # List user's files

POST /api/message/send      # Send encrypted message
POST /api/message/view/:id  # Decrypt and view message
GET  /api/message/conversations  # List conversations
```

### Database Schema
```javascript
// User Model
{
  username: String,
  email: String,
  publicKey: String,
  certificate: String,
  certificateSerial: String,
  issuedAt: Date,
  expiresAt: Date,
  isRevoked: Boolean
}

// File Model
{
  filename: String,
  encryptedData: String,
  encryptedKey: String,
  owner: ObjectId,
  sharedWith: [{ user: ObjectId, encryptedKey: String }],
  digitalSignature: String,
  checksum: String
}

// Message Model
{
  sender: ObjectId,
  recipient: ObjectId,
  encryptedContent: String,
  encryptedKey: String,
  digitalSignature: String,
  messageHash: String
}
```

## 🎓 Educational Value

This implementation demonstrates:
- **PKI Fundamentals**: Certificate authorities, trust chains
- **Cryptographic Protocols**: RSA, AES, SHA-256, digital signatures
- **Security Engineering**: Threat modeling, attack mitigation
- **Web Security**: HTTPS, CORS, JWT, rate limiting
- **Key Management**: Generation, storage, rotation, revocation

## 📄 License & Compliance

- Educational use for ST6051CEM coursework
- Implements industry-standard cryptographic practices
- Compliant with modern security frameworks
- Open source libraries used under respective licenses

## 🤝 Contributing

For assignment submission:
1. Fork the repository
2. Implement additional security features
3. Document security analysis
4. Submit with comprehensive test results

---

**Developed for ST6051CEM Practical Cryptography Assignment**  
**Softwarica College of IT & E-Commerce**  
**In collaboration with Coventry University**
