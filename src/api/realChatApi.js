import { request } from './realAuthApi';

// Реализация на реальном бэкенде — интерфейс идентичен mockChatApi.js
async function getOrCreateChat({ requestId, providerId }) {
  return request('/chats', { body: JSON.stringify({ requestId, providerId }) });
}

async function getChat(chatId) {
  return request(`/chats/${encodeURIComponent(chatId)}`, { method: 'GET' });
}

async function sendMessage(chatId, text) {
  return request(`/chats/${encodeURIComponent(chatId)}/messages`, { body: JSON.stringify({ text }) });
}

async function setWorkConfirmation(chatId, confirmed) {
  return request(`/chats/${encodeURIComponent(chatId)}/work-confirmation`, { method: 'PUT', body: JSON.stringify({ confirmed }) });
}

export const realChatApi = { getOrCreateChat, getChat, sendMessage, setWorkConfirmation };
