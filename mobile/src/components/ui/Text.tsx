import { Text as RNText, type TextProps } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { typography, type ThemeColors, type TypographyVariant } from '@/theme/tokens';

export type AppTextProps = TextProps & {
  variant?: TypographyVariant;
  color?: keyof ThemeColors | (string & {});
  align?: 'left' | 'center' | 'right';
  numberOfLines?: number;
};

// CSS-style textTransform uses the English mapping (i → I); Turkish needs i → İ.
const upperTr = (node: TextProps['children']): TextProps['children'] =>
  typeof node === 'string' ? node.toLocaleUpperCase('tr-TR') : Array.isArray(node) ? node.map((part) => (typeof part === 'string' ? part.toLocaleUpperCase('tr-TR') : part)) : node;

export function Text({ variant = 'body', color = 'text', align, style, children, ...props }: AppTextProps) {
  const { colors } = useTheme();
  const resolved = color in colors ? colors[color as keyof ThemeColors] : color;
  const upper = variant === 'label';
  return (
    <RNText
      maxFontSizeMultiplier={1.4}
      {...props}
      style={[typography[variant], upper && { textTransform: 'none' }, { color: resolved }, align ? { textAlign: align } : null, style]}
    >
      {upper ? upperTr(children) : children}
    </RNText>
  );
}
