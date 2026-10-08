import { Text as RNText, type TextProps } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { typography, type ThemeColors, type TypographyVariant } from '@/theme/tokens';

export type AppTextProps = TextProps & {
  variant?: TypographyVariant;
  color?: keyof ThemeColors | (string & {});
  align?: 'left' | 'center' | 'right';
  numberOfLines?: number;
};

export function Text({ variant = 'body', color = 'text', align, style, ...props }: AppTextProps) {
  const { colors } = useTheme();
  const resolved = color in colors ? colors[color as keyof ThemeColors] : color;
  return (
    <RNText
      maxFontSizeMultiplier={1.4}
      {...props}
      style={[typography[variant], { color: resolved }, align ? { textAlign: align } : null, style]}
    />
  );
}
