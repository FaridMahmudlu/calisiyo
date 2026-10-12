import { useEffect } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '@/theme/ThemeProvider';

// Brand loader: the logo's progress ring, spinning. Replaces ActivityIndicator.
export function Spinner({ size = 'small', color, style }: { size?: 'small' | 'large' | number; color?: string; style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  const rotation = useSharedValue(0);
  const px = size === 'large' ? 36 : size === 'small' ? 22 : size;
  const stroke = Math.max(2.5, px * 0.13);
  const r = (px - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const tint = color || colors.primary;

  useEffect(() => {
    rotation.set(withRepeat(withTiming(360, { duration: 850, easing: Easing.linear }), -1, false));
    return () => cancelAnimation(rotation);
  }, [rotation]);

  const spin = useAnimatedStyle(() => ({ transform: [{ rotate: `${rotation.value}deg` }] }));

  return (
    <Animated.View accessibilityRole="progressbar" accessibilityLabel="Yükleniyor" style={[{ width: px, height: px }, spin, style]}>
      <Svg width={px} height={px}>
        <Circle cx={px / 2} cy={px / 2} r={r} stroke={tint} strokeOpacity={0.2} strokeWidth={stroke} fill="none" />
        <Circle cx={px / 2} cy={px / 2} r={r} stroke={tint} strokeWidth={stroke} fill="none" strokeLinecap="round" strokeDasharray={`${circumference * 0.3} ${circumference}`} />
      </Svg>
    </Animated.View>
  );
}
