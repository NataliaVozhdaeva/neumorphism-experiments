import { ApiError } from './apiError';
import { EMPTY_AVAILABILITY, getAvailableSlots, toMinutes, toTime, SLOT_DURATION_OPTIONS, BREAK_OPTIONS } from '../utils/availability';

const DB_KEY = 'mockDb_bookings';
const USERS_KEY = 'mockDb_users';
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

function writeUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
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

async function getSlots(partnerId, date, duration) {
  await delay(200);

  const partner = getPartner(partnerId);
  const availability = partner.availability ?? EMPTY_AVAILABILITY;
  const bookings = readBookings().filter((booking) => booking.partnerId === partnerId);

  return getAvailableSlots(availability, bookings, date, duration);
}

async function createBooking({ partnerId, date, start, duration, note = '' }) {
  await delay();

  const customer = getSessionUser();
  if (customer.role !== 'customer') {
    throw new ApiError('Only customers can book appointments', { status: 403 });
  }

  const partner = getPartner(partnerId);
  const availability = partner.availability ?? EMPTY_AVAILABILITY;
  if (!(availability.slotDurations ?? [60]).includes(duration)) {
    throw new ApiError('This appointment length is not offered', {
      status: 400,
      field: 'duration',
    });
  }

  const bookings = readBookings();

  const freeSlots = getAvailableSlots(
    availability,
    bookings.filter((booking) => booking.partnerId === partnerId),
    date,
    duration,
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
    end: toTime(toMinutes(start) + duration),
    note,
    status: 'confirmed',
    createdAt: new Date().toISOString(),
  };

  writeBookings([...bookings, newBooking]);
  return newBooking;
}

async function getMyBookings() {
  await delay();

  const user = getSessionUser();
  const field = user.role === 'partner' ? 'partnerId' : 'customerId';

  return readBookings()
    .filter((booking) => booking[field] === user.id)
    .sort((a, b) => `${a.date} ${a.start}`.localeCompare(`${b.date} ${b.start}`));
}

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

async function blockRange({ date, from, to }) {
  await delay();

  const user = getSessionUser();
  if (user.role !== 'partner') {
    throw new ApiError('Only partners can block slots', { status: 403 });
  }

  if (toMinutes(from) >= toMinutes(to)) {
    throw new ApiError('"From" must be earlier than "to"', { status: 400 });
  }

  const availability = user.availability ?? EMPTY_AVAILABILITY;
  const newSlot = { id: crypto.randomUUID(), date, from, to };

  const updatedUser = {
    ...user,
    availability: { ...availability, blockedRanges: [...(availability.blockedRanges ?? []), newSlot] },
  };

  writeUsers(readUsers().map((candidate) => (candidate.id === user.id ? updatedUser : candidate)));
  return newSlot;
}

async function unblockRange(id) {
  await delay();

  const user = getSessionUser();
  if (user.role !== 'partner') {
    throw new ApiError('Only partners can unblock slots', { status: 403 });
  }

  const availability = user.availability ?? EMPTY_AVAILABILITY;
  const blockedRanges = availability.blockedRanges ?? [];
  if (!blockedRanges.some((slot) => slot.id === id)) {
    throw new ApiError('Blocked slot not found', { status: 404 });
  }

  const updatedUser = {
    ...user,
    availability: { ...availability, blockedRanges: blockedRanges.filter((slot) => slot.id !== id) },
  };

  writeUsers(readUsers().map((candidate) => (candidate.id === user.id ? updatedUser : candidate)));
}

async function getMyAvailability() {
  await delay();

  const user = getSessionUser();
  if (user.role !== 'partner') {
    throw new ApiError('Only partners have availability', { status: 403 });
  }

  return user.availability ?? EMPTY_AVAILABILITY;
}

async function saveWeekly(weekly) {
  await delay();

  const user = getSessionUser();
  if (user.role !== 'partner') {
    throw new ApiError('Only partners can edit schedule', { status: 403 });
  }

  const availability = user.availability ?? EMPTY_AVAILABILITY;
  const updatedUser = {
    ...user,
    availability: { ...availability, weekly: { ...availability.weekly, ...weekly } },
  };

  writeUsers(readUsers().map((candidate) => (candidate.id === user.id ? updatedUser : candidate)));
  return updatedUser.availability;
}

async function saveSettings(settings) {
  await delay();

  const user = getSessionUser();
  if (user.role !== 'partner') {
    throw new ApiError('Only partners have availability', { status: 403 });
  }

  const availability = user.availability ?? EMPTY_AVAILABILITY;

  if (settings.slotDurations) {
    const isValid = settings.slotDurations.length > 0 && settings.slotDurations.every((item) => SLOT_DURATION_OPTIONS.includes(item));
    if (!isValid) throw new ApiError('Choose at least one valid appointment length', { status: 400 });
  }

  if (settings.breakMinutes !== undefined && !BREAK_OPTIONS.includes(settings.breakMinutes)) {
    throw new ApiError('Invalid break length', { status: 400 });
  }

  if (settings.fixedBreaks?.some((item) => toMinutes(item.from) >= toMinutes(item.to))) {
    throw new ApiError('"From" must be earlier than "to"', { status: 400 });
  }

  const updatedUser = {
    ...user,
    availability: { ...availability, ...settings },
  };

  writeUsers(readUsers().map((candidate) => (candidate.id === user.id ? updatedUser : candidate)));

  return updatedUser.availability;
}

async function getBookingOptions(partnerId) {
  await delay(200);
  const partner = getPartner(partnerId);
  const availability = partner.availability ?? EMPTY_AVAILABILITY;
  return { slotDurations: availability.slotDurations ?? [60] };
}

export const mockBookingsApi = {
  getSlots,
  createBooking,
  getMyBookings,
  cancelBooking,
  blockRange,
  unblockRange,
  getMyAvailability,
  saveWeekly,
  getBookingOptions,
  saveSettings,
};
