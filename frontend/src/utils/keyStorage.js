// Key Storage Utility for Client-Side Key Management
// Note: In a production environment, you would use hardware security modules (HSM) 
// or secure key storage. This is a demo implementation.

class KeyStorage {
  constructor() {
    this.keys = new Map(); // In-memory storage
    this.sessionKeys = new Map(); // Session-specific keys
  }

  // Store keys temporarily in memory (lost on page refresh)
  storeKeysInMemory(userId, publicKey, privateKey, certificate) {
    this.keys.set(userId, {
      publicKey,
      privateKey,
      certificate,
      timestamp: Date.now()
    });
  }

  // Get keys from memory
  getKeysFromMemory(userId) {
    return this.keys.get(userId);
  }

  // Store keys for current session only
  storeSessionKeys(userId, publicKey, privateKey, certificate) {
    const keyData = {
      publicKey,
      privateKey,
      certificate,
      timestamp: Date.now()
    };
    
    this.sessionKeys.set(userId, keyData);
    
    // Also store in sessionStorage (cleared when tab closes)
    try {
      sessionStorage.setItem(`keys_${userId}`, JSON.stringify({
        publicKey,
        certificate,
        timestamp: Date.now()
        // Note: Private key is NOT stored in sessionStorage for security
      }));
    } catch (error) {
      console.warn('Failed to store keys in session storage:', error);
    }
  }

  // Get session keys
  getSessionKeys(userId) {
    // First try memory
    let keys = this.sessionKeys.get(userId);
    
    if (!keys) {
      // Try session storage (but private key won't be there)
      try {
        const stored = sessionStorage.getItem(`keys_${userId}`);
        if (stored) {
          const parsed = JSON.parse(stored);
          keys = {
            ...parsed,
            privateKey: null // Private key must be re-entered
          };
        }
      } catch (error) {
        console.warn('Failed to retrieve keys from session storage:', error);
      }
    }
    
    return keys;
  }

  // Clear all keys
  clearKeys(userId) {
    this.keys.delete(userId);
    this.sessionKeys.delete(userId);
    
    try {
      sessionStorage.removeItem(`keys_${userId}`);
    } catch (error) {
      console.warn('Failed to clear session storage:', error);
    }
  }

  // Clear all stored keys
  clearAllKeys() {
    this.keys.clear();
    this.sessionKeys.clear();
    
    try {
      // Clear all key-related items from session storage
      Object.keys(sessionStorage).forEach(key => {
        if (key.startsWith('keys_')) {
          sessionStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.warn('Failed to clear session storage:', error);
    }
  }

  // Check if user has keys stored
  hasKeys(userId) {
    return this.sessionKeys.has(userId) || this.keys.has(userId);
  }

  // Get public key only (for sharing with others)
  getPublicKey(userId) {
    const keys = this.getSessionKeys(userId) || this.getKeysFromMemory(userId);
    return keys ? keys.publicKey : null;
  }

  // Validate stored keys
  validateKeys(userId) {
    const keys = this.getSessionKeys(userId) || this.getKeysFromMemory(userId);
    
    if (!keys) return false;
    
    // Check if keys are expired (24 hours)
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    if (Date.now() - keys.timestamp > maxAge) {
      this.clearKeys(userId);
      return false;
    }
    
    // Validate key format
    return keys.publicKey && keys.certificate;
  }

  // Export keys for backup (user initiated)
  exportKeys(userId, password) {
    const keys = this.getSessionKeys(userId) || this.getKeysFromMemory(userId);
    
    if (!keys) {
      throw new Error('No keys found for user');
    }
    
    // In a real implementation, you would encrypt the keys with the password
    // This is a simplified version for demo purposes
    return {
      publicKey: keys.publicKey,
      certificate: keys.certificate,
      exportedAt: new Date().toISOString(),
      // Private key should be encrypted with user password before export
      encryptedPrivateKey: `ENCRYPTED_WITH_PASSWORD:${password}_${keys.privateKey}`
    };
  }

  // Import keys from backup
  importKeys(userId, keyData, password) {
    // In a real implementation, you would decrypt the private key with the password
    // This is a simplified version for demo purposes
    
    if (keyData.encryptedPrivateKey.startsWith(`ENCRYPTED_WITH_PASSWORD:${password}_`)) {
      const privateKey = keyData.encryptedPrivateKey.replace(`ENCRYPTED_WITH_PASSWORD:${password}_`, '');
      
      this.storeSessionKeys(userId, keyData.publicKey, privateKey, keyData.certificate);
      return true;
    }
    
    throw new Error('Invalid password or corrupted key data');
  }
}

// Create singleton instance
const keyStorage = new KeyStorage();

export default keyStorage;