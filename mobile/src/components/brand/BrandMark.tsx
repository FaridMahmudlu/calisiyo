import Svg, { Circle, Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { useTheme } from '@/theme/ThemeProvider';
import { brand } from '@/theme/tokens';
import { RING_ARC, WORDMARK } from './wordmark';

// Same geometry as mobile/scripts/brand/marks.cjs ("Halqa"): the final "o" of
// the wordmark is a daily-progress ring with an amber arc.

// App-icon style tile with the progress ring. `bare` draws only the ring.
export function BrandMark({ size = 44, bare = false }: { size?: number; bare?: boolean }) {
  const { colors } = useTheme();
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" accessibilityLabel="Planliyo">
      {bare ? null : (
        <>
          <Defs>
            <LinearGradient id="planliyoTile" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor="#14C784" />
              <Stop offset="1" stopColor="#00704F" />
            </LinearGradient>
          </Defs>
          <Rect width={100} height={100} rx={24} fill="url(#planliyoTile)" />
        </>
      )}
      <Circle cx={50} cy={50} r={27} fill="none" stroke={bare ? colors.primary : '#FFFFFF'} strokeOpacity={bare ? 0.22 : 0.32} strokeWidth={21} />
      <Path d={RING_ARC} fill="none" stroke={brand.amber} strokeWidth={21} strokeLinecap="round" />
    </Svg>
  );
}

// "planliyo" wordmark. `size` is the rendered height.
export function BrandLogo({ size = 36 }: { size?: number }) {
  const { colors } = useTheme();
  const { box, ring, dot } = WORDMARK;
  return (
    <Svg
      height={size}
      width={(size * box.width) / box.height}
      viewBox={`${box.x} ${box.y} ${box.width} ${box.height}`}
      accessibilityRole="header"
      accessibilityLabel="Planliyo"
    >
      <Path d={WORDMARK.d} fill={colors.text} />
      <Circle cx={dot.cx} cy={dot.cy} r={dot.r} fill={colors.text} />
      <Circle cx={ring.cx} cy={ring.cy} r={ring.r} fill="none" stroke={colors.primary} strokeOpacity={0.24} strokeWidth={ring.w} />
      <Path d={WORDMARK.arc} fill="none" stroke={brand.amber} strokeWidth={ring.w} strokeLinecap="round" />
    </Svg>
  );
}
