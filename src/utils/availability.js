export const WEEK_DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

export const DEFAULT_AVAILABILITY = {
  weekly: {
    mon: [{ from: '09:00', to: '17:00' }],
    tue: [{ from: '09:00', to: '17:00' }],
    wed: [{ from: '09:00', to: '17:00' }],
    thu: [{ from: '09:00', to: '17:00' }],
    fri: [{ from: '09:00', to: '17:00' }],
    sat: [],
    sun: [],
  },
  slotMinutes: 60,
  blockedPeriods: [],
  blockedSlots: [],
};

export const ACTIVE_BOOKING_STATUSES = ['pending', 'confirmed'];

export function toMinutes(time) {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

export function toTime(totalMinutes) {
  const hours = String(Math.floor(totalMinutes / 60)).padStart(2, '0');
  const minutes = String(totalMinutes % 60).padStart(2, '0');
  return `${hours}:${minutes}`;
}

function getWeekDay(dateISO) {
  return WEEK_DAYS[new Date(`${dateISO}T00:00`).getDay()];
}

export function isDateBlocked(availability, dateISO) {
  return availability.blockedPeriods.some((period) => dateISO >= period.from && dateISO <= period.to);
}

export function getAvailableSlots(availability, bookings, dateISO, now = new Date()) {
  if (isDateBlocked(availability, dateISO)) return [];

  const { weekly, slotMinutes } = availability;
  const intervals = weekly[getWeekDay(dateISO)] ?? [];

  const busy = bookings
    .filter((booking) => booking.date === dateISO && ACTIVE_BOOKING_STATUSES.includes(booking.status))
    .map((booking) => ({ start: toMinutes(booking.start), end: toMinutes(booking.end) }));

  const blockedSlots = (availability.blockedSlots ?? []).filter((slot) => slot.date === dateISO).map((slot) => slot.start);

  const todayISO = now.toLocaleDateString('en-CA');
  if (dateISO < todayISO) return [];
  const nowMinutes = dateISO === todayISO ? now.getHours() * 60 + now.getMinutes() : -1;

  const slots = [];
  for (const interval of intervals) {
    const intervalEnd = toMinutes(interval.to);
    for (let start = toMinutes(interval.from); start + slotMinutes <= intervalEnd; start += slotMinutes) {
      const end = start + slotMinutes;
      const isPast = start <= nowMinutes;
      const isBusy = busy.some((booking) => start < booking.end && end > booking.start);
      const isBlocked = blockedSlots.includes(toTime(start));

      if (!isPast && !isBusy && !isBlocked) slots.push(toTime(start));
    }
  }

  return slots;
}

export function getDaySlots(availability, dateISO) {
  if (isDateBlocked(availability, dateISO)) return [];

  const { weekly, slotMinutes } = availability;
  const slots = [];
  for (const interval of weekly[getWeekDay(dateISO)] ?? []) {
    const intervalEnd = toMinutes(interval.to);
    for (let start = toMinutes(interval.from); start + slotMinutes <= intervalEnd; start += slotMinutes) {
      slots.push(toTime(start));
    }
  }

  return slots;
}
