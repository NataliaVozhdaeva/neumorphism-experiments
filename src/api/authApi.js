import { mockAuthApi, seedMockProviders } from './mockAuthApi';
import { realAuthApi } from './realAuthApi';

// Единственное место переключения между моком и реальным бэкендом.
// Поставь VITE_API_MODE=real в .env, когда бэкенд будет готов.
const useMock = import.meta.env.VITE_API_MODE !== 'real';

// В мок-режиме при старте подкладываем тестовых провайдеров для проверки AI-мэтчинга
if (useMock) seedMockProviders();

export const authApi = useMock ? mockAuthApi : realAuthApi;
