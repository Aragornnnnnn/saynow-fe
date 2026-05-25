# Meta Ads SDK 설정 및 광고 운영 가이드

## 현재 세팅 상태

- **App ID**: `1311169574549165`
- **패키지명**: `com.saynow.app`
- **SDK**: `react-native-fbsdk-next`
- **초기화**: `App.tsx`에서 `Settings.initializeSDK()` 호출
- **Android 완료**, iOS는 추후 ATT 처리 필요

---

## 광고 집행 전 체크리스트

### 1회성 세팅 (최초 1번만)

- [ ] Meta 개발자 콘솔 → 앱 모드 **라이브** 전환
- [ ] `business.facebook.com` → 이벤트 관리자 → 데이터 소스 추가 → 앱 → App ID 연결
- [ ] 광고 계정과 앱 연결 확인

### 광고 캠페인 만들 때마다

- [ ] 캠페인 목표 → **앱 설치** 선택
- [ ] 앱 선택 → SayNow (`com.saynow.app`)
- [ ] 광고 소재 등록 (이미지/영상)
- [ ] 타겟 설정 (연령, 관심사, 지역)
- [ ] 예산 및 기간 설정

---

## 여러 광고를 운영할 때

Meta 광고 구조는 3단계예요.

```
캠페인 (Campaign)
└── 광고 세트 (Ad Set)  ← 타겟/예산/일정
    └── 광고 (Ad)       ← 소재 (이미지/영상/문구)
```

### 예시 구조

```
캠페인: SayNow 앱 설치 — 5월
├── 광고 세트 A: 20대 여성 / 영어 학습 관심사
│   ├── 광고 1: 영상 소재
│   └── 광고 2: 이미지 소재
└── 광고 세트 B: 20대 남성 / 여행 관심사
    ├── 광고 1: 영상 소재
    └── 광고 2: 이미지 소재
```

- **캠페인**은 목적 단위 (앱 설치, 인지도 등)
- **광고 세트**는 타겟/예산 단위 — 타겟별로 나눠서 CPI 비교
- **광고**는 소재 단위 — 소재별 성과 비교 (A/B 테스트)

---

## CPI 확인 방법

Meta 광고 관리자 → 캠페인 → 열 커스터마이즈 → **"앱 설치당 비용"** 추가

| 지표 | 설명 |
|------|------|
| CPI | 설치 1건당 광고비 |
| CPM | 노출 1,000회당 비용 |
| CTR | 클릭률 (광고 효율) |
| Install Rate | 클릭 → 설치 전환율 |

---

## 커스텀 이벤트 추가하기 (선택)

설치 이후 행동도 추적하고 싶을 때 — 예: 첫 연습 완료, 회원가입.

```typescript
import { AppEventsLogger } from 'react-native-fbsdk-next';

// 첫 연습 완료
AppEventsLogger.logEvent('first_practice_complete');

// 회원가입
AppEventsLogger.logEvent('registration_complete');
```

Meta 광고 캠페인 목표를 "앱 설치" 대신 "앱 이벤트"로 설정하면 특정 행동 기준으로 최적화 가능.

---

## iOS 추가 시 (나중에)

1. `expo install expo-tracking-transparency`
2. `app.json`에 `NSUserTrackingUsageDescription` 추가
3. 앱 첫 실행 시 ATT 동의 팝업 → 동의한 사용자만 추적 가능
4. Meta 개발자 콘솔 → iOS 플랫폼 추가 (Bundle ID: `com.saynow.app`)

ATT 동의율은 보통 20~40% — iOS CPI는 참고 지표로만 활용.
