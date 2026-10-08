import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, Flag, ShieldCheck, XCircle } from 'lucide-react-native';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { REPORT_TARGET_LABELS, reportReasonLabel } from '@shared/moderation/reports';
import { Badge, Button, Card, Chip, EmptyState, ErrorState, Screen, Sheet, SkeletonCards, SwitchRow, Text, TextField, useToast } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { space } from '@/theme/tokens';

type Report = {
  id: string; targetType: 'message' | 'user' | 'group'; reason: string; details?: string | null; evidence: Record<string, any>; status: 'open' | 'resolved' | 'dismissed';
  resolutionNote?: string | null; resolvedAt?: string | null; createdAt: string; messageDeleted?: boolean; targetName?: string | null; reporterName?: string | null;
  resolverName?: string | null; openReportsAgainstTarget: number;
};
const FILTERS: [Report['status'] | null, string][] = [['open', 'Açık'], ['resolved', 'İşlem yapıldı'], ['dismissed', 'Reddedildi'], [null, 'Tümü']];
const STATUS: Record<Report['status'], [string, 'warning' | 'primary' | 'muted']> = { open: ['Açık', 'warning'], resolved: ['İşlem yapıldı', 'primary'], dismissed: ['Reddedildi', 'muted'] };
const date = (value?: string | null) => value ? new Intl.DateTimeFormat('tr-TR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '—';

function evidenceText(report: Report) {
  const e = report.evidence || {};
  if (report.targetType === 'message') return `${e.groupName || ''} · ${e.senderName || ''}\n${e.body || (e.attachmentName ? `Ek: ${e.attachmentName}` : 'Mesaj metni yok')}`;
  if (report.targetType === 'group') return `${e.groupName || ''}\n${e.description || e.motto || 'Açıklama yok'}`;
  return `${e.name || ''}${e.username ? ` · @${e.username}` : ''}`;
}

export default function AdminReportsScreen() {
  const toast = useToast();
  const [filter, setFilter] = useState<Report['status'] | null>('open');
  const [selected, setSelected] = useState<Report | null>(null);
  const [note, setNote] = useState('');
  const [removeMessage, setRemoveMessage] = useState(true);
  const [busy, setBusy] = useState('');
  const query = useQuery({
    queryKey: ['admin-reports', filter],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_list_content_reports', { p_status: filter, p_limit: 150 });
      if (error) throw error;
      return (data || []) as Report[];
    },
  });

  const decide = async (decision: 'resolved' | 'dismissed') => {
    if (!selected) return;
    setBusy(decision);
    const { error } = await supabase.rpc('admin_resolve_content_report', {
      p_report_id: selected.id, p_decision: decision, p_note: note.trim() || null,
      p_remove_message: decision === 'resolved' && selected.targetType === 'message' && removeMessage,
    });
    setBusy('');
    if (error) return toast.error(error.message);
    toast.success(decision === 'resolved' ? 'Şikayet sonuçlandırıldı.' : 'Şikayet reddedildi.');
    setSelected(null);
    setNote('');
    query.refetch();
  };

  return (
    <Screen onRefresh={query.refetch}>
      <Text variant="body" color="textMuted">Mesaj, sınıf ve kullanıcı şikayetlerini incele. Gerekirse kullanıcıyı Yönetim Merkezi’nden süreli sustur veya askıya al.</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm, paddingVertical: space.md }}>
        {FILTERS.map(([value, label]) => <Chip key={label} label={label} active={filter === value} onPress={() => setFilter(value)} />)}
      </ScrollView>
      {query.isLoading ? <SkeletonCards /> : query.isError ? <ErrorState message={(query.error as Error).message} onRetry={query.refetch} /> : (query.data || []).length === 0 ? (
        <Card><EmptyState compact icon={ShieldCheck} title="Bu durumda şikayet yok" description="Yeni şikayetler burada ve bildirim merkezinde görünür." /></Card>
      ) : (
        <View style={{ gap: space.sm }}>
          {(query.data || []).map((report) => (
            <Card key={report.id} onPress={() => { setSelected(report); setNote(report.resolutionNote || ''); setRemoveMessage(true); }} style={{ gap: 4 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space.sm }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}><Flag size={14} /><Text variant="subheading" numberOfLines={1}>{REPORT_TARGET_LABELS[report.targetType]} · {reportReasonLabel(report.reason)}</Text></View>
                <Badge label={STATUS[report.status][0]} tone={STATUS[report.status][1]} />
              </View>
              <Text variant="caption" color="textMuted">Hedef: {report.targetName || '—'}{report.openReportsAgainstTarget > 1 ? ` · ${report.openReportsAgainstTarget} açık şikayet` : ''}</Text>
              <Text variant="caption" color="textSubtle">Bildiren: {report.reporterName || 'Silinmiş hesap'} · {date(report.createdAt)}</Text>
            </Card>
          ))}
        </View>
      )}

      <Sheet open={!!selected} onClose={() => !busy && setSelected(null)} title={selected ? `${REPORT_TARGET_LABELS[selected.targetType]} şikayeti` : ''} subtitle={selected ? reportReasonLabel(selected.reason) : ''}
        footer={selected?.status === 'open' ? (<>
          <Button title="İhlal yok" icon={XCircle} variant="secondary" loading={busy === 'dismissed'} onPress={() => decide('dismissed')} style={{ flex: 1 }} />
          <Button title="İşlem yapıldı" icon={CheckCircle2} loading={busy === 'resolved'} onPress={() => decide('resolved')} style={{ flex: 1 }} />
        </>) : undefined}>
        {selected ? (
          <>
            <Card tone="muted" style={{ gap: 4 }}>
              <Text variant="caption" color="textMuted">Hedef: {selected.targetName || '—'} · Bildiren: {selected.reporterName || 'Silinmiş hesap'}</Text>
              <Text variant="body">{evidenceText(selected)}</Text>
              {selected.messageDeleted ? <Text variant="captionStrong" color="danger">Mesaj artık kaldırılmış</Text> : null}
            </Card>
            {selected.details ? <Card tone="muted" style={{ gap: 4 }}><Text variant="caption" color="textMuted">Bildirenin açıklaması</Text><Text variant="body">{selected.details}</Text></Card> : null}
            {selected.status === 'open' ? (
              <>
                <TextField label="Karar notu (iç kayıt)" multiline value={note} onChangeText={setNote} maxLength={500} style={{ minHeight: 70 }} />
                {selected.targetType === 'message' && !selected.messageDeleted ? <SwitchRow title="Mesajı sohbetten kaldır" description="“İşlem yapıldı” seçildiğinde uygulanır." value={removeMessage} onChange={setRemoveMessage} /> : null}
              </>
            ) : <Text variant="caption" color="textMuted">{selected.resolverName || 'Yönetici'} · {date(selected.resolvedAt)}{selected.resolutionNote ? `\n${selected.resolutionNote}` : ''}</Text>}
          </>
        ) : null}
      </Sheet>
    </Screen>
  );
}
