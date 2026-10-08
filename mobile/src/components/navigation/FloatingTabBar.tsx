import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import type { MaterialTopTabBarProps } from 'expo-router/js-top-tabs';
import { useEffect, useState, type ComponentType } from 'react';
import { Animated, Keyboard, Platform, Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/ui';
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

const INACTIVE = 'rgba(226, 242, 235, 0.56)';

// Floating glass capsule. The gradient pill tracks the pager `position`, so it
// glides with the finger while swiping between tabs.
export function FloatingTabBar({ state, descriptors, navigation, position }: MaterialTopTabBarProps) {
  const insets = useSafeAreaInsets();
  const [width, setWidth] = useState(0);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const count = state.routes.length;
  const tabWidth = width / count;

  useEffect(() => {
    const show = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', () => setKeyboardOpen(true));
    const hide = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setKeyboardOpen(false));
    return () => { show.remove(); hide.remove(); };
  }, []);

  if (keyboardOpen) return null;

  const indices = state.routes.map((_: unknown, index: number) => index);
  const translateX = tabWidth && count > 1
    ? position.interpolate({ inputRange: indices, outputRange: indices.map((index: number) => index * tabWidth), extrapolate: 'clamp' })
    : 0;

  return (
    <View pointerEvents="box-none" style={[styles.host, { bottom: Math.max(insets.bottom, 10) + 4 }]}>
      <View style={styles.shadow}>
        <LinearGradient colors={['#172A2C', '#0B1518']} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={styles.bar}
          onLayout={(event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width - 12)}>
          <View style={styles.highlight} pointerEvents="none" />
          {tabWidth ? (
            <Animated.View pointerEvents="none" style={[styles.indicatorWrap, { width: tabWidth, transform: [{ translateX }] }]}>
              <LinearGradient colors={[brand.greenBright, brand.greenDeep]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.indicator} />
            </Animated.View>
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
                  <View style={[styles.tabInner, { transform: [{ scale: pressed ? 0.9 : 1 }] }]}>
                    <Icon active={focused} color={focused ? '#FFFFFF' : INACTIVE} accent={brand.amber} size={focused ? 24 : 23} />
                    <Text variant="caption" numberOfLines={1} color={focused ? '#FFFFFF' : INACTIVE}
                      style={[styles.label, { fontFamily: focused ? fonts.heavy : fonts.medium }]}>{label}</Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </LinearGradient>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  host: { position: 'absolute', left: 14, right: 14 },
  shadow: {
    borderRadius: 26, shadowColor: '#03110C', shadowOpacity: 0.32, shadowRadius: 22, shadowOffset: { width: 0, height: 12 }, elevation: 18,
  },
  bar: {
    height: TAB_BAR_HEIGHT, borderRadius: 26, paddingHorizontal: 6, flexDirection: 'row', alignItems: 'center', overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  highlight: { position: 'absolute', top: 0, left: 24, right: 24, height: 1, backgroundColor: 'rgba(255,255,255,0.14)' },
  indicatorWrap: { position: 'absolute', left: 6, top: 6, bottom: 6, paddingHorizontal: 3 },
  indicator: { flex: 1, borderRadius: 20 },
  tab: { flex: 1, height: TAB_BAR_HEIGHT, alignItems: 'center', justifyContent: 'center' },
  tabInner: { alignItems: 'center', justifyContent: 'center', gap: 3 },
  label: { fontSize: 10.5, lineHeight: 13, letterSpacing: 0.1 },
});
