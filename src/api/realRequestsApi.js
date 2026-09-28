import { request } from './realAuthApi';

// Реализация на реальном бэкенде — интерфейс идентичен mockRequestsApi.js
async function createRequest({ location, serviceDescription, budgetFrom = null, budgetTo = null }) {
  return request('/requests', { body: JSON.stringify({ location, serviceDescription, budgetFrom, budgetTo }) });
}

async function getMyRequests() {
  return request('/requests', { method: 'GET' });
}

export const realRequestsApi = { createRequest, getMyRequests };
