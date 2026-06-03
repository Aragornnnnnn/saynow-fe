// MSW 핸들러 — live Swagger 계약 기반 mock 응답
import { http, HttpResponse } from 'msw';

const BASE = '/api/v1';

export const scenariosHandler = http.get(`${BASE}/scenarios`, () => {
  return HttpResponse.json({
    success: true,
    data: {
      categories: [
        {
          categoryId: 1,
          categoryName: 'Free Talk',
          categoryLocked: false,
          categoryLockReason: null,
          scenarios: [
            {
              scenarioId: 1,
              displayOrder: 1,
              scenarioTitle: '음식 취향 이야기하기',
              briefing: '좋아하는 음식과 최근 먹었던 음식에 대해 이야기합니다.',
              conversationGoal: '음식 취향과 경험을 영어로 자연스럽게 설명할 수 있다.',
              completed: false,
              locked: false,
              lockReason: null,
              scenarioEmoji: '🍕',
              firstQuestionPreview: {
                questionId: 100,
                aiQuestion: 'What is your favorite food? Why do you like it?',
                translatedQuestion: '가장 좋아하는 음식이 뭐예요? 왜 좋아하나요?',
              },
            },
            {
              scenarioId: 2,
              displayOrder: 2,
              scenarioTitle: '주말 계획 말하기',
              briefing: '다가오는 주말에 하고 싶은 일을 편하게 이야기합니다.',
              conversationGoal: '계획과 이유를 영어로 이어서 말할 수 있다.',
              completed: false,
              locked: false,
              lockReason: null,
              scenarioEmoji: '🗓️',
              firstQuestionPreview: {
                questionId: 200,
                aiQuestion: 'What are you planning to do this weekend?',
                translatedQuestion: '이번 주말에 무엇을 할 계획인가요?',
              },
            },
            {
              scenarioId: 3,
              displayOrder: 3,
              scenarioTitle: '좋아하는 영화 소개하기',
              briefing: '좋아하는 영화와 추천 이유를 이야기합니다.',
              conversationGoal: '취향과 감상을 영어로 설명할 수 있다.',
              completed: false,
              locked: true,
              lockReason: 'PREVIOUS_SCENARIO_NOT_CLEARED',
              scenarioEmoji: '🎬',
              firstQuestionPreview: null,
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
      ],
    },
    error: null,
  });
});

export const startSessionHandler = http.post(
  `${BASE}/scenarios/:scenarioId/sessions`,
  ({ params }) => {
    return HttpResponse.json(
      {
        success: true,
        data: {
          sessionId: 42,
          scenarioId: Number(params.scenarioId),
          totalQuestionCount: 3,
          currentTurn: {
            turnId: 101,
            sequence: 1,
            aiQuestion: 'What is your favorite food? Why do you like it?',
            translatedQuestion: '가장 좋아하는 음식이 뭐예요? 왜 좋아하나요?',
          },
          progress: {
            currentSequence: 1,
            totalQuestionCount: 3,
            completed: false,
          },
        },
        error: null,
      },
      { status: 201 },
    );
  },
);

let utteranceCount = 0;
export const submitUtteranceHandler = http.post(
  `${BASE}/sessions/:sessionId/utterances`,
  () => {
    utteranceCount += 1;
    const sequence = utteranceCount;
    const completed = sequence >= 3;
    const nextSequence = sequence + 1;

    const response = HttpResponse.json({
      success: true,
      data: {
        submittedTurn: {
          turnId: 100 + sequence,
          sequence,
          turnFeedbackStatus: 'PREPARING',
        },
        nextTurn: completed
          ? null
          : {
              turnId: 100 + nextSequence,
              sequence: nextSequence,
              aiQuestion: sequence === 1
                ? 'Do you usually cook it yourself?'
                : 'When did you last eat it?',
              translatedQuestion: sequence === 1
                ? '그 음식을 보통 직접 요리하나요?'
                : '그 음식을 마지막으로 언제 먹었나요?',
            },
        progress: {
          currentSequence: completed ? 3 : nextSequence,
          totalQuestionCount: 3,
          completed,
        },
      },
      error: null,
    });

    if (completed) utteranceCount = 0;

    return response;
  },
);

export const feedbackHandler = http.post(
  `${BASE}/sessions/:sessionId/feedback`,
  ({ params }) => {
    return HttpResponse.json({
      success: true,
      data: {
        sessionId: Number(params.sessionId),
        nativeScore: 82,
        nativeLevelLabel: '유학생 수준',
        summary: '하고 싶은 말을 끝까지 전달하는 힘이 좋았어요.',
        turnFeedbacks: [
          {
            turnId: 101,
            sequence: 1,
            originalQuestion: 'What is your favorite food? Why do you like it?',
            translatedQuestion: '가장 좋아하는 음식이 뭐예요? 왜 좋아하나요?',
            userUtterance: 'I like pizza because it is spicy.',
            feedbackType: 'GOOD',
            koreanAnalogy: '한국어로 비유하자면 담백하게 이유를 붙인 말처럼 들려요.',
            feedbackDetail: '좋아하는 음식과 이유를 한 문장 안에서 분명하게 연결했기 때문이에요.',
            betterExpression: null,
          },
          {
            turnId: 102,
            sequence: 2,
            originalQuestion: 'Do you usually cook it yourself?',
            translatedQuestion: '그 음식을 보통 직접 요리하나요?',
            userUtterance: 'No cook. I buy outside.',
            feedbackType: 'NEEDS_IMPROVEMENT',
            koreanAnalogy: '뜻은 통하지만 단어만 이어 붙인 답처럼 들려요.',
            feedbackDetail: '동사를 넣어 문장으로 연결하면 훨씬 자연스럽습니다.',
            betterExpression: 'No, I usually buy it from a restaurant.',
          },
        ],
      },
      error: null,
    });
  },
);

export const abandonSessionHandler = http.patch(
  `${BASE}/sessions/:sessionId/abandon`,
  () => {
    return HttpResponse.json({
      success: true,
      data: null,
      error: null,
    });
  },
);

export const handlers = [
  scenariosHandler,
  startSessionHandler,
  submitUtteranceHandler,
  feedbackHandler,
  abandonSessionHandler,
];
