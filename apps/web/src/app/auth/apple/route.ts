// Apple 웹 로그인 form_post 콜백 — POST로 받은 id_token을 URL fragment로 옮겨 클라이언트 콜백 페이지로 전달
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const form = await request.formData();
  const error = form.get('error');
  const idToken = form.get('id_token');
  const state = form.get('state');

  if (typeof error === 'string' && error) {
    return NextResponse.redirect(
      new URL(`/auth/apple/callback?error=${encodeURIComponent(error)}`, request.url),
      303,
    );
  }

  if (typeof idToken !== 'string' || typeof state !== 'string') {
    return NextResponse.redirect(
      new URL('/auth/apple/callback?error=invalid_response', request.url),
      303,
    );
  }

  // id_token은 서버 로그·리퍼러에 남지 않도록 쿼리 대신 fragment로 전달한다
  const redirectUrl = new URL('/auth/apple/callback', request.url);
  redirectUrl.hash = `id_token=${encodeURIComponent(idToken)}&state=${encodeURIComponent(state)}`;
  return NextResponse.redirect(redirectUrl, 303);
}
