import { FlexWidget, OverlapWidget, SvgWidget, TextWidget } from 'react-native-android-widget';
import type { WidgetSnapshot } from './snapshot';
import { DAILY_GOAL_MINUTES, focusButton, progressRing } from './widgetArt';

const BRAND = { from: '#12C383', to: '#00704F', orientation: 'TL_BR' } as const;
const NIGHT = { from: '#17322C', to: '#0A1513', orientation: 'TL_BR' } as const;
const SOFT = '#DDFBEE';

// Android home-screen widget: today's focus ring, streak, tasks, next task and
// quick actions on the brand gradient (reads well on light and dark wallpapers).
export function TodayWidgetAndroid({ snapshot, compact }: { snapshot: WidgetSnapshot; compact: boolean }) {
  if (!snapshot.signedIn) {
    return (
      <FlexWidget clickAction="OPEN_APP" style={{ height: 'match_parent', width: 'match_parent', backgroundGradient: BRAND, borderRadius: 26, padding: 16, justifyContent: 'center' }}>
        <TextWidget text="planliyo" style={{ fontSize: 22, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.5 }} />
        <TextWidget text="Giriş yaparak serini ve bugünkü planını burada gör." style={{ fontSize: 12, color: SOFT, marginTop: 4 }} />
      </FlexWidget>
    );
  }
  const ring = compact ? 62 : 74;
  const minutes = Math.min(snapshot.todayMinutes, 999);
  return (
    <FlexWidget clickAction="OPEN_URI" clickActionData={{ uri: 'planliyo://' }}
      style={{ height: 'match_parent', width: 'match_parent', backgroundGradient: BRAND, borderRadius: 26, padding: 14, flexDirection: 'column', justifyContent: 'space-between' }}>
      <FlexWidget style={{ flexDirection: 'row', alignItems: 'center', width: 'match_parent' }}>
        <OverlapWidget style={{ width: ring, height: ring }}>
          <SvgWidget svg={progressRing(snapshot.todayMinutes / DAILY_GOAL_MINUTES, ring, compact ? 6 : 7)} style={{ width: ring, height: ring }} />
          <FlexWidget style={{ width: ring, height: ring, flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
            <TextWidget text={String(minutes)} style={{ fontSize: compact ? 18 : 21, fontWeight: '800', color: '#FFFFFF' }} />
            <TextWidget text={`/ ${DAILY_GOAL_MINUTES} dk`} style={{ fontSize: 9, color: SOFT }} />
          </FlexWidget>
        </OverlapWidget>
        <FlexWidget style={{ flexDirection: 'column', marginLeft: 12, flex: 1 }}>
          <TextWidget text={`🔥 ${snapshot.streak} gün seri`} maxLines={1} style={{ fontSize: compact ? 14 : 16, fontWeight: '800', color: '#FFFFFF' }} />
          <TextWidget text={`${snapshot.tasksDone}/${snapshot.tasksTotal} görev · Seviye ${snapshot.level}`} maxLines={1} style={{ fontSize: 12, color: SOFT, marginTop: 2 }} />
          {!compact ? (
            <TextWidget text={snapshot.nextTask ? `Sıradaki: ${snapshot.nextTask}` : snapshot.tasksTotal ? 'Bugünün görevleri tamam 🎉' : 'Bugün için plan ekle'}
              maxLines={1} truncate="END" style={{ fontSize: 12, color: '#FFFFFF', marginTop: 6 }} />
          ) : null}
        </FlexWidget>
      </FlexWidget>
      {!compact ? (
        <FlexWidget style={{ flexDirection: 'row', width: 'match_parent' }}>
          <FlexWidget clickAction="OPEN_URI" clickActionData={{ uri: 'planliyo://kronometre?baslat=1' }}
            style={{ backgroundColor: '#FFFFFF', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 8 }}>
            <TextWidget text="▶  Odak başlat" style={{ fontSize: 12, fontWeight: '800', color: '#00704F' }} />
          </FlexWidget>
          <FlexWidget clickAction="OPEN_URI" clickActionData={{ uri: 'planliyo://program' }}
            style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 8, marginLeft: 8 }}>
            <TextWidget text="Bugünkü plan" style={{ fontSize: 12, fontWeight: '700', color: '#FFFFFF' }} />
          </FlexWidget>
        </FlexWidget>
      ) : null}
    </FlexWidget>
  );
}

// 2x2 "Hızlı Odak" widget: one tap starts a focus session.
export function QuickFocusWidgetAndroid({ snapshot }: { snapshot: WidgetSnapshot }) {
  const size = 66;
  return (
    <FlexWidget clickAction="OPEN_URI" clickActionData={{ uri: snapshot.signedIn ? 'planliyo://kronometre?baslat=1' : 'planliyo://' }}
      style={{ height: 'match_parent', width: 'match_parent', backgroundGradient: NIGHT, borderRadius: 26, padding: 12, flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
      <SvgWidget svg={focusButton(snapshot.todayMinutes / DAILY_GOAL_MINUTES, size)} style={{ width: size, height: size }} />
      <TextWidget text={snapshot.signedIn ? 'Odak başlat' : 'Planliyo'} style={{ fontSize: 14, fontWeight: '800', color: '#FFFFFF', marginTop: 8 }} />
      <TextWidget text={snapshot.signedIn ? `Bugün ${Math.min(snapshot.todayMinutes, 999)} dk · 🔥 ${snapshot.streak}` : 'Giriş yap'} maxLines={1}
        style={{ fontSize: 11, color: '#8FE3BF', marginTop: 2 }} />
    </FlexWidget>
  );
}
