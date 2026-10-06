import { ApiError } from './apiError';

// Мок "таблицы" чатов в localStorage. Один чат = одна сделка между кастомером и провайдером по конкретной заявке.
// Сессия, заявки и юзеры лежат в "таблицах" других моков — читаем их напрямую, как делал бы бэкенд
const DB_KEY = 'mockDb_chats';
// Сессия в sessionStorage — у каждой вкладки своя (см. mockAuthApi)
const SESSION_KEY = 'mockDb_session';
const REQUESTS_KEY = 'mockDb_requests';
const USERS_KEY = 'mockDb_users';
const NETWORK_DELAY_MS = 150;

function readJson(key) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? [];
  } catch {
    return [];
  }
}

function writeChats(chats) {
  localStorage.setItem(DB_KEY, JSON.stringify(chats));
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

function getFullName(user) {
  return user ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() : 'Unknown user';
}

// Находит чат и проверяет, что текущий юзер — его участник. Возвращает чат и роль юзера в нём
function findChatForUser(chats, chatId, userId) {
  const chat = chats.find((item) => item.id === chatId);
  if (!chat) {
    throw new ApiError('Chat not found', { status: 404 });
  }
  if (chat.customerId !== userId && chat.providerId !== userId) {
    throw new ApiError('You are not a participant of this chat', { status: 403 });
  }
  return { chat, role: chat.customerId === userId ? 'customer' : 'provider' };
}

// Провайдер всё ещё "принял" заявку? Если он передумал (отклонил), чат закрывается — писать и подтверждать нельзя
function isDealActive(chat) {
  const request = readJson(REQUESTS_KEY).find((item) => item.id === chat.requestId);
  const match = request?.matches?.find((item) => item.providerId === chat.providerId);
  return match?.status === 'accepted';
}

// Вид чата для фронта: добавляем роль юзера, собеседника, краткие данные заявки и признак активности
function toChatView(chat, role) {
  const users = readJson(USERS_KEY);
  const request = readJson(REQUESTS_KEY).find((item) => item.id === chat.requestId);
  const otherId = role === 'customer' ? chat.providerId : chat.customerId;

  return {
    id: chat.id,
    requestId: chat.requestId,
    myRole: role,
    otherName: getFullName(users.find((user) => user.id === otherId)),
    otherId,
    serviceDescription: request?.serviceDescription ?? '',
    messages: chat.messages,
    confirmations: chat.confirmations,
    workStartedAt: chat.workStartedAt,
    isActive: isDealActive(chat),
  };
}

// Чат создаётся только при взаимном мэтче: провайдер принял заявку, а кастомер нажал "перейти к сделке"
async function getOrCreateChat({ requestId, providerId }) {
  await delay();
  const userId = requireSession();

  const request = readJson(REQUESTS_KEY).find((item) => item.id === requestId);
  if (!request) {
    throw new ApiError('Request not found', { status: 404 });
  }
  if (request.userId !== userId) {
    throw new ApiError('Only the author of the request can start a deal', { status: 403 });
  }
  const match = request.matches?.find((item) => item.providerId === providerId);
  if (match?.status !== 'accepted') {
    throw new ApiError('The provider has not accepted this request', { status: 403 });
  }

  const chats = readJson(DB_KEY);
  let chat = chats.find((item) => item.requestId === requestId && item.providerId === providerId);
  if (!chat) {
    chat = {
      id: crypto.randomUUID(),
      requestId,
      customerId: userId,
      providerId,
      messages: [],
      // Работа считается начатой, когда подтвердили обе стороны
      confirmations: { customer: false, provider: false },
      workStartedAt: null,
      createdAt: new Date().toISOString(),
    };
    writeChats([...chats, chat]);
  }

  return toChatView(chat, 'customer');
}

async function getChat(chatId) {
  await delay(50);
  const userId = requireSession();

  const { chat, role } = findChatForUser(readJson(DB_KEY), chatId, userId);
  return toChatView(chat, role);
}

async function sendMessage(chatId, text) {
  await delay(50);
  const userId = requireSession();

  const trimmed = (text ?? '').trim();
  if (!trimmed) {
    throw new ApiError('Message cannot be empty', { status: 422, field: 'text' });
  }

  const chats = readJson(DB_KEY);
  const { chat, role } = findChatForUser(chats, chatId, userId);
  if (!isDealActive(chat)) {
    throw new ApiError('The provider has declined this request, the chat is closed', { status: 403 });
  }

  const updatedChat = {
    ...chat,
    messages: [...chat.messages, { id: crypto.randomUUID(), senderId: userId, text: trimmed, createdAt: new Date().toISOString() }],
  };
  writeChats(chats.map((item) => (item.id === chatId ? updatedChat : item)));

  return toChatView(updatedChat, role);
}

// Подтвердить (или отозвать подтверждение) начала работы. Когда подтвердили оба — фиксируем время старта,
// после этого решение провайдера по заявке уже нельзя менять, а подтверждение отозвать нельзя
async function setWorkConfirmation(chatId, confirmed) {
  await delay();
  const userId = requireSession();

  const chats = readJson(DB_KEY);
  const { chat, role } = findChatForUser(chats, chatId, userId);
  if (chat.workStartedAt) {
    throw new ApiError('Work has already started', { status: 409 });
  }
  if (!isDealActive(chat)) {
    throw new ApiError('The provider has declined this request, the chat is closed', { status: 403 });
  }

  const confirmations = { ...chat.confirmations, [role]: Boolean(confirmed) };
  const updatedChat = {
    ...chat,
    confirmations,
    workStartedAt: confirmations.customer && confirmations.provider ? new Date().toISOString() : null,
  };
  writeChats(chats.map((item) => (item.id === chatId ? updatedChat : item)));

  return toChatView(updatedChat, role);
}

export const mockChatApi = { getOrCreateChat, getChat, sendMessage, setWorkConfirmation };
