import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import type { MaterialTopTabBarProps } from 'expo-router/js-top-tabs';
import { useEffect, useState, type ComponentType } from 'react';
import { Animated, Keyboard, Platform, Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/ui';
import { useResponsive } from '@/hooks/useResponsive';
import { useTheme } from '@/theme/ThemeProvider';
import { brand, fonts } from '@/theme/tokens';
import { ClassIcon, HomeIcon, MoreIcon, ProgramIcon, TimerIcon, type TabIconProps } from './TabIcons';

const ICONS: Record<string, ComponentType<TabIconProps>> = {
  index: HomeIcon,
  program: ProgramIcon,
  kronometre: TimerIcon,
  arkadaslar: ClassIcon,
  menu: MoreIcon,
};

export const TAB_BAR_HEIGHT = 68;
// Space screens must leave above the floating bar (bar + its bottom offset).
export const tabBarClearance = (bottomInset: number) => TAB_BAR_HEIGHT + Math.max(bottomInset, 10) + 14;

const INDICATOR_WIDTH = 56;
const MAX_BAR_WIDTH = 560;

// Floating glass capsule that follows the theme. A soft indicator sits behind
// the active icon and glides with the pager `position` while swiping.
export function FloatingTabBar({ state, descriptors, navigation, position }: MaterialTopTabBarProps) {
  const insets = useSafeAreaInsets();
  const { colors, scheme } = useTheme();
  const { width: screenWidth } = useResponsive();
  const dark = scheme === 'dark';
  const [width, setWidth] = useState(0);
  // Phone: edge-to-edge capsule. Tablet: a centered capsule of comfortable width.
  const barWidth = Math.min(screenWidth - 28, MAX_BAR_WIDTH);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const count = state.routes.length;
  const tabWidth = width / count;

  useEffect(() => {
    const show = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', () => setKeyboardOpen(true));
    const hide = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setKeyboardOpen(false));
    return () => { show.remove(); hide.remove(); };
  }, []);

  if (keyboardOpen) return null;

  const palette = dark
    ? { bar: Platform.OS === 'ios' ? 'rgba(18, 27, 25, 0.72)' : 'rgba(18, 27, 25, 0.97)', border: 'rgba(255, 255, 255, 0.08)', idle: 'rgba(226, 242, 235, 0.5)', active: colors.primary, label: colors.text, pill: 'rgba(27, 193, 132, 0.16)', pillBorder: 'rgba(27, 193, 132, 0.28)', shadow: 0.45 }
    : { bar: Platform.OS === 'ios' ? 'rgba(255, 255, 255, 0.72)' : 'rgba(255, 255, 255, 0.98)', border: 'rgba(13, 27, 42, 0.07)', idle: '#8493A2', active: colors.primary, label: colors.text, pill: colors.primarySoft, pillBorder: colors.primaryBorder, shadow: 0.13 };

  const indices = state.routes.map((_: unknown, index: number) => index);
  const offset = (tabWidth - INDICATOR_WIDTH) / 2;
  const translateX = tabWidth && count > 1
    ? position.interpolate({ inputRange: indices, outputRange: indices.map((index: number) => index * tabWidth + offset), extrapolate: 'clamp' })
    : 0;

  return (
    <View pointerEvents="box-none" style={[styles.host, { bottom: Math.max(insets.bottom, 10) + 4, width: barWidth, left: (screenWidth - barWidth) / 2 }]}>
      <View style={[styles.shadow, { shadowOpacity: palette.shadow, shadowColor: dark ? '#000000' : '#0B2B20' }]}>
        <View style={[styles.bar, { backgroundColor: palette.bar, borderColor: palette.border }]}
          onLayout={(event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width - 12)}>
          {Platform.OS === 'ios' ? <BlurView intensity={40} tint={dark ? 'systemChromeMaterialDark' : 'systemChromeMaterialLight'} style={StyleSheet.absoluteFill} /> : null}
          {tabWidth ? (
            <Animated.View pointerEvents="none" style={[styles.indicator, { backgroundColor: palette.pill, borderColor: palette.pillBorder, transform: [{ translateX }] }]} />
          ) : null}
          {state.routes.map((route: { key: string; name: string; params?: object }, index: number) => {
            const focused = state.index === index;
            const options = descriptors[route.key]?.options || {};
            const label = typeof options.title === 'string' ? options.title : route.name;
            const Icon = ICONS[route.name] || MoreIcon;
            const onPress = () => {
              const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!focused && !event.defaultPrevented) {
                Haptics.selectionAsync().catch(() => undefined);
                navigation.navigate(route.name, route.params);
              }
            };
            return (
              <Pressable key={route.key} accessibilityRole="tab" accessibilityState={{ selected: focused }} accessibilityLabel={label}
                onPress={onPress} onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })} style={styles.tab}>
                {({ pressed }) => (
                  <View style={[styles.tabInner, { transform: [{ scale: pressed ? 0.92 : 1 }] }]}>
                    <View style={styles.iconSlot}>
                      <Icon active={focused} color={focused ? palette.active : palette.idle} accent={brand.amber} size={24} />
                    </View>
                    <Text variant="caption" numberOfLines={1} color={focused ? palette.label : palette.idle}
                      style={[styles.label, { fontFamily: focused ? fonts.heavy : fonts.medium }]}>{label}</Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  host: { position: 'absolute' },
  shadow: { borderRadius: 28, shadowRadius: 24, shadowOffset: { width: 0, height: 10 }, elevation: 14 },
  bar: {
    height: TAB_BAR_HEIGHT, borderRadius: 28, paddingHorizontal: 6, flexDirection: 'row', alignItems: 'center', overflow: 'hidden', borderWidth: 1,
  },
  indicator: { position: 'absolute', left: 6, top: 9, width: INDICATOR_WIDTH, height: 32, borderRadius: 16, borderWidth: 1 },
  tab: { flex: 1, height: TAB_BAR_HEIGHT, alignItems: 'center', justifyContent: 'center' },
  tabInner: { alignItems: 'center', justifyContent: 'center', gap: 4 },
  iconSlot: { height: 32, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 11, lineHeight: 13, letterSpacing: 0.1 },
});
