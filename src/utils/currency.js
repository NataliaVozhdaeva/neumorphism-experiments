// Валюта по умолчанию, пока у юзера не сохранена своя (например, определение по IP не сработало)
export const FALLBACK_CURRENCY = 'USD';

const CURRENCIES = ['USD', 'EUR', 'GBP', 'RUB', 'KZT', 'UAH', 'BYN', 'PLN', 'TRY', 'GEL', 'AMD'];

// Опции для Select; текущая валюта может не входить в базовый список — добавляем её в начало
export function getCurrencyOptions(current) {
  const codes = !current || CURRENCIES.includes(current) ? CURRENCIES : [current, ...CURRENCIES];
  return codes.map((code) => ({ value: code, label: code }));
}

// Сумма с символом валюты по локали браузера; у старых заявок валюты нет — выводим просто число
export function formatAmount(amount, currency) {
  if (!currency) return String(amount);
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);
  } catch {
    // Неизвестный Intl код валюты
    return `${amount} ${currency}`;
  }
}

// Диапазон бюджета/цены; если указана только одна граница — показываем "from" или "up to"
export function formatRange(from, to, currency) {
  if (from != null && to != null) return `${formatAmount(from, currency)} – ${formatAmount(to, currency)}`;
  if (from != null) return `from ${formatAmount(from, currency)}`;
  if (to != null) return `up to ${formatAmount(to, currency)}`;
  return 'Not set';
}
