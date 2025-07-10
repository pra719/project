const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: `${API_BASE_URL}/api/auth/login`,
    REGISTER: `${API_BASE_URL}/api/auth/register`,
    CHALLENGE: `${API_BASE_URL}/api/auth/challenge`,
    PUBLIC_KEY: (username) => `${API_BASE_URL}/api/auth/publickey/${username}`,
    CA_CERT: `${API_BASE_URL}/api/auth/ca-certificate`,
  },
  FILE: {
    UPLOAD: `${API_BASE_URL}/api/file/upload`,
    LIST: `${API_BASE_URL}/api/file/list`,
    DOWNLOAD: (fileId) => `${API_BASE_URL}/api/file/download/${fileId}`,
    INFO: (fileId) => `${API_BASE_URL}/api/file/info/${fileId}`,
    SHARE: (fileId) => `${API_BASE_URL}/api/file/share/${fileId}`,
    DELETE: (fileId) => `${API_BASE_URL}/api/file/${fileId}`,
  },
  MESSAGE: {
    SEND: `${API_BASE_URL}/api/message/send`,
    LIST: `${API_BASE_URL}/api/message/list`,
    DELETE: (messageId) => `${API_BASE_URL}/api/message/${messageId}`,
  },
  TEST: `${API_BASE_URL}/api/test`
};

// Configure axios defaults
import axios from 'axios';

// Create axios instance with better configuration
const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 second timeout
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add retry logic for network errors
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Request interceptor
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Add retry count to config
    config._retryCount = config._retryCount || 0;
    
    console.log(`Making request to: ${config.url}`);
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor with retry logic
axiosInstance.interceptors.response.use(
  (response) => {
    console.log(`Successful response from: ${response.config.url}`);
    return response;
  },
  async (error) => {
    const config = error.config;
    
    // Check if it's a network error and we haven't exceeded max retries
    if (
      (!error.response || error.code === 'NETWORK_ERROR' || error.code === 'ECONNREFUSED') &&
      config &&
      config._retryCount < MAX_RETRIES
    ) {
      config._retryCount += 1;
      console.log(`Retrying request (${config._retryCount}/${MAX_RETRIES}) to: ${config.url}`);
      
      // Wait before retrying
      await sleep(RETRY_DELAY * config._retryCount);
      
      return axiosInstance(config);
    }
    
    // Handle authentication errors
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('privateKey');
      window.location.href = '/login';
    }
    
    console.error(`Request failed to: ${config?.url}`, error);
    return Promise.reject(error);
  }
);

// Test connectivity function
export const testConnectivity = async () => {
  try {
    const response = await axiosInstance.get('/api/test');
    return response.data;
  } catch (error) {
    console.error('Connectivity test failed:', error);
    throw error;
  }
};

// Export the configured axios instance as default
export default axiosInstance;

// Keep the old export for backward compatibility
export { API_BASE_URL };