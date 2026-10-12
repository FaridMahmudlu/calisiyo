import { Gauge, HStack, Image, Link, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import { background, containerBackground, cornerRadius, font, foregroundStyle, gaugeStyle, padding, tint, widgetURL } from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';

export type TodayWidgetProps = {
  streak: number;
  todayMinutes: number;
  tasksDone: number;
  tasksTotal: number;
  nextTask: string;
  level: number;
};

// Home/Lock Screen widget: today's focus ring, streak, tasks, next task and a
// one-tap "Odak başlat" link. Everything lives inside the widget function
// because the widget runtime only serializes this body.
const TodayWidget = (props: TodayWidgetProps, environment: WidgetEnvironment) => {
  'widget';
  const goal = 30;
  const progress = Math.max(0, Math.min(1, props.todayMinutes / goal));
  const minutes = Math.min(props.todayMinutes, 999);
  const amber = '#FFC247';
  const soft = '#DDFBEE';
  const family = environment.widgetFamily;

  if (family === 'accessoryCircular') {
    return (
      <Gauge value={progress} modifiers={[gaugeStyle('circularCapacity'), widgetURL('planliyo://')]}
        currentValueLabel={<Text modifiers={[font({ weight: 'bold', size: 15, design: 'rounded' })]}>{minutes}</Text>}>
        <Image systemName="flame.fill" />
      </Gauge>
    );
  }
  if (family === 'accessoryRectangular') {
    return (
      <VStack alignment="leading" spacing={2} modifiers={[widgetURL('planliyo://')]}>
        <HStack spacing={4}>
          <Image systemName="flame.fill" />
          <Text modifiers={[font({ weight: 'bold', size: 15 })]}>{props.streak} gün seri</Text>
        </HStack>
        <Text modifiers={[font({ size: 12 })]}>{minutes}/{goal} dk · {props.tasksDone}/{props.tasksTotal} görev</Text>
        {props.nextTask ? <Text modifiers={[font({ size: 12 })]}>{props.nextTask}</Text> : null}
      </VStack>
    );
  }

  const brand = containerBackground({ type: 'linearGradient', colors: ['#12C383', '#00704F'], startPoint: { x: 0, y: 0 }, endPoint: { x: 1, y: 1 } }, 'widget');
  const ring = (
    <Gauge value={progress} modifiers={[gaugeStyle('circularCapacity'), tint(amber)]}
      currentValueLabel={<Text modifiers={[font({ weight: 'heavy', size: 17, design: 'rounded' }), foregroundStyle('#FFFFFF')]}>{minutes}</Text>}>
      <Text modifiers={[foregroundStyle(soft)]}>dk</Text>
    </Gauge>
  );

  if (family === 'systemSmall') {
    return (
      <VStack alignment="leading" spacing={4} modifiers={[brand, widgetURL('planliyo://kronometre?baslat=1')]}>
        <HStack>
          {ring}
          <Spacer />
          <Image systemName="play.circle.fill" color="#FFFFFF" />
        </HStack>
        <Spacer />
        <HStack spacing={4}>
          <Image systemName="flame.fill" color={amber} />
          <Text modifiers={[font({ weight: 'heavy', size: 17 }), foregroundStyle('#FFFFFF')]}>{props.streak} gün</Text>
        </HStack>
        <Text modifiers={[font({ size: 12 }), foregroundStyle(soft)]}>{props.tasksDone}/{props.tasksTotal} görev · Sv. {props.level}</Text>
      </VStack>
    );
  }

  return (
    <HStack spacing={14} modifiers={[brand, widgetURL('planliyo://')]}>
      <VStack spacing={4}>
        {ring}
        <Text modifiers={[font({ size: 11 }), foregroundStyle(soft)]}>/ {goal} dk</Text>
      </VStack>
      <VStack alignment="leading" spacing={4}>
        <HStack spacing={4}>
          <Image systemName="flame.fill" color={amber} />
          <Text modifiers={[font({ weight: 'heavy', size: 18 }), foregroundStyle('#FFFFFF')]}>{props.streak} gün seri</Text>
        </HStack>
        <Text modifiers={[font({ size: 12 }), foregroundStyle(soft)]}>{props.tasksDone}/{props.tasksTotal} görev · Seviye {props.level}</Text>
        <Text modifiers={[font({ size: 12, weight: 'semibold' }), foregroundStyle('#FFFFFF')]}>{props.nextTask ? `Sıradaki: ${props.nextTask}` : 'Bugün için plan ekle'}</Text>
        <Spacer />
        <Link destination="planliyo://kronometre?baslat=1">
          <HStack spacing={6} modifiers={[padding({ horizontal: 12, vertical: 6 }), background('#FFFFFF'), cornerRadius(14)]}>
            <Image systemName="play.fill" color="#00704F" />
            <Text modifiers={[font({ weight: 'bold', size: 13 }), foregroundStyle('#00704F')]}>Odak başlat</Text>
          </HStack>
        </Link>
      </VStack>
      <Spacer />
    </HStack>
  );
};

export default createWidget('TodayWidget', TodayWidget);
