import { requestWidgetUpdate } from 'react-native-android-widget';
import type { WidgetSnapshot } from './snapshot';
import { TodayWidgetAndroid } from './TodayWidgetAndroid';
import { ANDROID_WIDGET_NAME } from './widgetTaskHandler';

export async function publishWidget(snapshot: WidgetSnapshot) {
  await requestWidgetUpdate({
    widgetName: ANDROID_WIDGET_NAME,
    renderWidget: (info) => <TodayWidgetAndroid snapshot={snapshot} compact={info.width < 250} />,
    widgetNotFound: () => undefined,
  });
}
