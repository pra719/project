import forge from 'node-forge'
import CryptoJS from 'crypto-js'
import { openDB } from 'idb'

// IndexedDB setup for secure key storage
const DB_NAME = 'SecureAppDB'
const DB_VERSION = 1
const KEYS_STORE = 'keys'

class CryptoUtils {
  constructor() {
    this.db = null
    this.initDB()
  }

  // Initialize IndexedDB
  async initDB() {
    try {
      this.db = await openDB(DB_NAME, DB_VERSION, {
        upgrade(db) {
          if (!db.objectStoreNames.contains(KEYS_STORE)) {
            db.createObjectStore(KEYS_STORE, { keyPath: 'id' })
          }
        },
      })
    } catch (error) {
      console.error('Failed to initialize IndexedDB:', error)
      throw new Error('Failed to initialize secure storage')
    }
  }

  // Generate RSA key pair (2048 bits)
  generateKeyPair() {
    try {
      const keyPair = forge.pki.rsa.generateKeyPair(2048)
      
      return {
        publicKey: forge.pki.publicKeyToPem(keyPair.publicKey),
        privateKey: forge.pki.privateKeyToPem(keyPair.privateKey)
      }
    } catch (error) {
      console.error('Key generation failed:', error)
      throw new Error('Failed to generate key pair')
    }
  }

  // Store private key securely in IndexedDB (encrypted with password)
  async storePrivateKey(privateKeyPem, password, username) {
    try {
      if (!this.db) await this.initDB()

      // Encrypt private key with password
      const encrypted = CryptoJS.AES.encrypt(privateKeyPem, password).toString()
      
      await this.db.put(KEYS_STORE, {
        id: username,
        encryptedPrivateKey: encrypted,
        timestamp: Date.now()
      })

      return true
    } catch (error) {
      console.error('Failed to store private key:', error)
      throw new Error('Failed to store private key securely')
    }
  }

  // Retrieve and decrypt private key
  async getPrivateKey(username, password) {
    try {
      if (!this.db) await this.initDB()

      const keyData = await this.db.get(KEYS_STORE, username)
      if (!keyData) {
        throw new Error('Private key not found')
      }

      // Decrypt private key
      const decryptedBytes = CryptoJS.AES.decrypt(keyData.encryptedPrivateKey, password)
      const privateKeyPem = decryptedBytes.toString(CryptoJS.enc.Utf8)

      if (!privateKeyPem) {
        throw new Error('Invalid password or corrupted key')
      }

      return privateKeyPem
    } catch (error) {
      console.error('Failed to retrieve private key:', error)
      throw new Error('Failed to retrieve private key')
    }
  }

  // Check if private key exists for user
  async hasPrivateKey(username) {
    try {
      if (!this.db) await this.initDB()
      const keyData = await this.db.get(KEYS_STORE, username)
      return !!keyData
    } catch (error) {
      return false
    }
  }

  // Delete stored private key
  async deletePrivateKey(username) {
    try {
      if (!this.db) await this.initDB()
      await this.db.delete(KEYS_STORE, username)
      return true
    } catch (error) {
      console.error('Failed to delete private key:', error)
      return false
    }
  }

  // Encrypt data with public key (RSA-OAEP)
  encryptWithPublicKey(data, publicKeyPem) {
    try {
      const publicKey = forge.pki.publicKeyFromPem(publicKeyPem)
      const encrypted = publicKey.encrypt(data, 'RSA-OAEP', {
        md: forge.md.sha256.create(),
        mgf1: { md: forge.md.sha256.create() }
      })
      return forge.util.encode64(encrypted)
    } catch (error) {
      console.error('Public key encryption failed:', error)
      throw new Error('Failed to encrypt data')
    }
  }

  // Decrypt data with private key (RSA-OAEP)
  decryptWithPrivateKey(encryptedData, privateKeyPem) {
    try {
      const privateKey = forge.pki.privateKeyFromPem(privateKeyPem)
      const encrypted = forge.util.decode64(encryptedData)
      const decrypted = privateKey.decrypt(encrypted, 'RSA-OAEP', {
        md: forge.md.sha256.create(),
        mgf1: { md: forge.md.sha256.create() }
      })
      return decrypted
    } catch (error) {
      console.error('Private key decryption failed:', error)
      throw new Error('Failed to decrypt data')
    }
  }

  // Sign data with private key
  signData(data, privateKeyPem) {
    try {
      const privateKey = forge.pki.privateKeyFromPem(privateKeyPem)
      const md = forge.md.sha256.create()
      md.update(data, 'utf8')
      const signature = privateKey.sign(md)
      return forge.util.encode64(signature)
    } catch (error) {
      console.error('Data signing failed:', error)
      throw new Error('Failed to sign data')
    }
  }

  // Verify signature with public key
  verifySignature(data, signature, publicKeyPem) {
    try {
      const publicKey = forge.pki.publicKeyFromPem(publicKeyPem)
      const md = forge.md.sha256.create()
      md.update(data, 'utf8')
      const decodedSignature = forge.util.decode64(signature)
      return publicKey.verify(md.digest().bytes(), decodedSignature)
    } catch (error) {
      console.error('Signature verification failed:', error)
      return false
    }
  }

  // Generate random AES key (256-bit)
  generateAESKey() {
    const key = forge.random.getBytesSync(32) // 256 bits
    return forge.util.encode64(key)
  }

  // Encrypt file with AES
  encryptFile(fileData, aesKey) {
    try {
      const key = forge.util.decode64(aesKey)
      const iv = forge.random.getBytesSync(16) // 128-bit IV for AES
      
      const cipher = forge.cipher.createCipher('AES-CBC', key)
      cipher.start({ iv: iv })
      cipher.update(forge.util.createBuffer(fileData))
      cipher.finish()
      
      const encrypted = cipher.output
      const result = forge.util.createBuffer()
      result.putBytes(iv)
      result.putBytes(encrypted.bytes())
      
      return forge.util.encode64(result.bytes())
    } catch (error) {
      console.error('File encryption failed:', error)
      throw new Error('Failed to encrypt file')
    }
  }

  // Decrypt file with AES
  decryptFile(encryptedData, aesKey) {
    try {
      const key = forge.util.decode64(aesKey)
      const data = forge.util.decode64(encryptedData)
      
      const iv = data.slice(0, 16) // First 16 bytes are IV
      const encrypted = data.slice(16) // Rest is encrypted data
      
      const decipher = forge.cipher.createDecipher('AES-CBC', key)
      decipher.start({ iv: iv })
      decipher.update(forge.util.createBuffer(encrypted))
      decipher.finish()
      
      return decipher.output.bytes()
    } catch (error) {
      console.error('File decryption failed:', error)
      throw new Error('Failed to decrypt file')
    }
  }

  // Hash data with SHA-256
  hashData(data) {
    try {
      const md = forge.md.sha256.create()
      md.update(data, 'utf8')
      return md.digest().toHex()
    } catch (error) {
      console.error('Data hashing failed:', error)
      throw new Error('Failed to hash data')
    }
  }

  // Verify certificate (basic validation)
  verifyCertificate(certificatePem, caCertificatePem) {
    try {
      const cert = forge.pki.certificateFromPem(certificatePem)
      const caCert = forge.pki.certificateFromPem(caCertificatePem)
      
      // Check if certificate was signed by CA
      const verified = caCert.verify(cert)
      
      // Check if certificate is not expired
      const now = new Date()
      const notExpired = now >= cert.validity.notBefore && now <= cert.validity.notAfter
      
      return {
        valid: verified && notExpired,
        expired: !notExpired,
        certificate: cert
      }
    } catch (error) {
      console.error('Certificate verification failed:', error)
      return { valid: false, error: error.message }
    }
  }

  // Convert file to ArrayBuffer
  async fileToArrayBuffer(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result)
      reader.onerror = reject
      reader.readAsArrayBuffer(file)
    })
  }

  // Convert ArrayBuffer to base64
  arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer)
    let binary = ''
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    return btoa(binary)
  }

  // Convert base64 to ArrayBuffer
  base64ToArrayBuffer(base64) {
    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i)
    }
    return bytes.buffer
  }

  // Generate secure random password
  generateSecurePassword(length = 16) {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*'
    let password = ''
    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * charset.length)
      password += charset[randomIndex]
    }
    return password
  }

  // Clear all stored keys (logout cleanup)
  async clearAllKeys() {
    try {
      if (!this.db) await this.initDB()
      const tx = this.db.transaction(KEYS_STORE, 'readwrite')
      await tx.objectStore(KEYS_STORE).clear()
      return true
    } catch (error) {
      console.error('Failed to clear keys:', error)
      return false
    }
  }
}

// Export singleton instance
export default new CryptoUtils()