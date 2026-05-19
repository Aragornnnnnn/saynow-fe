// MSW 핸들러 — API 명세 기반 mock 응답 정의
import { http, HttpResponse } from 'msw';

const BASE = '/api/v1';

// GET /api/v1/scenarios
export const scenariosHandler = http.get(`${BASE}/scenarios`, () => {
  return HttpResponse.json({
    success: true,
    data: {
      categories: [
        {
          categoryId: 1,
          categoryName: 'Cafe',
          categoryLocked: false,
          categoryLockReason: null,
          scenarios: [
            {
              scenarioId: 10,
              displayOrder: 1,
              scenarioTitle: '아이스 아메리카노 주문',
              scenarioGoal: '원하는 음료를 자연스럽게 주문할 수 있다.',
              scenarioEmoji: '☕',
              cleared: false,
              locked: false,
              lockReason: null,
            },
            {
              scenarioId: 11,
              displayOrder: 2,
              scenarioTitle: '커스텀 음료 주문',
              scenarioGoal: '원하는 옵션을 자연스럽게 말할 수 있다.',
              scenarioEmoji: '🥤',
              cleared: false,
              locked: true,
              lockReason: 'PREVIOUS_SCENARIO_NOT_CLEARED',
            },
            {
              scenarioId: 12,
              displayOrder: 3,
              scenarioTitle: '주문 문제 해결',
              scenarioGoal: '주문 문제를 자연스럽게 해결할 수 있다.',
              scenarioEmoji: '🧾',
              cleared: false,
              locked: true,
              lockReason: 'PREVIOUS_SCENARIO_NOT_CLEARED',
            },
          ],
        },
        {
          categoryId: 2,
          categoryName: 'Airport',
          categoryLocked: true,
          categoryLockReason: 'COMING_SOON',
          scenarios: [],
        },
        {
          categoryId: 3,
          categoryName: 'Hotel',
          categoryLocked: true,
          categoryLockReason: 'COMING_SOON',
          scenarios: [],
        },
        {
          categoryId: 4,
          categoryName: 'Restaurant',
          categoryLocked: true,
          categoryLockReason: 'COMING_SOON',
          scenarios: [],
        },
        {
          categoryId: 5,
          categoryName: 'Taxi',
          categoryLocked: true,
          categoryLockReason: 'COMING_SOON',
          scenarios: [],
        },
      ],
    },
  });
});

// POST /api/v1/scenarios/:scenarioId/sessions
export const startSessionHandler = http.post(
  `${BASE}/scenarios/:scenarioId/sessions`,
  () => {
    return HttpResponse.json(
      {
        success: true,
        data: {
          sessionId: 42,
          originalQuestion: 'What would you like to order?',
          translatedQuestion: '무엇을 주문하시겠어요?',
          remainingHearts: 3,
          isFeedbackAvailable: false,
        },
      },
      { status: 201 },
    );
  },
);

// POST /api/v1/sessions/:sessionId/utterances
let utteranceCount = 0;
export const submitUtteranceHandler = http.post(
  `${BASE}/sessions/:sessionId/utterances`,
  () => {
    utteranceCount += 1;
    const isLast = utteranceCount >= 3;

    if (isLast) {
      utteranceCount = 0;
      return HttpResponse.json({
        success: true,
        data: {
          sessionId: 42,
          originalQuestion: '',
          translatedQuestion: '',
          remainingHearts: 3,
          isFeedbackAvailable: true,
        },
      });
    }

    return HttpResponse.json({
      success: true,
      data: {
        sessionId: 42,
        originalQuestion: 'What size would you like?',
        translatedQuestion: '사이즈는요?',
        remainingHearts: 3,
        isFeedbackAvailable: false,
      },
    });
  },
);

// POST /api/v1/sessions/:sessionId/feedback
export const feedbackHandler = http.post(
  `${BASE}/sessions/:sessionId/feedback`,
  () => {
    return HttpResponse.json({
      success: true,
      data: {
        sessionId: 42,
        cleared: true,
        comprehensionScore: 82,
        feedbackSummary:
          '전체적으로 의도는 잘 전달됐지만 주문 표현이 조금 짧게 들립니다.',
        remainingHearts: 3,
        turnFeedbacks: [
          {
            turnId: 101,
            sequence: 1,
            originalQuestion: 'What would you like to order?',
            translatedQuestion: '무엇을 주문하시겠어요?',
            userUtterance: 'I want iced americano please',
            feedbackRequired: false,
            nativeUnderstanding: null,
            nativeLanguageInterpretation: null,
            betterExpression: null,
          },
          {
            turnId: 102,
            sequence: 2,
            originalQuestion: 'What size would you like?',
            translatedQuestion: '사이즈는요?',
            userUtterance: 'Um large size',
            feedbackRequired: true,
            nativeUnderstanding: '큰 사이즈를 원한다는 의미로 이해됩니다.',
            nativeLanguageInterpretation: '음... 큰 사이즈',
            betterExpression: 'Large, please.',
          },
        ],
      },
    });
  },
);

// DELETE /api/v1/sessions/:sessionId
export const exitSessionHandler = http.delete(
  `${BASE}/sessions/:sessionId`,
  () => {
    return new HttpResponse(null, { status: 204 });
  },
);

export const handlers = [
  scenariosHandler,
  startSessionHandler,
  submitUtteranceHandler,
  feedbackHandler,
  exitSessionHandler,
];
