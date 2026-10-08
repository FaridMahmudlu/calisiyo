import { router } from 'expo-router';
import { Check, Crown } from 'lucide-react-native';
import { View } from 'react-native';
import { Button, Card, Sheet, Text } from '@/components/ui';
import { useAccount } from '@/providers/AccountProvider';
import { useTheme } from '@/theme/ThemeProvider';
import { space } from '@/theme/tokens';

// Informational only: store policies do not allow steering to external
// payment, so the app explains limits and shows the current package.
export function PremiumInfo({ open, onClose, feature, description, benefits = [] }: {
  open: boolean; onClose: () => void; feature: string; description: string; benefits?: string[];
}) {
  const { colors } = useTheme();
  const { currentPlan } = useAccount();
  return (
    <Sheet open={open} onClose={onClose} title={feature} subtitle="Bu özellik paketine göre daha geniş limitlerle kullanılabilir.">
      <View style={{ alignItems: 'center', gap: space.sm }}>
        <View style={{ width: 56, height: 56, borderRadius: 18, backgroundColor: colors.goldSoft, alignItems: 'center', justifyContent: 'center' }}><Crown size={26} color={colors.gold} /></View>
        <Text variant="body" color="textMuted" align="center">{description}</Text>
      </View>
      <Card tone="muted" style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <View><Text variant="caption" color="textMuted">Mevcut paketin</Text><Text variant="subheading">{currentPlan.name}</Text></View>
        <View style={{ alignItems: 'flex-end' }}><Text variant="caption" color="textMuted">Geniş limitler</Text><Text variant="subheading" color="gold">calisiyo plus</Text></View>
      </Card>
      {benefits.map((benefit) => (
        <View key={benefit} style={{ flexDirection: 'row', gap: space.sm, alignItems: 'center' }}>
          <Check size={16} color={colors.primary} /><Text variant="body" style={{ flex: 1 }}>{benefit}</Text>
        </View>
      ))}
      <Button title="Paketimi gör" variant="secondary" onPress={() => { onClose(); router.push('/abonelik'); }} />
    </Sheet>
  );
}
