import { mockAuthApi } from './mockAuthApi';
import { realAuthApi } from './realAuthApi';

// Единственное место переключения между моком и реальным бэкендом.
// Поставь VITE_API_MODE=real в .env, когда бэкенд будет готов.
const useMock = import.meta.env.VITE_API_MODE !== 'real';

export const authApi = useMock ? mockAuthApi : realAuthApi;
