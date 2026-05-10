# CLAUDE.md

## 프로젝트 개요

실제 외국인 상황을 시뮬레이션하며 영어 회화를 연습하고, AI가 외국인 관점의 이해도 피드백을 주는 서비스.

## 개발 명령어

```bash
npm run dev -w apps/web
npm run build -w apps/web
npm run lint -w apps/web
npm run start -w apps/mobile
```

## 아키텍처

@docs/architecture.md
@docs/tech-stack.md
@docs/planning.md

## 코딩 규칙

- TypeScript strict mode — `any` 사용 금지, 타입 명시 필수
- 파일 네이밍: 컴포넌트 `PascalCase.tsx`, 훅/유틸 `camelCase.ts`
- shadcn 컴포넌트 직접 수정 금지 — 커스텀 필요시 래퍼 컴포넌트로 감쌀 것 (업데이트 충돌 방지)

## 주의사항

- `apps/mobile`은 웹뷰 껍데기 — 로직은 `apps/web`에만 작성
- 웹 ↔ 네이티브 통신은 `postMessage` 방식만 사용
- STT는 클라이언트에서 처리하지 않음, 음성 파일을 AI 서버로 전송
- 커밋 컨벤션: `/git-commit` 스킬 참고
