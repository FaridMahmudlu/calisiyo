import { FlexWidget, TextWidget } from 'react-native-android-widget';
import type { WidgetSnapshot } from './snapshot';

const GREEN = '#00A870';
const ORANGE = '#F26B49';
const INK = '#0D1830';
const MUTED = '#66738F';

// Android home-screen widget: streak, today's focus minutes, tasks and next task.
export function TodayWidgetAndroid({ snapshot, compact }: { snapshot: WidgetSnapshot; compact: boolean }) {
  if (!snapshot.signedIn) {
    return (
      <FlexWidget clickAction="OPEN_APP" style={{ height: 'match_parent', width: 'match_parent', backgroundColor: '#FFFFFF', borderRadius: 22, padding: 14, justifyContent: 'center' }}>
        <TextWidget text="Calisiyo" style={{ fontSize: 16, fontWeight: '700', color: GREEN }} />
        <TextWidget text="Giriş yaparak serini burada gör." style={{ fontSize: 12, color: MUTED, marginTop: 4 }} />
      </FlexWidget>
    );
  }
  const goalPct = Math.min(100, Math.round((snapshot.todayMinutes / 30) * 100));
  return (
    <FlexWidget clickAction="OPEN_URI" clickActionData={{ uri: 'calisiyo://' }}
      style={{ height: 'match_parent', width: 'match_parent', backgroundColor: '#FFFFFF', borderRadius: 22, padding: 14, flexDirection: 'column', justifyContent: 'space-between' }}>
      <FlexWidget style={{ flexDirection: 'row', alignItems: 'center', width: 'match_parent', justifyContent: 'space-between' }}>
        <FlexWidget style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TextWidget text="🔥" style={{ fontSize: 18 }} />
          <TextWidget text={String(snapshot.streak)} style={{ fontSize: 22, fontWeight: '800', color: ORANGE, marginLeft: 4 }} />
          <TextWidget text=" gün seri" style={{ fontSize: 12, color: MUTED }} />
        </FlexWidget>
        <TextWidget text={`Sv. ${snapshot.level}`} style={{ fontSize: 11, fontWeight: '700', color: '#A36B08' }} />
      </FlexWidget>
      <FlexWidget style={{ flexDirection: 'column', width: 'match_parent' }}>
        <TextWidget text={`${Math.min(snapshot.todayMinutes, 999)} / 30 dk odak`} style={{ fontSize: compact ? 15 : 17, fontWeight: '700', color: GREEN }} />
        <FlexWidget style={{ width: 'match_parent', height: 6, backgroundColor: '#E6F7F0', borderRadius: 3, marginTop: 6, flexDirection: 'row' }}>
          <FlexWidget style={{ height: 6, width: Math.max(4, goalPct * (compact ? 1.2 : 2.6)), backgroundColor: GREEN, borderRadius: 3 }} />
        </FlexWidget>
        <TextWidget text={`${snapshot.tasksDone}/${snapshot.tasksTotal} görev tamamlandı`} style={{ fontSize: 12, color: INK, marginTop: 6 }} />
        {!compact && snapshot.nextTask ? <TextWidget text={`Sıradaki: ${snapshot.nextTask}`} maxLines={1} truncate="END" style={{ fontSize: 12, color: MUTED, marginTop: 2 }} /> : null}
      </FlexWidget>
      {!compact ? (
        <FlexWidget style={{ flexDirection: 'row', width: 'match_parent' }}>
          <FlexWidget clickAction="OPEN_URI" clickActionData={{ uri: 'calisiyo://kronometre' }} style={{ backgroundColor: GREEN, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 6 }}>
            <TextWidget text="▶ Kronometre" style={{ fontSize: 12, fontWeight: '700', color: '#FFFFFF' }} />
          </FlexWidget>
          <FlexWidget clickAction="OPEN_URI" clickActionData={{ uri: 'calisiyo://program' }} style={{ backgroundColor: '#EEF2F6', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 6, marginLeft: 8 }}>
            <TextWidget text="Bugünkü plan" style={{ fontSize: 12, fontWeight: '700', color: INK }} />
          </FlexWidget>
        </FlexWidget>
      ) : null}
    </FlexWidget>
  );
}
