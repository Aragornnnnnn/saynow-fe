// Deepgram API 키를 브라우저에 안전하게 전달하는 API route
import { NextResponse } from 'next/server';

export async function POST() {
  const apiKey = process.env.DEEPGRAM_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'DEEPGRAM_API_KEY가 설정되지 않았습니다.' }, { status: 500 });
  }
  return NextResponse.json({ token: apiKey });
}
