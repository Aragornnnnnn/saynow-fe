'use client';
// STT 옵션별 인식 품질 비교 테스트 페이지

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { webBridge } from '@/bridge/webBridge';

type Mode = 'web' | 'native';

type Result = {
  mode: Mode;
  configLabel: string;
  refText: string;
  transcript: string;
  latencyMs: number;
  partialCount: number;
  wer: number | null;
};

// 정답 문장 — 시나리오별 고정
const SENTENCE_PRESETS = [
  {
    label: '입국심사',
    sentences: [
      "I'm here for tourism, about two weeks.",
      "I'm staying at the Hilton Hotel in downtown.",
      "I have nothing to declare.",
      "This is my first time visiting.",
      "I have a return ticket for the 15th.",
    ],
  },
  {
    label: '수하물',
    sentences: [
      "My bag hasn't come out yet, it's been about 30 minutes.",
      "It's a large black suitcase with a red tag.",
      "Can I get a reference number for the claim?",
      "I have a connecting flight tomorrow morning.",
      "Where do I pick it up once it's found?",
    ],
  },
  {
    label: '비행기 놓침',
    sentences: [
      "I just missed my flight to New York.",
      "Is there any other flight today?",
      "Can I get rebooked on the next available flight?",
      "I have travel insurance, does that help?",
      "What's the earliest I can get out?",
    ],
  },
  {
    label: '기본',
    sentences: [
      "Yes please, that sounds great.",
      "I'm not sure I understood that correctly.",
      "Could you say that again more slowly?",
      "Excuse me, could you help me with this?",
      "Do you have any recommendations?",
    ],
  },
];

// 힌트 단어 — 정답 문장과 독립적으로 선택
const HINT_PRESETS = [
  {
    label: '없음',
    description: '베이스라인 측정용',
    words: [] as string[],
  },
  {
    label: '입국심사',
    description: '여권, 체류 목적, 신고 관련 단어',
    words: [
      'passport', 'visa', 'tourism', 'business', 'declare', 'customs',
      'immigration', 'duration', 'stay', 'hotel', 'return ticket',
      'departure date', 'address', 'first time', 'fingerprint',
    ],
  },
  {
    label: '수하물',
    description: '짐 찾기, 분실, 클레임 관련 단어',
    words: [
      'baggage', 'suitcase', 'luggage', 'claim', 'lost', 'delayed',
      'tag', 'carousel', 'reference number', 'report', 'connecting flight',
      'description', 'black', 'hard case', 'delivery',
    ],
  },
  {
    label: '비행기 놓침',
    description: '재예약, 보험, 다음 편 관련 단어',
    words: [
      'missed', 'flight', 'rebook', 'next available', 'standby',
      'travel insurance', 'compensation', 'voucher', 'hotel', 'overnight',
      'departure', 'boarding', 'gate', 'ticket', 'refund',
    ],
  },
  {
    label: '카페',
    description: '음료 주문, 사이즈, 옵션 관련 단어',
    words: [
      'americano', 'latte', 'cappuccino', 'espresso', 'macchiato',
      'to go', 'for here', 'iced', 'hot', 'grande', 'venti', 'tall',
      'oat milk', 'almond milk', 'decaf', 'extra shot', 'sugar-free',
      'whipped cream', 'caramel', 'vanilla',
    ],
  },
  {
    label: '길 안내',
    description: '방향, 교통수단, 장소 관련 단어',
    words: [
      'turn left', 'turn right', 'straight ahead', 'intersection',
      'crosswalk', 'subway', 'bus stop', 'taxi', 'block', 'corner',
      'traffic light', 'downtown', 'avenue', 'street', 'exit',
      'entrance', 'landmark', 'directions', 'map', 'navigate',
    ],
  },
];

const CONTRACTIONS: [RegExp, string][] = [
  [/i'll/g, 'i will'], [/i'm/g, 'i am'], [/i've/g, 'i have'], [/i'd/g, 'i would'],
  [/you'll/g, 'you will'], [/you're/g, 'you are'], [/you've/g, 'you have'],
  [/he'll/g, 'he will'], [/she'll/g, 'she will'], [/it'll/g, 'it will'],
  [/we'll/g, 'we will'], [/we're/g, 'we are'], [/we've/g, 'we have'],
  [/they'll/g, 'they will'], [/they're/g, 'they are'], [/they've/g, 'they have'],
  [/that'll/g, 'that will'], [/that's/g, 'that is'],
  [/don't/g, 'do not'], [/doesn't/g, 'does not'], [/didn't/g, 'did not'],
  [/won't/g, 'will not'], [/can't/g, 'cannot'], [/couldn't/g, 'could not'],
  [/wouldn't/g, 'would not'], [/shouldn't/g, 'should not'], [/isn't/g, 'is not'],
  [/aren't/g, 'are not'], [/wasn't/g, 'was not'], [/weren't/g, 'were not'],
  [/what's/g, 'what is'], [/where's/g, 'where is'], [/there's/g, 'there is'],
];

function expandContractions(text: string): string {
  let t = text.toLowerCase();
  for (const [pattern, replacement] of CONTRACTIONS) t = t.replace(pattern, replacement);
  return t;
}

function calcWer(ref: string, hyp: string): number {
  const r = expandContractions(ref).replace(/[^a-z0-9 ]/g, '').split(' ').filter(Boolean);
  const h = expandContractions(hyp).replace(/[^a-z0-9 ]/g, '').split(' ').filter(Boolean);
  if (r.length === 0) return 0;
  const dp = Array.from({ length: r.length + 1 }, (_, i) =>
    Array.from({ length: h.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= r.length; i++) {
    for (let j = 1; j <= h.length; j++) {
      dp[i][j] =
        r[i - 1] === h[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return Math.min(100, Math.round((dp[r.length][h.length] / r.length) * 100));
}

function WerChip({ wer }: { wer: number }) {
  if (wer <= 10) return <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">WER {wer}%</span>;
  if (wer <= 30) return <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700">WER {wer}%</span>;
  return <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">WER {wer}%</span>;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2.5">{children}</p>;
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-zinc-100 last:border-0">
      <span className="text-sm text-zinc-500">{label}</span>
      <span className="text-sm font-medium text-zinc-900">{value}</span>
    </div>
  );
}

export default function SttTestPage() {
  const router = useRouter();
  const isNative = webBridge.isAvailable();

  const [mode, setMode] = useState<Mode>(isNative ? 'native' : 'web');
  const [languageModel, setLanguageModel] = useState<'web_search' | 'free_form'>('free_form');

  // 정답 문장 — 시나리오 + 문장 독립 선택
  const [sentencePresetIdx, setSentencePresetIdx] = useState(0);
  const [refText, setRefText] = useState(SENTENCE_PRESETS[0].sentences[0]);

  // 힌트 단어 — 정답 문장과 독립
  const [hintPresetIdx, setHintPresetIdx] = useState(0);
  const [customWords, setCustomWords] = useState('');

  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [results, setResults] = useState<Result[]>([]);
  const [partialCount, setPartialCount] = useState(0);
  const [captureMode, setCaptureMode] = useState(false);
  const [copied, setCopied] = useState(false);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const startTimeRef = useRef<number>(0);
  const partialCountRef = useRef(0);
  const transcriptRef = useRef('');
  const refTextRef = useRef(refText);
  const sessionIdRef = useRef(0);
  const configLabelRef = useRef('');
  useEffect(() => { refTextRef.current = refText; }, [refText]);

  function copyResults() {
    const header = '| # | 조건 | 정답 | 인식 결과 | WER | 레이턴시 |';
    const divider = '|---|------|------|-----------|-----|---------|';
    const rows = results.map((r, i) =>
      `| ${results.length - i} | ${r.configLabel} | ${r.refText} | ${r.transcript || '(인식 없음)'} | ${r.wer !== null ? r.wer + '%' : '-'} | ${(r.latencyMs / 1000).toFixed(1)}s |`
    );
    navigator.clipboard.writeText([header, divider, ...rows].join('\n')).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const currentHint = HINT_PRESETS[hintPresetIdx];
  const finalHints = [
    ...currentHint.words,
    ...customWords.split(',').map((w) => w.trim()).filter(Boolean),
  ];

  function buildConfigLabel() {
    const parts = [mode === 'native' ? languageModel : 'web'];
    parts.push(`힌트: ${currentHint.label}`);
    return parts.join(' · ');
  }

  // configLabel을 ref에 동기화해서 effect 클로저 stale 방지
  configLabelRef.current = buildConfigLabel();

  useEffect(() => {
    if (mode !== 'native') return;
    const sid = sessionIdRef.current;
    return webBridge.subscribe((msg) => {
      if (sessionIdRef.current !== sid) return;
      if (msg.type === 'STT_PARTIAL') {
        partialCountRef.current += 1;
        setPartialCount(partialCountRef.current);
        transcriptRef.current = msg.transcript;
        setTranscript(msg.transcript);
      }
      if (msg.type === 'STT_FINAL') {
        transcriptRef.current = msg.transcript;
        setTranscript(msg.transcript);
        saveResult(configLabelRef.current);
        setIsRecording(false);
      }
      if (msg.type === 'STT_ERROR' || msg.type === 'MIC_PERMISSION_DENIED') {
        setIsRecording(false);
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, languageModel, hintPresetIdx, customWords]);

  function resetRecordingState() {
    sessionIdRef.current += 1;
    partialCountRef.current = 0;
    transcriptRef.current = '';
    setPartialCount(0);
    setTranscript('');
    startTimeRef.current = Date.now();
  }

  function saveResult(configLabel: string) {
    const latency = Date.now() - startTimeRef.current;
    const hyp = transcriptRef.current.trim();
    const ref = refTextRef.current.trim();
    const wer = ref ? calcWer(ref, hyp) : null;
    setResults((prev) => [
      { mode, configLabel, refText: ref, transcript: hyp, latencyMs: latency, partialCount: partialCountRef.current, wer },
      ...prev,
    ]);
  }

  function startWeb() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
    if (!SR) { alert('Chrome에서 열어주세요.'); return; }
    const recognition: SpeechRecognition = new SR();
    recognition.lang = 'en-US';
    recognition.continuous = true;
    recognition.interimResults = true;
    resetRecordingState();
    let finalAccum = '';
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = '';
      for (let i = 0; i < event.results.length; i++) {
        if (event.results[i].isFinal) finalAccum += event.results[i][0].transcript;
        else interim += event.results[i][0].transcript;
      }
      if (interim) { partialCountRef.current++; setPartialCount(partialCountRef.current); }
      const display = (finalAccum + (interim ? ' ' + interim : '')).trim();
      transcriptRef.current = (finalAccum + (interim ? ' ' + interim : '')).trim();
      setTranscript(display);
    };
    recognition.onerror = () => setIsRecording(false);
    recognition.start();
    recognitionRef.current = recognition;
    setIsRecording(true);
  }

  function stopWeb() {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setIsRecording(false);
    saveResult(buildConfigLabel());
  }

  function startNative() {
    resetRecordingState();
    webBridge.send({
      type: 'START_STT',
      contextualStrings: finalHints.length > 0 ? finalHints : undefined,
      languageModel,
    });
    setIsRecording(true);
  }

  function stopNative() {
    webBridge.send({ type: 'STOP_STT' });
  }

  const handleMic = isRecording
    ? (mode === 'native' ? stopNative : stopWeb)
    : (mode === 'native' ? startNative : startWeb);

  if (captureMode) {
    return (
      <div className="flex min-h-full flex-col bg-white">
        <div className="px-5 pt-12 pb-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-blue-500 mb-0.5">실험실 · 캡처 모드</p>
            <h1 className="text-xl font-bold text-zinc-900 tracking-tight">STT 인식률 결과</h1>
          </div>
          <div className="flex gap-3">
            <button onClick={copyResults} className="text-sm text-blue-500 font-medium">
              {copied ? '복사됨' : '표로 복사'}
            </button>
            <button onClick={() => setCaptureMode(false)} className="text-sm text-zinc-400">닫기</button>
          </div>
        </div>

        {/* 테스트 조건 요약 */}
        <div className="mx-5 mb-4 flex flex-wrap gap-1.5">
          <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs text-zinc-600">
            {mode === 'web' ? 'Web' : 'Native'}
          </span>
          {mode === 'native' && (
            <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs text-zinc-600">{languageModel}</span>
          )}
          <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs text-zinc-600">
            힌트 {finalHints.length > 0 ? `${currentHint.label} ${finalHints.length}개` : '없음'}
          </span>
          <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs text-zinc-600">{results.length}건</span>
        </div>

        <div className="flex flex-col gap-3 px-5 pb-10">
          {results.map((r, i) => (
            <div key={i} className="rounded-2xl border border-zinc-200 bg-white overflow-hidden">
              <div className="px-4 pt-3 pb-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-zinc-500">{r.configLabel}</span>
                  {r.wer !== null && <WerChip wer={r.wer} />}
                </div>
                <p className="text-xs text-zinc-400 mb-2">정답: {r.refText}</p>
                <p className="text-sm text-zinc-900 leading-relaxed font-medium">
                  {r.transcript || <span className="text-zinc-400">(인식 없음)</span>}
                </p>
              </div>
              <div className="flex gap-0 border-t border-zinc-100 mt-2">
                <div className="flex-1 py-2 text-center">
                  <p className="text-xs text-zinc-400">레이턴시</p>
                  <p className="text-sm font-semibold text-zinc-900">{(r.latencyMs / 1000).toFixed(1)}s</p>
                </div>
                <div className="w-px bg-zinc-100" />
                <div className="flex-1 py-2 text-center">
                  <p className="text-xs text-zinc-400">Partial</p>
                  <p className="text-sm font-semibold text-zinc-900">{r.partialCount}회</p>
                </div>
                {r.wer !== null && (
                  <>
                    <div className="w-px bg-zinc-100" />
                    <div className="flex-1 py-2 text-center">
                      <p className="text-xs text-zinc-400">WER</p>
                      <p className="text-sm font-semibold text-zinc-900">{r.wer}%</p>
                    </div>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-col bg-white">
      <div className="px-5 pt-12 pb-6">
        <button
          onClick={() => router.back()}
          className="mb-4 flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900 transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          뒤로
        </button>
        <p className="text-xs font-medium text-blue-500 mb-1">실험실</p>
        <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">STT 인식률 테스트</h1>
        <p className="mt-1.5 text-sm text-zinc-500 leading-relaxed">
          정답 문장, 힌트 단어, 언어 모델을 각각 독립적으로 바꿔가며 WER를 비교해요.
        </p>
      </div>

      <div className="flex flex-col gap-6 px-5 pb-10">

        {/* 엔진 */}
        <div>
          <SectionLabel>엔진</SectionLabel>
          <div className="flex gap-2">
            {(['web', 'native'] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                disabled={m === 'native' && !isNative}
                className={`flex-1 rounded-xl py-3 text-sm font-semibold transition-colors ${
                  mode === m ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-500'
                } disabled:opacity-30`}
              >
                {m === 'web' ? '웹 (Chrome)' : `앱${!isNative ? ' — 앱에서만' : ''}`}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-zinc-400">
            {mode === 'web'
              ? 'Web Speech API — 힌트 단어 미지원, 베이스라인 측정용'
              : 'expo-speech-recognition — 힌트/모델 옵션 모두 적용됨'}
          </p>
        </div>

        {/* 언어 모델 — 앱 모드만 */}
        {mode === 'native' && (
          <div>
            <SectionLabel>언어 모델 (Android)</SectionLabel>
            <div className="flex gap-2">
              {(['free_form', 'web_search'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setLanguageModel(m)}
                  className={`flex-1 rounded-xl px-3 py-3 text-left transition-colors border ${
                    languageModel === m
                      ? 'border-zinc-900 bg-zinc-900 text-white'
                      : 'border-zinc-200 bg-white text-zinc-900'
                  }`}
                >
                  <p className="text-sm font-semibold">{m}</p>
                  <p className={`text-xs mt-0.5 ${languageModel === m ? 'text-zinc-400' : 'text-zinc-500'}`}>
                    {m === 'free_form' ? '기본값' : '검색 최적화 — 인식률 향상 기대'}
                  </p>
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-zinc-400">iOS에서는 적용되지 않아요.</p>
          </div>
        )}

        {/* 정답 문장 — 힌트와 독립 */}
        <div>
          <SectionLabel>정답 문장</SectionLabel>
          {/* 시나리오 탭 */}
          <div className="flex gap-1.5 mb-3 overflow-x-auto no-scrollbar">
            {SENTENCE_PRESETS.map((p, i) => (
              <button
                key={p.label}
                onClick={() => {
                  setSentencePresetIdx(i);
                  setRefText(p.sentences[0]);
                }}
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  sentencePresetIdx === i
                    ? 'bg-zinc-900 text-white'
                    : 'bg-zinc-100 text-zinc-600'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          {/* 문장 선택 */}
          <div className="flex flex-col gap-1.5 mb-2">
            {SENTENCE_PRESETS[sentencePresetIdx].sentences.map((s) => (
              <button
                key={s}
                onClick={() => setRefText(s)}
                className={`rounded-xl px-4 py-2.5 text-left text-xs transition-colors border ${
                  refText === s
                    ? 'border-blue-200 bg-blue-50 text-blue-700 font-medium'
                    : 'border-zinc-200 bg-white text-zinc-600'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
          <input
            className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-xs text-zinc-700 outline-none focus:border-zinc-400"
            value={refText}
            onChange={(e) => setRefText(e.target.value)}
            placeholder="직접 입력"
          />
        </div>

        {/* 힌트 단어 — 정답 문장과 독립 */}
        <div>
          <SectionLabel>힌트 단어</SectionLabel>
          <div className="flex gap-1.5 mb-3 overflow-x-auto no-scrollbar">
            {HINT_PRESETS.map((p, i) => (
              <button
                key={p.label}
                onClick={() => setHintPresetIdx(i)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  hintPresetIdx === i
                    ? 'bg-zinc-900 text-white'
                    : 'bg-zinc-100 text-zinc-600'
                }`}
              >
                {p.label}
                {p.words.length > 0 && (
                  <span className={`ml-1 ${hintPresetIdx === i ? 'text-zinc-400' : 'text-zinc-400'}`}>
                    {p.words.length}
                  </span>
                )}
              </button>
            ))}
          </div>
          {/* 선택된 힌트 단어 미리보기 */}
          {currentHint.words.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-1">
              {currentHint.words.slice(0, 10).map((w) => (
                <span key={w} className="rounded-md bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600">
                  {w}
                </span>
              ))}
              {currentHint.words.length > 10 && (
                <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-xs text-zinc-400">
                  +{currentHint.words.length - 10}
                </span>
              )}
            </div>
          )}
          <input
            className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-xs text-zinc-700 outline-none focus:border-zinc-400"
            value={customWords}
            onChange={(e) => setCustomWords(e.target.value)}
            placeholder="추가 단어 (쉼표로 구분) — 예: JFK, terminal 3"
          />
          {finalHints.length > 0 && (
            <p className="mt-1.5 text-xs text-zinc-400">총 {finalHints.length}개 힌트 적용</p>
          )}
          {mode === 'web' && hintPresetIdx !== 0 && (
            <p className="mt-1.5 text-xs text-amber-500">웹 모드에서는 힌트 단어가 적용되지 않아요.</p>
          )}
        </div>

        {/* 현재 조건 요약 */}
        <div className="rounded-2xl bg-zinc-50 px-4 py-3">
          <p className="text-xs text-zinc-400 mb-1">현재 테스트 조건</p>
          <p className="text-sm font-semibold text-zinc-900">{buildConfigLabel()}</p>
          <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed">"{refText}"</p>
        </div>

        {/* 녹음 */}
        <div>
          {isRecording && (
            <div className="mb-3 rounded-2xl bg-zinc-50 p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                <p className="text-xs text-zinc-500">인식 중 · partial {partialCount}회</p>
              </div>
              <p className="text-sm text-zinc-900 min-h-10 leading-relaxed">
                {transcript || '말해보세요...'}
              </p>
            </div>
          )}
          <button
            onClick={handleMic}
            className={`w-full rounded-2xl py-4 text-base font-bold transition-colors ${
              isRecording ? 'bg-red-500 text-white' : 'bg-zinc-900 text-white'
            }`}
          >
            {isRecording ? '멈추고 결과 저장' : '녹음 시작'}
          </button>
        </div>

        {/* 결과 */}
        {results.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <SectionLabel>결과 {results.length}건</SectionLabel>
              <div className="flex items-center gap-3 -mt-2.5">
                <button onClick={copyResults} className="text-xs text-blue-500">
                  {copied ? '복사됨' : '표로 복사'}
                </button>
                <button onClick={() => setCaptureMode(true)} className="text-xs text-zinc-500">캡처 모드</button>
                <button onClick={() => setResults([])} className="text-xs text-zinc-400">초기화</button>
              </div>
            </div>
            <div className="flex flex-col gap-3">
              {results.map((r, i) => (
                <div key={i} className="rounded-2xl border border-zinc-200 bg-white overflow-hidden">
                  <div className="flex items-center justify-between px-4 pt-4 pb-2">
                    <span className="text-sm font-bold text-zinc-900">{r.configLabel}</span>
                    <span className="text-xs text-zinc-400 rounded-full bg-zinc-100 px-2 py-0.5">{r.mode}</span>
                  </div>
                  <div className="px-4 pb-3">
                    <p className="text-sm text-zinc-700 mb-3 leading-relaxed">
                      {r.transcript || <span className="text-zinc-400">(인식 없음)</span>}
                    </p>
                    <div className="rounded-xl bg-zinc-50 px-3 py-1">
                      <InfoRow label="레이턴시" value={`${(r.latencyMs / 1000).toFixed(1)}s`} />
                      <InfoRow label="Partial 횟수" value={`${r.partialCount}회`} />
                      {r.wer !== null && (
                        <div className="flex items-center justify-between py-2.5">
                          <span className="text-sm text-zinc-500">WER</span>
                          <WerChip wer={r.wer} />
                        </div>
                      )}
                    </div>
                    {r.transcript && (
                      <p className="mt-2 text-xs text-zinc-400 leading-relaxed">정답: {r.refText}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
