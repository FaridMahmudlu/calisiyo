/// <reference types="node" />
import fs from 'node:fs';
import path from 'node:path';
import type { ConfigContext, ExpoConfig } from 'expo/config';

const BUNDLE_ID = 'tr.com.calisiyo.app';
const BRAND_GREEN = '#00A870';
const googleServicesFile = process.env.GOOGLE_SERVICES_JSON
  || (fs.existsSync(path.join(__dirname, 'google-services.json')) ? './google-services.json' : undefined);
const googleIosUrlScheme = process.env.GOOGLE_IOS_URL_SCHEME;

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Calisiyo',
  slug: 'calisiyo',
  owner: process.env.EXPO_OWNER || undefined,
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'calisiyo',
  userInterfaceStyle: 'automatic',
  runtimeVersion: { policy: 'appVersion' },
  updates: process.env.EAS_PROJECT_ID
    ? { url: `https://u.expo.dev/${process.env.EAS_PROJECT_ID}` }
    : undefined,
  ios: {
    bundleIdentifier: BUNDLE_ID,
    supportsTablet: true,
    usesAppleSignIn: true,
    icon: './assets/images/icon.png',
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
      NSSupportsLiveActivities: true,
      NSSupportsLiveActivitiesFrequentUpdates: true,
      CFBundleDevelopmentRegion: 'tr',
    },
  },
  android: {
    package: BUNDLE_ID,
    googleServicesFile,
    adaptiveIcon: {
      backgroundColor: BRAND_GREEN,
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundImage: './assets/images/android-icon-background.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: true,
    permissions: ['RECORD_AUDIO', 'USE_BIOMETRIC', 'VIBRATE'],
    blockedPermissions: [
      'android.permission.READ_MEDIA_VIDEO',
      'android.permission.READ_MEDIA_AUDIO',
      'android.permission.SYSTEM_ALERT_WINDOW',
      'android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK',
    ],
  },
  web: {
    output: 'static',
    favicon: './assets/images/favicon.png',
  },
  plugins: [
    'expo-router',
    './plugins/withAndroidBuildFixes',
    [
      'expo-splash-screen',
      {
        backgroundColor: '#FBFCFD',
        image: './assets/images/splash-icon.png',
        imageWidth: 96,
        dark: { backgroundColor: '#0C1211', image: './assets/images/splash-icon.png' },
      },
    ],
    'expo-sqlite',
    'expo-secure-store',
    'expo-sharing',
    'expo-web-browser',
    'expo-apple-authentication',
    '@react-native-community/datetimepicker',
    ['expo-font', {}],
    [
      'expo-audio',
      {
        microphonePermission: 'Sınıf sohbetinde sesli mesaj kaydetmek için mikrofon erişimi gerekir.',
        recordAudioAndroid: true,
        enableBackgroundPlayback: false,
        enableBackgroundRecording: false,
      },
    ],
    [
      'expo-image-picker',
      {
        photosPermission: 'Soru, hedef ve kaynak görselleri eklemek için fotoğraflarına erişim gerekir.',
        cameraPermission: 'Çözemediğin soruların fotoğrafını çekmek için kamera erişimi gerekir.',
      },
    ],
    [
      'expo-local-authentication',
      { faceIDPermission: 'Calisiyo hesabını Face ID ile korumak için kullanılır.' },
    ],
    [
      'expo-notifications',
      {
        icon: './assets/images/notification-icon.png',
        color: BRAND_GREEN,
        defaultChannel: 'default',
      },
    ],
    [
      'expo-widgets',
      {
        widgets: [
          {
            name: 'TodayWidget',
            displayName: 'Bugün',
            description: 'Serini, bugünkü odak süreni ve sıradaki görevini gösterir.',
            ios: { supportedFamilies: ['systemSmall', 'systemMedium', 'accessoryCircular', 'accessoryRectangular'] },
          },
        ],
      },
    ],
    [
      'react-native-android-widget',
      {
        widgets: [
          {
            name: 'TodayWidget',
            label: 'Calisiyo · Bugün',
            description: 'Serini, bugünkü odak süreni ve sıradaki görevini gösterir.',
            minWidth: '180dp',
            minHeight: '110dp',
            targetCellWidth: 3,
            targetCellHeight: 2,
            resizeMode: 'horizontal|vertical',
            updatePeriodMillis: 1800000,
          },
        ],
      },
    ],
    // Source maps are uploaded only on EAS builds that provide SENTRY_ORG,
    // SENTRY_PROJECT and the SENTRY_AUTH_TOKEN secret.
    ...(process.env.SENTRY_ORG && process.env.SENTRY_PROJECT
      ? [['@sentry/react-native/expo', { organization: process.env.SENTRY_ORG, project: process.env.SENTRY_PROJECT, url: 'https://sentry.io/' }] as [string, object]]
      : []),
    ...(googleIosUrlScheme
      ? [['@react-native-google-signin/google-signin', { iosUrlScheme: googleIosUrlScheme }] as [string, object]]
      : []),
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  extra: {
    eas: process.env.EAS_PROJECT_ID ? { projectId: process.env.EAS_PROJECT_ID } : undefined,
  },
});
