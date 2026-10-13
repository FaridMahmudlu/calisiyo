import * as ScreenOrientation from 'expo-screen-orientation';
import { Dimensions, Platform } from 'react-native';

// Phones stay portrait (app config). Tablets and unfolded foldables (shortest
// side ≥ 600dp) may rotate freely; the layout adapts via useResponsive.
// Android 16+ already ignores the portrait lock on large screens; this keeps
// older Android tablets consistent. iPads follow the system (split view).
function applyOrientationPolicy() {
  if (Platform.OS !== 'android') return;
  const { width, height } = Dimensions.get('screen');
  const action = Math.min(width, height) >= 600
    ? ScreenOrientation.unlockAsync()
    : ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
  action.catch(() => undefined);
}

export function initOrientationPolicy() {
  applyOrientationPolicy();
  // Foldables switch between the outer (phone) and inner (tablet) screen.
  Dimensions.addEventListener('change', applyOrientationPolicy);
}
