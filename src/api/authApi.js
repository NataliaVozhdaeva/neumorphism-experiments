import { mockAuthApi, seedMockPartners } from './mockAuthApi';
import { realAuthApi } from './realAuthApi';
import { migrateProvidersToPartners } from './migratePartners';

// Единственное место переключения между моком и реальным бэкендом.
// Поставь VITE_API_MODE=real в .env, когда бэкенд будет готов.
const useMock = import.meta.env.VITE_API_MODE !== 'real';

// В мок-режиме при старте подкладываем тестовых партнёров для проверки AI-мэтчинга
if (useMock) {
  // Сначала переносим старые данные (provider → partner), потом сидим — иначе будут дубли
  migrateProvidersToPartners();
  seedMockPartners();
}

export const authApi = useMock ? mockAuthApi : realAuthApi;
