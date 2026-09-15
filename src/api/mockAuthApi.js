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

async function register({ email, password, repeatPassword, contact }) {
  await delay();

  if (!email || !password) {
    throw new ApiError('Email and password are required', { status: 422, field: !email ? 'email' : 'password' });
  }
  if (password !== repeatPassword) {
    throw new ApiError('Passwords do not match', { status: 422, field: 'repeatPassword' });
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

export const mockAuthApi = { register, login, logout, getCurrentUser };
