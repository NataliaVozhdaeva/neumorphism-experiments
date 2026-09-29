import { ApiError } from './apiError';

// Мок "таблицы" заявок в localStorage — сессия общая с mockAuthApi
const DB_KEY = 'mockDb_requests';
const SESSION_KEY = 'mockDb_session';
const NETWORK_DELAY_MS = 400;

function readRequests() {
  try {
    return JSON.parse(localStorage.getItem(DB_KEY)) ?? [];
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

export const mockRequestsApi = { createRequest, getMyRequests, deleteRequest };
