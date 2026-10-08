import { Eye, EyeOff, type LucideIcon } from 'lucide-react-native';
import { forwardRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts, radius } from '@/theme/tokens';
import { Text } from './Text';

export type TextFieldProps = TextInputProps & {
  label?: string;
  hint?: string;
  error?: string;
  icon?: LucideIcon;
  secure?: boolean;
  multiline?: boolean;
};

export const TextField = forwardRef<TextInput, TextFieldProps>(function TextField(
  { label, hint, error, icon: Icon, secure, multiline, style, ...props }, ref,
) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(true);
  const borderColor = error ? colors.danger : focused ? colors.primary : colors.border;

  return (
    <View style={styles.wrap}>
      {label ? <Text variant="captionStrong" color="textMuted">{label}</Text> : null}
      <View style={[styles.field, multiline && styles.multiline, { borderColor, backgroundColor: colors.surface }]}>
        {Icon ? <Icon size={18} color={focused ? colors.primary : colors.textSubtle} /> : null}
        <TextInput
          ref={ref}
          placeholderTextColor={colors.textSubtle}
          selectionColor={colors.primary}
          secureTextEntry={secure && hidden}
          multiline={multiline}
          textAlignVertical={multiline ? 'top' : 'center'}
          maxFontSizeMultiplier={1.4}
          {...props}
          onFocus={(event) => { setFocused(true); props.onFocus?.(event); }}
          onBlur={(event) => { setFocused(false); props.onBlur?.(event); }}
          style={[styles.input, { color: colors.text }, multiline && styles.inputMultiline, style]}
        />
        {secure ? (
          <Pressable accessibilityRole="button" accessibilityLabel={hidden ? 'Şifreyi göster' : 'Şifreyi gizle'} hitSlop={10} onPress={() => setHidden((value) => !value)}>
            {hidden ? <Eye size={18} color={colors.textSubtle} /> : <EyeOff size={18} color={colors.textSubtle} />}
          </Pressable>
        ) : null}
      </View>
      {error ? <Text variant="caption" color="danger">{error}</Text> : hint ? <Text variant="caption" color="textSubtle">{hint}</Text> : null}
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  field: { minHeight: 50, paddingHorizontal: 14, borderRadius: radius.sm, borderWidth: 1.5, flexDirection: 'row', alignItems: 'center', gap: 10 },
  multiline: { alignItems: 'flex-start', paddingVertical: 12 },
  input: { flex: 1, fontFamily: fonts.regular, fontSize: 16, paddingVertical: 12 },
  inputMultiline: { minHeight: 110, paddingVertical: 0 },
});
