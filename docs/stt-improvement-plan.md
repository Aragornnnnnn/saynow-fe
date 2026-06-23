# STT 개선 계획

Deepgram STT를 "부드럽고 안 끊기는" 경험으로 만들기 위한 남은 작업.
완료: `endpointing 0.4초→1초`, 멈추기 토글 코드 정리 (커밋 `fe8e129`).

현재 STT 경로는 3개 — 앱 네이티브([useStt.ts](../apps/mobile/hooks/useStt.ts)), 웹 브라우저([conversation page](../apps/web/src/app/conversation/%5Bid%5D/page.tsx) `startDeepgramStt`), 미사용 REST([transcribe](../apps/web/src/app/api/stt/transcribe/route.ts)).

---

## P0 — 출시 전 필수

### 1. Deepgram API 키 → 단기 임시 토큰

- [ ] `/api/stt/token`이 원본 API 키를 그대로 내려주는 문제 해결 ([token/route.ts](../apps/web/src/app/api/stt/token/route.ts))
- [ ] Deepgram `/v1/auth/grant`로 짧은 TTL(예 30~60초) ephemeral key 발급해 반환
- [ ] 앱·웹 양쪽 토큰 fetch 흐름이 새 토큰으로 동작하는지 확인

**왜.** 지금은 장기 키가 클라이언트(WebView·브라우저)에 그대로 노출돼 누구나 추출·과금 악용 가능. 주석의 "키 노출 방지"가 거짓인 상태.
**완료 기준.** 네트워크 탭/WS 핸드셰이크에 장기 키가 안 보이고, 발급된 토큰은 수십 초 후 만료된다.

---

## P1 — 웹 브라우저 경로 견고화

앱(네이티브)은 사전연결·onclose 복구·Finalize 대기가 다 있지만, 브라우저 경로는 빠져 있어 거칠다.

### 2. 마이크 누른 뒤 첫 음성 유실

- [ ] WS open 전에 말한 앞부분이 잘리는 문제 — 사전연결(앱의 `prepare` 대응) 또는 open 후 캡처 시작 보정
- [ ] `getUserMedia → 토큰 fetch → WS open` 지연 동안의 UX 검토

**완료 기준.** 버튼 누르고 바로 말해도 첫 단어가 들어간다.

### 3. WS 끊김 복구 부재

- [ ] 브라우저 `startDeepgramStt`에 `ws.onclose` 핸들러 추가 (녹음 중 끊김 → 복구/에러)
- [ ] WS가 안 열릴 때 타임아웃 추가
- [ ] 앱의 `onclose → onError` 패턴과 일치시키기

**왜.** 지금은 녹음 중 WS가 끊기면 "듣고 있어요..."에 영원히 멈춘다.

### 4. 마지막 음성 꼬리 유실

- [ ] 브라우저도 종료 시 누적본만 보내지 말고, 마지막 in-flight 오디오 보정본을 받도록 검토 (앱은 `Finalize` 후 `speech_final` 대기)

**완료 기준.** 앱과 웹의 최종 transcript 정확도가 동등하다.

---

## P2 — 정리·일관성

### 5. Deepgram 파라미터 공유 상수화

- [ ] `endpointing`/`utterance_end_ms` 등이 [useStt.ts](../apps/mobile/hooks/useStt.ts)·[page.tsx](../apps/web/src/app/conversation/%5Bid%5D/page.tsx) 2곳에 중복 정의 — 한 곳에서 공유해 표류 방지

### 6. analytics `stt_engine` 정확도

- [ ] 앱에서 실제 Deepgram인데 `'native'`로 기록됨 ([page.tsx](../apps/web/src/app/conversation/%5Bid%5D/page.tsx)) — 실제 엔진 반영

### 7. 미사용 REST 라우트 제거

- [ ] [api/stt/transcribe/route.ts](../apps/web/src/app/api/stt/transcribe/route.ts) — 어디서도 호출 안 됨, 삭제 검토

---

## 관찰·튜닝 (코드 변경 아님)

- [ ] 실기기에서 `endpointing` 1초 체감 — 짧으면 1200~1500으로 (두 곳 값만 조정)
- [ ] 무음만 있을 때 `recording` 무한 대기 — 안전 타임아웃 필요한지 판단 (현재는 취소 버튼이 유일한 탈출, 기존 동작)
- [ ] 개인정보 — 오디오가 Deepgram(미국 서드파티)으로 가는 점, 처리방침/동의 반영 여부 확인
