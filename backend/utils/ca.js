const fs = require('fs-extra');
const path = require('path');
const CryptoUtils = require('./crypto');

class CertificateAuthority {
  constructor() {
    this.caDir = path.join(__dirname, '../ca');
    this.caKeyPath = path.join(this.caDir, 'ca-key.pem');
    this.caCertPath = path.join(this.caDir, 'ca-cert.pem');
  }

  // Initialize CA if it doesn't exist
  async initializeCA() {
    try {
      await fs.ensureDir(this.caDir);

      // Check if CA already exists
      if (await fs.pathExists(this.caKeyPath) && await fs.pathExists(this.caCertPath)) {
        console.log('CA already initialized');
        return;
      }

      console.log('Initializing Certificate Authority...');

      // Generate CA key pair
      const caKeys = CryptoUtils.generateKeyPair();
      
      // Create CA certificate
      const caSubject = {
        commonName: 'Secure File Sharing CA',
        organizationName: 'Secure File Sharing System',
        emailAddress: 'ca@securefilesharing.com'
      };

      const caSerial = CryptoUtils.generateSerial();
      const caCert = CryptoUtils.createCertificate(
        caKeys.publicKey,
        caKeys.privateKey,
        caSubject,
        null, // Self-signed
        caSerial
      );

      // Save CA private key and certificate
      await fs.writeFile(this.caKeyPath, caKeys.privateKey);
      await fs.writeFile(this.caCertPath, caCert);

      console.log('Certificate Authority initialized successfully');
    } catch (error) {
      console.error('Failed to initialize CA:', error);
      throw error;
    }
  }

  // Get CA certificate
  async getCACertificate() {
    try {
      if (!(await fs.pathExists(this.caCertPath))) {
        await this.initializeCA();
      }
      return await fs.readFile(this.caCertPath, 'utf8');
    } catch (error) {
      throw new Error('Failed to get CA certificate');
    }
  }

  // Get CA private key
  async getCAPrivateKey() {
    try {
      if (!(await fs.pathExists(this.caKeyPath))) {
        await this.initializeCA();
      }
      return await fs.readFile(this.caKeyPath, 'utf8');
    } catch (error) {
      throw new Error('Failed to get CA private key');
    }
  }

  // Issue certificate for user
  async issueCertificate(userPublicKey, userSubject) {
    try {
      const caPrivateKey = await this.getCAPrivateKey();
      const caCert = await this.getCACertificate();
      
      // Extract CA subject for issuer field
      const forge = require('node-forge');
      const caX509 = forge.pki.certificateFromPem(caCert);
      const caSubject = caX509.subject.attributes.map(attr => ({
        name: attr.name,
        value: attr.value
      }));

      const serial = CryptoUtils.generateSerial();
      
      // Create user certificate signed by CA
      const userCert = CryptoUtils.createCertificate(
        userPublicKey,
        caPrivateKey,
        userSubject,
        caSubject,
        serial
      );

      return {
        certificate: userCert,
        serial: serial,
        issuedAt: new Date(),
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year
      };
    } catch (error) {
      throw new Error('Failed to issue certificate: ' + error.message);
    }
  }

  // Verify certificate against CA
  async verifyCertificate(userCert) {
    try {
      const caCert = await this.getCACertificate();
      return CryptoUtils.verifyCertificate(userCert, caCert);
    } catch (error) {
      throw new Error('Failed to verify certificate');
    }
  }

  // Revoke certificate (for future implementation)
  async revokeCertificate(serial) {
    // In a production system, you would maintain a Certificate Revocation List (CRL)
    // For this demo, we'll implement a simple revocation check
    console.log(`Certificate ${serial} marked for revocation`);
    return true;
  }
}

module.exports = new CertificateAuthority();