import { Eraser, PenLine, RotateCcw, Save, Trash2, X } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, Modal, Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Polyline } from 'react-native-svg';
import { Button, Segmented, Text, TextField } from '@/components/ui';
import { space, radius } from '@/theme/tokens';

const COLORS: Record<string, string> = { white: '#F7FBF8', mint: '#7CE0BD', yellow: '#FFD66B', coral: '#FF9A86' };
const WIDTHS = [3, 5, 8, 12];
type Point = { x: number; y: number };
type Stroke = { id?: string; color: string; width: number; points: Point[] };
export type BoardState = { text: string; strokes: Stroke[]; version: number };

// Shared classroom whiteboard: same 1000x560 coordinate space as the web board.
export function ClassroomBoard({ open, board, isOwner, busy, onClose, onSaveText, onAppendStroke, onUndo, onClear }: {
  open: boolean; board: BoardState; isOwner: boolean; busy: boolean; onClose: () => void;
  onSaveText: (text: string) => void; onAppendStroke: (stroke: Stroke) => Promise<unknown>; onUndo: () => void; onClear: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [tool, setTool] = useState<'pen' | 'text'>('pen');
  const [color, setColor] = useState('white');
  const [width, setWidth] = useState(5);
  const [text, setText] = useState(board.text || '');
  const [syncedVersion, setSyncedVersion] = useState(board.version);
  const [draft, setDraft] = useState<Point[]>([]);
  const [size, setSize] = useState({ w: 1, h: 1 });

  if (board.version !== syncedVersion) {
    setSyncedVersion(board.version);
    setText(board.text || '');
  }

  const toPoint = (x: number, y: number) => ({
    x: Math.round(Math.max(0, Math.min(1000, (x / size.w) * 1000))),
    y: Math.round(Math.max(0, Math.min(560, (y / size.h) * 560))),
  });
  const begin = (x: number, y: number) => setDraft([toPoint(x, y)]);
  const extend = (x: number, y: number) => {
    const point = toPoint(x, y);
    setDraft((current) => {
      const previous = current[current.length - 1];
      if (current.length >= 180 || (previous && Math.hypot(point.x - previous.x, point.y - previous.y) < 5)) return current;
      return [...current, point];
    });
  };
  const finish = async () => {
    const points = draft;
    setDraft([]);
    if (points.length >= 2) await onAppendStroke({ color, width, points });
  };

  const pan = Gesture.Pan().runOnJS(true).enabled(tool === 'pen' && !busy).minDistance(0)
    .onBegin((event) => begin(event.x, event.y))
    .onUpdate((event) => extend(event.x, event.y))
    .onFinalize(() => { finish(); });

  const strokes = Array.isArray(board.strokes) ? board.strokes : [];
  const render = (stroke: Stroke, key: string) => (
    <Polyline key={key} points={stroke.points.map((p) => `${p.x},${p.y}`).join(' ')} fill="none" stroke={COLORS[stroke.color] || COLORS.white} strokeWidth={stroke.width || 5} strokeLinecap="round" strokeLinejoin="round" />
  );

  return (
    <Modal visible={open} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <GestureHandlerRootView style={[styles.root, { paddingTop: insets.top + space.sm, paddingBottom: insets.bottom + space.sm }]}>
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text variant="label" color="#7CE0BD">Canlı sınıf tahtası</Text>
            <Text variant="heading" color="#FFFFFF">Birlikte düşün, birlikte yaz</Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Tahtayı kapat" onPress={onClose} style={styles.close}><X size={20} color="#FFFFFF" /></Pressable>
        </View>
        <View style={{ paddingHorizontal: space.lg }}><Segmented options={[{ value: 'pen', label: 'Kalem' }, { value: 'text', label: 'Tahta notu' }]} value={tool} onChange={setTool} /></View>

        <GestureDetector gesture={pan}>
          <View style={styles.surface} onLayout={(event: LayoutChangeEvent) => setSize({ w: event.nativeEvent.layout.width, h: event.nativeEvent.layout.height })}>
            {board.text ? <Text variant="bodyStrong" color="#F7FBF8" style={styles.sharedText}>{board.text}</Text> : null}
            <Svg width="100%" height="100%" viewBox="0 0 1000 560" style={StyleSheet.absoluteFill}>
              {strokes.map((stroke, index) => render(stroke, stroke.id || String(index)))}
              {draft.length > 1 ? render({ color, width, points: draft }, 'draft') : null}
            </Svg>
            {!board.text && strokes.length === 0 && draft.length === 0 ? (
              <View style={styles.empty} pointerEvents="none"><Eraser size={24} color="#9FB8AE" /><Text variant="bodyStrong" color="#CFE3DA">Tahta hazır</Text><Text variant="caption" color="#9FB8AE">Parmağınla çiz veya ortak bir not yaz.</Text></View>
            ) : null}
          </View>
        </GestureDetector>

        {tool === 'pen' ? (
          <View style={styles.tools}>
            <View style={{ flexDirection: 'row', gap: space.sm, alignItems: 'center' }}>
              {Object.entries(COLORS).map(([name, value]) => (
                <Pressable key={name} accessibilityRole="button" accessibilityLabel={`${name} kalem`} onPress={() => setColor(name)}
                  style={[styles.swatch, { backgroundColor: value, borderColor: color === name ? '#FFFFFF' : 'transparent' }]} />
              ))}
              <View style={{ width: space.md }} />
              {WIDTHS.map((value) => (
                <Pressable key={value} accessibilityRole="button" accessibilityLabel={`Kalınlık ${value}`} onPress={() => setWidth(value)} style={[styles.widthButton, width === value && { backgroundColor: 'rgba(255,255,255,0.18)' }]}>
                  <View style={{ width: value + 4, height: value + 4, borderRadius: 99, backgroundColor: COLORS[color] }} />
                </Pressable>
              ))}
            </View>
            <View style={{ flexDirection: 'row', gap: space.sm }}>
              <Button title="Geri al" icon={RotateCcw} variant="secondary" size="sm" disabled={busy} onPress={onUndo} style={{ flex: 1 }} />
              {isOwner ? <Button title="Temizle" icon={Trash2} variant="danger" size="sm" disabled={busy} style={{ flex: 1 }}
                onPress={() => Alert.alert('Tahtayı temizle', 'Tahtadaki tüm not ve çizimleri temizlemek istiyor musun?', [{ text: 'Vazgeç', style: 'cancel' }, { text: 'Temizle', style: 'destructive', onPress: onClear }])} /> : null}
            </View>
          </View>
        ) : (
          <View style={[styles.tools, { backgroundColor: '#FFFFFF', borderRadius: radius.md, marginHorizontal: space.lg }]}>
            <TextField multiline value={text} onChangeText={setText} maxLength={500} placeholder="Örn. Bugünün sorusu: Bu problemin kısa yolu nedir?" hint={`${text.length}/500`} style={{ minHeight: 90 }} />
            <Button title={busy ? 'Kaydediliyor…' : 'Notu kaydet'} icon={Save} disabled={busy || text.trim() === (board.text || '')} onPress={() => onSaveText(text)} />
          </View>
        )}
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: space.sm }}><PenLine size={13} color="#9FB8AE" /><Text variant="caption" color="#9FB8AE">Yazdıkların sınıftaki herkeste anında görünür.</Text></View>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#14302A', gap: space.md },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.lg, gap: space.md },
  close: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  surface: { marginHorizontal: space.lg, aspectRatio: 1000 / 560, borderRadius: radius.md, backgroundColor: '#1E4038', borderWidth: 6, borderColor: '#8B5E34', overflow: 'hidden' },
  sharedText: { position: 'absolute', top: 10, left: 12, right: 12 },
  empty: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', gap: 4 },
  tools: { paddingHorizontal: space.lg, paddingVertical: space.md, gap: space.md },
  swatch: { width: 30, height: 30, borderRadius: 15, borderWidth: 3 },
  widthButton: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
});
