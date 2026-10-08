import type { WidgetSnapshot } from './snapshot';
import TodayWidget from './TodayWidget';

export async function publishWidget(snapshot: WidgetSnapshot) {
  TodayWidget.updateSnapshot({
    streak: snapshot.signedIn ? snapshot.streak : 0,
    todayMinutes: snapshot.signedIn ? snapshot.todayMinutes : 0,
    tasksDone: snapshot.tasksDone,
    tasksTotal: snapshot.tasksTotal,
    nextTask: snapshot.nextTask,
    level: snapshot.level,
  });
}
