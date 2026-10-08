import { registerWidgetTaskHandler } from 'react-native-android-widget';
import { widgetTaskHandler } from './widgetTaskHandler';

// Android home-screen widget renderer (headless task).
registerWidgetTaskHandler(widgetTaskHandler);
