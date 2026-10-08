import { HStack, Image, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import { font, foregroundStyle, padding } from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';

export type TodayWidgetProps = {
  streak: number;
  todayMinutes: number;
  tasksDone: number;
  tasksTotal: number;
  nextTask: string;
  level: number;
};

// Home/Lock Screen widget: streak, today's focus minutes and next task.
const TodayWidget = (props: TodayWidgetProps, environment: WidgetEnvironment) => {
  'widget';
  const green = '#00A870';
  const orange = '#F26B49';
  if (environment.widgetFamily === 'accessoryCircular') {
    return (
      <VStack>
        <Image systemName="flame.fill" />
        <Text modifiers={[font({ weight: 'bold', size: 16 })]}>{props.streak}</Text>
      </VStack>
    );
  }
  if (environment.widgetFamily === 'accessoryRectangular') {
    return (
      <VStack alignment="leading">
        <Text modifiers={[font({ weight: 'bold', size: 14 })]}>🔥 {props.streak} gün · {props.todayMinutes} dk</Text>
        <Text modifiers={[font({ size: 12 })]}>{props.tasksDone}/{props.tasksTotal} görev tamamlandı</Text>
      </VStack>
    );
  }
  const small = environment.widgetFamily === 'systemSmall';
  return (
    <VStack alignment="leading" spacing={6} modifiers={[padding({ all: 4 })]}>
      <HStack>
        <Image systemName="flame.fill" color={orange} />
        <Text modifiers={[font({ weight: 'heavy', size: 22 }), foregroundStyle(orange)]}>{props.streak}</Text>
        <Spacer />
        <Text modifiers={[font({ size: 11, weight: 'semibold' }), foregroundStyle('#A36B08')]}>Sv. {props.level}</Text>
      </HStack>
      <Text modifiers={[font({ size: 12 }), foregroundStyle('#66738F')]}>günlük seri</Text>
      <Spacer />
      <Text modifiers={[font({ weight: 'bold', size: small ? 15 : 17 }), foregroundStyle(green)]}>{Math.min(props.todayMinutes, 999)} / 30 dk</Text>
      <Text modifiers={[font({ size: 12 })]}>{props.tasksDone}/{props.tasksTotal} görev</Text>
      {!small && props.nextTask ? <Text modifiers={[font({ size: 12 }), foregroundStyle('#66738F')]}>Sıradaki: {props.nextTask}</Text> : null}
    </VStack>
  );
};

export default createWidget('TodayWidget', TodayWidget);
