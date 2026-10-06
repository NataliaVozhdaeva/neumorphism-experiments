import { mockChatApi } from './mockChatApi';
import { realChatApi } from './realChatApi';

// Переключение мок/реальный бэкенд — по той же переменной, что и в authApi.js
const useMock = import.meta.env.VITE_API_MODE !== 'real';

export const chatApi = useMock ? mockChatApi : realChatApi;
