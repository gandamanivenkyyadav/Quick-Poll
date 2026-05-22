import axios from 'axios';

/**
 * Axios instance with base URL.
 * The Authorization header is automatically set when a token exists in localStorage.
 */
const api = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_URL ? `${import.meta.env.VITE_BACKEND_URL}/api` : '/api',
  withCredentials: true // send cookies with requests
});

// Request interceptor: attach JWT from localStorage
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('qp_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  // Attach guest creator token for poll management
  const creatorToken = localStorage.getItem('qp_creator_token');
  if (creatorToken) {
    config.headers['x-creator-token'] = creatorToken;
  }
  return config;
});

// Response interceptor: handle 401 (expired/invalid token)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('qp_token');
      localStorage.removeItem('qp_user');
    }
    return Promise.reject(error);
  }
);

export default api;
