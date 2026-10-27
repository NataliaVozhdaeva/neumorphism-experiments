// Разовая миграция мок-данных после переименования provider → partner.
// В localStorage остались юзеры с role: 'provider', записи и заявки с providerId и т.д. —
// без миграции код их просто не найдёт. Запускать до seedMockPartners
const MIGRATED_FLAG = 'mockDb_partnersMigrated';
const TABLE_KEYS = ['mockDb_users', 'mockDb_bookings', 'mockDb_requests', 'mockDb_chats'];
const SESSION_KEY = 'mockDb_session';

function renameKey(key) {
  return key.replace(/provider/g, 'partner').replace(/Provider/g, 'Partner');
}

// Переименовываем ключи объектов и значения, которые равны ровно 'provider' (роль)
// или начинаются с id тестовых партнёров. Свободный текст (сообщения, заметки) не трогаем
function migrateValue(value) {
  if (Array.isArray(value)) return value.map(migrateValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [renameKey(key), migrateValue(item)]));
  }
  if (value === 'provider') return 'partner';
  if (typeof value === 'string' && value.startsWith('mock-provider-')) {
    return value.replace('mock-provider-', 'mock-partner-');
  }
  return value;
}

export function migrateProvidersToPartners() {
  try {
    if (localStorage.getItem(MIGRATED_FLAG)) return;

    for (const key of TABLE_KEYS) {
      const raw = localStorage.getItem(key);
      if (raw) localStorage.setItem(key, JSON.stringify(migrateValue(JSON.parse(raw))));
    }

    // Сессия хранит id юзера: если это тестовый партнёр, его id тоже поменялся
    const sessionId = sessionStorage.getItem(SESSION_KEY);
    if (sessionId) sessionStorage.setItem(SESSION_KEY, migrateValue(sessionId));

    localStorage.setItem(MIGRATED_FLAG, 'true');
  } catch {
    // Битые данные в мок-базе не должны ломать запуск приложения
  }
}
