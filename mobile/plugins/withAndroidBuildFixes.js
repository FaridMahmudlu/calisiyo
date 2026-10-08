const { withAppBuildGradle, withGradleProperties } = require('expo/config-plugins');

const MARKER = '// calisiyo: align androidx.work artifacts';

// - react-native-android-widget uses androidx.work 2.8.x while another
//   dependency still pulls work-runtime-ktx 2.7.1; since 2.8 the -ktx classes
//   live in work-runtime, so both versions must be aligned to avoid
//   duplicate classes.
// - The project is large enough that Gradle needs more heap/metaspace.
function withWorkManagerAlignment(config) {
  return withAppBuildGradle(config, (mod) => {
    if (!mod.modResults.contents.includes(MARKER)) {
      mod.modResults.contents += `
${MARKER}
configurations.all {
    resolutionStrategy {
        force 'androidx.work:work-runtime:2.8.1'
        force 'androidx.work:work-runtime-ktx:2.8.1'
    }
}
`;
    }
    return mod;
  });
}

function withGradleMemory(config) {
  return withGradleProperties(config, (mod) => {
    const key = 'org.gradle.jvmargs';
    const value = '-Xmx4096m -XX:MaxMetaspaceSize=1024m -Dfile.encoding=UTF-8';
    const existing = mod.modResults.find((item) => item.type === 'property' && item.key === key);
    if (existing) existing.value = value;
    else mod.modResults.push({ type: 'property', key, value });
    return mod;
  });
}

module.exports = (config) => withGradleMemory(withWorkManagerAlignment(config));
