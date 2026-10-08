import { View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/theme/ThemeProvider';

export function BrandMark({ size = 44 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 96 96" accessibilityLabel="calisiyo">
      <Rect x="2" y="2" width="92" height="92" rx="25" fill="#00A870" />
      <Path fill="#FFFFFF" d="M18 26.7c11.8-2.7 21.8-.7 30 6.1v39.4c-7.5-5.5-16.6-7.3-27.4-5.1A3 3 0 0 1 17 64.2V30.6a4 4 0 0 1 1-3.9Z" />
      <Path fill="#E5FFF5" d="M78 26.7c-11.8-2.7-21.8-.7-30 6.1v39.4c7.5-5.5 16.6-7.3 27.4-5.1a3 3 0 0 0 3.6-2.9V30.6a4 4 0 0 0-1-3.9Z" />
      <Path d="m34.6 47.7 9.2 9.2 18-20.4" fill="none" stroke="#0B3B2E" strokeWidth={6.2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M18.5 72.2c11.9-2.4 21.7.2 29.5 7.1 7.8-6.9 17.6-9.5 29.5-7.1" fill="none" stroke="#FFFFFF" strokeWidth={5} strokeLinecap="round" />
    </Svg>
  );
}

export function BrandLogo({ size = 36 }: { size?: number }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }} accessibilityRole="header" accessibilityLabel="calisiyo">
      <BrandMark size={size} />
      <Text variant="title" color={colors.primary} style={{ fontSize: size * 0.72, lineHeight: size * 0.9 }}>calisiyo</Text>
    </View>
  );
}
