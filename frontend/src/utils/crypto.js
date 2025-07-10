import forge from 'node-forge';

class ClientCrypto {
  // Generate challenge signature for login - FIXED: Now returns hex format to match backend
  static signChallenge(challenge, privateKeyPem) {
    try {
      const privateKey = forge.pki.privateKeyFromPem(privateKeyPem);
      const md = forge.md.sha256.create();
      md.update(challenge, 'utf8');
      const signature = privateKey.sign(md);
      return forge.util.bytesToHex(signature); // Changed from encode64 to bytesToHex
    } catch (error) {
      throw new Error('Failed to sign challenge: ' + error.message);
    }
  }

  // Verify digital signature
  static verifySignature(data, signature, publicKeyPem) {
    try {
      const publicKey = forge.pki.publicKeyFromPem(publicKeyPem);
      const md = forge.md.sha256.create();
      md.update(data, 'utf8');
      const signatureBytes = forge.util.hexToBytes(signature); // Updated to handle hex format
      return publicKey.verify(md.digest().bytes(), signatureBytes);
    } catch (error) {
      return false;
    }
  }

  // Create digital signature - FIXED: Now returns hex format to match backend
  static createSignature(data, privateKeyPem) {
    try {
      const privateKey = forge.pki.privateKeyFromPem(privateKeyPem);
      const md = forge.md.sha256.create();
      md.update(data, 'utf8');
      const signature = privateKey.sign(md);
      return forge.util.bytesToHex(signature); // Changed from encode64 to bytesToHex
    } catch (error) {
      throw new Error('Failed to create signature: ' + error.message);
    }
  }

  // Encrypt data with public key (for small data like AES keys)
  static encryptWithPublicKey(data, publicKeyPem) {
    try {
      const publicKey = forge.pki.publicKeyFromPem(publicKeyPem);
      const encrypted = publicKey.encrypt(data, 'RSA-OAEP');
      return forge.util.encode64(encrypted);
    } catch (error) {
      throw new Error('Failed to encrypt with public key: ' + error.message);
    }
  }

  // Decrypt data with private key
  static decryptWithPrivateKey(encryptedData, privateKeyPem) {
    try {
      const privateKey = forge.pki.privateKeyFromPem(privateKeyPem);
      const encrypted = forge.util.decode64(encryptedData);
      const decrypted = privateKey.decrypt(encrypted, 'RSA-OAEP');
      return decrypted;
    } catch (error) {
      throw new Error('Failed to decrypt with private key: ' + error.message);
    }
  }

  // Generate random AES key
  static generateAESKey() {
    return forge.random.getBytesSync(32); // 256-bit key
  }

  // Encrypt data with AES
  static encryptAES(data, key) {
    try {
      const cipher = forge.cipher.createCipher('AES-CBC', key);
      const iv = forge.random.getBytesSync(16);
      cipher.start({ iv: iv });
      cipher.update(forge.util.createBuffer(data, 'utf8'));
      cipher.finish();
      
      return {
        encrypted: forge.util.encode64(cipher.output.data),
        iv: forge.util.encode64(iv)
      };
    } catch (error) {
      throw new Error('Failed to encrypt with AES: ' + error.message);
    }
  }

  // Decrypt data with AES
  static decryptAES(encryptedData, key, iv) {
    try {
      const decipher = forge.cipher.createDecipher('AES-CBC', key);
      const encryptedBytes = forge.util.decode64(encryptedData);
      const ivBytes = forge.util.decode64(iv);
      
      decipher.start({ iv: ivBytes });
      decipher.update(forge.util.createBuffer(encryptedBytes));
      decipher.finish();
      
      return decipher.output.toString('utf8');
    } catch (error) {
      throw new Error('Failed to decrypt with AES: ' + error.message);
    }
  }

  // Generate hash
  static generateHash(data) {
    const md = forge.md.sha256.create();
    md.update(data, 'utf8');
    return md.digest().toHex();
  }

  // Validate PEM format
  static isValidPEM(pem, type = 'PRIVATE KEY') {
    try {
      const regex = new RegExp(`-----BEGIN ${type}-----[\\s\\S]*-----END ${type}-----`);
      return regex.test(pem);
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
      throw new Error('Failed to extract public key from certificate');
    }
  }

  // Verify certificate validity
  static verifyCertificate(certPem) {
    try {
      const cert = forge.pki.certificateFromPem(certPem);
      const now = new Date();
      return now >= cert.validity.notBefore && now <= cert.validity.notAfter;
    } catch (error) {
      return false;
    }
  }
}

export default ClientCrypto;