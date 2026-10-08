import * as Haptics from 'expo-haptics';
import { Armchair, Crown, Hand, Move, PenLine, PersonStanding } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View, type GestureResponderEvent, type LayoutChangeEvent } from 'react-native';
import Animated, { LinearTransition, ZoomIn } from 'react-native-reanimated';
import Svg, { Defs, G, LinearGradient, Rect, Stop } from 'react-native-svg';
import { Text } from '@/components/ui';
import { useNow } from '@/hooks/useNow';
import { radius, space } from '@/theme/tokens';
import { ClassroomAvatar } from './Avatar';
import { CLASSROOM_SEATS, facingFor, REACTION_META, resolveMovement, STATUS_LABEL, ZONES, type Member, type Position, type ReactionKey, type Seat, type Zone } from './world';

const THEMES: Record<string, { wall: [string, string]; floor: [string, string]; desk: string; accent: string }> = {
  sunny: { wall: ['#E7F6EE', '#D5EFE2'], floor: ['#E9D3B0', '#DDBF94'], desk: '#B9875A', accent: '#00A870' },
  library: { wall: ['#F4E6D2', '#EAD5B8'], floor: ['#C99A6B', '#B58456'], desk: '#7A4E2D', accent: '#A36B08' },
  evening: { wall: ['#2A3550', '#222B42'], floor: ['#5C4A3A', '#4C3C2E'], desk: '#3B2E25', accent: '#7CE0BD' },
};
const STATUS_COLOR: Record<string, string> = { studying: '#00A870', break: '#F59E0B', online: '#3B82F6', offline: '#9AA5B7' };

export function ClassroomScene({ theme, motto, members, userId, position, reactions, onMove, onEnterZone, onSit, onStand, onAction, onOpenBoard, onOpenAvatar, canReact }: {
  theme?: string; motto: string; members: Member[]; userId: string; position: Position | null; reactions: { userId: string; reaction: string; createdAt: string }[];
  onMove: (next: Position) => void; onEnterZone: (zone: Zone) => void; onSit: (seat: Seat) => void; onStand: () => void; onAction: (action: ReactionKey) => void;
  onOpenBoard: () => void; onOpenAvatar: () => void; canReact: boolean;
}) {
  const palette = THEMES[theme || 'sunny'] || THEMES.sunny;
  const [size, setSize] = useState({ w: 320, h: 320 });
  const now = useNow(1000);
  const me = members.find((member) => member.userId === userId);
  const avatarSize = Math.max(56, Math.min(84, size.w / 5));
  const latestReactions = useMemo(() => {
    const map = new Map<string, { reaction: string }>();
    for (const item of reactions || []) {
      if (Date.parse(item.createdAt) <= now - 12000) continue;
      if (!map.has(item.userId)) map.set(item.userId, item);
    }
    return map;
  }, [now, reactions]);

  const tapToMove = (event: GestureResponderEvent) => {
    const target = { x: (event.nativeEvent.locationX / size.w) * 100, y: (event.nativeEvent.locationY / size.h) * 100 };
    const next = resolveMovement(position, target);
    Haptics.selectionAsync().catch(() => undefined);
    onMove({ ...next, facing: facingFor(next.x - Number(position?.x ?? 50), next.y - Number(position?.y ?? 72), position?.facing) });
  };

  return (
    <View style={styles.card}>
      <Pressable accessibilityRole="button" accessibilityLabel="Sınıf tahtasını aç" onPress={onOpenBoard} style={styles.blackboard}>
        <Text variant="captionStrong" color="#F7FBF8" numberOfLines={1}>{motto}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}><PenLine size={12} color="#7CE0BD" /><Text variant="caption" color="#7CE0BD">Tahta</Text></View>
      </Pressable>

      <View style={styles.field} onLayout={(event: LayoutChangeEvent) => setSize({ w: event.nativeEvent.layout.width, h: event.nativeEvent.layout.height })}>
        <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
          <Defs>
            <LinearGradient id="wall" x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor={palette.wall[0]} /><Stop offset="1" stopColor={palette.wall[1]} /></LinearGradient>
            <LinearGradient id="floor" x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor={palette.floor[0]} /><Stop offset="1" stopColor={palette.floor[1]} /></LinearGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="22%" fill="url(#wall)" />
          <Rect x="0" y="22%" width="100%" height="78%" fill="url(#floor)" />
          {[0, 1, 2, 3, 4, 5].map((index) => <Rect key={index} x="0" y={`${22 + index * 13}%`} width="100%" height="0.4%" fill="#00000012" />)}
          {[12, 40, 68].map((x) => <Rect key={x} x={`${x}%`} y="4%" width="18%" height="12%" rx="6" fill="#BFE6FF" stroke="#FFFFFF" strokeWidth={3} />)}
          <Rect x="38%" y="58%" width="24%" height="16%" rx="40" fill={`${palette.accent}22`} />
          {CLASSROOM_SEATS.map((seat) => (
            <G key={seat.id}>
              <Rect x={`${seat.deskX - 9}%`} y={`${seat.deskY - 5}%`} width="18%" height="9%" rx="6" fill={palette.desk} />
              <Rect x={`${seat.deskX - 8}%`} y={`${seat.deskY - 4.4}%`} width="16%" height="2%" rx="3" fill="#FFFFFF33" />
            </G>
          ))}
        </Svg>
        <Pressable accessibilityLabel="Hareket etmek için sınıf alanına dokun" onPress={tapToMove} style={StyleSheet.absoluteFill} />

        {ZONES.map((zone) => {
          const Icon = zone.icon;
          return (
            <Pressable key={zone.id} accessibilityRole="button" accessibilityLabel={`${zone.label}: ${zone.hint}`} onPress={() => onEnterZone(zone)}
              style={[styles.zone, { left: `${zone.x - 14}%`, top: `${zone.y - 5}%` }]}>
              <Icon size={13} color={palette.accent} />
              <Text variant="caption" style={{ fontSize: 10, fontWeight: '700' }} numberOfLines={1}>{zone.label}</Text>
            </Pressable>
          );
        })}

        {CLASSROOM_SEATS.map((seat) => {
          const occupied = members.some((member) => member.pose === 'sitting' && member.seatId === seat.id && member.userId !== userId);
          return (
            <Pressable key={seat.id} accessibilityRole="button" accessibilityLabel={occupied ? `${seat.label} dolu` : `${seat.label} sırasına otur`} disabled={occupied} onPress={() => onSit(seat)}
              style={[styles.seat, { left: `${seat.x - 6}%`, top: `${seat.y + 2}%`, opacity: occupied ? 0.45 : 1 }]}>
              <Armchair size={11} color="#FFFFFF" /><Text variant="caption" color="#FFFFFF" style={{ fontSize: 9 }}>{occupied ? 'Dolu' : 'Otur'}</Text>
            </Pressable>
          );
        })}

        {members.map((member) => {
          const isMe = member.userId === userId;
          const pos = isMe && position ? position : { x: Number(member.positionX ?? 50), y: Number(member.positionY ?? 72), facing: member.facing || 'east' };
          const reaction = latestReactions.get(member.userId);
          const meta = reaction ? REACTION_META[reaction.reaction as ReactionKey] : null;
          return (
            <Animated.View key={member.userId} layout={LinearTransition.duration(380)} pointerEvents="box-none"
              style={[styles.character, { left: (pos.x / 100) * size.w - avatarSize / 2, top: (pos.y / 100) * size.h - avatarSize, zIndex: Math.round(pos.y) + 20, width: avatarSize }]}>
              {meta ? (
                <Animated.View entering={ZoomIn} style={styles.reaction}><Text variant="caption" style={{ fontSize: 10, fontWeight: '700' }}>{meta.label}</Text></Animated.View>
              ) : null}
              <Pressable disabled={!isMe} accessibilityRole={isMe ? 'button' : undefined} accessibilityLabel={isMe ? 'Karakterini özelleştir' : `${member.name}, ${STATUS_LABEL[member.presence] || 'Çevrimdışı'}`} onPress={onOpenAvatar}
                style={{ opacity: member.presence === 'offline' ? 0.5 : 1 }}>
                <ClassroomAvatar model={member.avatarModel} size={avatarSize} facing={pos.facing} name={member.name} />
                {member.role === 'owner' ? <View style={styles.crown}><Crown size={10} color="#A36B08" /></View> : null}
              </Pressable>
              <View style={[styles.label, isMe && { backgroundColor: '#0D1830' }]}>
                <View style={[styles.dot, { backgroundColor: STATUS_COLOR[member.presence] || STATUS_COLOR.offline }]} />
                <Text variant="caption" color={isMe ? '#FFFFFF' : '#0D1830'} style={{ fontSize: 10, fontWeight: '700' }} numberOfLines={1}>{isMe ? 'Sen' : member.name.split(' ')[0]}</Text>
              </View>
            </Animated.View>
          );
        })}
      </View>

      <View style={styles.dock}>
        <DockButton icon={PenLine} label="Tahta" onPress={onOpenBoard} />
        <DockButton icon={PersonStanding} label="Zıpla" disabled={!canReact || me?.pose === 'sitting'} onPress={() => onAction('jump')} />
        <DockButton icon={Hand} label="Selamla" disabled={!canReact} onPress={() => onAction('wave')} />
        {me?.pose === 'sitting' ? <DockButton icon={Move} label="Kalk" onPress={onStand} /> : null}
      </View>
      <Text variant="caption" color="textSubtle" align="center">Dokunarak hareket et · Konumun sınıf üyeleriyle anlık paylaşılır</Text>
    </View>
  );
}

function DockButton({ icon: Icon, label, onPress, disabled }: { icon: typeof Hand; label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled} onPress={() => { Haptics.selectionAsync().catch(() => undefined); onPress(); }}
      style={({ pressed }) => [styles.dockButton, { opacity: disabled ? 0.4 : pressed ? 0.7 : 1 }]}>
      <Icon size={16} color="#FFFFFF" /><Text variant="caption" color="#FFFFFF" style={{ fontSize: 11 }}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { gap: space.sm },
  blackboard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm, paddingHorizontal: space.md, paddingVertical: space.sm, borderRadius: radius.sm, backgroundColor: '#1E4038', borderWidth: 3, borderColor: '#8B5E34' },
  field: { width: '100%', aspectRatio: 0.92, borderRadius: radius.lg, overflow: 'hidden' },
  zone: { position: 'absolute', width: '28%', flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 6, paddingVertical: 4, borderRadius: radius.full, backgroundColor: 'rgba(255,255,255,0.88)' },
  seat: { position: 'absolute', width: '12%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 2, paddingVertical: 3, borderRadius: radius.full, backgroundColor: 'rgba(13,24,48,0.55)' },
  character: { position: 'absolute', alignItems: 'center' },
  reaction: { position: 'absolute', top: -18, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full, backgroundColor: '#FFFFFF', zIndex: 2 },
  crown: { position: 'absolute', top: 0, right: 4, width: 18, height: 18, borderRadius: 9, backgroundColor: '#FFF6E0', alignItems: 'center', justifyContent: 'center' },
  label: { flexDirection: 'row', alignItems: 'center', gap: 3, maxWidth: 90, marginTop: -4, paddingHorizontal: 6, paddingVertical: 2, borderRadius: radius.full, backgroundColor: 'rgba(255,255,255,0.92)' },
  dot: { width: 6, height: 6, borderRadius: 3 },
  dock: { flexDirection: 'row', justifyContent: 'center', gap: space.sm },
  dockButton: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, height: 34, borderRadius: radius.full, backgroundColor: '#0D1830' },
});
