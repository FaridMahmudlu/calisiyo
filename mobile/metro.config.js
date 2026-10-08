const path = require('path');
const { getSentryExpoConfig } = require('@sentry/react-native/metro');

// Expo's default Metro config plus Sentry debug IDs for readable stack traces.
const config = getSentryExpoConfig(__dirname);
const sharedRoot = path.resolve(__dirname, '../lib');

// Pure business rules (plans, dates, curricula, guides) are shared with the
// Next.js web app from ../lib so both clients stay in lockstep. The `@shared/*`
// alias itself comes from tsconfig.json paths, which Expo's Metro resolves.
config.watchFolders = [...(config.watchFolders || []), sharedRoot];
config.resolver.sourceExts = [...new Set([...config.resolver.sourceExts, 'mjs'])];

module.exports = config;
