'use client';
// STT 엔진 실시간 비교 실험실 — Web STT vs Deepgram 동시 녹음

import { useRef, useState } from 'react';
import { ChevronLeft, Mic, MicOff } from 'lucide-react';
import { useBackButtonReplace } from '@/hooks/useBackButtonReplace';

type EngineResult = {
  text: string;
  latencyMs: number | null;
  wordCount: number;
  punctCount: number;
  done: boolean;
};

const EMPTY_RESULT: EngineResult = { text: '', latencyMs: null, wordCount: 0, punctCount: 0, done: false };

const CONTRACTIONS: [RegExp, string][] = [
  [/i'll/g, 'i will'], [/i'm/g, 'i am'], [/i've/g, 'i have'], [/i'd/g, 'i would'],
  [/you're/g, 'you are'], [/we're/g, 'we are'], [/they're/g, 'they are'],
  [/don't/g, 'do not'], [/doesn't/g, 'does not'], [/didn't/g, 'did not'],
  [/won't/g, 'will not'], [/can't/g, 'cannot'], [/couldn't/g, 'could not'],
  [/what's/g, 'what is'], [/where's/g, 'where is'], [/there's/g, 'there is'],
  [/that's/g, 'that is'], [/it's/g, 'it is'], [/hasn't/g, 'has not'],
];

function expandContractions(text: string): string {
  let t = text.toLowerCase();
  for (const [p, r] of CONTRACTIONS) t = t.replace(p, r);
  return t;
}

function calcWer(ref: string, hyp: string): number {
  const r = expandContractions(ref).replace(/[^a-z0-9 ]/g, '').split(' ').filter(Boolean);
  const h = expandContractions(hyp).replace(/[^a-z0-9 ]/g, '').split(' ').filter(Boolean);
  if (r.length === 0) return 0;
  const dp = Array.from({ length: r.length + 1 }, (_, i) =>
    Array.from({ length: h.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= r.length; i++)
    for (let j = 1; j <= h.length; j++)
      dp[i][j] = r[i - 1] === h[j - 1] ? dp[i - 1][j - 1] : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
  return Math.min(100, Math.round((dp[r.length][h.length] / r.length) * 100));
}

function countWords(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function countPunct(text: string) {
  return (text.match(/[.,!?;:]/g) ?? []).length;
}

function makeResult(text: string, latencyMs: number | null): EngineResult {
  return { text, latencyMs, wordCount: countWords(text), punctCount: countPunct(text), done: true };
}

function WerChip({ wer }: { wer: number }) {
  if (wer <= 10) return <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-bold text-green-700">WER {wer}%</span>;
  if (wer <= 30) return <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-bold text-yellow-700">WER {wer}%</span>;
  return <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700">WER {wer}%</span>;
}

function EngineCard({ label, result, interim, wer, isRecording, error, ready }: {
  label: string;
  result: EngineResult;
  interim: string;
  wer: number | null;
  isRecording: boolean;
  error?: string | null;
  ready: boolean;
}) {
  const displayText = ready ? result.text : interim;

  return (
    <div className="rounded-2xl bg-white border border-zinc-200 p-4 flex flex-col min-h-44">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-bold text-zinc-500 uppercase tracking-wide">{label}</p>
        {ready && result.latencyMs && (
          <span className="text-xs text-zinc-400">{(result.latencyMs / 1000).toFixed(1)}s</span>
        )}
      </div>

      <p className="text-sm leading-relaxed text-zinc-900 flex-1 break-words">
        {displayText
          ? displayText
          : <span className="text-zinc-300">
              {error ? '연결 실패' : isRecording ? '듣고 있어요...' : ready ? '—' : '분석 중...'}
            </span>
        }
      </p>

      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}

      {ready && result.text && (
        <div className="mt-3 pt-3 border-t border-zinc-100 flex flex-wrap gap-1.5">
          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-500">
            {result.wordCount}단어
          </span>
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${result.punctCount > 0 ? 'bg-zinc-100 text-zinc-600' : 'bg-zinc-100 text-zinc-400'}`}>
            구두점 {result.punctCount}개
          </span>
          {wer !== null && <WerChip wer={wer} />}
        </div>
      )}
    </div>
  );
}

export default function SttTestPage() {
  const goBack = useBackButtonReplace('/me');

  const [isRecording, setIsRecording] = useState(false);
  const [refText, setRefText] = useState('');
  // 녹음 중 실시간 interim 텍스트
  const [webInterim, setWebInterim] = useState('');
  const [dgInterim, setDgInterim] = useState('');
  // 둘 다 완료 후 동시에 보여줄 최종 결과
  const [webResult, setWebResult] = useState<EngineResult>(EMPTY_RESULT);
  const [dgResult, setDgResult] = useState<EngineResult>(EMPTY_RESULT);
  const [dgError, setDgError] = useState<string | null>(null);

  const webRef = useRef<SpeechRecognition | null>(null);
  const dgSocketRef = useRef<WebSocket | null>(null);
  const dgMediaRef = useRef<MediaRecorder | null>(null);
  const recordingRef = useRef(false); // 이중 실행 방지

  const webStartRef = useRef(0);
  const dgStartRef = useRef(0);
  const webFinalRef = useRef('');
  const dgFinalRef = useRef('');

  // 둘 다 완료되면 결과 공개
  const webDoneRef = useRef(false);
  const dgDoneRef = useRef(false);
  const webPendingRef = useRef<EngineResult | null>(null);
  const dgPendingRef = useRef<EngineResult | null>(null);

  function tryReveal() {
    if (!webDoneRef.current || !dgDoneRef.current) return;
    if (webPendingRef.current) setWebResult(webPendingRef.current);
    if (dgPendingRef.current) setDgResult(dgPendingRef.current);
  }

  function finishWeb(text: string) {
    webDoneRef.current = true;
    webPendingRef.current = makeResult(text, Date.now() - webStartRef.current);
    tryReveal();
  }

  function finishDg(text: string) {
    dgDoneRef.current = true;
    dgPendingRef.current = makeResult(text, Date.now() - dgStartRef.current);
    tryReveal();
  }

  function stopAll() {
    if (!recordingRef.current) return;
    recordingRef.current = false;
    setIsRecording(false);

    webRef.current?.stop();
    webRef.current = null;

    dgMediaRef.current?.stop();
    dgMediaRef.current?.stream.getTracks().forEach((t) => t.stop());
    dgMediaRef.current = null;
    dgSocketRef.current?.close(1000);
    dgSocketRef.current = null;
  }

  async function startRecording() {
    if (recordingRef.current) return; // 이중 실행 방지
    recordingRef.current = true;

    setWebResult(EMPTY_RESULT);
    setDgResult(EMPTY_RESULT);
    setWebInterim('');
    setDgInterim('');
    setDgError(null);
    webFinalRef.current = '';
    dgFinalRef.current = '';
    webDoneRef.current = false;
    dgDoneRef.current = false;
    webPendingRef.current = null;
    dgPendingRef.current = null;

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      alert('마이크 권한이 필요해요.');
      recordingRef.current = false;
      return;
    }

    // ── Web STT ──
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
    if (SR) {
      const rec: SpeechRecognition = new SR();
      rec.lang = 'en-US';
      rec.continuous = true;
      rec.interimResults = true;
      webStartRef.current = Date.now();

      rec.onresult = (e: SpeechRecognitionEvent) => {
        let final = '';
        let interim = '';
        for (let i = 0; i < e.results.length; i++) {
          if (e.results[i].isFinal) final += e.results[i][0].transcript;
          else interim += e.results[i][0].transcript;
        }
        webFinalRef.current = final.trim();
        setWebInterim((final + (interim ? ' ' + interim : '')).trim());
      };

      // Web STT가 자동 종료되면 (침묵 감지) → 전체 종료 트리거
      rec.onend = () => {
        const text = webFinalRef.current;
        finishWeb(text);
        if (recordingRef.current) stopAll();
      };

      rec.onerror = () => {
        finishWeb(webFinalRef.current);
        if (recordingRef.current) stopAll();
      };

      rec.start();
      webRef.current = rec;
    } else {
      // Web STT 없으면 Web 쪽 즉시 완료 처리
      finishWeb('');
    }

    // ── Deepgram WebSocket ──
    try {
      const tokenRes = await fetch('/api/stt/token', { method: 'POST' });
      const { token } = (await tokenRes.json()) as { token: string };

      const params = new URLSearchParams({
        model: 'nova-3',
        language: 'en-US',
        smart_format: 'true',
        interim_results: 'true',
        endpointing: '400',
        utterance_end_ms: '1000',
        vad_events: 'true',
      });
      const ws = new WebSocket(`wss://api.deepgram.com/v1/listen?${params}`, ['bearer', token]);
      dgSocketRef.current = ws;
      dgStartRef.current = Date.now();

      ws.onopen = () => {
        const mr = new MediaRecorder(stream, { mimeType: 'audio/webm' });
        dgMediaRef.current = mr;
        mr.ondataavailable = (e) => { if (ws.readyState === WebSocket.OPEN) ws.send(e.data); };
        mr.start(250);
      };

      ws.onmessage = (e) => {
        const msg = JSON.parse(e.data as string) as {
          type: string;
          channel?: { alternatives: { transcript: string }[] };
          is_final?: boolean;
        };

        if (msg.type === 'Results' && msg.channel) {
          const text = msg.channel.alternatives[0]?.transcript ?? '';
          if (!text) return;
          if (msg.is_final) {
            dgFinalRef.current = (dgFinalRef.current + ' ' + text).trim();
            setDgInterim(dgFinalRef.current);
          } else {
            setDgInterim((dgFinalRef.current + ' ' + text).trim());
          }
        }

        // 발화 끝 감지 → Deepgram 완료 처리 후 전체 종료
        if (msg.type === 'UtteranceEnd') {
          finishDg(dgFinalRef.current);
          if (recordingRef.current) stopAll();
        }
      };

      ws.onerror = () => {
        setDgError('WebSocket 연결 실패');
        finishDg('');
      };
      ws.onclose = (e) => {
        if (e.code !== 1000 && e.code !== 1001) {
          setDgError(`연결 끊김 (${e.code})`);
          finishDg(dgFinalRef.current);
        }
      };
    } catch {
      setDgError('Deepgram 연결 실패');
      finishDg('');
    }

    setIsRecording(true);
  }

  const bothReady = webResult.done && dgResult.done;
  const wer = refText.trim() && bothReady ? {
    web: calcWer(refText, webResult.text),
    dg: calcWer(refText, dgResult.text),
  } : null;

  return (
    <div className="flex h-dvh flex-col bg-[#F2F2F7]">
      <header
        className="relative flex shrink-0 items-center px-4"
        style={{ paddingTop: 'max(env(safe-area-inset-top), 16px)', paddingBottom: 8 }}
      >
        <button
          onClick={goBack}
          className="flex h-9 w-9 items-center justify-center rounded-full transition-all active:scale-90 active:bg-zinc-200"
          style={{ color: '#444', marginLeft: -4 }}
        >
          <ChevronLeft size={22} strokeWidth={2} />
        </button>
        <h1 className="absolute left-1/2 -translate-x-1/2 text-[17px] font-semibold text-zinc-900">실험실</h1>
      </header>

      <div className="no-scrollbar flex-1 overflow-y-auto px-5 pb-10">

        <div className="pt-4 pb-5">
          <p className="text-[22px] font-bold text-zinc-900">STT 엔진 비교</p>
          <p className="mt-1 text-sm text-zinc-500">말을 멈추면 자동으로 두 결과가 동시에 나타나요.</p>
        </div>

        {/* 정답 문장 */}
        <div className="mb-5">
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">정답 문장 (선택)</p>
          <input
            className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-700 outline-none focus:border-zinc-400"
            value={refText}
            onChange={(e) => setRefText(e.target.value)}
            placeholder="직접 입력 — 비워두면 자유 발화"
          />
        </div>

        {/* 녹음 버튼 */}
        <button
          onClick={isRecording ? stopAll : startRecording}
          className={`w-full rounded-2xl py-5 flex items-center justify-center gap-3 text-base font-bold transition-colors mb-5 ${
            isRecording ? 'bg-red-500 text-white' : 'bg-zinc-900 text-white'
          }`}
        >
          {isRecording
            ? <><MicOff size={20} /><span>멈추기</span></>
            : <><Mic size={20} /><span>동시 녹음 시작</span></>
          }
        </button>

        {isRecording && (
          <div className="rounded-2xl bg-zinc-100 px-4 py-3 flex items-center gap-3 mb-5">
            <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse shrink-0" />
            <p className="text-sm text-zinc-600">직접 멈추거나, 1초 정도 말이 없으면 자동으로 분석해요</p>
          </div>
        )}

        {/* 비교 카드 */}
        <div className="grid grid-cols-2 gap-3">
          <EngineCard
            label="Web STT"
            result={webResult}
            interim={webInterim}
            wer={wer?.web ?? null}
            isRecording={isRecording}
            ready={bothReady}
          />
          <EngineCard
            label="Deepgram"
            result={dgResult}
            interim={dgInterim}
            wer={wer?.dg ?? null}
            isRecording={isRecording}
            error={dgError}
            ready={bothReady}
          />
        </div>

      </div>
    </div>
  );
}
