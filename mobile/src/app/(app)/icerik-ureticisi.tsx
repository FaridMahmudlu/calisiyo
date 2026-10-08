import { useQuery } from '@tanstack/react-query';
import * as Clipboard from 'expo-clipboard';
import { BadgeCheck, CircleDollarSign, Clock3, Copy, Gift, PencilLine, RefreshCw, Send, ShieldCheck, Users, WalletCards } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { HorizontalBars } from '@/components/charts';
import { Badge, Button, Card, Chip, ErrorState, Notice, Screen, SectionHeader, Segmented, Sheet, SkeletonCards, StatTile, Text, TextField, useToast } from '@/components/ui';
import { api } from '@/lib/api';
import { useAccount } from '@/providers/AccountProvider';
import { useTheme } from '@/theme/ThemeProvider';
import { space } from '@/theme/tokens';

const money = (minor?: number) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(Number(minor || 0) / 100);
const date = (value?: string | null) => value ? new Intl.DateTimeFormat('tr-TR', { dateStyle: 'medium' }).format(new Date(value)) : '—';
const STATUS: Record<string, string> = { pending: '14 günlük bekleme süresinde', available: 'Ödenebilir', reserved: 'Ödeme için ayrıldı', paid: 'Ödendi', cancelled: 'Kazanç dışı', reversed: 'İade nedeniyle geri alındı', review_required: 'İnceleniyor' };
const PLATFORMS = [['youtube', 'YouTube'], ['instagram', 'Instagram'], ['tiktok', 'TikTok'], ['other', 'Diğer']] as const;
type Range = '7d' | '30d' | 'all';
type ApplicationForm = { platform: string; profileUrl: string; audienceSize: string; contentFocus: string; motivation: string; preferredPlanCode: string };

export default function ContentProducerScreen() {
  const { colors } = useTheme();
  const toast = useToast();
  const { profile, reload } = useAccount();
  const [range, setRange] = useState<Range>('30d');
  const [saving, setSaving] = useState(false);
  const [codeOpen, setCodeOpen] = useState(false);
  const [codeDraft, setCodeDraft] = useState('');
  const [formDraft, setForm] = useState<ApplicationForm | null>(null);

  const query = useQuery({ queryKey: ['content-producer', range], queryFn: () => api<any>(`/api/content-producer?range=${range}`, { cache: 'no-store' }) });
  const producer = query.data?.producer;
  const application = query.data?.application || { status: 'none' };
  const growth = query.data?.growth;
  const form: ApplicationForm = formDraft ?? (!['none', 'withdrawn'].includes(application.status) ? {
    platform: application.platform || 'youtube', profileUrl: application.profileUrl || '', audienceSize: String(application.audienceSize ?? ''),
    contentFocus: application.contentFocus || '', motivation: application.motivation || '', preferredPlanCode: application.preferredPlanCode || 'plus_2027',
  } : { platform: 'youtube', profileUrl: '', audienceSize: '', contentFocus: '', motivation: '', preferredPlanCode: profile?.yks_year === 2028 ? 'plus_2028' : 'plus_2027' });

  const post = async (body: Record<string, unknown>) => {
    setSaving(true);
    try { const result = await api<any>('/api/content-producer', { method: 'POST', body }); toast.success(result.message || 'İşlem tamamlandı.'); await Promise.all([query.refetch(), reload()]); return true; }
    catch (error) { toast.error((error as Error).message); return false; }
    finally { setSaving(false); }
  };

  if (query.isLoading) return <Screen><SkeletonCards count={4} /></Screen>;
  if (query.isError) return <Screen><ErrorState message={(query.error as Error).message} onRetry={query.refetch} /></Screen>;

  if (!producer || producer.status === 'not_enrolled') {
    return (
      <Screen keyboard onRefresh={query.refetch}>
        <Text variant="body" color="textMuted">Calisiyo’yu öğrencilerle buluştur; doğrulanan satışlarını ve kazançlarını şeffaf biçimde takip et.</Text>
        {application.status === 'pending' ? (
          <Card tone="primary" style={{ gap: space.sm, marginTop: space.lg }}>
            <Clock3 size={22} color={colors.primary} />
            <Text variant="caption" color="primaryPressed">Başvurun alındı</Text>
            <Text variant="heading">İnceleme sırasındasın</Text>
            <Text variant="caption" color="textMuted">Profil bağlantın ve içerik alanın yönetici ekibi tarafından inceleniyor. Sonucu bildirimlerinden ve bu sayfadan görebilirsin.</Text>
            <Text variant="captionStrong">{application.platform} · {Number(application.audienceSize || 0).toLocaleString('tr-TR')} takipçi/abone</Text>
            <Button title="Başvuruyu geri çek" variant="secondary" loading={saving} onPress={() => post({ action: 'withdraw' })} />
          </Card>
        ) : (
          <>
            {application.status === 'rejected' ? <View style={{ marginTop: space.lg }}><Notice tone="warning" icon={ShieldCheck}>Başvurun şu anda onaylanmadı. {application.reviewNote || 'Bilgilerini güncelleyerek yeniden başvurabilirsin.'}</Notice></View> : null}
            <Card tone="muted" style={{ gap: space.md, marginTop: space.lg }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><Gift size={16} color={colors.primary} /><Text variant="label" color="primary">Program avantajları</Text></View>
              <Text variant="heading">Takipçilerine %20 indirim, sana doğrulanmış satış kazancı</Text>
              <Text variant="caption" color="textMuted">Onaylandığında seçilen YKS dönemi için ücretsiz calisiyo plus erişimi ve kişisel indirim kodun hazırlanır.</Text>
              <View style={{ flexDirection: 'row', gap: space.sm }}>
                {[['₺1.000', 'İlk 3 satışın her biri'], ['₺500', '4. satıştan itibaren'], ['14 gün', 'İade kontrolü sonrası']].map(([value, label]) => (
                  <View key={label} style={{ flex: 1 }}><Text variant="heading" color="primary">{value}</Text><Text variant="caption" color="textMuted">{label}</Text></View>
                ))}
              </View>
            </Card>
            <SectionHeader title="Başvuru formu" subtitle="Şifre veya sosyal medya hesabına erişim istemeyiz." />
            <View style={{ gap: space.md }}>
              <Text variant="captionStrong" color="textMuted">Ana içerik platformun</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>{PLATFORMS.map(([value, label]) => <Chip key={value} label={label} active={form.platform === value} onPress={() => setForm({ ...form, platform: value })} />)}</View>
              <TextField label="Profil bağlantın" value={form.profileUrl} onChangeText={(profileUrl) => setForm({ ...form, profileUrl })} placeholder="https://youtube.com/@kanalin" autoCapitalize="none" keyboardType="url" maxLength={500} />
              <TextField label="Takipçi / abone sayın" value={form.audienceSize} onChangeText={(audienceSize) => setForm({ ...form, audienceSize: audienceSize.replace(/\D/g, '') })} keyboardType="number-pad" placeholder="Örn. 12500" />
              <TextField label="İçerik alanın" value={form.contentFocus} onChangeText={(contentFocus) => setForm({ ...form, contentFocus })} maxLength={300} placeholder="Örn. YKS Matematik, motivasyon ve deneme analizi" />
              <TextField label="Neden programa katılmak istiyorsun?" multiline value={form.motivation} onChangeText={(motivation) => setForm({ ...form, motivation })} maxLength={1000} placeholder="Hedef kitleni ve Calisiyo’yu nasıl tanıtacağını kısaca anlat." style={{ minHeight: 100 }} />
              <Text variant="captionStrong" color="textMuted">Tercih ettiğin ücretsiz Plus dönemi</Text>
              <Segmented options={[{ value: 'plus_2027', label: 'YKS 2027' }, { value: 'plus_2028', label: 'YKS 2028' }]} value={form.preferredPlanCode} onChange={(preferredPlanCode) => setForm({ ...form, preferredPlanCode })} />
              <Button title={application.status === 'rejected' ? 'Yeniden başvur' : 'Başvuruyu gönder'} icon={Send} size="lg" loading={saving} onPress={() => post({ action: 'submit', ...form, audienceSize: Number(form.audienceSize) })} />
              <Text variant="caption" color="textSubtle" align="center">Başvuru otomatik onaylanmaz. Profilin yalnızca program uygunluğu için incelenir.</Text>
            </View>
          </>
        )}
      </Screen>
    );
  }

  return (
    <Screen onRefresh={query.refetch}>
      {producer.status === 'suspended' ? <Notice tone="warning" icon={ShieldCheck}>Program erişimin askıda. Üretici erişimin ve kod ilişkilendirmen durduruldu.</Notice> : null}
      <Card tone="primary" style={{ gap: space.sm, marginTop: space.sm }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><BadgeCheck size={16} color={colors.primary} /><Text variant="label" color="primary">İndirim kodun</Text></View>
        <Text variant="display">{producer.code || producer.codePreview || 'Hazırlanıyor'}</Text>
        <Text variant="caption" color="textMuted">{producer.code ? 'Takipçilerin kodunu kayıt sırasında kullanır; %20 indirim Plus’ta hesaplarına otomatik uygulanır.' : 'İndirim kodun hazırlanıyor.'}</Text>
        <Badge label={`Ücretsiz ${producer.grantPlanCode === 'plus_2028' ? 'YKS 2028' : 'YKS 2027'} Plus · ${date(producer.grantEndsAt)}`} tone="gold" />
        <View style={{ flexDirection: 'row', gap: space.sm, marginTop: space.sm }}>
          <Button title="Kopyala" icon={Copy} variant="secondary" disabled={!producer.code} onPress={async () => { await Clipboard.setStringAsync(producer.code); toast.success('İndirim kodun kopyalandı.'); }} style={{ flex: 1 }} />
          {!producer.selfCodeChangeUsed ? <Button title="Kodu değiştir" icon={PencilLine} variant="secondary" onPress={() => { setCodeDraft(''); setCodeOpen(true); }} style={{ flex: 1 }} /> : null}
          {producer.selfCodeChangeUsed && !producer.code && producer.codePreview ? <Button title="Tekrar dene" icon={RefreshCw} variant="secondary" loading={saving} onPress={() => post({ action: 'retry_code_sync' })} style={{ flex: 1 }} /> : null}
        </View>
      </Card>

      <Card tone="muted" style={{ marginTop: space.md }}>
        <Text variant="caption" color="textMuted">İlk 3 doğrulanmış satışında satış başına <Text variant="captionStrong">₺1.000</Text>, 4. satıştan itibaren satış başına <Text variant="captionStrong">₺500</Text> kazanırsın. Kazançlar, iade kontrolü için 14 gün bekledikten sonra ödenebilir olur.</Text>
      </Card>

      <SectionHeader title="Kod performansın" subtitle="Kayıttan doğrulanmış satışa" />
      <Segmented options={[{ value: '7d', label: '7 gün' }, { value: '30d', label: '30 gün' }, { value: 'all', label: 'Tümü' }]} value={range} onChange={setRange} />
      {query.data?.growthError ? <View style={{ marginTop: space.md }}><ErrorState message={query.data.growthError} /></View> : growth ? (
        <Card style={{ gap: space.md, marginTop: space.md }}>
          <HorizontalBars max={Math.max(1, Number(growth.registrations || 0))} items={[
            { label: 'Kodla kayıt', value: Number(growth.registrations || 0), hint: Number(growth.registrations || 0).toLocaleString('tr-TR') },
            { label: 'Aktifleşen', value: Number(growth.activated || 0), hint: `${growth.activated || 0} · %${growth.activationRate || 0}`, color: '#3B82F6' },
            { label: 'Plus denemesi', value: Number(growth.trials || 0), hint: `${growth.trials || 0} · %${growth.trialRate || 0}`, color: '#8B5CF6' },
            { label: 'Ücretliye geçen', value: Number(growth.paidConversions || 0), hint: `${growth.paidConversions || 0} · %${growth.paidRate || 0}`, color: colors.gold },
          ]} />
          <Text variant="caption" color="textMuted">Doğrulanmış satış: <Text variant="captionStrong">{Number(growth.verifiedSales || 0).toLocaleString('tr-TR')}</Text></Text>
        </Card>
      ) : null}
      <Text variant="caption" color="textSubtle" style={{ marginTop: space.sm }}>Öğrenci gizliliği için yalnızca toplu sayılar gösterilir.</Text>

      <SectionHeader title="Kazançların" />
      <View style={styles.grid}>
        <StatTile icon={CircleDollarSign} label="Ödenebilir" value={money(producer.availableMinor)} />
        <StatTile icon={Clock3} color={colors.warning} label="Bekleyen" value={money(producer.pendingMinor)} />
        <StatTile icon={WalletCards} color="#3B82F6" label="Toplam ödenen" value={money(producer.paidMinor)} />
        <StatTile icon={Users} color="#8B5CF6" label="Geçerli satış" value={String(producer.lifetimeQualifiedSales || 0)} />
      </View>

      <SectionHeader title="Son doğrulanmış hareketler" />
      <Card padded={false}>
        {producer.recentRewards?.length ? producer.recentRewards.map((reward: any, index: number) => (
          <View key={reward.id} style={[styles.row, index > 0 && { borderTopWidth: 1, borderTopColor: colors.border }]}>
            <View style={{ flex: 1 }}><Text variant="bodyStrong">{reward.sequence ? `${reward.sequence}. satış` : 'Kazanç dışı işlem'}</Text><Text variant="caption" color="textMuted">{date(reward.createdAt)} · {STATUS[reward.status] || reward.status}</Text></View>
            <Text variant="subheading">{money(reward.amountMinor)}</Text>
          </View>
        )) : <Text variant="caption" color="textMuted" style={{ padding: space.lg }}>Henüz doğrulanmış satış kazancı yok.</Text>}
      </Card>

      <SectionHeader title="Ödeme geçmişi" />
      <Card padded={false}>
        {producer.payouts?.length ? producer.payouts.map((payout: any, index: number) => (
          <View key={payout.id} style={[styles.row, index > 0 && { borderTopWidth: 1, borderTopColor: colors.border }]}>
            <View style={{ flex: 1 }}><Text variant="bodyStrong">{payout.status === 'paid' ? 'Ödendi' : 'Ödeme hazırlanıyor'}</Text><Text variant="caption" color="textMuted">{date(payout.paidAt || payout.createdAt)}</Text></View>
            <Text variant="subheading">{money(payout.amountMinor)}</Text>
          </View>
        )) : <Text variant="caption" color="textMuted" style={{ padding: space.lg }}>Henüz oluşturulmuş ödeme kaydı yok.</Text>}
      </Card>

      <Sheet open={codeOpen} onClose={() => !saving && setCodeOpen(false)} title="Kısa ve hatırlanabilir kodunu seç" subtitle="Kodunu yalnızca bir kez değiştirebilirsin; 4–20 harf veya rakam kullan."
        footer={<Button title="Kodu bir kez değiştir" loading={saving} onPress={async () => { if (await post({ action: 'change_code', code: codeDraft })) setCodeOpen(false); }} style={{ flex: 1 }} />}>
        <TextField label="Yeni indirim kodu" value={codeDraft} onChangeText={(value) => setCodeDraft(value.toUpperCase())} autoCapitalize="characters" maxLength={20} placeholder="ADIN20" />
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg },
});
