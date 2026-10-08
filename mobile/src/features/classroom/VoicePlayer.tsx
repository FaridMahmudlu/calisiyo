import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { AlertCircle, Pause, Play } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';

const SPEEDS = [1, 1.5, 2];
const format = (value: number) => { const s = Number.isFinite(value) && value > 0 ? Math.floor(value) : 0; return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };

export function VoicePlayer({ uri, tint, onSourceError }: { uri: string; tint?: string; onSourceError?: () => void }) {
  const { colors } = useTheme();
  const player = useAudioPlayer({ uri });
  const status = useAudioPlayerStatus(player);
  const [speed, setSpeed] = useState(1);
  const accent = tint || colors.primary;
  const failed = !status.isLoaded && status.playbackState === 'failed';

  useEffect(() => { if (status.didJustFinish) player.seekTo(0).catch(() => undefined); }, [player, status.didJustFinish]);
  useEffect(() => { if (failed) onSourceError?.(); }, [failed, onSourceError]);

  const progress = status.duration ? Math.min(1, status.currentTime / status.duration) : 0;
  return (
    <View style={[styles.wrap, { backgroundColor: colors.surfaceMuted }]}>
      <Pressable accessibilityRole="button" accessibilityLabel={status.playing ? 'Duraklat' : 'Oynat'} onPress={() => (status.playing ? player.pause() : player.play())}
        style={[styles.play, { backgroundColor: accent }]}>
        {failed ? <AlertCircle size={16} color="#FFFFFF" /> : status.playing ? <Pause size={16} color="#FFFFFF" fill="#FFFFFF" /> : <Play size={16} color="#FFFFFF" fill="#FFFFFF" />}
      </Pressable>
      <View style={{ flex: 1, gap: 4 }}>
        <View style={[styles.track, { backgroundColor: colors.border }]}><View style={{ width: `${progress * 100}%`, height: '100%', backgroundColor: accent, borderRadius: 2 }} /></View>
        <Text variant="caption" color="textMuted">{failed ? 'Bu ses biçimi cihazda oynatılamıyor' : `${format(status.currentTime)} / ${format(status.duration)}`}</Text>
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel="Oynatma hızı" onPress={() => { const next = SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length]; setSpeed(next); player.setPlaybackRate(next); }} hitSlop={8}>
        <Text variant="captionStrong" color={accent}>{speed}x</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: space.sm, padding: space.sm, borderRadius: radius.sm, minWidth: 220 },
  play: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  track: { height: 4, borderRadius: 2, overflow: 'hidden' },
});
