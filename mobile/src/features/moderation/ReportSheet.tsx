import { Flag, ShieldCheck } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { REPORT_REASONS, REPORT_TARGET_LABELS } from '@shared/moderation/reports';
import { Button, Sheet, Text, TextField, useToast } from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';
import { submitReport, type ReportTarget } from './moderation';

export function ReportSheet({ target, onClose }: { target: ReportTarget | null; onClose: () => void }) {
  const { colors } = useTheme();
  const toast = useToast();
  const [reason, setReason] = useState('spam');
  const [details, setDetails] = useState('');
  const [busy, setBusy] = useState(false);

  const close = () => { if (busy) return; setReason('spam'); setDetails(''); onClose(); };
  const send = async () => {
    if (!target) return;
    if (reason === 'other' && !details.trim()) return toast.error('Lütfen şikayetini kısaca açıkla.');
    setBusy(true);
    try {
      await submitReport(target, reason, details);
      toast.success('Şikayetin alındı. Yönetici ekibimiz inceleyecek.');
      setBusy(false);
      setReason('spam');
      setDetails('');
      onClose();
    } catch (error) {
      setBusy(false);
      toast.error((error as Error).message);
    }
  };

  return (
    <Sheet open={!!target} onClose={close} title={`${REPORT_TARGET_LABELS[target?.type || 'message']} şikayet et`} subtitle={target?.label || 'Şikayetin yönetici ekibine gizli olarak iletilir.'}
      footer={<Button title={busy ? 'Gönderiliyor…' : 'Şikayeti gönder'} icon={Flag} variant="danger" loading={busy} onPress={send} style={{ flex: 1 }} />}>
      <View style={{ gap: space.xs }} accessibilityRole="radiogroup">
        {REPORT_REASONS.map((item) => {
          const active = reason === item.value;
          return (
            <Pressable key={item.value} accessibilityRole="radio" accessibilityState={{ selected: active }} onPress={() => setReason(item.value)}
              style={[styles.option, { borderColor: active ? colors.danger : colors.border, backgroundColor: active ? colors.dangerSoft : colors.surface }]}>
              <View style={[styles.radio, { borderColor: active ? colors.danger : colors.borderStrong }]}>{active ? <View style={[styles.dot, { backgroundColor: colors.danger }]} /> : null}</View>
              <View style={{ flex: 1 }}><Text variant="bodyStrong">{item.label}</Text><Text variant="caption" color="textMuted">{item.description}</Text></View>
            </Pressable>
          );
        })}
      </View>
      <TextField label={reason === 'other' ? 'Açıklama' : 'Açıklama (isteğe bağlı)'} multiline value={details} onChangeText={setDetails} maxLength={500} placeholder="Ne olduğunu kısaca anlat" hint={`${details.length}/500`} style={{ minHeight: 80 }} />
      <View style={{ flexDirection: 'row', gap: space.sm, alignItems: 'center' }}>
        <ShieldCheck size={15} color={colors.textMuted} />
        <Text variant="caption" color="textMuted" style={{ flex: 1 }}>Şikayet ettiğin kişiye adın gösterilmez. Acil bir tehlike varsa 112’yi ara.</Text>
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  option: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, borderRadius: radius.md, borderWidth: 1.5 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 10, height: 10, borderRadius: 5 },
});
