import { request } from './realAuthApi';

// Реализация на реальном бэкенде — интерфейс идентичен mockBookingsApi.js
async function getSlots(partnerId, date) {
  return request(`/partners/${encodeURIComponent(partnerId)}/slots?date=${encodeURIComponent(date)}`, { method: 'GET' });
}

async function createBooking({ partnerId, date, start, note = '' }) {
  return request('/bookings', { body: JSON.stringify({ partnerId, date, start, note }) });
}

async function getMyBookings() {
  return request('/bookings', { method: 'GET' });
}

async function cancelBooking(id) {
  return request(`/bookings/${encodeURIComponent(id)}/cancel`, { method: 'PUT' });
}

export const realBookingsApi = { getSlots, createBooking, getMyBookings, cancelBooking };
