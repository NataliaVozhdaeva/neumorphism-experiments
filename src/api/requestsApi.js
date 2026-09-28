import { mockRequestsApi } from './mockRequestsApi';
import { realRequestsApi } from './realRequestsApi';

// Переключение мок/реальный бэкенд — по той же переменной, что и в authApi.js
const useMock = import.meta.env.VITE_API_MODE !== 'real';

export const requestsApi = useMock ? mockRequestsApi : realRequestsApi;
