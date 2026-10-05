import { ApiError } from './apiError';
import { askGeminiForJson } from './geminiApi';
import { formatSchedule } from '../utils/schedule';

const TOP_COUNT = 3;
// Ниже этого процента провайдер не считается подходящим — лучше никого, чем случайные трое
const MIN_SCORE = 40;

// Насколько бюджет заявки сходится с ценами провайдера:
//   'overlap' — оба указаны и диапазоны пересекаются (самый высокий приоритет)
//   'unknown' — у кого-то не указано или валюты разные, сравнить нельзя
//   'outside' — оба указаны, но не пересекаются (самый низкий приоритет)
function getBudgetFit(request, provider) {
  const requestHasBudget = request.budgetFrom != null || request.budgetTo != null;
  const providerHasPrice = provider.priceFrom != null || provider.priceTo != null;
  if (!requestHasBudget || !providerHasPrice) return 'unknown';
  if (request.currency && provider.currency && request.currency !== provider.currency) return 'unknown';

  // Незаданная граница — диапазон открыт с этой стороны
  const requestMin = request.budgetFrom ?? 0;
  const requestMax = request.budgetTo ?? Infinity;
  const providerMin = provider.priceFrom ?? 0;
  const providerMax = provider.priceTo ?? Infinity;
  return requestMin <= providerMax && providerMin <= requestMax ? 'overlap' : 'outside';
}

const BUDGET_PRIORITY = { overlap: 2, unknown: 1, outside: 0 };

function buildPrompt(request, providers) {
  const providersForAi = providers.map((provider) => ({
    id: provider.id,
    activities: provider.activities ?? [],
    locations: provider.locations ?? [],
    services: (provider.services ?? []).map((service) => ({ title: service.name, description: service.description ?? '' })),
  }));

  return `You match customer service requests with service providers.

Customer request:
- Needed service: ${request.serviceDescription}
- Location: ${request.location}
- When: ${formatSchedule(request.schedule)}

Providers (JSON):
${JSON.stringify(providersForAi)}

Tasks:
1. Check the request. It is invalid only if it is meaningless, not a request for a service, or asks for something illegal.
2. For every provider give a match score from 0 to 100:
   - Service fit matters most: compare the needed service with the provider's activities and services by meaning, not exact words, in any language.
   - Location is not a hard filter but matters: a place inside the same city or metro area counts as the same location
     (e.g. Glenn Innes is a suburb of Auckland, so an Auckland provider fits), a different city (e.g. Wellington for Auckland) should lower the score a lot.
   - Do not consider price or budget.

Answer with JSON only, in this shape:
{"isValid": true, "problem": null, "matches": [{"providerId": "...", "score": 85, "reason": "one short sentence in English"}]}
If the request is invalid, set "isValid": false, explain in "problem" in one short English sentence, and return an empty "matches" array.`;
}

// Возвращает топ-3 провайдера для заявки: [{ providerId, providerName, score, reason, budgetFit }]
export async function findMatches(request, providers) {
  if (providers.length === 0) return [];

  const answer = await askGeminiForJson(buildPrompt(request, providers));

  // Заявку, которую AI счёл бессмысленной, не создаём — ошибка покажется кастомеру под формой
  if (answer?.isValid === false) {
    throw new ApiError(answer.problem || 'The request does not look like a service request', { status: 422 });
  }

  const providersById = new Map(providers.map((provider) => [provider.id, provider]));

  return (
    (answer?.matches ?? [])
      // AI мог вернуть лишнего — берём только реальных провайдеров с нормальной оценкой
      .filter((match) => providersById.has(match.providerId) && Number.isFinite(match.score) && match.score >= MIN_SCORE)
      .map((match) => {
        const provider = providersById.get(match.providerId);
        return {
          providerId: provider.id,
          providerName: `${provider.firstName ?? ''} ${provider.lastName ?? ''}`.trim(),
          score: Math.round(Math.min(match.score, 100)),
          reason: match.reason ?? '',
          budgetFit: getBudgetFit(request, provider),
        };
      })
      // Сначала те, у кого бюджет пересекается, потом без бюджета, потом не попавшие в бюджет; внутри — по проценту
      .sort((a, b) => BUDGET_PRIORITY[b.budgetFit] - BUDGET_PRIORITY[a.budgetFit] || b.score - a.score)
      .slice(0, TOP_COUNT)
  );
}
