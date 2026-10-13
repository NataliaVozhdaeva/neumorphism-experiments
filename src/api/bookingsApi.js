import { mockBookingsApi } from './mockBookingsApi';
import { realBookingsApi } from './realBookingsApi';

// Переключение мок/реальный бэкенд — по той же переменной, что и в authApi.js
const useMock = import.meta.env.VITE_API_MODE !== 'real';

export const bookingsApi = useMock ? mockBookingsApi : realBookingsApi;
