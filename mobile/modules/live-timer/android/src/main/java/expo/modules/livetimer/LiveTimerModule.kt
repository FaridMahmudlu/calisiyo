package expo.modules.livetimer

import android.app.AlarmManager
import android.app.NotificationManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.records.Field
import expo.modules.kotlin.records.Record
import java.lang.ref.WeakReference

// What the app shows for a Kronometre stage (see TimerSurfaceState in JS).
class TimerPayload : Record {
  @Field val title: String = ""
  @Field val text: String = ""
  @Field val next: String = ""
  @Field val endsAt: Double = 0.0
  @Field val remainingSeconds: Int = 0
  @Field val totalSeconds: Int = 0
  @Field val isBreak: Boolean = false
  @Field val alertTitle: String = ""
  @Field val alertBody: String = ""
  @Field val alert: Boolean = true

  fun toSession(running: Boolean, endsAt: Long, remainingMs: Long) =
    TimerSession(title, text, next, endsAt, remainingMs, totalSeconds, isBreak, running, alertTitle, alertBody, alert)
}

// Ongoing Kronometre notification with a native countdown chronometer and
// Duraklat / Devam et / Molayı geç buttons. On Android 16+ it is promoted to a
// Live Update (status-bar chip, lock screen, Samsung Now Bar).
class LiveTimerModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  private var listening = false

  override fun definition() = ModuleDefinition {
    Name("LiveTimer")
    Events("onAction")

    OnCreate { current = WeakReference(this@LiveTimerModule) }
    OnDestroy { if (current?.get() === this@LiveTimerModule) current = null }
    OnStartObserving { listening = true }
    OnStopObserving { listening = false }

    AsyncFunction("start") { payload: TimerPayload ->
      val endsAt = payload.endsAt.toLong()
      val session = payload.toSession(running = true, endsAt = endsAt, remainingMs = (endsAt - System.currentTimeMillis()).coerceAtLeast(0))
      LiveTimerNotifier.save(context, session)
      LiveTimerNotifier.scheduleFinish(context, session.endsAt)
      LiveTimerNotifier.showRunning(context, session)
    }

    AsyncFunction("pause") { payload: TimerPayload ->
      val session = payload.toSession(running = false, endsAt = 0, remainingMs = payload.remainingSeconds * 1000L)
      LiveTimerNotifier.cancelFinish(context)
      LiveTimerNotifier.save(context, session)
      LiveTimerNotifier.showPaused(context, session)
    }

    AsyncFunction<Unit>("stop") {
      LiveTimerNotifier.cancelFinish(context)
      LiveTimerNotifier.cancel(context)
      LiveTimerNotifier.clear(context)
    }

    Function("consumePendingActions") {
      LiveTimerNotifier.drainActions(context)
    }

    // Without "Alarms & reminders" access Android may deliver the end alert minutes late.
    Function("canScheduleExactAlarms") {
      Build.VERSION.SDK_INT < Build.VERSION_CODES.S || context.getSystemService(AlarmManager::class.java)?.canScheduleExactAlarms() == true
    }

    // Android 16+: whether the user lets this app post Live Updates (status chip, lock screen).
    Function("liveUpdatesStatus") {
      if (Build.VERSION.SDK_INT < 36) return@Function "unsupported"
      if (context.getSystemService(NotificationManager::class.java)?.canPostPromotedNotifications() == true) "on" else "off"
    }

    AsyncFunction<Unit>("openLiveUpdateSettings") {
      val fallback = Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).putExtra(Settings.EXTRA_APP_PACKAGE, context.packageName)
      val intent = if (Build.VERSION.SDK_INT >= 36) Intent(ACTION_MANAGE_PROMOTED).putExtra(Settings.EXTRA_APP_PACKAGE, context.packageName) else fallback
      try {
        context.startActivity(intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
      } catch (_: Exception) {
        context.startActivity(fallback.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
      }
    }

    AsyncFunction<Unit>("openExactAlarmSettings") {
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return@AsyncFunction
      val intent = Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM, Uri.parse("package:${context.packageName}"))
        .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      context.startActivity(intent)
    }
  }

  companion object {
    private const val ACTION_MANAGE_PROMOTED = "android.settings.MANAGE_APP_PROMOTED_NOTIFICATIONS"

    @Volatile private var current: WeakReference<LiveTimerModule>? = null

    // Delivers a notification button tap to JS if the app is running and listening.
    fun emit(action: String, at: Long): Boolean {
      val module = current?.get() ?: return false
      if (!module.listening) return false
      module.sendEvent("onAction", mapOf("action" to action, "at" to at.toDouble()))
      return true
    }
  }
}
