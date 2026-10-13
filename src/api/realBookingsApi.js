import { request } from './realAuthApi';

// Реализация на реальном бэкенде — интерфейс идентичен mockBookingsApi.js
async function getSlots(providerId, date) {
  return request(`/providers/${encodeURIComponent(providerId)}/slots?date=${encodeURIComponent(date)}`, { method: 'GET' });
}

async function createBooking({ providerId, date, start, note = '' }) {
  return request('/bookings', { body: JSON.stringify({ providerId, date, start, note }) });
}

async function getMyBookings() {
  return request('/bookings', { method: 'GET' });
}

async function cancelBooking(id) {
  return request(`/bookings/${encodeURIComponent(id)}/cancel`, { method: 'PUT' });
}

export const realBookingsApi = { getSlots, createBooking, getMyBookings, cancelBooking };
