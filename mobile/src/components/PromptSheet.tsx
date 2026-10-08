import { useState } from 'react';
import { Button, Sheet, TextField } from '@/components/ui';

export type PromptRequest = {
  title: string;
  subtitle?: string;
  label: string;
  placeholder?: string;
  keyboardType?: 'default' | 'decimal-pad';
  minLength?: number;
  confirmLabel?: string;
  onSubmit: (value: string) => Promise<unknown> | void;
};

// Cross-platform replacement for window.prompt / Alert.prompt (iOS-only).
export function PromptSheet({ request, onClose }: { request: PromptRequest | null; onClose: () => void }) {
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const min = request?.minLength ?? 1;
  return (
    <Sheet open={!!request} onClose={() => { if (!busy) { setValue(''); onClose(); } }} title={request?.title} subtitle={request?.subtitle}
      footer={<Button title={request?.confirmLabel || 'Onayla'} loading={busy} disabled={value.trim().length < min} style={{ flex: 1 }}
        onPress={async () => { if (!request) return; setBusy(true); await request.onSubmit(value.trim()); setBusy(false); setValue(''); onClose(); }} />}>
      <TextField label={request?.label} value={value} onChangeText={setValue} placeholder={request?.placeholder} keyboardType={request?.keyboardType || 'default'} multiline={request?.keyboardType !== 'decimal-pad'} autoFocus />
    </Sheet>
  );
}
