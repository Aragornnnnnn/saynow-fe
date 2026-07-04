// Google Play 설치 리퍼러에서 광고 출처(utm) 파라미터를 읽어 파싱하는 헬퍼
import * as Application from 'expo-application';
import { Platform } from 'react-native';

export type InstallAttribution = {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  adId?: string;
};

// "utm_source=facebook&utm_campaign=..." 형태의 리퍼러 문자열을 키-값으로 분해한다.
function parseReferrer(referrer: string): InstallAttribution {
  const params: Record<string, string> = {};
  for (const pair of referrer.split('&')) {
    const idx = pair.indexOf('=');
    if (idx === -1) continue;
    try {
      const key = decodeURIComponent(pair.slice(0, idx));
      const value = decodeURIComponent(pair.slice(idx + 1).replace(/\+/g, ' '));
      if (value) params[key] = value;
    } catch {
      // 잘못 인코딩된 조각은 건너뛴다
    }
  }
  return {
    utmSource: params['utm_source'],
    utmMedium: params['utm_medium'],
    utmCampaign: params['utm_campaign'],
    utmContent: params['utm_content'],
    adId: params['ad_id'],
  };
}

// Android에서 설치 리퍼러를 읽어 utm 값이 하나라도 있으면 반환, 아니면 null.
export async function readInstallAttribution(): Promise<InstallAttribution | null> {
  if (Platform.OS !== 'android') return null;

  try {
    const referrer = await Application.getInstallReferrerAsync();
    if (!referrer) return null;

    const attribution = parseReferrer(referrer);
    const hasAny = Object.values(attribution).some((v) => v !== undefined);
    return hasAny ? attribution : null;
  } catch {
    return null;
  }
}
