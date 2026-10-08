import { Image } from 'expo-image';
import { X } from 'lucide-react-native';
import { FlatList, Modal, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/ui';
import { space } from '@/theme/tokens';

export function ImageViewer({ urls, index, onClose }: { urls: string[]; index: number | null; onClose: () => void }) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={index != null} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.root}>
        <FlatList
          data={urls}
          horizontal
          pagingEnabled
          initialScrollIndex={index ?? 0}
          getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
          keyExtractor={(item, i) => `${i}-${item}`}
          showsHorizontalScrollIndicator={false}
          renderItem={({ item, index: i }) => (
            <View style={{ width, height, justifyContent: 'center' }}>
              <Image source={{ uri: item }} style={{ width, height: height * 0.8 }} contentFit="contain" accessibilityLabel={`${i + 1}. görsel`} />
              <Text variant="captionStrong" color="#FFFFFF" align="center" style={{ marginTop: space.md }}>{i + 1} / {urls.length}</Text>
            </View>
          )}
        />
        <Pressable accessibilityRole="button" accessibilityLabel="Kapat" onPress={onClose} style={[styles.close, { top: insets.top + space.md }]} hitSlop={10}>
          <X size={22} color="#FFFFFF" />
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: 'rgba(0,0,0,0.94)' },
  close: { position: 'absolute', right: space.lg, width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
});
