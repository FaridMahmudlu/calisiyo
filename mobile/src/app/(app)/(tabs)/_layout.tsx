import TopTabs, { type MaterialTopTabBarProps } from 'expo-router/js-top-tabs';
import { FloatingTabBar } from '@/components/navigation/FloatingTabBar';
import { useTheme } from '@/theme/ThemeProvider';

// Swipeable pager tabs (left/right finger swipe moves between tabs) with a
// custom floating tab bar at the bottom.
export default function TabsLayout() {
  const { colors } = useTheme();
  return (
    <TopTabs
      tabBarPosition="bottom"
      tabBar={(props: MaterialTopTabBarProps) => <FloatingTabBar {...props} />}
      screenOptions={{
        swipeEnabled: true,
        animationEnabled: true,
        lazy: true,
        lazyPreloadDistance: 1,
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <TopTabs.Screen name="index" options={{ title: 'Bugün' }} />
      <TopTabs.Screen name="program" options={{ title: 'Program' }} />
      <TopTabs.Screen name="kronometre" options={{ title: 'Kronometre' }} />
      <TopTabs.Screen name="arkadaslar" options={{ title: 'Sınıflar' }} />
      <TopTabs.Screen name="menu" options={{ title: 'Daha' }} />
    </TopTabs>
  );
}
