import type { WidgetTaskHandlerProps } from 'react-native-android-widget';
import { readSnapshot } from './snapshot';
import { TodayWidgetAndroid } from './TodayWidgetAndroid';

export const ANDROID_WIDGET_NAME = 'TodayWidget';

// Runs headless when Android adds, resizes or periodically refreshes the widget.
export async function widgetTaskHandler({ widgetInfo, widgetAction, renderWidget }: WidgetTaskHandlerProps) {
  if (widgetInfo.widgetName !== ANDROID_WIDGET_NAME || widgetAction === 'WIDGET_DELETED' || widgetAction === 'WIDGET_CLICK') return;
  renderWidget(<TodayWidgetAndroid snapshot={readSnapshot()} compact={widgetInfo.width < 250} />);
}
