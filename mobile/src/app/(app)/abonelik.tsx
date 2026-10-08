import { useQuery } from '@tanstack/react-query';
import { Check, CheckCircle2, CreditCard, ReceiptText, ShieldCheck, Sparkles } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { getPublicPlan, PLUS_VARIANTS, PUBLIC_PLANS } from '@shared/billing/plans';
import { Badge, Button, Card, EmptyState, ErrorState, Notice, Screen, SectionHeader, Segmented, SkeletonCards, Text, useToast } from '@/components/ui';
import { api } from '@/lib/api';
import { useAccount } from '@/providers/AccountProvider';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';

const STATUS: Record<string, [string, 'muted' | 'warning' | 'primary' | 'danger']> = {
  created: ['Hazırlanıyor', 'muted'], payment_link_ready: ['Ödeme bekleniyor', 'warning'], awaiting_review: ['İnceleme gerekli', 'warning'], approved: ['Etkinleştirildi', 'primary'],
  rejected: ['Doğrulanamadı', 'danger'], cancelled: ['İptal edildi', 'muted'], refunded: ['İade edildi', 'muted'], expired: ['Süresi doldu', 'muted'],
};
type Order = { id: string; order_number: string; plan_code: string; billing_period?: string; status: string; created_at: string };
type Billing = { currentPlan?: { code: string; name: string; status: string; trialEndsAt?: string; periodEnd?: string } | null; orders: Order[] };
const longDate = (value: string) => new Intl.DateTimeFormat('tr-TR', { dateStyle: 'long' }).format(new Date(value));

// Package status screen. Purchases are not offered inside the app (store
// payment policies); Plus bought on calisiyo.com.tr unlocks here automatically.
export default function PackageScreen() {
  const { colors } = useTheme();
  const toast = useToast();
  const { currentPlan: contextPlan, reload, profile } = useAccount();
  const [selected, setSelected] = useState(profile?.yks_year === 2028 ? 'plus_2028' : 'plus_2027');
  const [busy, setBusy] = useState('');
  const query = useQuery({ queryKey: ['billing'], queryFn: () => api<Billing & { ok: true }>('/api/billing', { cache: 'no-store' }) });
  const plan = query.data?.currentPlan || contextPlan;
  const trialActive = plan?.status === 'trialing' && !!(plan as any)?.trialEndsAt;
  const variant = PLUS_VARIANTS.find((item) => item.code === selected) || PLUS_VARIANTS[0];

  const startTrial = async () => {
    setBusy('trial');
    try {
      await api('/api/billing/trial', { method: 'POST', body: { planCode: selected } });
      toast.success('7 günlük calisiyo plus denemen başladı. Süre sonunda otomatik ücret alınmaz.');
      await Promise.all([query.refetch(), reload()]);
    } catch (error) { toast.error((error as Error).message); }
    finally { setBusy(''); }
  };
  const verify = async (orderId: string) => {
    setBusy(orderId);
    try {
      const result = await api<{ status: string; message?: string }>('/api/billing/verify', { method: 'POST', body: { orderId } });
      toast.show(result.message || 'Ödeme kontrol edildi.', result.status === 'approved' ? 'success' : 'info');
      await Promise.all([query.refetch(), reload()]);
    } catch (error) { toast.error((error as Error).message); }
    finally { setBusy(''); }
  };

  return (
    <Screen onRefresh={() => Promise.all([query.refetch(), reload()])}>
      {query.isLoading ? <SkeletonCards count={3} /> : query.isError ? <ErrorState message={(query.error as Error).message} onRetry={query.refetch} /> : (
        <>
          <Card tone="primary" style={styles.current}>
            <View style={[styles.icon, { backgroundColor: colors.surface }]}><CreditCard size={22} color={colors.primary} /></View>
            <View style={{ flex: 1 }}>
              <Text variant="caption" color="textMuted">Mevcut paketin</Text>
              <Text variant="heading">{plan?.name || 'calisiyo ücretsiz'}</Text>
              <Text variant="caption" color="textMuted">{trialActive ? `Deneme ${longDate((plan as any).trialEndsAt)} tarihinde biter` : (plan as any)?.periodEnd ? `${longDate((plan as any).periodEnd)} tarihine kadar etkin` : 'Süresiz ücretsiz temel erişim'}</Text>
            </View>
            <Badge label={trialActive ? 'Deneme' : plan?.status === 'active' ? 'Etkin' : 'Ücretsiz'} tone={plan?.code === 'baslangic' ? 'muted' : 'primary'} />
          </Card>

          <SectionHeader title="Paketler" subtitle="Plus erişimin web ve mobilde aynı hesapla çalışır." />
          {PUBLIC_PLANS.map((item) => (
            <Card key={item.code} style={{ gap: space.md, marginBottom: space.md, borderColor: item.code === 'plus' ? colors.primaryBorder : colors.border }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flex: 1 }}><Text variant="caption" color="textMuted">{item.tagline}</Text><Text variant="heading">{item.name}</Text></View>
                {(item.code === 'baslangic' ? plan?.code === 'baslangic' : plan?.code !== 'baslangic') ? <Badge label="Mevcut" /> : null}
              </View>
              <Text variant="caption" color="textMuted">{item.description}</Text>
              {item.features.map((feature) => <View key={feature} style={styles.feature}><Check size={16} color={colors.primary} /><Text variant="body" style={{ flex: 1 }}>{feature}</Text></View>)}
              {item.code === 'plus' ? (
                <>
                  <Segmented options={PLUS_VARIANTS.map((v) => ({ value: v.code, label: v.label }))} value={selected} onChange={setSelected} />
                  <Text variant="caption" color="textMuted">{variant.duration} · {variant.detail}</Text>
                  {plan?.code === 'baslangic' ? <Button title="7 gün ücretsiz dene" icon={Sparkles} loading={busy === 'trial'} onPress={startTrial} /> : null}
                  <Text variant="caption" color="textSubtle" align="center">Deneme süresi sonunda otomatik ücret alınmaz.</Text>
                </>
              ) : <Button title={plan?.code === 'baslangic' ? 'Mevcut paketin' : 'Her zaman kullanılabilir'} icon={CheckCircle2} variant="secondary" disabled />}
            </Card>
          ))}
          <Notice tone="info" icon={ShieldCheck}>Hesabına tanımlı Plus erişimi, giriş yaptığın her cihazda otomatik olarak açılır. Şehit ve gazi yakınlarından ücret tahsil edilmemektedir; calisiyo.destek@gmail.com</Notice>

          <SectionHeader title="Erişim geçmişi" subtitle="Hesabına tanımlı paket işlemlerin" />
          {(query.data?.orders || []).length === 0 ? (
            <Card><EmptyState compact icon={ReceiptText} title="Henüz paket işlemin yok" description="Paket işlemlerin ve erişim durumun burada görünür." /></Card>
          ) : (
            <Card padded={false}>
              {(query.data?.orders || []).map((order, index) => {
                const meta = STATUS[order.status] || ['Bilinmiyor', 'muted'];
                const orderPlan = getPublicPlan(order.plan_code) as { name: string; duration?: string };
                return (
                  <View key={order.id} style={[styles.order, index > 0 && { borderTopWidth: 1, borderTopColor: colors.border }]}>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text variant="bodyStrong">{order.order_number}</Text>
                      <Text variant="caption" color="textMuted">{orderPlan.name} · {orderPlan.duration || order.billing_period}</Text>
                      <Text variant="caption" color="textSubtle">{new Intl.DateTimeFormat('tr-TR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(order.created_at))}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 6 }}>
                      <Badge label={meta[0]} tone={meta[1]} />
                      {['payment_link_ready', 'awaiting_review'].includes(order.status) ? <Button title="Durumu yenile" size="sm" variant="ghost" loading={busy === order.id} onPress={() => verify(order.id)} /> : null}
                    </View>
                  </View>
                );
              })}
            </Card>
          )}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  current: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  icon: { width: 48, height: 48, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  feature: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  order: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg },
});
