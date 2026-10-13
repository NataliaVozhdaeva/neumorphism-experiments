// Доступность провайдера:
//   weekly          — рабочие часы по дням недели, несколько интервалов в день
//   slotMinutes     — длительность одного слота
//   blockedPeriods  — закрытые периоды { id, from, to } включительно (to === from — один день)
// Даты — строки 'YYYY-MM-DD', время — 'HH:MM'. Часовые пояса в прототипе не учитываем:
// всё считается локальным временем провайдера

export const WEEK_DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

// Если провайдер ещё не настроил доступность — по умолчанию пн–пт, 9:00–17:00
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
};

// Записи в этих статусах занимают слот; отменённые — нет
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

// День недели по дате; 'T00:00' — чтобы дата не съехала из-за часового пояса (как в schedule.js)
function getWeekDay(dateISO) {
  return WEEK_DAYS[new Date(`${dateISO}T00:00`).getDay()];
}

export function isDateBlocked(availability, dateISO) {
  // Строки 'YYYY-MM-DD' можно сравнивать напрямую
  return availability.blockedPeriods.some((period) => dateISO >= period.from && dateISO <= period.to);
}

// Свободные слоты на дату — массив начал слотов ['09:00', '10:00', ...].
// `now` параметром, чтобы функцию было легко проверять на любой дате
export function getAvailableSlots(availability, bookings, dateISO, now = new Date()) {
  if (isDateBlocked(availability, dateISO)) return [];

  const { weekly, slotMinutes } = availability;
  const intervals = weekly[getWeekDay(dateISO)] ?? [];

  const busy = bookings
    .filter((booking) => booking.date === dateISO && ACTIVE_BOOKING_STATUSES.includes(booking.status))
    .map((booking) => ({ start: toMinutes(booking.start), end: toMinutes(booking.end) }));

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
      if (!isPast && !isBusy) slots.push(toTime(start));
    }
  }

  return slots;
}
