import { requestPinWidget } from 'react-native-android-widget';
import { ANDROID_WIDGET_NAME, QUICK_FOCUS_WIDGET_NAME } from './widgetTaskHandler';

export const canPinWidgets = true;
export type PinnableWidget = 'today' | 'quickFocus';

// Opens the launcher's own "add to home screen" prompt (Samsung One UI, Pixel…).
// Resolves to false when the launcher does not support pinning.
export function pinWidget(widget: PinnableWidget) {
  return requestPinWidget({ widgetName: widget === 'today' ? ANDROID_WIDGET_NAME : QUICK_FOCUS_WIDGET_NAME }).catch(() => false);
}
