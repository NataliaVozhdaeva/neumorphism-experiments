import { ApiError } from './apiError';

// Бесплатный тариф Gemini (Google AI Studio). Ключ лежит во фронте — это допустимо только пока у нас мок-данные:
// любой, кто откроет DevTools, его увидит. С появлением бэкенда запрос к AI должен переехать туда.
// Ключ кладём в .env.local (он в .gitignore), а не в .env — .env закоммичен в репозиторий
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const MODEL = import.meta.env.VITE_GEMINI_MODEL || 'gemini-3.5-flash';
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

// Отправляет промпт и возвращает ответ модели, уже разобранный из JSON
export async function askGeminiForJson(prompt) {
  if (!API_KEY) {
    throw new ApiError('AI is not configured: add VITE_GEMINI_API_KEY to .env.local', { status: 500 });
  }

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': API_KEY },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      // JSON-режим и нулевая температура — чтобы ответ был стабильным и его можно было распарсить
      generationConfig: { responseMimeType: 'application/json', temperature: 0 },
    }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    // 429 — упёрлись в лимит бесплатного тарифа
    const message = response.status === 429 ? 'AI rate limit reached, try again in a minute' : (data?.error?.message ?? 'AI request failed');
    throw new ApiError(message, { status: response.status });
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  try {
    return JSON.parse(text);
  } catch {
    throw new ApiError('AI returned an unexpected answer', { status: 502 });
  }
}
