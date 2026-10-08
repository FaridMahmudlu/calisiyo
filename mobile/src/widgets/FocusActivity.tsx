import { HStack, Image, ProgressView, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import { font, foregroundStyle, frame, monospacedDigit, padding, tint } from '@expo/ui/swift-ui/modifiers';
import { createLiveActivity, type LiveActivityEnvironment } from 'expo-widgets';

export type FocusActivityProps = {
  title: string;
  subtitle: string;
  mode: 'focus' | 'break';
  startsAt: number;
  endsAt: number;
};

// Lock Screen banner + Dynamic Island for a running Kronometre stage. The
// countdown is rendered natively by SwiftUI, so it stays accurate without app updates.
const FocusActivity = (props: FocusActivityProps, environment: LiveActivityEnvironment) => {
  'widget';
  const accent = environment.isLuminanceReduced ? '#FFFFFF' : props.mode === 'break' ? '#F59E0B' : '#00A870';
  const symbol = props.mode === 'break' ? 'cup.and.saucer.fill' : 'timer';
  const interval = { lower: new Date(props.startsAt), upper: new Date(props.endsAt) };

  return {
    banner: (
      <VStack spacing={8} modifiers={[padding({ all: 16 })]}>
        <HStack spacing={10}>
          <Image systemName={symbol} color={accent} />
          <VStack alignment="leading" spacing={2}>
            <Text modifiers={[font({ weight: 'bold', size: 16 })]}>{props.title}</Text>
            <Text modifiers={[font({ size: 13 }), foregroundStyle('#8A94A6')]}>{props.subtitle}</Text>
          </VStack>
          <Spacer />
          <Text timerInterval={interval} countsDown modifiers={[font({ weight: 'heavy', size: 30, design: 'rounded' }), monospacedDigit(), foregroundStyle(accent), frame({ width: 110 })]} />
        </HStack>
        <ProgressView timerInterval={interval} countsDown={false} modifiers={[tint(accent)]} />
      </VStack>
    ),
    compactLeading: <Image systemName={symbol} color={accent} />,
    compactTrailing: <Text timerInterval={interval} countsDown modifiers={[monospacedDigit(), foregroundStyle(accent), frame({ width: 52 })]} />,
    minimal: <Image systemName={symbol} color={accent} />,
    expandedLeading: (
      <VStack alignment="leading" modifiers={[padding({ leading: 8 })]}>
        <Image systemName={symbol} color={accent} />
        <Text modifiers={[font({ size: 12 })]}>{props.mode === 'break' ? 'Mola' : 'Odak'}</Text>
      </VStack>
    ),
    expandedTrailing: (
      <Text timerInterval={interval} countsDown modifiers={[font({ weight: 'heavy', size: 26, design: 'rounded' }), monospacedDigit(), foregroundStyle(accent), padding({ trailing: 8 })]} />
    ),
    expandedBottom: (
      <VStack spacing={6} modifiers={[padding({ horizontal: 12, bottom: 8 })]}>
        <Text modifiers={[font({ size: 13 })]}>{props.subtitle}</Text>
        <ProgressView timerInterval={interval} countsDown={false} modifiers={[tint(accent)]} />
      </VStack>
    ),
  };
};

export default createLiveActivity('FocusActivity', FocusActivity);
