'use client';
// STT 엔진 실시간 비교 실험실 — Web STT vs Deepgram 동시 녹음

import { useRef, useState } from 'react';
import { ChevronLeft, Mic, MicOff } from 'lucide-react';
import { useBackButtonReplace } from '@/hooks/useBackButtonReplace';

type EngineResult = {
  text: string;
  latencyMs: number | null;
  partialCount: number;
  done: boolean;
};

const EMPTY_RESULT: EngineResult = { text: '', latencyMs: null, partialCount: 0, done: false };

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

function hasPunctuation(text: string) {
  return /[.,!?;:]/.test(text);
}

function highlightPunctuation(text: string) {
  if (!text) return null;
  const parts = text.split(/([.,!?;:]+)/g);
  return parts.map((p, i) =>
    /[.,!?;:]+/.test(p)
      ? <mark key={i} className="bg-zinc-200 text-zinc-700 rounded px-0.5">{p}</mark>
      : p
  );
}

function WerChip({ wer }: { wer: number }) {
  if (wer <= 10) return <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-bold text-green-700">WER {wer}%</span>;
  if (wer <= 30) return <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-bold text-yellow-700">WER {wer}%</span>;
  return <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700">WER {wer}%</span>;
}

function EngineCard({ label, result, wer, isRecording, error }: {
  label: string;
  result: EngineResult;
  wer: number | null;
  isRecording: boolean;
  error?: string | null;
}) {
  return (
    <div className="rounded-2xl bg-white border border-zinc-200 p-4 flex flex-col min-h-44">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-bold text-zinc-500 uppercase tracking-wide">{label}</p>
        {result.done && result.latencyMs && (
          <span className="text-xs text-zinc-400">{(result.latencyMs / 1000).toFixed(1)}s</span>
        )}
      </div>

      <p className="text-sm leading-relaxed text-zinc-900 flex-1">
        {result.text
          ? highlightPunctuation(result.text)
          : <span className="text-zinc-300">{error ? '연결 실패' : isRecording ? '듣고 있어요...' : '—'}</span>
        }
      </p>

      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}

      {result.text && (
        <div className="mt-3 pt-3 border-t border-zinc-100 flex flex-wrap gap-1.5">
          {result.partialCount > 0 && (
            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-500">
              partial {result.partialCount}회
            </span>
          )}
          {hasPunctuation(result.text)
            ? <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600">구두점 ✓</span>
            : <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-400">구두점 없음</span>
          }
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
  const [webResult, setWebResult] = useState<EngineResult>(EMPTY_RESULT);
  const [dgResult, setDgResult] = useState<EngineResult>(EMPTY_RESULT);
  const [dgError, setDgError] = useState<string | null>(null);

  const webRef = useRef<SpeechRecognition | null>(null);
  const dgSocketRef = useRef<WebSocket | null>(null);
  const dgMediaRef = useRef<MediaRecorder | null>(null);

  const webStartRef = useRef(0);
  const dgStartRef = useRef(0);
  const webPartialRef = useRef(0);
  const dgFinalRef = useRef('');
  const dgPartialRef = useRef(0);

  async function startRecording() {
    setWebResult(EMPTY_RESULT);
    setDgResult(EMPTY_RESULT);
    setDgError(null);
    webPartialRef.current = 0;
    dgFinalRef.current = '';
    dgPartialRef.current = 0;

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      alert('마이크 권한이 필요해요.');
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
        if (interim) webPartialRef.current++;
        const display = (final + (interim ? ' ' + interim : '')).trim();
        setWebResult((prev) => ({ ...prev, text: display, partialCount: webPartialRef.current }));
      };
      rec.onerror = () => {};
      rec.start();
      webRef.current = rec;
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
      });
      const ws = new WebSocket(`wss://api.deepgram.com/v1/listen?${params}`, ['token', token]);
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
          channel: { alternatives: { transcript: string }[] };
          is_final: boolean;
        };
        if (msg.type !== 'Results') return;
        const text = msg.channel.alternatives[0]?.transcript ?? '';
        if (!text) return;
        dgPartialRef.current++;
        if (msg.is_final) {
          dgFinalRef.current = (dgFinalRef.current + ' ' + text).trim();
          setDgResult((prev) => ({ ...prev, text: dgFinalRef.current, latencyMs: Date.now() - dgStartRef.current, partialCount: dgPartialRef.current }));
        } else {
          const display = (dgFinalRef.current + ' ' + text).trim();
          setDgResult((prev) => ({ ...prev, text: display, partialCount: dgPartialRef.current }));
        }
      };

      ws.onerror = () => setDgError('WebSocket 연결 실패');
      ws.onclose = (e) => {
        if (e.code !== 1000 && e.code !== 1001) setDgError(`연결 끊김 (${e.code})`);
      };
    } catch {
      setDgError('Deepgram 연결 실패');
    }

    setIsRecording(true);
  }

  function stopRecording() {
    setIsRecording(false);

    webRef.current?.stop();
    webRef.current = null;
    setWebResult((prev) => ({ ...prev, latencyMs: Date.now() - webStartRef.current, done: true }));

    dgMediaRef.current?.stop();
    dgMediaRef.current?.stream.getTracks().forEach((t) => t.stop());
    dgMediaRef.current = null;
    dgSocketRef.current?.close(1000);
    dgSocketRef.current = null;
    setDgResult((prev) => ({ ...prev, done: true }));
  }

  const wer = refText.trim() ? {
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
          <p className="mt-1 text-sm text-zinc-500">Web STT와 Deepgram을 동시에 녹음해서 실시간으로 비교해요.</p>
        </div>

        {/* 정답 문장 직접 입력 */}
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
          onClick={isRecording ? stopRecording : startRecording}
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
            <p className="text-sm text-zinc-600">녹음 중 — 말하고 멈추기를 눌러요</p>
          </div>
        )}

        {/* 비교 카드 */}
        <div className="grid grid-cols-2 gap-3">
          <EngineCard label="Web STT" result={webResult} wer={wer?.web ?? null} isRecording={isRecording} />
          <EngineCard label="Deepgram" result={dgResult} wer={wer?.dg ?? null} isRecording={isRecording} error={dgError} />
        </div>

      </div>
    </div>
  );
}
