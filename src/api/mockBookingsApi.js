import { ApiError } from './apiError';
import { DEFAULT_AVAILABILITY, getAvailableSlots, toMinutes, toTime } from '../utils/availability';

// Мок "таблицы" записей в localStorage — сессия и юзеры общие с mockAuthApi
const DB_KEY = 'mockDb_bookings';
const USERS_KEY = 'mockDb_users';
// Сессия в sessionStorage — у каждой вкладки своя (см. mockAuthApi)
const SESSION_KEY = 'mockDb_session';
const NETWORK_DELAY_MS = 400;

function readBookings() {
  try {
    return JSON.parse(localStorage.getItem(DB_KEY)) ?? [];
  } catch {
    return [];
  }
}

function writeBookings(bookings) {
  localStorage.setItem(DB_KEY, JSON.stringify(bookings));
}

function readUsers() {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY)) ?? [];
  } catch {
    return [];
  }
}

function delay(ms = NETWORK_DELAY_MS) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getSessionUser() {
  const sessionId = sessionStorage.getItem(SESSION_KEY);
  const user = readUsers().find((candidate) => candidate.id === sessionId);
  if (!user) throw new ApiError('Not authenticated', { status: 401 });
  return user;
}

function getPartner(partnerId) {
  const partner = readUsers().find((candidate) => candidate.id === partnerId && candidate.role === 'partner');
  if (!partner) throw new ApiError('Partner not found', { status: 404 });
  return partner;
}

// Свободные слоты партнёра на дату — ['09:00', '10:00', ...]
async function getSlots(partnerId, date) {
  await delay(200);

  const partner = getPartner(partnerId);
  const availability = partner.availability ?? DEFAULT_AVAILABILITY;
  const bookings = readBookings().filter((booking) => booking.partnerId === partnerId);

  return getAvailableSlots(availability, bookings, date);
}

async function createBooking({ partnerId, date, start, note = '' }) {
  await delay();

  const customer = getSessionUser();
  if (customer.role !== 'customer') {
    throw new ApiError('Only customers can book appointments', { status: 403 });
  }

  const partner = getPartner(partnerId);
  const availability = partner.availability ?? DEFAULT_AVAILABILITY;
  const bookings = readBookings();

  // Слот перепроверяем при создании: пока кастомер выбирал, его мог занять другой
  const freeSlots = getAvailableSlots(
    availability,
    bookings.filter((booking) => booking.partnerId === partnerId),
    date,
  );
  if (!freeSlots.includes(start)) {
    throw new ApiError('This time slot is no longer available', { status: 409, field: 'start' });
  }

  const newBooking = {
    id: crypto.randomUUID(),
    partnerId,
    customerId: customer.id,
    customerName: `${customer.firstName ?? ''} ${customer.lastName ?? ''}`.trim() || customer.email,
    date,
    start,
    end: toTime(toMinutes(start) + availability.slotMinutes),
    note,
    status: 'confirmed',
    createdAt: new Date().toISOString(),
  };

  writeBookings([...bookings, newBooking]);
  return newBooking;
}

// Записи текущего юзера: у кастомера — его записи, у партнёра — записи к нему
async function getMyBookings() {
  await delay();

  const user = getSessionUser();
  const field = user.role === 'partner' ? 'partnerId' : 'customerId';

  return readBookings()
    .filter((booking) => booking[field] === user.id)
    .sort((a, b) => `${a.date} ${a.start}`.localeCompare(`${b.date} ${b.start}`));
}

// Отменить может и кастомер, и партнёр; слот при этом снова становится свободным
async function cancelBooking(id) {
  await delay();

  const user = getSessionUser();
  const bookings = readBookings();
  const index = bookings.findIndex((booking) => booking.id === id);

  if (index === -1) throw new ApiError('Booking not found', { status: 404 });
  if (bookings[index].customerId !== user.id && bookings[index].partnerId !== user.id) {
    throw new ApiError('Not allowed', { status: 403 });
  }

  bookings[index] = { ...bookings[index], status: 'cancelled', cancelledBy: user.role };
  writeBookings(bookings);
  return bookings[index];
}

export const mockBookingsApi = { getSlots, createBooking, getMyBookings, cancelBooking };
