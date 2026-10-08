import { router } from 'expo-router';
import { BookMarked, ChevronRight } from 'lucide-react-native';
import { View } from 'react-native';
import { CONTENT_UPDATED_AT, formatEditorialDate, GUIDES } from '@shared/seo/content';
import { Card, Screen, Text } from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';

export default function GuidesScreen() {
  const { colors } = useTheme();
  return (
    <Screen>
      <Text variant="body" color="textMuted">Planını kurmak, çalışma kayıtlarını anlamak ve sonraki adımını belirlemek için uygulanabilir YKS rehberleri.</Text>
      <Text variant="caption" color="textSubtle" style={{ marginTop: space.xs }}>Son güncelleme: {formatEditorialDate(CONTENT_UPDATED_AT)}</Text>
      <View style={{ gap: space.md, marginTop: space.lg }}>
        {GUIDES.map((guide) => (
          <Card key={guide.slug} onPress={() => router.push(`/rehber/${guide.slug}`)} style={{ flexDirection: 'row', gap: space.md, alignItems: 'center' }}>
            <View style={{ width: 44, height: 44, borderRadius: radius.md, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}><BookMarked size={20} color={colors.primary} /></View>
            <View style={{ flex: 1, gap: 4 }}>
              <Text variant="label" color="primary">{guide.kicker}</Text>
              <Text variant="subheading">{guide.title}</Text>
              <Text variant="caption" color="textMuted" numberOfLines={3}>{guide.summary}</Text>
            </View>
            <ChevronRight size={18} color={colors.textSubtle} />
          </Card>
        ))}
      </View>
    </Screen>
  );
}
