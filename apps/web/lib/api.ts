import axios from 'axios';

export const api = axios.create({
  baseURL: '/api/v1',
  withCredentials: true,
  headers: {
    Accept: 'application/json',
  },
});

api.interceptors.request.use((config) => {
  config.withCredentials = true;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      error.response?.status === 401 &&
      typeof window !== 'undefined' &&
      window.location.pathname !== '/login'
    ) {
      window.location.assign('/login');
    }
    return Promise.reject(error);
  },
);
