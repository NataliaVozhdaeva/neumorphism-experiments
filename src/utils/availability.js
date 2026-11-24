export const WEEK_DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
export const WORK_DAYS = ['mon', 'tue', 'wed', 'thu', 'fri'];

export const EMPTY_AVAILABILITY = {
  weekly: {
    mon: [],
    tue: [],
    wed: [],
    thu: [],
    fri: [],
    sat: [],
    sun: [],
  },
  blockedPeriods: [],
  slotDurations: [60],
  breakMinutes: 0,
  blockedRanges: [],
  fixedBreaks: [],
};

export const SLOT_DURATION_OPTIONS = [15, 30, 60];
export const BREAK_OPTIONS = [0, ...SLOT_DURATION_OPTIONS];

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

export function getAvailableSlots(availability, bookings, dateISO, duration, now = new Date()) {
  if (isDateBlocked(availability, dateISO)) return [];

  const { weekly, breakMinutes = 0 } = availability;
  const intervals = weekly[getWeekDay(dateISO)] ?? [];

  const busy = bookings
    .filter((booking) => booking.date === dateISO && ACTIVE_BOOKING_STATUSES.includes(booking.status))
    .map((booking) => ({ start: toMinutes(booking.start), end: toMinutes(booking.end) + breakMinutes }));

  const blockedRanges = (availability.blockedRanges ?? [])
    .filter((range) => range.date === dateISO)
    .map((range) => ({ start: toMinutes(range.from), end: toMinutes(range.to) }));
  const fixedBreaks = (availability.fixedBreaks ?? []).map((item) => ({
    start: toMinutes(item.from),
    end: toMinutes(item.to),
  }));
  const unavailable = [...blockedRanges, ...fixedBreaks];
  const todayISO = now.toLocaleDateString('en-CA');
  if (dateISO < todayISO) return [];
  const nowMinutes = dateISO === todayISO ? now.getHours() * 60 + now.getMinutes() : -1;

  const slots = [];
  for (const interval of intervals) {
    const intervalEnd = toMinutes(interval.to);
    for (let start = toMinutes(interval.from); start + duration <= intervalEnd; start += duration + breakMinutes) {
      const end = start + duration;
      const isPast = start <= nowMinutes;
      const endWithBreak = end + breakMinutes;
      const isBusy = busy.some((booking) => start < booking.end && endWithBreak > booking.start);
      const isBlocked = unavailable.some((range) => start < range.end && end > range.start);

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
