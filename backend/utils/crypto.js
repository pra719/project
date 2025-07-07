const crypto = require('crypto');
const forge = require('node-forge');

class CryptoUtils {
  // Generate RSA key pair (2048-bit)
  static generateKeyPair() {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem'
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem'
      }
    });
    return { publicKey, privateKey };
  }

  // Generate AES key for symmetric encryption
  static generateAESKey() {
    return crypto.randomBytes(32); // 256-bit key
  }

  // Encrypt data using AES
  static encryptAES(data, key) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher('aes-256-cbc', key);
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return {
      iv: iv.toString('hex'),
      encryptedData: encrypted
    };
  }

  // Decrypt data using AES
  static decryptAES(encryptedData, key, iv) {
    const decipher = crypto.createDecipher('aes-256-cbc', key);
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  // Encrypt data using RSA public key
  static encryptRSA(data, publicKey) {
    return crypto.publicEncrypt(publicKey, Buffer.from(data)).toString('base64');
  }

  // Decrypt data using RSA private key
  static decryptRSA(encryptedData, privateKey) {
    return crypto.privateDecrypt(privateKey, Buffer.from(encryptedData, 'base64')).toString();
  }

  // Create digital signature
  static createSignature(data, privateKey) {
    const sign = crypto.createSign('SHA256');
    sign.update(data);
    sign.end();
    return sign.sign(privateKey, 'hex');
  }

  // Verify digital signature
  static verifySignature(data, signature, publicKey) {
    const verify = crypto.createVerify('SHA256');
    verify.update(data);
    verify.end();
    return verify.verify(publicKey, signature, 'hex');
  }

  // Generate hash
  static generateHash(data) {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  // Generate certificate serial number
  static generateSerial() {
    return crypto.randomBytes(16).toString('hex');
  }

  // Create X.509 certificate using node-forge
  static createCertificate(publicKeyPem, privateKeyPem, subject, issuer, serialNumber) {
    const publicKey = forge.pki.publicKeyFromPem(publicKeyPem);
    const privateKey = forge.pki.privateKeyFromPem(privateKeyPem);

    const cert = forge.pki.createCertificate();
    cert.publicKey = publicKey;
    cert.serialNumber = serialNumber;
    cert.validity.notBefore = new Date();
    cert.validity.notAfter = new Date();
    cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 1);

    const attrs = [
      { name: 'commonName', value: subject.commonName },
      { name: 'organizationName', value: subject.organizationName || 'Secure File Sharing' },
      { name: 'emailAddress', value: subject.emailAddress }
    ];

    cert.setSubject(attrs);
    cert.setIssuer(issuer || attrs);

    // Add extensions
    cert.setExtensions([
      {
        name: 'basicConstraints',
        cA: false
      },
      {
        name: 'keyUsage',
        digitalSignature: true,
        nonRepudiation: true,
        keyEncipherment: true,
        dataEncipherment: true
      },
      {
        name: 'extKeyUsage',
        serverAuth: true,
        clientAuth: true,
        emailProtection: true
      }
    ]);

    // Sign the certificate
    cert.sign(privateKey, forge.md.sha256.create());

    return forge.pki.certificateToPem(cert);
  }

  // Verify certificate
  static verifyCertificate(certPem, caCertPem) {
    try {
      const cert = forge.pki.certificateFromPem(certPem);
      const caCert = forge.pki.certificateFromPem(caCertPem);
      
      // Check if certificate is still valid
      const now = new Date();
      if (now < cert.validity.notBefore || now > cert.validity.notAfter) {
        return false;
      }

      // Verify signature (if CA cert is provided)
      if (caCertPem) {
        return caCert.publicKey.verify(
          cert.tbsCertificate,
          cert.signature,
          forge.md.sha256.create()
        );
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  // Extract public key from certificate
  static getPublicKeyFromCert(certPem) {
    try {
      const cert = forge.pki.certificateFromPem(certPem);
      return forge.pki.publicKeyToPem(cert.publicKey);
    } catch (error) {
      throw new Error('Invalid certificate');
    }
  }
}

module.exports = CryptoUtils;