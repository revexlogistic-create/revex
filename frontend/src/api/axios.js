// src/api/axios.js — Instance Axios avec intercepteurs JWT
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || '/api',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' }
});

// Intercepteur réponse : refresh token automatique
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(({ resolve, reject }) => error ? reject(error) : resolve(token));
  failedQueue = [];
};

api.interceptors.response.use(
  res => res,
  async error => {
    const original = error.config;

    // ── Erreur 402 : jetons insuffisants ──────────────────────
    if (error.response?.status === 402 && error.response?.data?.code === 'INSUFFICIENT_TOKENS') {
      const { required, available, message } = error.response.data;
      const msg = `🪙 ${message || 'Jetons insuffisants'}\n\nVoulez-vous recharger votre compte ?`;
      if (window.confirm(msg)) {
        window.location.href = '/tokens';
      }
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && error.response?.data?.code === 'TOKEN_EXPIRED' && !original._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(token => { original.headers['Authorization'] = `Bearer ${token}`; return api(original); });
      }
      original._retry = true;
      isRefreshing = true;
      const refreshToken = localStorage.getItem('revex_refresh');
      try {
        const { data } = await axios.post('/api/auth/refresh', { refreshToken });
        const newToken = data.tokens.access;
        localStorage.setItem('revex_token', newToken);
        localStorage.setItem('revex_refresh', data.tokens.refresh);
        api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
        processQueue(null, newToken);
        original.headers['Authorization'] = `Bearer ${newToken}`;
        return api(original);
      } catch (err) {
        processQueue(err, null);
        localStorage.removeItem('revex_token');
        localStorage.removeItem('revex_refresh');
        window.location.href = '/login';
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  }
);

export default api;
