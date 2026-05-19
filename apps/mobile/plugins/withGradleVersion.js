// gradle-wrapper.properties의 Gradle 버전을 지정 버전으로 강제 교체하는 Expo config plugin
const { withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

const withGradleVersion = (config, { version }) => {
  return withDangerousMod(config, [
    'android',
    (config) => {
      const gradleWrapperPath = path.join(
        config.modRequest.platformProjectRoot,
        'gradle/wrapper/gradle-wrapper.properties'
      );

      if (fs.existsSync(gradleWrapperPath)) {
        let contents = fs.readFileSync(gradleWrapperPath, 'utf8');
        contents = contents.replace(
          /distributionUrl=.*gradle-.*-bin\.zip/,
          `distributionUrl=https\\://services.gradle.org/distributions/gradle-${version}-bin.zip`
        );
        fs.writeFileSync(gradleWrapperPath, contents);
      }

      return config;
    },
  ]);
};

module.exports = withGradleVersion;
