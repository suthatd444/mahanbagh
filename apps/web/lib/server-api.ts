import axios from 'axios';

export const serverApi = axios.create({
  baseURL: process.env.API_BASE_URL ?? 'http://localhost:3001/api/v1',
  headers: {
    Accept: 'application/json',
  },
  validateStatus: () => true,
});
