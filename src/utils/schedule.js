// Расписание заявки:
//   null                                                        — срок не указан (Flexible)
//   { type: 'once', dateFrom, dateTo }                          — один раз в окне дат (dateTo может быть null — конкретный день)
//   { type: 'recurring', interval, unit, startDate, endDate }  — "каждые N дней/недель/месяцев", endDate может быть null
// Даты храним строками 'YYYY-MM-DD', как их отдаёт <input type='date'> — такие строки можно сравнивать напрямую

export const FREQUENCY_OPTIONS = [
  // Срок необязателен: кастомер может не знать, сколько времени нужно, — тогда расписания нет (null)
  { value: 'flexible', label: 'Flexible' },
  { value: 'once', label: 'One-time' },
  { value: 'recurring', label: 'Recurring' },
];

export const UNIT_OPTIONS = [
  { value: 'day', label: 'days' },
  { value: 'week', label: 'weeks' },
  { value: 'month', label: 'months' },
];

// Сегодняшняя дата в формате 'YYYY-MM-DD' по локальному времени (toISOString дал бы дату по UTC)
export function todayISO() {
  return new Date().toLocaleDateString('en-CA');
}

function formatDate(isoDate) {
  // 'T00:00' — чтобы дата не съехала на день назад из-за часового пояса
  return new Date(`${isoDate}T00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatSchedule(schedule) {
  if (!schedule) return 'Flexible';

  if (schedule.type === 'once') {
    if (!schedule.dateTo || schedule.dateTo === schedule.dateFrom) return `Once, on ${formatDate(schedule.dateFrom)}`;
    return `Once, between ${formatDate(schedule.dateFrom)} and ${formatDate(schedule.dateTo)}`;
  }

  // "Every week" вместо "Every 1 weeks"
  const unit = schedule.interval === 1 ? schedule.unit : `${schedule.interval} ${schedule.unit}s`;
  const until = schedule.endDate ? ` until ${formatDate(schedule.endDate)}` : '';
  return `Every ${unit}, from ${formatDate(schedule.startDate)}${until}`;
}
