const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: `${API_BASE_URL}/api/auth/login`,
    REGISTER: `${API_BASE_URL}/api/auth/register`,
  },
  FILE: {
    UPLOAD: `${API_BASE_URL}/api/file/upload`,
    LIST: `${API_BASE_URL}/api/file/list`,
    DOWNLOAD: (fileId) => `${API_BASE_URL}/api/file/download/${fileId}`,
  },
  MESSAGE: {
    SEND: `${API_BASE_URL}/api/message/send`,
    LIST: `${API_BASE_URL}/api/message/list`,
  }
};

export default API_BASE_URL;