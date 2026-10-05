import { ApiError } from './apiError';
import { findMatches } from './matching';

// Мок "таблицы" заявок в localStorage — сессия общая с mockAuthApi
const DB_KEY = 'mockDb_requests';
const SESSION_KEY = 'mockDb_session';
// Юзеры лежат в "таблице" mockAuthApi — читаем её напрямую, как делал бы бэкенд
const USERS_KEY = 'mockDb_users';
const NETWORK_DELAY_MS = 400;

function readRequests() {
  try {
    return JSON.parse(localStorage.getItem(DB_KEY)) ?? [];
  } catch {
    return [];
  }
}

function readUsers() {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY)) ?? [];
  } catch {
    return [];
  }
}

function writeRequests(requests) {
  localStorage.setItem(DB_KEY, JSON.stringify(requests));
}

function delay(ms = NETWORK_DELAY_MS) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function requireSession() {
  const sessionId = localStorage.getItem(SESSION_KEY);
  if (!sessionId) {
    throw new ApiError('Not authenticated', { status: 401 });
  }
  return sessionId;
}

async function createRequest({ location, serviceDescription, budgetFrom = null, budgetTo = null, currency = null, schedule = null }) {
  await delay();
  const userId = requireSession();

  if (!location) {
    throw new ApiError('Location is required', { status: 422, field: 'location' });
  }
  if (!serviceDescription) {
    throw new ApiError('Service description is required', { status: 422, field: 'serviceDescription' });
  }
  if (budgetFrom !== null && budgetTo !== null && budgetFrom > budgetTo) {
    throw new ApiError('Minimum budget cannot be greater than maximum budget', { status: 422, field: 'budgetFrom' });
  }
  if (schedule?.type !== 'once' && schedule?.type !== 'recurring') {
    throw new ApiError('Schedule is required', { status: 422, field: 'schedule' });
  }

  const newRequest = {
    id: crypto.randomUUID(),
    userId,
    location,
    serviceDescription,
    budgetFrom,
    budgetTo,
    currency,
    schedule,
    createdAt: new Date().toISOString(),
  };

  // AI проверяет заявку и подбирает топ-3 провайдера. Если AI признал заявку бессмысленной (422) —
  // пробрасываем ошибку и заявку не создаём. Любой другой сбой (лимит, сеть, нет ключа) не должен
  // терять заявку: сохраняем её без мэтчей и с текстом ошибки
  const providers = readUsers().filter((candidate) => candidate.role === 'provider');
  try {
    newRequest.matches = await findMatches(newRequest, providers);
    newRequest.matchingError = null;
  } catch (err) {
    if (err.status === 422) throw err;
    newRequest.matches = [];
    newRequest.matchingError = err.message;
  }

  writeRequests([...readRequests(), newRequest]);
  return newRequest;
}

// Заявки текущего пользователя, новые сверху
async function getMyRequests() {
  await delay(100);
  const userId = requireSession();

  return readRequests()
    .filter((item) => item.userId === userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

// Заявки, в которых текущий провайдер попал в топ-3, — с его процентом мэтча и именем кастомера
async function getIncomingRequests() {
  await delay(100);
  const userId = requireSession();
  const users = readUsers();

  return readRequests()
    .filter((item) => item.matches?.some((match) => match.providerId === userId))
    .map((item) => {
      const customer = users.find((candidate) => candidate.id === item.userId);
      return {
        ...item,
        myMatch: item.matches.find((match) => match.providerId === userId),
        customerName: customer ? `${customer.firstName ?? ''} ${customer.lastName ?? ''}`.trim() : 'Unknown customer',
      };
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

// Удалить можно только свою заявку
async function deleteRequest(id) {
  await delay();
  const userId = requireSession();

  const requests = readRequests();
  const target = requests.find((item) => item.id === id);
  if (!target) {
    throw new ApiError('Request not found', { status: 404 });
  }
  if (target.userId !== userId) {
    throw new ApiError('You can only delete your own requests', { status: 403 });
  }

  writeRequests(requests.filter((item) => item.id !== id));
}

export const mockRequestsApi = { createRequest, getMyRequests, getIncomingRequests, deleteRequest };
