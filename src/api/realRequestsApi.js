import { request } from './realAuthApi';

// Реализация на реальном бэкенде — интерфейс идентичен mockRequestsApi.js
async function createRequest({ location, serviceDescription, budgetFrom = null, budgetTo = null, currency = null, schedule = null }) {
  return request('/requests', { body: JSON.stringify({ location, serviceDescription, budgetFrom, budgetTo, currency, schedule }) });
}

async function getMyRequests() {
  return request('/requests', { method: 'GET' });
}

async function deleteRequest(id) {
  return request(`/requests/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export const realRequestsApi = { createRequest, getMyRequests, deleteRequest };
