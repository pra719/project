import React, { createContext, useContext } from 'react'
import cryptoUtils from '../utils/crypto'
import { authAPI } from '../services/api'

// Create context
const CryptoContext = createContext()

// Provider component
export const CryptoProvider = ({ children }) => {
  
  // Generate new key pair
  const generateKeyPair = () => {
    return cryptoUtils.generateKeyPair()
  }

  // Encrypt message for recipient
  const encryptMessage = async (message, recipientUsername) => {
    try {
      // Get recipient's public key
      const response = await authAPI.getUserPublicKey(recipientUsername)
      const recipientPublicKey = response.data.publicKey

      // Encrypt message with recipient's public key
      return cryptoUtils.encryptWithPublicKey(message, recipientPublicKey)
    } catch (error) {
      throw new Error('Failed to encrypt message: ' + error.message)
    }
  }

  // Decrypt message with user's private key
  const decryptMessage = (encryptedMessage, privateKey) => {
    try {
      return cryptoUtils.decryptWithPrivateKey(encryptedMessage, privateKey)
    } catch (error) {
      throw new Error('Failed to decrypt message: ' + error.message)
    }
  }

  // Sign data with private key
  const signData = (data, privateKey) => {
    try {
      return cryptoUtils.signData(data, privateKey)
    } catch (error) {
      throw new Error('Failed to sign data: ' + error.message)
    }
  }

  // Verify signature with public key
  const verifySignature = async (data, signature, signerUsername) => {
    try {
      // Get signer's public key
      const response = await authAPI.getUserPublicKey(signerUsername)
      const signerPublicKey = response.data.publicKey

      return cryptoUtils.verifySignature(data, signature, signerPublicKey)
    } catch (error) {
      throw new Error('Failed to verify signature: ' + error.message)
    }
  }

  // Encrypt file for sharing
  const encryptFile = async (fileData, recipientUsername) => {
    try {
      // Generate AES key for file encryption
      const aesKey = cryptoUtils.generateAESKey()

      // Encrypt file with AES
      const encryptedFile = cryptoUtils.encryptFile(fileData, aesKey)

      // Get recipient's public key
      const response = await authAPI.getUserPublicKey(recipientUsername)
      const recipientPublicKey = response.data.publicKey

      // Encrypt AES key with recipient's public key
      const encryptedKey = cryptoUtils.encryptWithPublicKey(aesKey, recipientPublicKey)

      return {
        encryptedFile,
        encryptedKey,
        aesKey // Keep for owner
      }
    } catch (error) {
      throw new Error('Failed to encrypt file: ' + error.message)
    }
  }

  // Decrypt file with user's private key
  const decryptFile = (encryptedFile, encryptedKey, privateKey) => {
    try {
      // Decrypt AES key with private key
      const aesKey = cryptoUtils.decryptWithPrivateKey(encryptedKey, privateKey)

      // Decrypt file with AES key
      return cryptoUtils.decryptFile(encryptedFile, aesKey)
    } catch (error) {
      throw new Error('Failed to decrypt file: ' + error.message)
    }
  }

  // Hash data for integrity checking
  const hashData = (data) => {
    return cryptoUtils.hashData(data)
  }

  // Verify certificate
  const verifyCertificate = async (certificate) => {
    try {
      // Get CA certificate
      const response = await authAPI.getCACertificate()
      const caCertificate = response.data.certificate

      return cryptoUtils.verifyCertificate(certificate, caCertificate)
    } catch (error) {
      throw new Error('Failed to verify certificate: ' + error.message)
    }
  }

  // Convert file to base64
  const fileToBase64 = async (file) => {
    try {
      const arrayBuffer = await cryptoUtils.fileToArrayBuffer(file)
      return cryptoUtils.arrayBufferToBase64(arrayBuffer)
    } catch (error) {
      throw new Error('Failed to convert file: ' + error.message)
    }
  }

  // Generate secure password
  const generateSecurePassword = (length = 16) => {
    return cryptoUtils.generateSecurePassword(length)
  }

  // Store private key securely
  const storePrivateKey = async (privateKey, password, username) => {
    return cryptoUtils.storePrivateKey(privateKey, password, username)
  }

  // Get private key
  const getPrivateKey = async (username, password) => {
    return cryptoUtils.getPrivateKey(username, password)
  }

  // Check if private key exists
  const hasPrivateKey = async (username) => {
    return cryptoUtils.hasPrivateKey(username)
  }

  // Delete private key
  const deletePrivateKey = async (username) => {
    return cryptoUtils.deletePrivateKey(username)
  }

  // Clear all keys
  const clearAllKeys = async () => {
    return cryptoUtils.clearAllKeys()
  }

  const value = {
    // Key management
    generateKeyPair,
    storePrivateKey,
    getPrivateKey,
    hasPrivateKey,
    deletePrivateKey,
    clearAllKeys,

    // Encryption/Decryption
    encryptMessage,
    decryptMessage,
    encryptFile,
    decryptFile,

    // Digital signatures
    signData,
    verifySignature,

    // Utilities
    hashData,
    verifyCertificate,
    fileToBase64,
    generateSecurePassword,
  }

  return <CryptoContext.Provider value={value}>{children}</CryptoContext.Provider>
}

// Custom hook to use crypto context
export const useCrypto = () => {
  const context = useContext(CryptoContext)
  if (!context) {
    throw new Error('useCrypto must be used within a CryptoProvider')
  }
  return context
}

export default CryptoContext