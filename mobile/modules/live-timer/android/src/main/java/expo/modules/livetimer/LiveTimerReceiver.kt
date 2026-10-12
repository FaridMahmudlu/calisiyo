package expo.modules.livetimer

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

// Handles the ongoing notification's buttons and the stage-end alarm. When the
// app's JS is alive the action is forwarded to it; otherwise it is applied to
// the native session and queued for JS to reconcile on the next launch.
class LiveTimerReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    val now = System.currentTimeMillis()
    when (intent.action) {
      LiveTimerNotifier.ACTION_FINISHED -> finish(context)
      LiveTimerNotifier.ACTION_PAUSE -> forwardOrApply(context, "pause", now)
      LiveTimerNotifier.ACTION_RESUME -> forwardOrApply(context, "resume", now)
      LiveTimerNotifier.ACTION_SKIP_BREAK -> forwardOrApply(context, "skipBreak", now)
    }
  }

  private fun finish(context: Context) {
    val session = LiveTimerNotifier.load(context) ?: return
    if (!session.running) return
    LiveTimerNotifier.cancel(context)
    if (session.alert) LiveTimerNotifier.showFinished(context, session)
    LiveTimerNotifier.save(context, session.copy(running = false, remainingMs = 0))
  }

  private fun forwardOrApply(context: Context, action: String, now: Long) {
    if (LiveTimerModule.emit(action, now)) return
    val session = LiveTimerNotifier.load(context) ?: return
    when (action) {
      "pause" -> {
        if (!session.running) return
        val paused = session.copy(running = false, remainingMs = (session.endsAt - now).coerceAtLeast(0))
        LiveTimerNotifier.cancelFinish(context)
        LiveTimerNotifier.save(context, paused)
        LiveTimerNotifier.showPaused(context, paused)
      }
      "resume" -> {
        if (session.running || session.remainingMs <= 0) return
        val resumed = session.copy(running = true, endsAt = now + session.remainingMs)
        LiveTimerNotifier.save(context, resumed)
        LiveTimerNotifier.scheduleFinish(context, resumed.endsAt)
        LiveTimerNotifier.showRunning(context, resumed)
      }
      "skipBreak" -> {
        LiveTimerNotifier.cancelFinish(context)
        LiveTimerNotifier.cancel(context)
        LiveTimerNotifier.clear(context)
      }
    }
    LiveTimerNotifier.queueAction(context, action, now)
  }
}
