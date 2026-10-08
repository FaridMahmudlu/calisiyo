import { View } from 'react-native';
import Svg, { Circle, Defs, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/theme/ThemeProvider';

// Same geometry as mobile/scripts/brand/marks.cjs ("Yol"): the "c" is a road
// that starts at a dot and ends at the goal flag.
const ROAD = 'M68.06 34.93 A27 27 0 1 0 68.06 71.07';
const FLAG = 'M69.6 11.6 C74.6 9.6 78.6 14.4 85.6 12 V24.6 C78.6 27 74.6 22.2 69.6 24.2 Z';

function MarkShape({ road, lane, flag }: { road: string; lane: string; flag: string }) {
  return (
    <>
      <Path d={ROAD} fill="none" stroke={road} strokeWidth={17} strokeLinecap="round" />
      <Path d={ROAD} fill="none" stroke={lane} strokeWidth={2.8} strokeLinecap="round" strokeDasharray="2.6 8.24" strokeDashoffset={6.72} />
      <Circle cx={68.06} cy={71.07} r={3.6} fill={lane} />
      <Path d="M68.06 36 V11.2" stroke={road} strokeWidth={3.4} strokeLinecap="round" />
      <Path d={FLAG} fill={flag} />
    </>
  );
}

// App-icon style tile (gradient square). `bare` draws only the mark in brand green.
export function BrandMark({ size = 44, bare = false }: { size?: number; bare?: boolean }) {
  if (bare) {
    return (
      <Svg width={size} height={size} viewBox="0 0 100 100" accessibilityLabel="calisiyo">
        <MarkShape road="#00A870" lane="#FFFFFF" flag="#FFC247" />
      </Svg>
    );
  }
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" accessibilityLabel="calisiyo">
      <Defs>
        <LinearGradient id="calisiyoTile" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#14C784" />
          <Stop offset="1" stopColor="#00704F" />
        </LinearGradient>
      </Defs>
      <Rect width={100} height={100} rx={24} fill="url(#calisiyoTile)" />
      <G transform="translate(50 50) scale(0.84) translate(-49 -50)">
        <MarkShape road="#FFFFFF" lane="#00A870" flag="#FFC247" />
      </G>
    </Svg>
  );
}

export function BrandLogo({ size = 36 }: { size?: number }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: size * 0.22 }} accessibilityRole="header" accessibilityLabel="calisiyo">
      <BrandMark size={size} bare />
      <Text variant="title" color={colors.text} style={{ fontSize: size * 0.74, lineHeight: size * 0.95, letterSpacing: -0.6 }}>calisiyo</Text>
    </View>
  );
}
