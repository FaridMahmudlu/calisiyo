import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { StyleSheet, useColorScheme } from 'react-native';
import Animated, { Easing, useAnimatedProps, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withSequence, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';
import { scheduleOnRN } from 'react-native-worklets';
import { brand } from '@/theme/tokens';
import { useLaunchReady } from './launch';
import { WORDMARK } from './wordmark';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const { box, ring, dot } = WORDMARK;
const CIRCUMFERENCE = 2 * Math.PI * ring.r;
const LOGO_ARC = 258 / 360; // the logo's amber arc covers 258° of the "o"
const WIDTH = 124; // matches the native splash (200dp image, wordmark at 62% of it)
const HEIGHT = (WIDTH * box.height) / box.width;
const MAX_WAIT = 4000;

// Cold-start intro: starts identical to the native splash, then the amber arc
// completes the ring ("plan done"), the logo breathes and lifts away to reveal
// the first screen. Plays once per app launch; skipped with Reduce Motion.
export function LaunchAnimation() {
  const dark = useColorScheme() === 'dark';
  const ready = useLaunchReady();
  const reduceMotion = useReducedMotion();
  const [timedOut, setTimedOut] = useState(false);
  const [done, setDone] = useState(false);
  const fill = useSharedValue(LOGO_ARC);
  const scale = useSharedValue(1);
  const exit = useSharedValue(0);

  useEffect(() => {
    const timer = setTimeout(() => setTimedOut(true), MAX_WAIT);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!ready && !timedOut) return;
    const finish = (finished?: boolean) => { 'worklet'; if (finished) scheduleOnRN(setDone, true); };
    if (reduceMotion) {
      exit.set(withTiming(1, { duration: 180 }, finish));
      return;
    }
    fill.set(withTiming(1, { duration: 560, easing: Easing.inOut(Easing.cubic) }));
    scale.set(withSequence(withTiming(1.06, { duration: 560, easing: Easing.out(Easing.cubic) }), withTiming(1.22, { duration: 360, easing: Easing.in(Easing.cubic) })));
    exit.set(withDelay(620, withTiming(1, { duration: 320, easing: Easing.in(Easing.quad) }, finish)));
  }, [ready, timedOut, reduceMotion, fill, scale, exit]);

  const arcProps = useAnimatedProps(() => ({ strokeDashoffset: CIRCUMFERENCE * (1 - fill.value) }));
  const logoStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const screenStyle = useAnimatedStyle(() => ({ opacity: 1 - exit.value }));

  if (done) return null;

  const text = dark ? '#FFFFFF' : '#0D1B2A';
  const track = dark ? 'rgba(255,255,255,0.35)' : 'rgba(0,168,112,0.22)';
  return (
    <Animated.View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      onLayout={() => { SplashScreen.hideAsync().catch(() => undefined); }}
      style={[StyleSheet.absoluteFill, styles.center, { backgroundColor: dark ? '#0C1211' : '#FBFCFD' }, screenStyle]}
    >
      <Animated.View style={logoStyle}>
        <Svg width={WIDTH} height={HEIGHT} viewBox={`${box.x} ${box.y} ${box.width} ${box.height}`}>
          <Path d={WORDMARK.d} fill={text} />
          <Circle cx={dot.cx} cy={dot.cy} r={dot.r} fill={text} />
          <Circle cx={ring.cx} cy={ring.cy} r={ring.r} fill="none" stroke={track} strokeWidth={ring.w} />
          <AnimatedCircle
            cx={ring.cx} cy={ring.cy} r={ring.r} fill="none" stroke={brand.amber} strokeWidth={ring.w} strokeLinecap="round"
            strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`} transform={`rotate(-90 ${ring.cx} ${ring.cy})`} animatedProps={arcProps}
          />
        </Svg>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center', zIndex: 9999, elevation: 9999 },
});
