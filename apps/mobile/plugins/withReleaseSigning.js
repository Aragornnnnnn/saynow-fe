// 릴리즈 서명 설정을 build.gradle에 주입하는 Expo config plugin — prebuild 때마다 수동 편집이 날아가는 문제 해결
// 비밀번호는 리포에 두지 않고 ~/.gradle/gradle.properties의 SAYNOW_UPLOAD_* 프로퍼티에서 읽는다.
// 프로퍼티가 없으면 디버그 서명으로 폴백해서 개발 빌드는 그대로 동작한다.
const { withAppBuildGradle } = require('expo/config-plugins');

const RELEASE_SIGNING_CONFIG = `        release {
            if (project.hasProperty('SAYNOW_UPLOAD_STORE_FILE')) {
                storeFile file(SAYNOW_UPLOAD_STORE_FILE)
                storePassword SAYNOW_UPLOAD_STORE_PASSWORD
                keyAlias SAYNOW_UPLOAD_KEY_ALIAS
                keyPassword SAYNOW_UPLOAD_KEY_PASSWORD
            }
        }`;

const withReleaseSigning = (config) => {
  return withAppBuildGradle(config, (config) => {
    let contents = config.modResults.contents;

    // 1. signingConfigs 블록에 release 항목 추가 (debug 항목 뒤)
    if (!contents.includes('storeFile file(SAYNOW_UPLOAD_STORE_FILE)')) {
      contents = contents.replace(
        /(signingConfigs\s*\{\s*debug\s*\{[^}]*\})/,
        `$1\n${RELEASE_SIGNING_CONFIG}`
      );
    }

    // 2. release 빌드타입의 서명을 조건부로 교체 (Caution 주석 블록 뒤의 것만)
    if (!contents.includes('signingConfigs.release : signingConfigs.debug')) {
      contents = contents.replace(
        /(\/\/ Caution!(?:[^\n]*\n\s*\/\/[^\n]*)*[^\n]*\n\s*)signingConfig signingConfigs\.debug/,
        `$1signingConfig project.hasProperty('SAYNOW_UPLOAD_STORE_FILE') ? signingConfigs.release : signingConfigs.debug`
      );
    }

    config.modResults.contents = contents;
    return config;
  });
};

module.exports = withReleaseSigning;
