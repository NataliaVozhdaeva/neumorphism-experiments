import { ApiError } from './apiError';
import { askGeminiForJson } from './geminiApi';
import { formatSchedule } from '../utils/schedule';

const TOP_COUNT = 3;
// Ниже этого процента партнёр не считается подходящим — лучше никого, чем случайные трое
const MIN_SCORE = 40;
// Насколько партнёр может быть дороже бюджета: больше — не мэтч, меньше — штраф к оценке
const MAX_OVER_BUDGET = 0.1;
// Штраф в пунктах при максимальном допустимом превышении; растёт линейно от 0
const MAX_BUDGET_PENALTY = 20;

// Насколько бюджет заявки сходится с ценами партнёра. Возвращает { fit, overBy }:
//   'overlap' — оба указаны и партнёр укладывается в бюджет (диапазоны пересекаются
//               или он дешевле — дешевле штрафовать не за что); высокий приоритет
//   'unknown' — у кого-то не указано или валюты разные, сравнить нельзя
//   'over'    — минимальная цена партнёра выше максимума бюджета; overBy — на сколько
//               (доля от бюджета, 0.05 = на 5% дороже); самый низкий приоритет
function getBudgetFit(request, partner) {
  const requestHasBudget = request.budgetFrom != null || request.budgetTo != null;
  const partnerHasPrice = partner.priceFrom != null || partner.priceTo != null;
  if (!requestHasBudget || !partnerHasPrice) return { fit: 'unknown', overBy: 0 };
  if (request.currency && partner.currency && request.currency !== partner.currency) return { fit: 'unknown', overBy: 0 };

  // Незаданная граница — диапазон открыт с этой стороны
  const requestMax = request.budgetTo ?? Infinity;
  const partnerMin = partner.priceFrom ?? 0;
  if (partnerMin <= requestMax) return { fit: 'overlap', overBy: 0 };

  // При бюджете "до 0" делить нельзя — любое превышение считаем бесконечным
  return { fit: 'over', overBy: requestMax > 0 ? (partnerMin - requestMax) / requestMax : Infinity };
}

const BUDGET_PRIORITY = { overlap: 2, unknown: 1, over: 0 };

function buildPrompt(request, partners) {
  const partnersForAi = partners.map((partner) => ({
    id: partner.id,
    industry: partner.industry ?? null,
    activities: partner.activities ?? [],
    locations: partner.locations ?? [],
    services: (partner.services ?? []).map((service) => ({ title: service.name, description: service.description ?? '' })),
  }));

  return `You match customer service requests with service partners.

Customer request:
- Needed service: ${request.serviceDescription}
- Location: ${request.location}
${request.schedule ? `- When: ${formatSchedule(request.schedule)}\n` : ''}
Partners (JSON):
${JSON.stringify(partnersForAi)}

Tasks:
1. Check the request. It is invalid only if it is meaningless, not a request for a service, or asks for something illegal.
2. For every partner give a match score from 0 to 100:
   - Service fit matters most: compare the needed service with the partner's industry, activities and services by meaning, not exact words, in any language.
   - Location is not a hard filter but matters: a place inside the same city or metro area counts as the same location
     (e.g. Glenn Innes is a suburb of Auckland, so an Auckland partner fits), a different city (e.g. Wellington for Auckland) should lower the score a lot.
   - Do not consider price or budget.

Answer with JSON only, in this shape:
{"isValid": true, "problem": null, "matches": [{"partnerId": "...", "score": 85, "reason": "one short sentence in English"}]}
If the request is invalid, set "isValid": false, explain in "problem" in one short English sentence, and return an empty "matches" array.`;
}

// Возвращает топ-3 партнёра для заявки: [{ partnerId, partnerName, score, reason, budgetFit }]
export async function findMatches(request, partners) {
  if (partners.length === 0) return [];

  const answer = await askGeminiForJson(buildPrompt(request, partners));

  // Заявку, которую AI счёл бессмысленной, не создаём — ошибка покажется кастомеру под формой
  if (answer?.isValid === false) {
    throw new ApiError(answer.problem || 'The request does not look like a service request', { status: 422 });
  }

  const partnersById = new Map(partners.map((partner) => [partner.id, partner]));

  return (
    (answer?.matches ?? [])
      // AI мог вернуть лишнего — берём только реальных партнёров с нормальной оценкой
      .filter((match) => partnersById.has(match.partnerId) && Number.isFinite(match.score) && match.score >= MIN_SCORE)
      .map((match) => {
        const partner = partnersById.get(match.partnerId);
        const { fit, overBy } = getBudgetFit(request, partner);
        // Штраф за превышение бюджета: от 0 до MAX_BUDGET_PENALTY пунктов, линейно до порога
        const penalty = Math.round((overBy / MAX_OVER_BUDGET) * MAX_BUDGET_PENALTY);
        return {
          partnerId: partner.id,
          partnerName: `${partner.firstName ?? ''} ${partner.lastName ?? ''}`.trim(),
          score: Math.round(Math.min(match.score, 100)) - penalty,
          reason: match.reason ?? '',
          budgetFit: fit,
          overBy,
        };
      })
      // Слишком дорогие (дороже бюджета больше чем на MAX_OVER_BUDGET) — не мэтч; оценку проверяем уже со штрафом
      .filter((match) => match.overBy <= MAX_OVER_BUDGET && match.score >= MIN_SCORE)
      // Для интерфейса отдаём процент превышения целым числом, а не долю
      .map(({ overBy, ...match }) => ({ ...match, budgetOverPercent: Math.round(overBy * 100) }))
      // Сначала те, у кого бюджет пересекается, потом без бюджета, потом не попавшие в бюджет; внутри — по проценту
      .sort((a, b) => BUDGET_PRIORITY[b.budgetFit] - BUDGET_PRIORITY[a.budgetFit] || b.score - a.score)
      .slice(0, TOP_COUNT)
  );
}
