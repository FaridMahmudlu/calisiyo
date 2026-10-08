import { Check, Compass } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Button, Sheet, Text } from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';
import { AVATAR_MODELS, ClassroomAvatar, FACINGS, type AvatarModel } from './Avatar';

export function AvatarStudio({ open, onClose, initialModel, name, onSave, busy }: {
  open: boolean; onClose: () => void; initialModel?: string | null; name: string; onSave: (model: AvatarModel) => void; busy: boolean;
}) {
  const { colors } = useTheme();
  const [model, setModel] = useState<AvatarModel>((initialModel && initialModel in AVATAR_MODELS ? initialModel : 'navy') as AvatarModel);
  const [facingIndex, setFacingIndex] = useState(7);

  return (
    <Sheet open={open} onClose={onClose} title="Sınıf karakterini seç" subtitle="Her karakter sekiz yönden hazırlandı; sınıfta yürürken yönün otomatik değişir."
      footer={<Button title={busy ? 'Kaydediliyor…' : 'Karakterimi kaydet'} loading={busy} onPress={() => onSave(model)} style={{ flex: 1 }} />}>
      <View style={[styles.preview, { backgroundColor: colors.primarySoft }]}>
        <ClassroomAvatar model={model} size={170} facing={FACINGS[facingIndex]} name={name} />
        <Text variant="subheading">{name}</Text>
        <Text variant="caption" color="textMuted">{AVATAR_MODELS[model].description}</Text>
        <Button title="Yönü çevir" icon={Compass} size="sm" variant="secondary" onPress={() => setFacingIndex((value) => (value + 1) % FACINGS.length)} />
      </View>
      <View style={styles.grid}>
        {(Object.keys(AVATAR_MODELS) as AvatarModel[]).map((key) => {
          const selected = model === key;
          return (
            <Pressable key={key} accessibilityRole="radio" accessibilityState={{ selected }} onPress={() => setModel(key)}
              style={[styles.option, { borderColor: selected ? colors.primary : colors.border, backgroundColor: selected ? colors.primarySoft : colors.surface }]}>
              <ClassroomAvatar model={key} size={78} facing="south_east" name={AVATAR_MODELS[key].label} />
              <Text variant="captionStrong">{AVATAR_MODELS[key].label}</Text>
              {selected ? <View style={[styles.check, { backgroundColor: colors.primary }]}><Check size={12} color="#FFFFFF" strokeWidth={3} /></View> : null}
            </Pressable>
          );
        })}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  preview: { alignItems: 'center', padding: space.lg, borderRadius: radius.lg, gap: space.xs },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  option: { flexBasis: '31%', flexGrow: 1, alignItems: 'center', padding: space.sm, borderRadius: radius.md, borderWidth: 1.5 },
  check: { position: 'absolute', top: 6, right: 6, width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
});
