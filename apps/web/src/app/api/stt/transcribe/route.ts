// 오디오 파일을 받아 Deepgram REST API로 변환하는 서버 라우트 (키 노출 방지)
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const apiKey = process.env.DEEPGRAM_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'DEEPGRAM_API_KEY가 설정되지 않았습니다.' }, { status: 500 });
  }

  const audioBuffer = await request.arrayBuffer();

  const params = new URLSearchParams({
    model: 'nova-3',
    language: 'en-US',
    smart_format: 'true',
    punctuate: 'true',
  });

  const res = await fetch(`https://api.deepgram.com/v1/listen?${params}`, {
    method: 'POST',
    headers: {
      Authorization: `Token ${apiKey}`,
      'Content-Type': request.headers.get('content-type') ?? 'audio/webm',
    },
    body: audioBuffer,
  });

  if (!res.ok) {
    const err = await res.text();
    console.error('[stt/transcribe] Deepgram error:', err);
    return NextResponse.json({ error: 'Deepgram 변환 실패' }, { status: 502 });
  }

  const data = (await res.json()) as {
    results: { channels: { alternatives: { transcript: string }[] }[] };
  };

  const transcript = data.results.channels[0]?.alternatives[0]?.transcript ?? '';
  return NextResponse.json({ transcript });
}
