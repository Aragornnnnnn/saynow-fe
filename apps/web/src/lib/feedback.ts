// 피드백 페이지 타입 및 목업 데이터

export interface TurnFeedback {
  question: string;
  myAnswer: string;
  comprehension: number;
  howItSounded: string;
  betterExpression: string;
  betterExpressionGain: number;
  speakLatency: number;
}

export interface FeedbackResult {
  scenarioId: string;
  cleared: boolean;
  totalComprehension: number;
  turns: TurnFeedback[];
}

export const MOCK_FEEDBACK: Record<string, FeedbackResult> = {
  '1': {
    scenarioId: '1',
    cleared: true,
    totalComprehension: 78,
    turns: [
      {
        question: 'Hi! What can I get for you today?',
        myAnswer: "I'd like an iced americano, please.",
        comprehension: 95,
        howItSounded: '아이스 아메리카노를 원한다는 게 명확히 전달됐어요.',
        betterExpression: "Could I get an iced americano?",
        betterExpressionGain: 0,
        speakLatency: 2,
      },
      {
        question: 'Would you like that iced or hot?',
        myAnswer: 'Ice, please.',
        comprehension: 80,
        howItSounded: '원하는 걸 전달했지만 조금 짧게 들렸어요.',
        betterExpression: "Iced, please.",
        betterExpressionGain: 5,
        speakLatency: 3,
      },
      {
        question: 'What size would you like?',
        myAnswer: 'Medium size.',
        comprehension: 70,
        howItSounded: '"Medium"만으로도 충분한데 "size"를 붙여서 살짝 어색하게 들렸어요.',
        betterExpression: "Medium, please.",
        betterExpressionGain: 8,
        speakLatency: 4,
      },
      {
        question: 'Can I get a name for the order?',
        myAnswer: 'My name is Junseo.',
        comprehension: 90,
        howItSounded: '이름을 정확히 전달했어요.',
        betterExpression: "It's Junseo.",
        betterExpressionGain: 3,
        speakLatency: 2,
      },
      {
        question: "That'll be $4.50. Will that be cash or card?",
        myAnswer: 'Card.',
        comprehension: 55,
        howItSounded: '의미는 통했지만 너무 짧아서 무뚝뚝하게 들렸어요.',
        betterExpression: "Card, please.",
        betterExpressionGain: 15,
        speakLatency: 5,
      },
    ],
  },
};
