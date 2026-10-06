import { ApiError } from './apiError';
import { findMatches } from './matching';

// Мок "таблицы" заявок в localStorage — сессия общая с mockAuthApi
const DB_KEY = 'mockDb_requests';
// Сессия в sessionStorage — у каждой вкладки своя (см. mockAuthApi)
const SESSION_KEY = 'mockDb_session';
// Юзеры лежат в "таблице" mockAuthApi — читаем её напрямую, как делал бы бэкенд
const USERS_KEY = 'mockDb_users';
// Чаты (сделки) лежат в "таблице" mockChatApi
const CHATS_KEY = 'mockDb_chats';
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

function readChats() {
  try {
    return JSON.parse(localStorage.getItem(CHATS_KEY)) ?? [];
  } catch {
    return [];
  }
}

function writeChats(chats) {
  localStorage.setItem(CHATS_KEY, JSON.stringify(chats));
}

function writeRequests(requests) {
  localStorage.setItem(DB_KEY, JSON.stringify(requests));
}

// Моковый рейтинг { average, count }: оценок в приложении пока нет, поэтому для демо выдаём
// стабильное число от 3.8 до 5.0, посчитанное по id юзера. Если у юзера появится своё поле rating — берём его
function getMockRating(user) {
  if (user?.rating) return user.rating;
  let hash = 0;
  for (const char of user?.id ?? '') hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return { average: Math.round((3.8 + (hash % 13) / 10) * 10) / 10, count: 3 + (hash % 38) };
}

// Добавляет к мэтчу данные о сделке: id чата и началась ли работа. Статус по умолчанию 'pending' —
// у заявок, созданных до появления ответов провайдера, его нет
function withDealInfo(match, requestId, chats) {
  const chat = chats.find((item) => item.requestId === requestId && item.providerId === match.providerId);
  return {
    ...match,
    status: match.status ?? 'pending',
    dealId: chat?.id ?? null,
    workStarted: Boolean(chat?.workStartedAt),
  };
}

function delay(ms = NETWORK_DELAY_MS) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function requireSession() {
  const sessionId = sessionStorage.getItem(SESSION_KEY);
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
  // Расписание необязательно, но если передано — оно должно быть корректного типа
  if (schedule !== null && schedule?.type !== 'once' && schedule?.type !== 'recurring') {
    throw new ApiError('Schedule is invalid', { status: 422, field: 'schedule' });
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
    // Каждый провайдер из топа ещё должен ответить на заявку — пока статус 'pending'
    newRequest.matches = (await findMatches(newRequest, providers)).map((match) => ({ ...match, status: 'pending' }));
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

  const chats = readChats();
  const users = readUsers();
  return readRequests()
    .filter((item) => item.userId === userId)
    .map((item) => ({
      ...item,
      matches: item.matches?.map((match) => ({
        ...withDealInfo(match, item.id, chats),
        providerRating: getMockRating(users.find((candidate) => candidate.id === match.providerId)),
      })),
    }))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

// Заявки, в которых текущий провайдер попал в топ-3, — с его процентом мэтча и именем кастомера
async function getIncomingRequests() {
  await delay(100);
  const userId = requireSession();
  const users = readUsers();
  const chats = readChats();

  return readRequests()
    .filter((item) => item.matches?.some((match) => match.providerId === userId))
    .map((item) => {
      const customer = users.find((candidate) => candidate.id === item.userId);
      return {
        ...item,
        myMatch: withDealInfo(
          item.matches.find((match) => match.providerId === userId),
          item.id,
          chats,
        ),
        customerRating: getMockRating(customer),
        customerName: customer ? `${customer.firstName ?? ''} ${customer.lastName ?? ''}`.trim() : 'Unknown customer',
      };
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

// Провайдер отвечает на заявку, в которой попал в топ: 'accepted' или 'declined'.
// Решение можно менять, пока работа не началась (обе стороны не подтвердили старт в чате)
async function respondToRequest(id, status) {
  await delay();
  const userId = requireSession();

  if (status !== 'accepted' && status !== 'declined') {
    throw new ApiError('Status must be either "accepted" or "declined"', { status: 422, field: 'status' });
  }

  const requests = readRequests();
  const target = requests.find((item) => item.id === id);
  const match = target?.matches?.find((item) => item.providerId === userId);
  if (!target || !match) {
    throw new ApiError('Request not found', { status: 404 });
  }

  const chats = readChats();
  const chat = chats.find((item) => item.requestId === id && item.providerId === userId);
  if (chat?.workStartedAt) {
    throw new ApiError('Work has already started, the decision can no longer be changed', { status: 409 });
  }

  match.status = status;
  writeRequests(requests);

  // Если решение поменялось, прежние подтверждения старта работы теряют смысл
  if (chat) {
    writeChats(chats.map((item) => (item.id === chat.id ? { ...item, confirmations: { customer: false, provider: false } } : item)));
  }

  return { status };
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
  // Чаты удалённой заявки больше никому не нужны
  writeChats(readChats().filter((item) => item.requestId !== id));
}

export const mockRequestsApi = { createRequest, getMyRequests, getIncomingRequests, respondToRequest, deleteRequest };
