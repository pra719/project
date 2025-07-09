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
  }
};

// Configure axios defaults
import axios from 'axios';

axios.defaults.baseURL = API_BASE_URL;
axios.defaults.headers.common['Content-Type'] = 'application/json';

// Add auth token to requests
axios.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default API_BASE_URL;