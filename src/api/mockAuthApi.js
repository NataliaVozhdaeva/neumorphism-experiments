import { ApiError } from './apiError';

// Мок "базы данных" поверх localStorage — переживает перезагрузку страницы,
// но полностью изолирован от реального бэкенда
const DB_KEY = 'mockDb_users';
const SESSION_KEY = 'mockDb_session';
const NETWORK_DELAY_MS = 400;

function readUsers() {
  try {
    return JSON.parse(localStorage.getItem(DB_KEY)) ?? [];
  } catch {
    return [];
  }
}

function writeUsers(users) {
  localStorage.setItem(DB_KEY, JSON.stringify(users));
}

function delay(ms = NETWORK_DELAY_MS) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toPublicUser(user) {
  const publicUser = { ...user };
  delete publicUser.password;
  return publicUser;
}

async function register({
  email,
  password,
  repeatPassword,
  contact,
  phone,
  firstName,
  lastName,
  role,
  activities,
  locations,
  priceFrom,
  priceTo,
}) {
  await delay();

  if (!email || !password) {
    throw new ApiError('Email and password are required', { status: 422, field: !email ? 'email' : 'password' });
  }
  if (password !== repeatPassword) {
    throw new ApiError('Passwords do not match', { status: 422, field: 'repeatPassword' });
  }
  if (role !== 'customer' && role !== 'provider') {
    throw new ApiError('Role must be either "customer" or "provider"', { status: 422, field: 'role' });
  }
  if (contact === 'phone' && !phone) {
    throw new ApiError('Phone number is required', { status: 422, field: 'phone' });
  }

  const users = readUsers();
  if (users.some((user) => user.email.toLowerCase() === email.toLowerCase())) {
    throw new ApiError('An account with this email already exists', { status: 409, field: 'email' });
  }

  const newUser = {
    id: crypto.randomUUID(),
    email,
    password,
    contact: contact ?? null,
    // Номер хранится только когда contact === 'phone'
    ...(contact === 'phone' && { phone }),
    firstName,
    lastName,
    role,
    // Поля, специфичные для provider — у customer своих полей в профиле нет
    ...(role === 'provider' && { activities, locations, priceFrom, priceTo }),
    createdAt: new Date().toISOString(),
  };

  writeUsers([...users, newUser]);
  localStorage.setItem(SESSION_KEY, newUser.id);

  return toPublicUser(newUser);
}

async function login({ email, password }) {
  await delay();

  const users = readUsers();
  const user = users.find((candidate) => candidate.email.toLowerCase() === email.toLowerCase());

  if (!user) {
    throw new ApiError('No account found with this email', { status: 404, field: 'email' });
  }
  if (user.password !== password) {
    throw new ApiError('Incorrect password', { status: 401, field: 'password' });
  }

  localStorage.setItem(SESSION_KEY, user.id);
  return toPublicUser(user);
}

async function updateProfile(updates) {
  await delay();

  const sessionId = localStorage.getItem(SESSION_KEY);
  if (!sessionId) {
    throw new ApiError('Not authenticated', { status: 401 });
  }

  const users = readUsers();
  const index = users.findIndex((candidate) => candidate.id === sessionId);
  if (index === -1) {
    throw new ApiError('Not authenticated', { status: 401 });
  }

  // email и пароль через этот эндпоинт не меняются — даже если их случайно передадут
  const {
    email,
    password,
    repeatPassword,
    contact,
    phone,
    role,
    activities,
    locations,
    priceFrom,
    priceTo,
    ...rest
  } = updates;

  if (role !== 'customer' && role !== 'provider') {
    throw new ApiError('Role must be either "customer" or "provider"', { status: 422, field: 'role' });
  }
  if (contact === 'phone' && !phone) {
    throw new ApiError('Phone number is required', { status: 422, field: 'phone' });
  }

  const updatedUser = {
    ...users[index],
    ...rest,
    contact: contact ?? null,
    phone: undefined,
    ...(contact === 'phone' && { phone }),
    role,
    // Поля предыдущей роли сбрасываются, чтобы при смене роли не оставалось чужих данных
    activities: undefined,
    locations: undefined,
    priceFrom: undefined,
    priceTo: undefined,
    ...(role === 'provider' && { activities, locations, priceFrom, priceTo }),
    // Услуги редактируются отдельным методом; при уходе из провайдеров — сбрасываем
    ...(role !== 'provider' && { services: undefined }),
  };

  users[index] = updatedUser;
  writeUsers(users);

  return toPublicUser(updatedUser);
}

// Отдельный метод для валюты: updateProfile требует полный набор полей профиля
async function updateCurrency(currency) {
  await delay(100);

  const sessionId = localStorage.getItem(SESSION_KEY);
  const users = readUsers();
  const index = users.findIndex((candidate) => candidate.id === sessionId);
  if (!sessionId || index === -1) {
    throw new ApiError('Not authenticated', { status: 401 });
  }

  users[index] = { ...users[index], currency };
  writeUsers(users);

  return toPublicUser(users[index]);
}

// Услуги провайдера сохраняются отдельно от остального профиля
async function updateServices(services) {
  await delay();

  const sessionId = localStorage.getItem(SESSION_KEY);
  const users = readUsers();
  const index = users.findIndex((candidate) => candidate.id === sessionId);
  if (!sessionId || index === -1) {
    throw new ApiError('Not authenticated', { status: 401 });
  }
  if (users[index].role !== 'provider') {
    throw new ApiError('Only providers can have services', { status: 403 });
  }
  if (services.some((service) => !service.name || service.price == null)) {
    throw new ApiError('Each service needs both a name and a price', { status: 422, field: 'services' });
  }

  users[index] = { ...users[index], services };
  writeUsers(users);

  return toPublicUser(users[index]);
}

// Публичный профиль для страницы по QR: только то, что можно показывать посторонним.
// Контакт отдаём только выбранный юзером как предпочтительный
function toPublicProfile(user) {
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    contact: user.contact ?? null,
    ...(user.contact === 'email' && { email: user.email }),
    ...(user.contact === 'phone' && { phone: user.phone }),
    currency: user.currency ?? null,
    createdAt: user.createdAt,
    ...(user.role === 'provider' && {
      activities: user.activities,
      locations: user.locations,
      priceFrom: user.priceFrom,
      priceTo: user.priceTo,
      services: user.services ?? [],
    }),
  };
}

async function getPublicProfile(id) {
  await delay();

  const user = readUsers().find((candidate) => candidate.id === id);
  if (!user) {
    throw new ApiError('Profile not found', { status: 404 });
  }

  return toPublicProfile(user);
}

async function logout() {
  await delay(100);
  localStorage.removeItem(SESSION_KEY);
}

async function getCurrentUser() {
  await delay(100);

  const sessionId = localStorage.getItem(SESSION_KEY);
  if (!sessionId) return null;

  const user = readUsers().find((candidate) => candidate.id === sessionId);
  return user ? toPublicUser(user) : null;
}

export const mockAuthApi = { register, login, logout, getCurrentUser, updateProfile, updateCurrency, updateServices, getPublicProfile };
