// 앱 전체 루트 레이아웃 — 폰트, 메타데이터, 모바일 뷰포트 설정
import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import { QueryProvider } from "@/providers/QueryProvider";
import { MSWProvider } from "@/mocks/MSWProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "SayNow",
  description: "실제 외국인 상황을 시뮬레이션하며 영어 회화를 연습하세요",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <head>
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css"
        />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/toss/tossface/dist/tossface.css"
        />
      </head>
      <body className="h-full bg-background text-foreground">
        <MSWProvider>
          <QueryProvider>{children}</QueryProvider>
        </MSWProvider>
        <Analytics />
      </body>
    </html>
  );
}
