// Определение валюты по IP через бесплатные сервисы (без ключа, с CORS).
// Если первый не ответил или упёрся в лимит — пробуем следующий
const GEO_SOURCES = [
  { url: 'https://free.freeipapi.com/api/v1/json', getCurrency: (data) => data?.currencies?.[0] },
  { url: 'https://ipapi.co/json/', getCurrency: (data) => data?.currency },
];
const TIMEOUT_MS = 3000;

// Возвращает код валюты или null, если определить не получилось
export async function detectCurrency() {
  for (const source of GEO_SOURCES) {
    try {
      const response = await fetch(source.url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
      if (!response.ok) continue;

      const currency = source.getCurrency(await response.json());
      if (currency) return currency;
    } catch {
      // Сервис недоступен или заблокирован (например, блокировщиком рекламы) — пробуем следующий
    }
  }

  return null;
}
