import type { WidgetTaskHandlerProps } from 'react-native-android-widget';
import { readSnapshot } from './snapshot';
import { QuickFocusWidgetAndroid, TodayWidgetAndroid } from './TodayWidgetAndroid';

export const ANDROID_WIDGET_NAME = 'TodayWidget';
export const QUICK_FOCUS_WIDGET_NAME = 'QuickFocusWidget';

// Runs headless when Android adds, resizes or periodically refreshes a widget.
export async function widgetTaskHandler({ widgetInfo, widgetAction, renderWidget }: WidgetTaskHandlerProps) {
  if (widgetAction === 'WIDGET_DELETED' || widgetAction === 'WIDGET_CLICK') return;
  const snapshot = readSnapshot();
  if (widgetInfo.widgetName === ANDROID_WIDGET_NAME) renderWidget(<TodayWidgetAndroid snapshot={snapshot} compact={widgetInfo.width < 250} />);
  else if (widgetInfo.widgetName === QUICK_FOCUS_WIDGET_NAME) renderWidget(<QuickFocusWidgetAndroid snapshot={snapshot} />);
}
