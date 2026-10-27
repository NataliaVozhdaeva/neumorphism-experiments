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

async function getMyAvailability() {
  return request('/partners/me/availability', { method: 'GET' });
}

async function blockSlot({ date, start }) {
  return request('/partners/me/blocked-slots', { body: JSON.stringify({ date, start }) });
}

async function unblockSlot(id) {
  return request(`/partners/me/blocked-slots/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export const realBookingsApi = { getSlots, createBooking, getMyBookings, cancelBooking, getMyAvailability, blockSlot, unblockSlot };
