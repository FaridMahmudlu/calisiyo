import { router, Stack, useLocalSearchParams } from 'expo-router';
import { ArrowRight, Check, ExternalLink, Info, Share2 } from 'lucide-react-native';
import { Linking, Pressable, Share, StyleSheet, View } from 'react-native';
import { formatEditorialDate, GUIDE_BY_SLUG } from '@shared/seo/content';
import { SITE } from '@shared/seo/site';
import { Button, Card, EmptyState, IconButton, Screen, Text } from '@/components/ui';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';

// Guide CTA → the matching native screen for signed-in users.
const FEATURE_ROUTE: Record<string, string> = {
  'yks-planlama': '/program', 'deneme-analizi': '/deneme-analizi', 'konu-takibi': '/konu-takibi',
  'kronometre-ve-istatistikler': '/kronometre', 'youtube-calisma-plani': '/kaynaklarim', 'calisma-siniflari': '/arkadaslar',
};

type Section = { title: string; paragraphs?: string[]; steps?: [string, string, string][]; checklist?: string[]; table?: { headers: string[]; rows: string[][] }; callout?: string };

export default function GuideScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { colors } = useTheme();
  const { session } = useAuth();
  const guide = GUIDE_BY_SLUG[slug as keyof typeof GUIDE_BY_SLUG] as any;
  if (!guide) return <Screen><EmptyState title="Rehber bulunamadı" description="Bu yazı kaldırılmış veya taşınmış olabilir." /></Screen>;
  const related = (guide.related || []).map((item: string) => (GUIDE_BY_SLUG as any)[item]).filter(Boolean);

  return (
    <Screen>
      <Stack.Screen options={{ title: guide.kicker, headerRight: () => <IconButton icon={Share2} label="Paylaş" onPress={() => Share.share({ message: `${guide.title}\n${SITE.origin}/rehber/${guide.slug}` })} /> }} />
      <Text variant="label" color="primary">{guide.kicker}</Text>
      <Text variant="title" style={{ marginTop: space.xs }}>{guide.title}</Text>
      <Text variant="caption" color="textSubtle" style={{ marginTop: space.xs }}>Güncellendi: {formatEditorialDate(guide.updatedAt)}</Text>
      <Card tone="primary" style={{ marginTop: space.lg, gap: space.xs }}>
        <Text variant="label" color="primaryPressed">Kısa cevap</Text>
        <Text variant="body">{guide.answer}</Text>
      </Card>

      {(guide.sections as Section[]).map((section, index) => (
        <View key={section.title} style={{ marginTop: space.xl, gap: space.md }} accessibilityRole="summary">
          <Text variant="heading" accessibilityRole="header">{index + 1}. {section.title}</Text>
          {section.paragraphs?.map((paragraph) => <Text key={paragraph} variant="body" color="textMuted" style={{ lineHeight: 24 }}>{paragraph}</Text>)}
          {section.steps?.map(([number, title, text]) => (
            <View key={number} style={styles.step}>
              <View style={[styles.stepNumber, { backgroundColor: colors.primary }]}><Text variant="captionStrong" color="#FFFFFF">{number}</Text></View>
              <View style={{ flex: 1 }}><Text variant="bodyStrong">{title}</Text><Text variant="caption" color="textMuted">{text}</Text></View>
            </View>
          ))}
          {section.checklist?.map((item) => (
            <View key={item} style={styles.check}><Check size={16} color={colors.primary} /><Text variant="body" style={{ flex: 1 }}>{item}</Text></View>
          ))}
          {section.table ? (
            <Card padded={false} style={{ overflow: 'hidden' }}>
              {section.table.rows.map((row, rowIndex) => (
                <View key={row.join('-')} style={[styles.tableRow, rowIndex > 0 && { borderTopWidth: 1, borderTopColor: colors.border }]}>
                  {row.map((cell, cellIndex) => (
                    <View key={cell} style={{ flex: 1, gap: 2 }}>
                      <Text variant="caption" color="textSubtle">{section.table!.headers[cellIndex]}</Text>
                      <Text variant="captionStrong">{cell}</Text>
                    </View>
                  ))}
                </View>
              ))}
            </Card>
          ) : null}
          {section.callout ? (
            <View style={[styles.callout, { backgroundColor: colors.infoSoft }]}><Info size={18} color={colors.info} /><Text variant="body" style={{ flex: 1 }}>{section.callout}</Text></View>
          ) : null}
        </View>
      ))}

      {(guide.sources || []).length ? (
        <View style={{ marginTop: space.xl, gap: space.sm }}>
          <Text variant="subheading">Kaynaklar</Text>
          {guide.sources.map((source: { label: string; href: string; note?: string }) => (
            <Pressable key={source.href} accessibilityRole="link" onPress={() => Linking.openURL(source.href)} style={styles.check}>
              <ExternalLink size={15} color={colors.primary} />
              <View style={{ flex: 1 }}><Text variant="captionStrong" color="primary">{source.label}</Text>{source.note ? <Text variant="caption" color="textMuted">{source.note}</Text> : null}</View>
            </Pressable>
          ))}
        </View>
      ) : null}

      <Button title={session ? 'Uygulamada dene' : guide.cta?.label || 'Ücretsiz başla'} iconRight={ArrowRight} size="lg" style={{ marginTop: space.xl }}
        onPress={() => router.push((session ? FEATURE_ROUTE[guide.feature] || '/' : '/kayit') as never)} />

      {related.length ? (
        <View style={{ marginTop: space.xl, gap: space.sm }}>
          <Text variant="subheading">İlgili rehberler</Text>
          {related.map((item: any) => (
            <Card key={item.slug} onPress={() => router.push(`/rehber/${item.slug}`)} style={{ gap: 2 }}>
              <Text variant="label" color="primary">{item.kicker}</Text>
              <Text variant="bodyStrong">{item.title}</Text>
            </Card>
          ))}
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  step: { flexDirection: 'row', gap: space.md, alignItems: 'flex-start' },
  stepNumber: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  check: { flexDirection: 'row', gap: space.sm, alignItems: 'flex-start' },
  tableRow: { flexDirection: 'row', gap: space.md, padding: space.md },
  callout: { flexDirection: 'row', gap: space.sm, padding: space.md, borderRadius: radius.md },
});
