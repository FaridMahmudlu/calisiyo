import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, SearchCheck, XCircle } from 'lucide-react-native';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Badge, Button, Card, Chip, EmptyState, ErrorState, Screen, SectionHeader, Sheet, SkeletonCards, Text, TextField, useToast } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/theme/ThemeProvider';
import { space } from '@/theme/tokens';

const FILTERS: [string | null, string][] = [['awaiting_review', 'İnceleme'], ['payment_link_ready', 'Ödeme bekliyor'], ['approved', 'Onaylandı'], ['refunded', 'İade edildi'], ['cancelled', 'İptal edildi'], ['rejected', 'Reddedildi'], [null, 'Tümü']];
const money = (value: unknown, currency = 'TRY') => new Intl.NumberFormat('tr-TR', { style: 'currency', currency }).format(Number(value || 0));
const date = (value?: string | null) => value ? new Intl.DateTimeFormat('tr-TR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '—';
const period = (value?: string) => value === 'yks_2027' ? '19 Ağustos 2027’ye kadar' : value === 'yks_2028' ? '25 Haziran 2028’e kadar' : value === 'six_months' ? 'Tarihsel 6 aylık dönem' : value || '';

export default function AdminPaymentsScreen() {
  const { colors } = useTheme();
  const toast = useToast();
  const [filter, setFilter] = useState<string | null>('awaiting_review');
  const [selected, setSelected] = useState<any>(null);
  const [reference, setReference] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState('');
  const query = useQuery({
    queryKey: ['admin-orders', filter],
    queryFn: async () => {
      const [orders, events] = await Promise.all([
        supabase.rpc('admin_list_billing_orders', { p_status: filter, p_limit: 100 }),
        supabase.rpc('admin_list_provider_events', { p_status: 'review_required', p_limit: 50 }),
      ]);
      if (orders.error || events.error) throw orders.error || events.error;
      return { orders: (orders.data || []) as any[], events: (events.data || []) as any[] };
    },
  });

  const review = async (decision: 'approve' | 'reject') => {
    if (decision === 'approve' && reference.trim().length < 4) return toast.error('Shopier panelindeki benzersiz ödeme referansını gir.');
    setBusy(decision);
    const { error } = await supabase.rpc('admin_review_billing_order', { p_order_id: selected.id, p_decision: decision, p_payment_reference: reference.trim() || null, p_note: note.trim() || null });
    setBusy('');
    if (error) return toast.error(error.message);
    toast.success(decision === 'approve' ? 'Sipariş onaylandı ve paket etkinleştirildi.' : 'Sipariş reddedildi.');
    setSelected(null); setReference(''); setNote('');
    query.refetch();
  };

  return (
    <Screen onRefresh={query.refetch}>
      <Text variant="body" color="textMuted">Otomatik eşleşmeyen ödemeleri Shopier kanıtlarıyla güvenli biçimde incele.</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm, paddingVertical: space.md }}>
        {FILTERS.map(([value, label]) => <Chip key={label} label={label} active={filter === value} onPress={() => setFilter(value)} />)}
      </ScrollView>
      {query.isLoading ? <SkeletonCards /> : query.isError ? <ErrorState message={(query.error as Error).message} onRetry={query.refetch} /> : (
        <>
          {query.data!.orders.length === 0 ? <Card><EmptyState compact icon={SearchCheck} title="Bu durumda sipariş yok" description="Filtreyi değiştirebilir veya kuyruğu yenileyebilirsin." /></Card> : (
            <View style={{ gap: space.sm }}>
              {query.data!.orders.map((order) => (
                <Card key={order.id} onPress={() => { setSelected(order); setReference(order.paymentReference || ''); setNote(order.decisionNote || ''); }} style={{ gap: 4 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text variant="subheading">{order.orderNumber}</Text>
                    <Badge label={order.status} tone={order.status === 'approved' ? 'primary' : order.status === 'awaiting_review' ? 'warning' : order.status === 'rejected' ? 'danger' : 'muted'} />
                  </View>
                  <Text variant="caption" color="textMuted">{order.fullName || 'Öğrenci'} · {order.email}</Text>
                  <Text variant="caption">{order.planName} · {period(order.billingPeriod)}</Text>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text variant="captionStrong">{money(order.amount, order.currency)}</Text><Text variant="caption" color="textSubtle">{date(order.claimedAt || order.createdAt)}</Text></View>
                </Card>
              ))}
            </View>
          )}
          <SectionHeader title="Manuel eşleştirme gerektiren olaylar" />
          {query.data!.events.length === 0 ? <Card><EmptyState compact icon={CheckCircle2} title="Bekleyen provider olayı yok" description="Otomatik eşleşmeyen Shopier bildirimleri burada görünür." /></Card> : (
            <Card padded={false}>
              {query.data!.events.map((event, index) => (
                <View key={event.id} style={[styles.row, index > 0 && { borderTopWidth: 1, borderTopColor: colors.border }]}>
                  <Text variant="bodyStrong">{event.eventType}</Text>
                  <Text variant="caption" color="textMuted">{event.eventId} · Shopier: {event.providerOrderId || '—'}</Text>
                  <Text variant="caption">{event.reasonCode || event.lastErrorCode || 'İnceleme gerekli'} · {event.attempts} deneme · {date(event.updatedAt || event.createdAt)}</Text>
                </View>
              ))}
            </Card>
          )}
        </>
      )}

      <Sheet open={!!selected} onClose={() => !busy && setSelected(null)} title={selected?.orderNumber} subtitle="Güvenli inceleme"
        footer={selected?.status === 'awaiting_review' ? (<>
          <Button title="Reddet" icon={XCircle} variant="danger" loading={busy === 'reject'} onPress={() => review('reject')} style={{ flex: 1 }} />
          <Button title="Onayla" icon={CheckCircle2} loading={busy === 'approve'} disabled={reference.trim().length < 4} onPress={() => review('approve')} style={{ flex: 1 }} />
        </>) : undefined}>
        {selected ? (
          <Card tone="muted" style={{ gap: space.sm }}>
            {[['Kullanıcı', selected.fullName || selected.email], ['Paket', `${selected.planName} · ${period(selected.billingPeriod)}`], ['Tutar', money(selected.amount, selected.currency)], ['Shopier siparişi', selected.providerOrderId || 'Henüz eşleşmedi'], ['Ürün kimliği', selected.providerProductId || '—'], ['Provider durumu', selected.providerStatus || '—']].map(([label, value]) => (
              <View key={label} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: space.md }}><Text variant="caption" color="textMuted">{label}</Text><Text variant="captionStrong" style={{ flex: 1, textAlign: 'right' }}>{value}</Text></View>
            ))}
          </Card>
        ) : null}
        <TextField label="Shopier ödeme referansı" value={reference} onChangeText={setReference} placeholder="Shopier panelindeki benzersiz referans" editable={selected?.status === 'awaiting_review'} autoCapitalize="none" />
        <TextField label="İnceleme notu" multiline value={note} onChangeText={setNote} placeholder="Tutar, kullanıcı, ürün ve sipariş eşleşmesi…" editable={selected?.status === 'awaiting_review'} style={{ minHeight: 70 }} />
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({ row: { padding: space.lg, gap: 2 } });
