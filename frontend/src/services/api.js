import axios from 'axios'

// Create axios instance with default config
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
})

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Remove invalid token and redirect to login
      localStorage.removeItem('authToken')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// Authentication APIs
export const authAPI = {
  // Register new user
  register: async (userData) => {
    const response = await api.post('/auth/register', userData)
    return response.data
  },

  // Login user
  login: async (credentials) => {
    const response = await api.post('/auth/login', credentials)
    return response.data
  },

  // Logout user
  logout: async () => {
    const response = await api.post('/auth/logout')
    return response.data
  },

  // Get user profile
  getProfile: async () => {
    const response = await api.get('/auth/profile')
    return response.data
  },

  // Change password
  changePassword: async (passwordData) => {
    const response = await api.post('/auth/change-password', passwordData)
    return response.data
  },

  // Get CA certificate
  getCACertificate: async () => {
    const response = await api.get('/auth/ca-certificate')
    return response.data
  },

  // Verify certificate
  verifyCertificate: async (certificate) => {
    const response = await api.post('/auth/verify-certificate', { certificate })
    return response.data
  },
}

// File APIs
export const fileAPI = {
  // Upload file
  uploadFile: async (formData) => {
    const response = await api.post('/files/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  },

  // Get user files
  getFiles: async (params = {}) => {
    const response = await api.get('/files', { params })
    return response.data
  },

  // Get file details
  getFileDetails: async (fileId) => {
    const response = await api.get(`/files/${fileId}`)
    return response.data
  },

  // Download file
  downloadFile: async (fileId, privateKey) => {
    const response = await api.get(`/files/${fileId}/download`, {
      params: { privateKey },
      responseType: 'blob',
    })
    return response
  },

  // Share file
  shareFile: async (fileId, shareData) => {
    const response = await api.post(`/files/${fileId}/share`, shareData)
    return response.data
  },

  // Verify file signature
  verifyFileSignature: async (fileId, privateKey) => {
    const response = await api.post(`/files/${fileId}/verify-signature`, { privateKey })
    return response.data
  },

  // Delete file
  deleteFile: async (fileId) => {
    const response = await api.delete(`/files/${fileId}`)
    return response.data
  },
}

// Message APIs
export const messageAPI = {
  // Send message
  sendMessage: async (messageData) => {
    const response = await api.post('/messages/send', messageData)
    return response.data
  },

  // Get messages
  getMessages: async (params = {}) => {
    const response = await api.get('/messages', { params })
    return response.data
  },

  // Get specific message
  getMessage: async (messageId, privateKey) => {
    const response = await api.get(`/messages/${messageId}`, {
      params: { privateKey },
    })
    return response.data
  },

  // Get conversation
  getConversation: async (username, params = {}) => {
    const response = await api.get(`/messages/conversations/${username}`, { params })
    return response.data
  },

  // Verify message signature
  verifyMessageSignature: async (messageId, privateKey) => {
    const response = await api.post(`/messages/${messageId}/verify-signature`, { privateKey })
    return response.data
  },

  // Delete message
  deleteMessage: async (messageId) => {
    const response = await api.delete(`/messages/${messageId}`)
    return response.data
  },

  // Get message statistics
  getMessageStats: async () => {
    const response = await api.get('/messages/stats')
    return response.data
  },
}

// User APIs
export const userAPI = {
  // Search users
  searchUsers: async (query, limit = 10) => {
    const response = await api.get('/users/search', {
      params: { q: query, limit },
    })
    return response.data
  },

  // Get user's public key
  getUserPublicKey: async (username) => {
    const response = await api.get(`/users/${username}/public-key`)
    return response.data
  },

  // Get online users
  getOnlineUsers: async () => {
    const response = await api.get('/users/online')
    return response.data
  },

  // Admin APIs
  admin: {
    // Get all users
    getUsers: async (params = {}) => {
      const response = await api.get('/users/list', { params })
      return response.data
    },

    // Get user details
    getUserDetails: async (userId) => {
      const response = await api.get(`/users/${userId}/details`)
      return response.data
    },

    // Change user status
    changeUserStatus: async (userId, isActive) => {
      const response = await api.put(`/users/${userId}/status`, { isActive })
      return response.data
    },

    // Get user statistics
    getUserStats: async () => {
      const response = await api.get('/users/stats')
      return response.data
    },

    // Get recent activity
    getRecentActivity: async (limit = 50) => {
      const response = await api.get('/users/recent-activity', {
        params: { limit },
      })
      return response.data
    },
  },
}

// Utility function to handle API errors
export const handleAPIError = (error) => {
  if (error.response) {
    // Server responded with error status
    const { data, status } = error.response
    return {
      message: data.message || 'An error occurred',
      status,
      errors: data.errors || [],
    }
  } else if (error.request) {
    // Request made but no response received
    return {
      message: 'Network error - please check your connection',
      status: 0,
    }
  } else {
    // Something else happened
    return {
      message: error.message || 'An unexpected error occurred',
      status: 0,
    }
  }
}

// Health check function
export const healthCheck = async () => {
  try {
    const response = await api.get('/health')
    return response.data
  } catch (error) {
    throw handleAPIError(error)
  }
}

export default api