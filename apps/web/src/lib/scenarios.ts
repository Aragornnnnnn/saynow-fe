// 시나리오 목업 데이터 및 타입 정의

export type Category = '전체' | '카페' | '공항' | '호텔' | '식당' | '택시';
export type Difficulty = '쉬움' | '어려움';

export interface Scenario {
  id: string;
  title: string;
  category: Exclude<Category, '전체'>;
  difficulty: Difficulty;
  emoji: string;
  description: string;
  goal: string;
}

export const SCENARIOS: Scenario[] = [
  {
    id: '1',
    title: '아메리카노 주문',
    category: '카페',
    difficulty: '쉬움',
    emoji: '☕',
    description: '카페에 들어가 바리스타에게 아이스 아메리카노를 주문하는 상황입니다.',
    goal: '아이스 아메리카노 주문에 성공하세요.',
  },
  {
    id: '2',
    title: '커스텀 음료 주문',
    category: '카페',
    difficulty: '어려움',
    emoji: '🧋',
    description: '사이즈 변경, 샷 추가 등 세부 옵션을 지정하며 음료를 주문하는 상황입니다.',
    goal: '커스텀 옵션을 모두 정확히 전달하여 주문에 성공하세요.',
  },
  {
    id: '3',
    title: '탑승구 위치 묻기',
    category: '공항',
    difficulty: '쉬움',
    emoji: '✈️',
    description: '공항에서 직원에게 탑승구 위치를 물어보는 상황입니다.',
    goal: '탑승구 위치를 파악하고 감사 인사까지 마무리하세요.',
  },
  {
    id: '4',
    title: '수하물 분실 신고',
    category: '공항',
    difficulty: '어려움',
    emoji: '🧳',
    description: '수하물이 도착하지 않아 공항 직원에게 분실 신고를 하는 상황입니다.',
    goal: '분실 신고서 접수를 완료하고 연락처를 남기세요.',
  },
  {
    id: '5',
    title: '호텔 체크인',
    category: '호텔',
    difficulty: '쉬움',
    emoji: '🏨',
    description: '호텔 프런트에서 체크인 절차를 진행하는 상황입니다.',
    goal: '체크인을 완료하고 방 키를 받으세요.',
  },
  {
    id: '6',
    title: '룸 컴플레인',
    category: '호텔',
    difficulty: '어려움',
    emoji: '🔧',
    description: '에어컨 고장 등 객실 문제를 프런트에 신고하고 해결을 요청하는 상황입니다.',
    goal: '문제 상황을 정확히 설명하고 해결 방법에 합의하세요.',
  },
  {
    id: '7',
    title: '메뉴 추천받고 주문',
    category: '식당',
    difficulty: '쉬움',
    emoji: '🍽️',
    description: '식당에서 직원에게 추천 메뉴를 물어보고 주문하는 상황입니다.',
    goal: '추천받은 메뉴를 주문하는 데 성공하세요.',
  },
  {
    id: '8',
    title: '알레르기 확인 후 주문',
    category: '식당',
    difficulty: '어려움',
    emoji: '🥜',
    description: '알레르기 재료가 포함됐는지 확인하고 안전한 메뉴를 주문하는 상황입니다.',
    goal: '알레르기 재료를 확인하고 적절한 메뉴를 주문하세요.',
  },
  {
    id: '9',
    title: '목적지 말하기',
    category: '택시',
    difficulty: '쉬움',
    emoji: '🚕',
    description: '택시 기사에게 목적지를 말하고 출발하는 상황입니다.',
    goal: '목적지를 정확히 전달하고 출발하세요.',
  },
  {
    id: '10',
    title: '전화로 길 설명하기',
    category: '택시',
    difficulty: '어려움',
    emoji: '📞',
    description: '기사가 목적지를 못 찾아 전화로 길을 설명해야 하는 상황입니다.',
    goal: '랜드마크와 방향을 활용해 위치를 정확히 안내하세요.',
  },
];

export const CATEGORIES: Category[] = ['전체', '카페', '공항', '호텔', '식당', '택시'];

export interface ConversationTurn {
  foreignerLine: string;
}

export const SCENARIO_TURNS: Record<string, ConversationTurn[]> = {
  '1': [
    { foreignerLine: "Hi! What can I get for you today?" },
    { foreignerLine: "Would you like that iced or hot?" },
    { foreignerLine: "What size would you like?" },
    { foreignerLine: "Can I get a name for the order?" },
    { foreignerLine: "That'll be $4.50. Will that be cash or card?" },
  ],
  '2': [
    { foreignerLine: "Hi there! What can I get started for you?" },
    { foreignerLine: "What size would you like — tall, grande, or venti?" },
    { foreignerLine: "How many espresso shots would you like?" },
    { foreignerLine: "Any milk preference? We have oat, almond, or regular." },
    { foreignerLine: "Anything else to add, like syrups or toppings?" },
  ],
  '3': [
    { foreignerLine: "Hello, can I help you?" },
    { foreignerLine: "Which gate are you looking for?" },
    { foreignerLine: "Do you have your boarding pass handy?" },
    { foreignerLine: "It's at the end of Terminal B, past security checkpoint 3." },
    { foreignerLine: "Is there anything else you need help with?" },
  ],
  '4': [
    { foreignerLine: "Hello, how can I assist you?" },
    { foreignerLine: "Can you describe your bag for me?" },
    { foreignerLine: "What flight did you arrive on?" },
    { foreignerLine: "Can I have your contact number and local address?" },
    { foreignerLine: "We'll contact you within 24 hours. Is that okay?" },
  ],
  '5': [
    { foreignerLine: "Good evening! Welcome. Do you have a reservation?" },
    { foreignerLine: "Can I see your ID and the credit card used for booking?" },
    { foreignerLine: "Would you prefer a smoking or non-smoking room?" },
    { foreignerLine: "Breakfast is included — it starts at 7am in the dining hall." },
    { foreignerLine: "Here's your key card. Your room is on the 5th floor." },
  ],
  '6': [
    { foreignerLine: "Front desk, how can I help you?" },
    { foreignerLine: "I'm sorry to hear that. What seems to be the issue?" },
    { foreignerLine: "How long has this been going on?" },
    { foreignerLine: "Would you like us to send a technician, or would you prefer a different room?" },
    { foreignerLine: "We'll have someone up within 15 minutes. Apologies for the inconvenience." },
  ],
  '7': [
    { foreignerLine: "Hi, welcome! Are you ready to order or do you need a moment?" },
    { foreignerLine: "Our most popular dish today is the grilled salmon. Would you like to try that?" },
    { foreignerLine: "Would you like that with a side salad or fries?" },
    { foreignerLine: "Anything to drink with that?" },
    { foreignerLine: "Great choice! I'll have that right out for you." },
  ],
  '8': [
    { foreignerLine: "Hi, are you ready to order?" },
    { foreignerLine: "Do you have any food allergies I should know about?" },
    { foreignerLine: "The pasta contains gluten and dairy — is that okay?" },
    { foreignerLine: "We do have a gluten-free option. Would you like to try that?" },
    { foreignerLine: "Perfect. I'll let the kitchen know about your allergy. Just to confirm — no nuts, correct?" },
  ],
  '9': [
    { foreignerLine: "Hey, where to?" },
    { foreignerLine: "Do you have the address?" },
    { foreignerLine: "Is that near downtown?" },
    { foreignerLine: "Alright, estimated time is about 15 minutes. Is that okay?" },
    { foreignerLine: "Great, let's go!" },
  ],
  '10': [
    { foreignerLine: "Hello? I'm having trouble finding your location." },
    { foreignerLine: "I'm near a big intersection — can you describe any landmarks nearby?" },
    { foreignerLine: "Okay, I see a convenience store. Should I turn left or right?" },
    { foreignerLine: "How far down should I go after the turn?" },
    { foreignerLine: "Okay, I think I can see you now. Are you waving?" },
  ],
};
