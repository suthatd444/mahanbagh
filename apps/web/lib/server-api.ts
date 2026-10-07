import axios from 'axios';

export const serverApi = axios.create({
  baseURL: process.env.API_BASE_URL ?? 'https://crm.mohanbagh.in/backend/api/v1',
  headers: {
    Accept: 'application/json',
  },
  validateStatus: () => true,
});
