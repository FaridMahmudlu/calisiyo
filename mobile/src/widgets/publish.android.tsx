import { requestWidgetUpdate } from 'react-native-android-widget';
import type { WidgetSnapshot } from './snapshot';
import { QuickFocusWidgetAndroid, TodayWidgetAndroid } from './TodayWidgetAndroid';
import { ANDROID_WIDGET_NAME, QUICK_FOCUS_WIDGET_NAME } from './widgetTaskHandler';

export async function publishWidget(snapshot: WidgetSnapshot) {
  await Promise.all([
    requestWidgetUpdate({
      widgetName: ANDROID_WIDGET_NAME,
      renderWidget: (info) => <TodayWidgetAndroid snapshot={snapshot} compact={info.width < 250} />,
      widgetNotFound: () => undefined,
    }),
    requestWidgetUpdate({
      widgetName: QUICK_FOCUS_WIDGET_NAME,
      renderWidget: () => <QuickFocusWidgetAndroid snapshot={snapshot} />,
      widgetNotFound: () => undefined,
    }),
  ]);
}
