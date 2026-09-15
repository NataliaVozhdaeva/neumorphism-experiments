import { ApiError } from './apiError';

// Реализация на реальном бэкенде (Laravel) — интерфейс идентичен mockAuthApi.js,
// поэтому переключение между ними прозрачно для остального приложения
const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';

// Если авторизация будет через Laravel Sanctum (SPA, по кукам), перед login/register
// нужно будет сначала сходить за CSRF-кукой: GET `${BASE_URL}/sanctum/csrf-cookie`
async function request(path, options) {
  const response = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    credentials: 'include',
    ...options,
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    // Laravel возвращает ошибки валидации как { message, errors: { field: [msg, ...] } }
    const [field, messages] = Object.entries(data?.errors ?? {})[0] ?? [];
    throw new ApiError(messages?.[0] ?? data?.message ?? 'Something went wrong', {
      status: response.status,
      field: field ?? null,
    });
  }

  return data;
}

async function register({ email, password, repeatPassword, contact }) {
  return request('/auth/register', { body: JSON.stringify({ email, password, repeatPassword, contact }) });
}

async function login({ email, password }) {
  return request('/auth/login', { body: JSON.stringify({ email, password }) });
}

async function logout() {
  return request('/auth/logout', { method: 'POST' });
}

async function getCurrentUser() {
  return request('/auth/me', { method: 'GET' });
}

export const realAuthApi = { register, login, logout, getCurrentUser };
