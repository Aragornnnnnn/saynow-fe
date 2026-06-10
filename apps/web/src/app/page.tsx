// 루트 경로 — 랜딩페이지 예정 자리. 현재는 /home으로 리디렉트
import { redirect } from 'next/navigation';

export default function RootPage() {
  redirect('/home');
}
