import { useQuery } from '@tanstack/react-query';
import { Alert, Linking, StyleSheet, View } from 'react-native';
import { BadgeCheck, BookOpenText, CircleDollarSign, ExternalLink, KeyRound, RefreshCw, Search, UserCheck, UserPlus, WalletCards, X } from 'lucide-react-native';
import { useState } from 'react';
import { PromptSheet, type PromptRequest } from '@/components/PromptSheet';
import { Badge, Button, Card, EmptyState, ErrorState, Screen, SectionHeader, Segmented, Sheet, SkeletonCards, SwitchRow, Text, TextField, useToast } from '@/components/ui';
import { api } from '@/lib/api';
import { useTheme } from '@/theme/ThemeProvider';
import { space } from '@/theme/tokens';

const money = (minor?: number) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(Number(minor || 0) / 100);
const date = (value?: string | null) => value ? new Intl.DateTimeFormat('tr-TR', { dateStyle: 'medium' }).format(new Date(value)) : '—';
type Range = '7d' | '30d' | 'all';

export default function AdminProducersScreen() {
  const { colors } = useTheme();
  const toast = useToast();
  const [range, setRange] = useState<Range>('30d');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState('');
  const [prompt, setPrompt] = useState<PromptRequest | null>(null);
  const [enrolling, setEnrolling] = useState<any>(null);
  const [confirming, setConfirming] = useState<any>(null);
  const [providerId, setProviderId] = useState('');
  const [scopeConfirmed, setScopeConfirmed] = useState(false);
  const [ledger, setLedger] = useState<any>(null);

  const data = useQuery({
    queryKey: ['admin-producers', range, query],
    queryFn: () => api<any>(`/api/admin/content-producers?${new URLSearchParams({ range, ...(query ? { q: query } : {}) })}`, { cache: 'no-store' }),
  });
  const producers: any[] = data.data?.producers || [];
  const applications: any[] = (data.data?.applications || []).filter((item: any) => item.status === 'pending');
  const users: any[] = data.data?.users || [];

  const act = async (action: string, payload: Record<string, unknown>) => {
    setBusy(action);
    try {
      const result = await api<any>('/api/admin/content-producers', { method: 'POST', body: { action, ...payload } });
      toast.success(result.message || 'İşlem tamamlandı.');
      setEnrolling(null); setConfirming(null); setProviderId(''); setScopeConfirmed(false);
      await data.refetch();
      return true;
    } catch (error) { toast.error((error as Error).message); return false; }
    finally { setBusy(''); }
  };
  const openLedger = async (producer: any) => {
    try { const result = await api<any>(`/api/admin/content-producers?ledgerUserId=${encodeURIComponent(producer.userId)}`, { cache: 'no-store' }); setLedger({ producer, ...result.ledger }); }
    catch (error) { toast.error((error as Error).message); }
  };

  return (
    <Screen keyboard onRefresh={data.refetch}>
      <Text variant="body" color="textMuted">Ücretsiz grant, Shopier kod bağı, satış sırası ve banka payout kayıtlarını denetlenebilir şekilde yönet.</Text>

      <SectionHeader title="Mevcut kullanıcıyı programa ekle" subtitle="Bu işlem admin yetkisi vermez." />
      <View style={{ flexDirection: 'row', gap: space.sm }}>
        <View style={{ flex: 1 }}><TextField icon={Search} value={search} onChangeText={setSearch} placeholder="Ad veya e-posta ile ara" autoCapitalize="none" onSubmitEditing={() => search.trim().length >= 2 && setQuery(search.trim())} /></View>
        <Button title="Ara" disabled={search.trim().length < 2} onPress={() => setQuery(search.trim())} style={{ height: 50 }} />
      </View>
      {query && users.length === 0 && !data.isFetching ? <Text variant="caption" color="textMuted" style={{ marginTop: space.sm }}>“{query}” için kullanıcı bulunamadı.</Text> : null}
      {users.map((user) => {
        const enrolled = producers.some((producer) => producer.userId === user.id);
        return (
          <Card key={user.id} style={[styles.row, { marginTop: space.sm }]}>
            <View style={{ flex: 1 }}><Text variant="bodyStrong">{user.name}</Text><Text variant="caption" color="textMuted">{user.email}</Text></View>
            <Button title={enrolled ? 'Programda' : 'Seç'} icon={enrolled ? BadgeCheck : UserPlus} size="sm" disabled={enrolled || !!busy} onPress={() => setEnrolling({ ...user, source: 'search', planCode: 'plus_2027' })} />
          </Card>
        );
      })}

      <SectionHeader title="Bekleyen başvurular" />
      {data.isLoading ? <SkeletonCards count={2} /> : data.isError ? <ErrorState message={(data.error as Error).message} onRetry={data.refetch} /> : applications.length === 0 ? (
        <Card><EmptyState compact icon={UserCheck} title="Bekleyen başvuru yok" description="Yeni başvurular burada görünecek." /></Card>
      ) : applications.map((application) => (
        <Card key={application.id} style={{ gap: space.sm, marginBottom: space.sm }}>
          <Text variant="subheading">{application.name}</Text>
          <Text variant="caption" color="textMuted">{application.email} · {date(application.createdAt)} başvurdu</Text>
          <View style={{ flexDirection: 'row', gap: space.sm, alignItems: 'center' }}>
            <Badge label={application.platform} tone="info" />
            <Text variant="captionStrong">{Number(application.audienceSize || 0).toLocaleString('tr-TR')} takipçi</Text>
            <Button title="Profili aç" icon={ExternalLink} size="sm" variant="ghost" onPress={() => Linking.openURL(application.profileUrl)} />
          </View>
          <Text variant="caption"><Text variant="captionStrong">İçerik: </Text>{application.contentFocus}</Text>
          <Text variant="caption" color="textMuted">{application.motivation}</Text>
          <View style={{ flexDirection: 'row', gap: space.sm }}>
            <Button title="Reddet" icon={X} variant="danger" size="sm" style={{ flex: 1 }} disabled={!!busy}
              onPress={() => setPrompt({ title: 'Başvuruyu reddet', label: 'Başvuru sahibine gösterilecek ret nedeni', minLength: 5, confirmLabel: 'Reddet', onSubmit: (note) => act('reject_application', { applicationId: application.id, note }) })} />
            <Button title="İncele ve onayla" icon={UserCheck} size="sm" style={{ flex: 1 }} disabled={!!busy}
              onPress={() => setEnrolling({ ...application, source: 'application', planCode: application.preferredPlanCode || (application.yksYear === 2028 ? 'plus_2028' : 'plus_2027') })} />
          </View>
        </Card>
      ))}

      <SectionHeader title="Program hesapları" subtitle="Büyüme ve ledger özeti" />
      <Segmented options={[{ value: '7d', label: '7 gün' }, { value: '30d', label: '30 gün' }, { value: 'all', label: 'Tümü' }]} value={range} onChange={setRange} />
      {data.data?.growthError ? <Text variant="caption" color="danger" style={{ marginTop: space.sm }}>{data.data.growthError}</Text> : null}
      {producers.length === 0 && !data.isLoading ? <Card style={{ marginTop: space.md }}><EmptyState compact icon={CircleDollarSign} title="Henüz içerik üreticisi yok" /></Card> : producers.map((producer) => (
        <Card key={producer.userId} style={{ gap: space.sm, marginTop: space.md }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flex: 1 }}><Text variant="subheading">{producer.name}</Text><Text variant="caption" color="textMuted">{producer.email}</Text></View>
            <Badge label={producer.status} tone={producer.status === 'active' ? 'primary' : 'danger'} />
          </View>
          <Text variant="caption">Kod: <Text variant="captionStrong">{producer.code || '—'}</Text> ({producer.promoStatus}) · {producer.grantPlanCode === 'plus_2028' ? 'YKS 2028' : 'YKS 2027'} · {date(producer.grantEndsAt)}</Text>
          <Text variant="caption">Satış {producer.lifetimeSales || 0} · Ödenebilir {money(producer.availableMinor)} · Bekleyen {money(producer.pendingMinor)} · Ödenen {money(producer.paidMinor)}</Text>
          {producer.growth ? <Text variant="caption" color="textMuted">Kayıt {producer.growth.registrations || 0} · Aktif {producer.growth.activated || 0} · Trial {producer.growth.trials || 0} · Ücretli {producer.growth.paidConversions || 0} · Doğrulanmış {producer.growth.verifiedSales || 0}</Text> : null}
          <View style={styles.actions}>
            {producer.promoStatus !== 'active' ? <Button title="Senkronu dene" icon={RefreshCw} size="sm" variant="secondary" disabled={!!busy} onPress={() => act('sync_code', { userId: producer.userId, code: producer.code })} /> : null}
            {producer.promoStatus !== 'active' ? <Button title="Provider ile doğrula" icon={BadgeCheck} size="sm" variant="secondary" onPress={() => setConfirming(producer)} /> : null}
            <Button title="Ledger" icon={BookOpenText} size="sm" variant="secondary" onPress={() => openLedger(producer)} />
            <Button title="Düzeltme" icon={CircleDollarSign} size="sm" variant="secondary" disabled={!!busy}
              onPress={() => setPrompt({
                title: 'Düzeltme tutarı', label: 'Tutar (TRY). Borç için eksi değer gir.', keyboardType: 'decimal-pad', confirmLabel: 'Devam',
                onSubmit: (amountText) => {
                  const amount = Number(amountText.replace(',', '.'));
                  if (!Number.isFinite(amount) || amount === 0 || Math.round(amount * 100) !== amount * 100) { toast.error('En fazla iki ondalıklı, sıfırdan farklı bir TRY tutarı gir.'); return; }
                  setTimeout(() => setPrompt({ title: 'Düzeltme nedeni', label: 'Neden (en az 5 karakter)', minLength: 5, onSubmit: (reason) => act('adjustment', { userId: producer.userId, amountMinor: Math.round(amount * 100), reason }) }), 350);
                },
              })} />
            <Button title="Kodu değiştir" icon={KeyRound} size="sm" variant="secondary" disabled={!!busy}
              onPress={() => Alert.alert('Kodu değiştir', 'Bu işlem eski kodu emekliye ayırır ve Shopier kodunu kapatmayı dener.', [{ text: 'Vazgeç', style: 'cancel' }, { text: 'Devam', onPress: () => setPrompt({ title: 'Kod değiştirme nedeni', label: 'Neden (en az 5 karakter)', minLength: 5, onSubmit: (reason) => act('rotate_code', { userId: producer.userId, reason }) }) }])} />
            {producer.status === 'active'
              ? <Button title="Askıya al" size="sm" variant="danger" onPress={() => setPrompt({ title: 'Askıya alma nedeni', label: 'Neden', minLength: 3, confirmLabel: 'Askıya al', onSubmit: (reason) => act('suspend', { userId: producer.userId, reason }) })} />
              : <>
                <Button title="2027 ile etkinleştir" size="sm" onPress={() => act('activate', { userId: producer.userId, planCode: 'plus_2027' })} />
                <Button title="2028 ile etkinleştir" size="sm" onPress={() => act('activate', { userId: producer.userId, planCode: 'plus_2028' })} />
              </>}
            {producer.reservedPayout
              ? <Button title={`${money(producer.reservedPayout.amountMinor)} ödendi`} icon={WalletCards} size="sm" onPress={() => setPrompt({ title: 'Ödeme yapıldı', label: 'Banka transferi referansı', minLength: 3, onSubmit: (reference) => act('mark_paid', { payoutId: producer.reservedPayout.id, reference }) })} />
              : <Button title="Payout oluştur" icon={WalletCards} size="sm" variant="secondary" disabled={!!busy} onPress={() => act('create_payout', { userId: producer.userId })} />}
          </View>
        </Card>
      ))}

      <PromptSheet request={prompt} onClose={() => setPrompt(null)} />

      <Sheet open={!!enrolling} onClose={() => setEnrolling(null)} title={enrolling?.name} subtitle={enrolling?.source === 'application' ? 'Başvuru onayı' : 'Manuel program kaydı'}
        footer={<Button title="Onayla ve programı etkinleştir" icon={UserCheck} loading={!!busy} style={{ flex: 1 }}
          onPress={() => act(enrolling.source === 'application' ? 'approve_application' : 'activate', { userId: enrolling.userId || enrolling.id, applicationId: enrolling.source === 'application' ? enrolling.id : undefined, planCode: enrolling.planCode })} />}>
        <Text variant="bodyStrong">{enrolling?.email}</Text>
        <Text variant="caption" color="textMuted">Bu işlem admin yetkisi vermez. Ayrı ücretsiz Plus grant’i ve kişisel %20 Shopier kodu oluşturur; mevcut ücretli aboneliği değiştirmez.</Text>
        <Segmented options={[{ value: 'plus_2027', label: 'YKS 2027' }, { value: 'plus_2028', label: 'YKS 2028' }]} value={enrolling?.planCode || 'plus_2027'} onChange={(planCode) => setEnrolling((current: any) => ({ ...current, planCode }))} />
      </Sheet>

      <Sheet open={!!confirming} onClose={() => setConfirming(null)} title={confirming?.code} subtitle="Shopier doğrulaması"
        footer={<Button title="Doğrula ve etkinleştir" loading={!!busy} disabled={!scopeConfirmed || providerId.length < 2} style={{ flex: 1 }}
          onPress={() => act('confirm_code', { userId: confirming.userId, code: confirming.code, providerDiscountId: providerId, scopeConfirmed: true })} />}>
        <Text variant="caption" color="textMuted">Shopier panelinde %20, TRY ve yalnızca iki calisiyo ürününe uygulanacak şekilde oluşturduğun kodun provider kimliğini gir.</Text>
        <TextField label="Shopier indirim kimliği" value={providerId} onChangeText={setProviderId} autoCapitalize="none" />
        <SwitchRow title="Kapsam doğrulandı" description="Kodun yalnızca ürün 50041880 ve 50041981 için geçerli olduğunu Shopier panelinde doğruladım." value={scopeConfirmed} onChange={setScopeConfirmed} />
      </Sheet>

      <Sheet open={!!ledger} onClose={() => setLedger(null)} title={ledger?.producer?.name} subtitle="Finansal hareketler">
        {[['Satış ödülleri', ledger?.rewards, (item: any) => [item.orderNumber, `Satış #${item.sequence || '—'} · ${item.status}`, item.rewardAmountMinor]],
          ['Düzeltmeler', ledger?.adjustments, (item: any) => [item.kind, item.reason, item.amountMinor]],
          ['Payout geçmişi', ledger?.payouts, (item: any) => [item.status, item.paymentReference || date(item.createdAt), item.amountMinor]]].map(([title, rows, map]: any) => (
          <View key={title} style={{ gap: space.sm }}>
            <Text variant="subheading">{title}</Text>
            {rows?.length ? rows.map((item: any) => { const [a, b, c] = map(item); return (
              <View key={item.id} style={[styles.row, { borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: space.sm }]}>
                <View style={{ flex: 1 }}><Text variant="bodyStrong">{a}</Text><Text variant="caption" color="textMuted">{b}</Text></View>
                <Text variant="captionStrong">{money(c)}</Text>
              </View>
            ); }) : <Text variant="caption" color="textMuted">Kayıt yok.</Text>}
          </View>
        ))}
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
});
