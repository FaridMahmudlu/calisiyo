# Calisiyo Mobile

Android and iOS app for Calisiyo (`tr.com.calisiyo.app`). Built with Expo SDK 57, React Native, TypeScript and Expo Router. It uses the same Supabase project, accounts, RLS policies and Next.js API (`https://calisiyo.com.tr/api/*`, called with bearer tokens) as the web app. Pure business rules are shared from `../lib` through the `@shared/*` alias.

## Local development

```bash
cd mobile
npm install
cp .env.example .env.local   # then fill in the values
npx expo start               # Expo Go only covers screens without custom native code
```

Native features (widgets, Live Activity, Android live timer notification, Google Sign-In, biometrics) need a native build. Install a release build on a USB-connected Android phone locally (Android SDK + Android Studio JBR as `JAVA_HOME`):

```bash
npx expo prebuild -p android
cd android && ./gradlew app:assembleRelease -PreactNativeArchitectures=arm64-v8a
adb install -r app/build/outputs/apk/release/app-release.apk
```

Or build an installable APK in the cloud: `npm run build:android:preview`.

### Environment variables

| Name | Where | Notes |
| --- | --- | --- |
| `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` | `.env.local` / EAS env | Anon key only. Never put the service-role key in the app. |
| `EXPO_PUBLIC_API_URL` | EAS env | Defaults to `https://calisiyo.com.tr`. |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`, `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` | EAS env | Google Sign-In. |
| `GOOGLE_IOS_URL_SCHEME` | EAS env | Reversed iOS client ID, needed for iOS builds. |
| `GOOGLE_SERVICES_JSON` | EAS **file** env var | Firebase `google-services.json` (needed for Android push). |
| `EXPO_PUBLIC_SENTRY_DSN` | EAS env | Optional crash reporting (no PII). |
| `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN` | EAS env (token as secret) | Optional source map upload. |
| `EXPO_PUBLIC_POSTHOG_KEY`, `EXPO_PUBLIC_POSTHOG_HOST` | EAS env | Optional analytics, only after user consent. |
| `EAS_PROJECT_ID`, `EXPO_OWNER` | optional | Defaults are set in `app.config.ts` (`@faridmahmudluu/calisiyo`). |

## Verification

```bash
npm run typecheck
npm run lint
npx expo-doctor
npx expo export --platform android --platform ios --output-dir .expo-export-check   # bundle check
```

## Releasing to Google Play

1. The EAS project (`@faridmahmudluu/calisiyo`) and the `EXPO_PUBLIC_*` variables for all environments are already set up.
2. Build: `npm run build:android:production` (AAB). The upload keystore is stored on EAS, so never create a new one.
3. In Play Console, create the app, finish the store listing, the content rating questionnaire, Data safety, and the account deletion URL (`https://calisiyo.com.tr/hesap-silme`).
4. Upload the first AAB manually to the **Internal testing** track. After that, create a Play service account, save its key as `google-play-service-account.json` (git-ignored) and use `npm run submit:android`.
5. Ship JS-only fixes with `npx eas-cli@latest update --channel production`.

## iOS (later)

The code and config are already iOS-ready: Sign in with Apple, Live Activity / Dynamic Island, home and Lock Screen widgets, and Face ID. You will need an Apple Developer account. Then run `npx eas-cli@latest build -p ios --profile production` and `eas submit -p ios`.

## Store policy notes

- Plus is **not sold in the app**. The package screen only shows status, offers the free trial, and refreshes the status of existing orders. Purchases bought on the web unlock automatically.
- In-app account deletion: Ayarlar → Hesabımı kalıcı olarak sil (`DELETE /api/account`).
