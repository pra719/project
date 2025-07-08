const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: `${API_BASE_URL}/api/auth/login`,
    REGISTER: `${API_BASE_URL}/api/auth/register`,
  },
  FILES: {
    UPLOAD: `${API_BASE_URL}/api/files/upload`,
    LIST: `${API_BASE_URL}/api/files/list`,
    DOWNLOAD: (fileId) => `${API_BASE_URL}/api/files/download/${fileId}`,
    SHARE: `${API_BASE_URL}/api/files/share`,
  },
  MESSAGES: {
    SEND: `${API_BASE_URL}/api/messages/send`,
    LIST: `${API_BASE_URL}/api/messages/list`,
    DECRYPT: (messageId) => `${API_BASE_URL}/api/messages/${messageId}/decrypt`,
  }
};

export default API_BASE_URL;