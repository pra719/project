# Secure File Sharing & Messaging Application with PKI

A comprehensive web application implementing Public Key Infrastructure (PKI) for secure user authentication, file sharing, and messaging using cryptographic primitives.

## Features

- **Secure User Authentication**: PKI-based authentication with digital certificates
- **File Sharing**: Encrypted file sharing between users using public/private key cryptography
- **Secure Messaging**: End-to-end encrypted messaging
- **Key Management**: Client-side key generation and storage
- **Digital Signatures**: Document signing and verification
- **Beautiful UI**: Modern and responsive web interface

## Architecture

```
├── backend/                 # Express.js API server
│   ├── src/
│   │   ├── controllers/     # API controllers
│   │   ├── middleware/      # Authentication & security middleware
│   │   ├── models/          # Database models
│   │   ├── routes/          # API routes
│   │   ├── services/        # Business logic services
│   │   └── utils/           # Utility functions
│   ├── uploads/             # Temporary file storage
│   └── certificates/        # CA certificates
├── frontend/                # React.js client application
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── pages/           # Page components
│   │   ├── services/        # API services
│   │   ├── utils/           # Crypto utilities (client-side)
│   │   └── styles/          # CSS/SCSS styles
│   └── public/              # Static assets
├── database/                # Database configuration
├── docker/                  # Docker configuration
└── docs/                    # Documentation
```

## Security Features

1. **Confidentiality**: AES-256 encryption for files and messages
2. **Integrity**: SHA-256 hashing and digital signatures
3. **Authentication**: RSA-based PKI with digital certificates
4. **Non-repudiation**: Digital signatures for accountability

## Technologies Used

- **Backend**: Node.js, Express.js, PostgreSQL
- **Frontend**: React.js, Material-UI, Web Crypto API
- **Cryptography**: Node.js crypto module, Web Crypto API
- **Containerization**: Docker & Docker Compose

## Getting Started

1. Clone the repository
2. Run `docker-compose up --build`
3. Access the application at `http://localhost:3000`

## Key Management

- **Key Generation**: RSA 2048-bit keys generated client-side
- **Key Storage**: Private keys stored in browser's IndexedDB (encrypted)
- **Public Keys**: Stored on server with digital certificates
- **Certificate Authority**: Self-signed CA for development

## Use Case: Secure Business Document Management

This application addresses the real-world need for secure document sharing in business environments where:
- Legal documents require digital signatures
- Confidential files need secure transmission
- User identity verification is crucial
- Audit trails are necessary for compliance
