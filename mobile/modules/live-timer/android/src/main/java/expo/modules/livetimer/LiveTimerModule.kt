package expo.modules.livetimer

import android.app.AlarmManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.lang.ref.WeakReference

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

    AsyncFunction("start") { title: String, text: String, endsAt: Double, isBreak: Boolean, totalSeconds: Int, alertTitle: String, alertBody: String, alert: Boolean ->
      val session = TimerSession(title, text, endsAt.toLong(), (endsAt.toLong() - System.currentTimeMillis()).coerceAtLeast(0), totalSeconds, isBreak, true, alertTitle, alertBody, alert)
      LiveTimerNotifier.save(context, session)
      LiveTimerNotifier.scheduleFinish(context, session.endsAt)
      LiveTimerNotifier.showRunning(context, session)
    }

    AsyncFunction("pause") { title: String, text: String, remainingSeconds: Int, isBreak: Boolean, totalSeconds: Int, alertTitle: String, alertBody: String, alert: Boolean ->
      val session = TimerSession(title, text, 0, remainingSeconds * 1000L, totalSeconds, isBreak, false, alertTitle, alertBody, alert)
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

    AsyncFunction<Unit>("openExactAlarmSettings") {
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return@AsyncFunction
      val intent = Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM, Uri.parse("package:${context.packageName}"))
        .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      context.startActivity(intent)
    }
  }

  companion object {
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
