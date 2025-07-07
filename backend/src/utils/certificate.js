const forge = require('node-forge');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const db = require('../config/database');
const logger = require('./logger');

class CertificateAuthority {
    constructor() {
        this.caKeyPair = null;
        this.caCert = null;
        this.serialNumber = 1;
    }

    async initializeCA() {
        try {
            const caPath = path.join(__dirname, '../../certificates');
            const caKeyPath = path.join(caPath, 'ca-private-key.pem');
            const caCertPath = path.join(caPath, 'ca-certificate.pem');

            // Create certificates directory if it doesn't exist
            await fs.mkdir(caPath, { recursive: true });

            // Check if CA already exists
            try {
                const caKeyPem = await fs.readFile(caKeyPath, 'utf8');
                const caCertPem = await fs.readFile(caCertPath, 'utf8');
                
                this.caKeyPair = {
                    privateKey: forge.pki.privateKeyFromPem(caKeyPem),
                    publicKey: forge.pki.certificateFromPem(caCertPem).publicKey
                };
                this.caCert = forge.pki.certificateFromPem(caCertPem);
                
                logger.info('Existing CA loaded successfully');
                return;
            } catch (error) {
                logger.info('Creating new Certificate Authority...');
            }

            // Generate CA key pair
            this.caKeyPair = forge.pki.rsa.generateKeyPair(2048);

            // Create CA certificate
            this.caCert = forge.pki.createCertificate();
            this.caCert.publicKey = this.caKeyPair.publicKey;
            this.caCert.serialNumber = '01';
            this.caCert.validity.notBefore = new Date();
            this.caCert.validity.notAfter = new Date();
            this.caCert.validity.notAfter.setFullYear(this.caCert.validity.notBefore.getFullYear() + 10);

            const caAttrs = [{
                name: 'commonName',
                value: 'Secure App CA'
            }, {
                name: 'countryName',
                value: 'US'
            }, {
                name: 'stateOrProvinceName',
                value: 'California'
            }, {
                name: 'localityName',
                value: 'San Francisco'
            }, {
                name: 'organizationName',
                value: 'Secure App Inc'
            }, {
                name: 'organizationalUnitName',
                value: 'IT Department'
            }];

            this.caCert.setSubject(caAttrs);
            this.caCert.setIssuer(caAttrs);

            // Add extensions
            this.caCert.setExtensions([{
                name: 'basicConstraints',
                cA: true,
                critical: true
            }, {
                name: 'keyUsage',
                keyCertSign: true,
                cRLSign: true,
                critical: true
            }]);

            // Self-sign the CA certificate
            this.caCert.sign(this.caKeyPair.privateKey, forge.md.sha256.create());

            // Save CA key and certificate
            const caKeyPem = forge.pki.privateKeyToPem(this.caKeyPair.privateKey);
            const caCertPem = forge.pki.certificateToPem(this.caCert);

            await fs.writeFile(caKeyPath, caKeyPem);
            await fs.writeFile(caCertPath, caCertPem);

            logger.info('Certificate Authority created and saved successfully');

        } catch (error) {
            logger.error('Failed to initialize Certificate Authority:', error);
            throw error;
        }
    }

    async generateUserCertificate(userInfo, publicKeyPem) {
        try {
            if (!this.caKeyPair || !this.caCert) {
                throw new Error('Certificate Authority not initialized');
            }

            // Parse the user's public key
            const userPublicKey = forge.pki.publicKeyFromPem(publicKeyPem);

            // Create user certificate
            const userCert = forge.pki.createCertificate();
            userCert.publicKey = userPublicKey;
            userCert.serialNumber = (++this.serialNumber).toString();
            userCert.validity.notBefore = new Date();
            userCert.validity.notAfter = new Date();
            userCert.validity.notAfter.setFullYear(userCert.validity.notBefore.getFullYear() + 1);

            const userAttrs = [{
                name: 'commonName',
                value: userInfo.username
            }, {
                name: 'emailAddress',
                value: userInfo.email
            }, {
                name: 'countryName',
                value: 'US'
            }, {
                name: 'organizationName',
                value: 'Secure App Users'
            }];

            userCert.setSubject(userAttrs);
            userCert.setIssuer(this.caCert.subject.attributes);

            // Add extensions
            userCert.setExtensions([{
                name: 'basicConstraints',
                cA: false,
                critical: true
            }, {
                name: 'keyUsage',
                digitalSignature: true,
                keyEncipherment: true,
                critical: true
            }, {
                name: 'extKeyUsage',
                clientAuth: true,
                emailProtection: true
            }, {
                name: 'subjectAltName',
                altNames: [{
                    type: 1, // email
                    value: userInfo.email
                }]
            }]);

            // Sign the certificate with CA private key
            userCert.sign(this.caKeyPair.privateKey, forge.md.sha256.create());

            return {
                certificate: forge.pki.certificateToPem(userCert),
                serialNumber: userCert.serialNumber
            };

        } catch (error) {
            logger.error('Failed to generate user certificate:', error);
            throw error;
        }
    }

    async verifyCertificate(certificatePem) {
        try {
            const cert = forge.pki.certificateFromPem(certificatePem);
            
            // Verify the certificate was signed by our CA
            const verified = this.caCert.verify(cert);
            
            // Check if certificate is not expired
            const now = new Date();
            const notExpired = now >= cert.validity.notBefore && now <= cert.validity.notAfter;
            
            // Check if certificate is not revoked
            const isRevoked = await this.isCertificateRevoked(cert.serialNumber);
            
            return {
                valid: verified && notExpired && !isRevoked,
                expired: !notExpired,
                revoked: isRevoked,
                certificate: cert
            };

        } catch (error) {
            logger.error('Failed to verify certificate:', error);
            return { valid: false, error: error.message };
        }
    }

    async revokeCertificate(serialNumber, reason = 'unspecified') {
        try {
            const query = `
                INSERT INTO revoked_certificates (certificate_serial, reason)
                VALUES ($1, $2)
                ON CONFLICT (certificate_serial) DO NOTHING
            `;
            await db.query(query, [serialNumber, reason]);
            
            logger.info(`Certificate ${serialNumber} revoked for reason: ${reason}`);
            return true;

        } catch (error) {
            logger.error('Failed to revoke certificate:', error);
            throw error;
        }
    }

    async isCertificateRevoked(serialNumber) {
        try {
            const query = 'SELECT id FROM revoked_certificates WHERE certificate_serial = $1';
            const result = await db.query(query, [serialNumber]);
            return result.rows.length > 0;

        } catch (error) {
            logger.error('Failed to check certificate revocation status:', error);
            return false;
        }
    }

    getCACertificate() {
        return this.caCert ? forge.pki.certificateToPem(this.caCert) : null;
    }
}

// Cryptographic utilities
class CryptoUtils {
    static generateKeyPair() {
        try {
            const keyPair = forge.pki.rsa.generateKeyPair(2048);
            return {
                publicKey: forge.pki.publicKeyToPem(keyPair.publicKey),
                privateKey: forge.pki.privateKeyToPem(keyPair.privateKey)
            };
        } catch (error) {
            logger.error('Failed to generate key pair:', error);
            throw error;
        }
    }

    static signData(data, privateKeyPem) {
        try {
            const privateKey = forge.pki.privateKeyFromPem(privateKeyPem);
            const md = forge.md.sha256.create();
            md.update(data, 'utf8');
            const signature = privateKey.sign(md);
            return forge.util.encode64(signature);
        } catch (error) {
            logger.error('Failed to sign data:', error);
            throw error;
        }
    }

    static verifySignature(data, signature, publicKeyPem) {
        try {
            const publicKey = forge.pki.publicKeyFromPem(publicKeyPem);
            const md = forge.md.sha256.create();
            md.update(data, 'utf8');
            const decodedSignature = forge.util.decode64(signature);
            return publicKey.verify(md.digest().bytes(), decodedSignature);
        } catch (error) {
            logger.error('Failed to verify signature:', error);
            return false;
        }
    }

    static encryptWithPublicKey(data, publicKeyPem) {
        try {
            const publicKey = forge.pki.publicKeyFromPem(publicKeyPem);
            const encrypted = publicKey.encrypt(data, 'RSA-OAEP', {
                md: forge.md.sha256.create(),
                mgf1: { md: forge.md.sha256.create() }
            });
            return forge.util.encode64(encrypted);
        } catch (error) {
            logger.error('Failed to encrypt with public key:', error);
            throw error;
        }
    }

    static decryptWithPrivateKey(encryptedData, privateKeyPem) {
        try {
            const privateKey = forge.pki.privateKeyFromPem(privateKeyPem);
            const encrypted = forge.util.decode64(encryptedData);
            const decrypted = privateKey.decrypt(encrypted, 'RSA-OAEP', {
                md: forge.md.sha256.create(),
                mgf1: { md: forge.md.sha256.create() }
            });
            return decrypted;
        } catch (error) {
            logger.error('Failed to decrypt with private key:', error);
            throw error;
        }
    }

    static generateAESKey() {
        return crypto.randomBytes(32).toString('base64'); // 256-bit key
    }

    static encryptAES(data, key) {
        try {
            const iv = crypto.randomBytes(16);
            const cipher = crypto.createCipher('aes-256-cbc', Buffer.from(key, 'base64'));
            cipher.setAutoPadding(true);
            
            let encrypted = cipher.update(data, 'utf8', 'base64');
            encrypted += cipher.final('base64');
            
            return {
                encrypted,
                iv: iv.toString('base64')
            };
        } catch (error) {
            logger.error('Failed to encrypt with AES:', error);
            throw error;
        }
    }

    static decryptAES(encryptedData, key, iv) {
        try {
            const decipher = crypto.createDecipher('aes-256-cbc', Buffer.from(key, 'base64'));
            decipher.setAutoPadding(true);
            
            let decrypted = decipher.update(encryptedData, 'base64', 'utf8');
            decrypted += decipher.final('utf8');
            
            return decrypted;
        } catch (error) {
            logger.error('Failed to decrypt with AES:', error);
            throw error;
        }
    }

    static hashData(data) {
        return crypto.createHash('sha256').update(data).digest('hex');
    }
}

// Global CA instance
const ca = new CertificateAuthority();

// Initialize CA
async function initializeCertificateAuthority() {
    await ca.initializeCA();
}

module.exports = {
    CertificateAuthority,
    CryptoUtils,
    ca,
    initializeCertificateAuthority
};