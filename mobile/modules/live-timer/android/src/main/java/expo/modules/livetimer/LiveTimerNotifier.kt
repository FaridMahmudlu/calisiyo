package expo.modules.livetimer

import android.app.AlarmManager
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import androidx.core.app.AlarmManagerCompat
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import org.json.JSONArray
import org.json.JSONObject

// A running or paused Kronometre stage, mirrored natively so the ongoing
// notification, its buttons and the end alert keep working without JS.
data class TimerSession(
  val title: String,
  val text: String,
  val endsAt: Long,
  val remainingMs: Long,
  val totalSeconds: Int,
  val isBreak: Boolean,
  val running: Boolean,
  val alertTitle: String,
  val alertBody: String,
  val alert: Boolean,
)

object LiveTimerNotifier {
  const val ACTION_PAUSE = "expo.modules.livetimer.PAUSE"
  const val ACTION_RESUME = "expo.modules.livetimer.RESUME"
  const val ACTION_SKIP_BREAK = "expo.modules.livetimer.SKIP_BREAK"
  const val ACTION_FINISHED = "expo.modules.livetimer.FINISHED"

  private const val CHANNEL_ID = "kronometre_live"
  private const val ALERT_CHANNEL_ID = "timer"
  private const val NOTIFICATION_ID = 4201
  private const val ALERT_NOTIFICATION_ID = 4202
  private const val PREFS = "planliyo_live_timer"
  private const val KEY_SESSION = "session"
  private const val KEY_ACTIONS = "pending_actions"
  private const val EXTRA_REQUEST_PROMOTED_ONGOING = "android.requestPromotedOngoing"
  private const val EXTRA_SHORT_CRITICAL_TEXT = "android.shortCriticalText"
  private val GREEN = 0xFF00A870.toInt()
  private val AMBER = 0xFFF59E0B.toInt()

  fun save(context: Context, session: TimerSession) {
    val json = JSONObject()
      .put("title", session.title).put("text", session.text).put("endsAt", session.endsAt)
      .put("remainingMs", session.remainingMs).put("totalSeconds", session.totalSeconds)
      .put("isBreak", session.isBreak).put("running", session.running)
      .put("alertTitle", session.alertTitle).put("alertBody", session.alertBody).put("alert", session.alert)
    prefs(context).edit().putString(KEY_SESSION, json.toString()).apply()
  }

  fun load(context: Context): TimerSession? {
    val raw = prefs(context).getString(KEY_SESSION, null) ?: return null
    return try {
      val json = JSONObject(raw)
      TimerSession(
        json.getString("title"), json.getString("text"), json.getLong("endsAt"), json.getLong("remainingMs"),
        json.getInt("totalSeconds"), json.getBoolean("isBreak"), json.getBoolean("running"),
        json.optString("alertTitle"), json.optString("alertBody"), json.optBoolean("alert", true),
      )
    } catch (_: Exception) {
      null
    }
  }

  fun clear(context: Context) {
    prefs(context).edit().remove(KEY_SESSION).apply()
  }

  // Actions taken from the notification while the JS runtime was not running.
  fun queueAction(context: Context, action: String, at: Long) {
    val list = JSONArray(prefs(context).getString(KEY_ACTIONS, "[]"))
    list.put(JSONObject().put("action", action).put("at", at))
    prefs(context).edit().putString(KEY_ACTIONS, list.toString()).apply()
  }

  fun drainActions(context: Context): List<Map<String, Any>> {
    val list = JSONArray(prefs(context).getString(KEY_ACTIONS, "[]"))
    prefs(context).edit().remove(KEY_ACTIONS).apply()
    return (0 until list.length()).map { index ->
      val item = list.getJSONObject(index)
      mapOf("action" to item.getString("action"), "at" to item.getLong("at").toDouble())
    }
  }

  fun showRunning(context: Context, session: TimerSession) {
    ensureChannel(context)
    val builder = base(context, session)
      .setContentTitle(session.title)
      .setContentText(session.text)
      .setShowWhen(true)
      .setWhen(session.endsAt)
      .setUsesChronometer(true)
      .setChronometerCountDown(true)
      .setCategory(NotificationCompat.CATEGORY_STOPWATCH)
      .addAction(0, "Duraklat", action(context, ACTION_PAUSE))
      .addExtras(Bundle().apply { putBoolean(EXTRA_REQUEST_PROMOTED_ONGOING, true) })
    if (session.isBreak) builder.addAction(0, "Molayı geç", action(context, ACTION_SKIP_BREAK))
    val remaining = session.endsAt - System.currentTimeMillis()
    if (remaining > 0) builder.setTimeoutAfter(remaining + 60_000)
    post(context, NOTIFICATION_ID, builder)
  }

  fun showPaused(context: Context, session: TimerSession) {
    ensureChannel(context)
    val left = formatClock(session.remainingMs)
    val builder = base(context, session)
      .setContentTitle("${session.title} · Duraklatıldı")
      .setContentText("$left kaldı · devam etmek için dokun")
      .setShowWhen(false)
      .setCategory(NotificationCompat.CATEGORY_STATUS)
      .addAction(0, "Devam et", action(context, ACTION_RESUME))
      .addExtras(Bundle().apply { putString(EXTRA_SHORT_CRITICAL_TEXT, "⏸ $left") })
    if (session.isBreak) builder.addAction(0, "Molayı geç", action(context, ACTION_SKIP_BREAK))
    post(context, NOTIFICATION_ID, builder)
  }

  fun showFinished(context: Context, session: TimerSession) {
    ensureAlertChannel(context)
    val builder = NotificationCompat.Builder(context, ALERT_CHANNEL_ID)
      .setSmallIcon(smallIcon(context))
      .setColor(GREEN)
      .setContentTitle(session.alertTitle.ifBlank { if (session.isBreak) "Mola bitti" else "Odak oturumu tamamlandı" })
      .setContentText(session.alertBody)
      .setStyle(NotificationCompat.BigTextStyle().bigText(session.alertBody))
      .setAutoCancel(true)
      .setCategory(NotificationCompat.CATEGORY_ALARM)
      .setPriority(NotificationCompat.PRIORITY_HIGH)
      .setContentIntent(open(context))
    post(context, ALERT_NOTIFICATION_ID, builder)
  }

  fun cancel(context: Context) {
    NotificationManagerCompat.from(context).cancel(NOTIFICATION_ID)
  }

  fun scheduleFinish(context: Context, at: Long) {
    val alarm = context.getSystemService(AlarmManager::class.java) ?: return
    val intent = finishIntent(context)
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S || alarm.canScheduleExactAlarms()) {
      AlarmManagerCompat.setExactAndAllowWhileIdle(alarm, AlarmManager.RTC_WAKEUP, at, intent)
    } else {
      AlarmManagerCompat.setAndAllowWhileIdle(alarm, AlarmManager.RTC_WAKEUP, at, intent)
    }
  }

  fun cancelFinish(context: Context) {
    context.getSystemService(AlarmManager::class.java)?.cancel(finishIntent(context))
  }

  private fun base(context: Context, session: TimerSession) = NotificationCompat.Builder(context, CHANNEL_ID)
    .setSmallIcon(smallIcon(context))
    .setColor(if (session.isBreak) AMBER else GREEN)
    .setColorized(false)
    .setOngoing(true)
    .setOnlyAlertOnce(true)
    .setSilent(true)
    .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
    .setPriority(NotificationCompat.PRIORITY_LOW)
    .setContentIntent(open(context))

  private fun post(context: Context, id: Int, builder: NotificationCompat.Builder) {
    if (!NotificationManagerCompat.from(context).areNotificationsEnabled()) return
    try {
      NotificationManagerCompat.from(context).notify(id, builder.build())
    } catch (_: SecurityException) {
      // POST_NOTIFICATIONS was revoked; the in-app timer keeps working.
    }
  }

  private fun open(context: Context): PendingIntent {
    val launch = Intent(Intent.ACTION_VIEW, Uri.parse("planliyo://kronometre")).apply {
      setPackage(context.packageName)
      flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
    }
    return PendingIntent.getActivity(context, NOTIFICATION_ID, launch, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
  }

  private fun action(context: Context, name: String): PendingIntent {
    val intent = Intent(context, LiveTimerReceiver::class.java).setAction(name)
    return PendingIntent.getBroadcast(context, name.hashCode(), intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
  }

  private fun finishIntent(context: Context): PendingIntent {
    val intent = Intent(context, LiveTimerReceiver::class.java).setAction(ACTION_FINISHED)
    return PendingIntent.getBroadcast(context, ACTION_FINISHED.hashCode(), intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
  }

  private fun formatClock(ms: Long): String {
    val total = ((ms + 999) / 1000).coerceAtLeast(0)
    val hours = total / 3600
    val minutes = (total % 3600) / 60
    val seconds = total % 60
    return if (hours > 0) "%d:%02d:%02d".format(hours, minutes, seconds) else "%02d:%02d".format(minutes, seconds)
  }

  private fun smallIcon(context: Context): Int {
    val id = context.resources.getIdentifier("notification_icon", "drawable", context.packageName)
    return if (id != 0) id else context.applicationInfo.icon
  }

  private fun prefs(context: Context) = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

  private fun ensureChannel(context: Context) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
    val manager = context.getSystemService(NotificationManager::class.java) ?: return
    if (manager.getNotificationChannel(CHANNEL_ID) != null) return
    val channel = NotificationChannel(CHANNEL_ID, "Canlı Kronometre", NotificationManager.IMPORTANCE_LOW).apply {
      description = "Çalışan odak veya mola süresini bildirimde gösterir"
      setShowBadge(false)
      lockscreenVisibility = android.app.Notification.VISIBILITY_PUBLIC
    }
    manager.createNotificationChannel(channel)
  }

  // The app creates this channel on first launch; recreate it if missing.
  private fun ensureAlertChannel(context: Context) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
    val manager = context.getSystemService(NotificationManager::class.java) ?: return
    if (manager.getNotificationChannel(ALERT_CHANNEL_ID) != null) return
    val channel = NotificationChannel(ALERT_CHANNEL_ID, "Kronometre", NotificationManager.IMPORTANCE_HIGH).apply {
      description = "Çalışma ve mola bitiş bildirimleri"
      enableVibration(true)
      vibrationPattern = longArrayOf(0, 250, 150, 250)
    }
    manager.createNotificationChannel(channel)
  }
}
