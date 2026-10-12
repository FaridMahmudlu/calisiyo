package expo.modules.livetimer

import android.app.AlarmManager
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.graphics.drawable.Icon
import android.net.Uri
import android.os.Build
import android.os.Bundle
import androidx.core.app.AlarmManagerCompat
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import org.json.JSONArray
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.time.Duration
import java.time.Instant
import java.util.Date
import java.util.Locale

// A running or paused Kronometre stage, mirrored natively so the ongoing
// notification, its buttons and the end alert keep working without JS.
data class TimerSession(
  val title: String,
  val text: String,
  val next: String,
  val endsAt: Long,
  val remainingMs: Long,
  val totalSeconds: Int,
  val isBreak: Boolean,
  val running: Boolean,
  val alertTitle: String,
  val alertBody: String,
  val alert: Boolean,
) {
  fun toJson(): JSONObject = JSONObject()
    .put("title", title).put("text", text).put("next", next).put("endsAt", endsAt)
    .put("remainingMs", remainingMs).put("totalSeconds", totalSeconds)
    .put("isBreak", isBreak).put("running", running)
    .put("alertTitle", alertTitle).put("alertBody", alertBody).put("alert", alert)

  companion object {
    fun fromJson(json: JSONObject) = TimerSession(
      json.optString("title"), json.optString("text"), json.optString("next"),
      json.optLong("endsAt"), json.optLong("remainingMs"), json.optInt("totalSeconds"),
      json.optBoolean("isBreak"), json.optBoolean("running"),
      json.optString("alertTitle"), json.optString("alertBody"), json.optBoolean("alert", true),
    )
  }
}

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
    prefs(context).edit().putString(KEY_SESSION, session.toJson().toString()).apply()
  }

  fun load(context: Context): TimerSession? {
    val raw = prefs(context).getString(KEY_SESSION, null) ?: return null
    return try { TimerSession.fromJson(JSONObject(raw)) } catch (_: Exception) { null }
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
    val end = clock(session.endsAt)
    val summary = listOfNotNull("Bitiş $end", session.next.takeIf { it.isNotBlank() }?.let { "sonra $it" }).joinToString(" · ")
    val remaining = session.endsAt - System.currentTimeMillis()
    val notification = metricNotification(context, session, summary) ?: run {
      val builder = compat(context, session)
        .setContentTitle(session.title)
        .setContentText(session.text)
        .setSubText(summary)
        .setStyle(NotificationCompat.BigTextStyle().bigText("${session.text}\n$summary"))
        .setShowWhen(true)
        .setWhen(session.endsAt)
        .setUsesChronometer(true)
        .setChronometerCountDown(true)
        .setCategory(NotificationCompat.CATEGORY_STOPWATCH)
        .addAction(0, "Duraklat", action(context, ACTION_PAUSE))
      if (session.isBreak) builder.addAction(0, "Molayı geç", action(context, ACTION_SKIP_BREAK))
      if (remaining > 0) builder.setTimeoutAfter(remaining + 60_000)
      builder.build()
    }
    post(context, NOTIFICATION_ID, notification)
  }

  fun showPaused(context: Context, session: TimerSession) {
    ensureChannel(context)
    val left = formatClock(session.remainingMs)
    val notification = metricNotification(context, session, "Duraklatıldı · $left kaldı") ?: run {
      val builder = compat(context, session)
        .setContentTitle("${session.title} · Duraklatıldı")
        .setContentText("$left kaldı · devam etmek için dokun")
        .setSubText(session.text)
        .setShowWhen(false)
        .setCategory(NotificationCompat.CATEGORY_STATUS)
        .addAction(0, "Devam et", action(context, ACTION_RESUME))
        .addExtras(Bundle().apply { putString(EXTRA_SHORT_CRITICAL_TEXT, "⏸ $left") })
      if (session.isBreak) builder.addAction(0, "Molayı geç", action(context, ACTION_SKIP_BREAK))
      builder.build()
    }
    post(context, NOTIFICATION_ID, notification)
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
    post(context, ALERT_NOTIFICATION_ID, builder.build())
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

  // Android 17+: MetricStyle lets the system draw a live countdown on the lock
  // screen, status-bar chip, AOD and Samsung Now Bar. Built reflectively so the
  // module still compiles against SDK 36; returns null on older versions.
  private fun metricNotification(context: Context, session: TimerSession, summary: String): Notification? {
    if (Build.VERSION.SDK_INT < 37) return null
    return try {
      val metric = Class.forName("android.app.Notification\$Metric")
      val value = Class.forName("android.app.Notification\$Metric\$MetricValue")
      val difference = Class.forName("android.app.Notification\$Metric\$TimeDifference")
      val fixedText = Class.forName("android.app.Notification\$Metric\$FixedText").getConstructor(CharSequence::class.java)
      val newMetric = metric.getConstructor(value, CharSequence::class.java)
      val format = difference.getField("FORMAT_CHRONOMETER").getInt(null)
      val countdown = if (session.running) {
        difference.getMethod("forTimer", Instant::class.java, Int::class.javaPrimitiveType).invoke(null, Instant.ofEpochMilli(session.endsAt), format)
      } else {
        difference.getMethod("forPausedTimer", Duration::class.java, Int::class.javaPrimitiveType).invoke(null, Duration.ofMillis(session.remainingMs), format)
      }
      val style = Class.forName("android.app.Notification\$MetricStyle").getConstructor().newInstance()
      val add = style.javaClass.getMethod("addMetric", metric)
      add.invoke(style, newMetric.newInstance(countdown, "Kalan"))
      add.invoke(style, newMetric.newInstance(fixedText.newInstance(if (session.running) clock(session.endsAt) else "Durdu"), if (session.running) "Bitiş" else "Durum"))
      if (session.next.isNotBlank()) add.invoke(style, newMetric.newInstance(fixedText.newInstance(session.next), "Sonra"))

      val icon = Icon.createWithResource(context, smallIcon(context))
      val builder = Notification.Builder(context, CHANNEL_ID)
        .setSmallIcon(smallIcon(context))
        .setColor(if (session.isBreak) AMBER else GREEN)
        .setContentTitle(if (session.running) session.title else "${session.title} · Duraklatıldı")
        .setContentText(summary)
        .setSubText(session.text)
        .setOngoing(true)
        .setOnlyAlertOnce(true)
        .setVisibility(Notification.VISIBILITY_PUBLIC)
        .setCategory(if (session.running) Notification.CATEGORY_STOPWATCH else Notification.CATEGORY_STATUS)
        .setContentIntent(open(context))
        .setStyle(style as Notification.Style)
        .addExtras(Bundle().apply { putBoolean(EXTRA_REQUEST_PROMOTED_ONGOING, true) })
      if (session.running) {
        builder.addAction(Notification.Action.Builder(icon, "Duraklat", action(context, ACTION_PAUSE)).build())
        val remaining = session.endsAt - System.currentTimeMillis()
        if (remaining > 0) builder.setTimeoutAfter(remaining + 60_000)
      } else {
        builder.addAction(Notification.Action.Builder(icon, "Devam et", action(context, ACTION_RESUME)).build())
      }
      if (session.isBreak) builder.addAction(Notification.Action.Builder(icon, "Molayı geç", action(context, ACTION_SKIP_BREAK)).build())
      builder.build()
    } catch (_: Throwable) {
      null
    }
  }

  private fun compat(context: Context, session: TimerSession) = NotificationCompat.Builder(context, CHANNEL_ID)
    .setSmallIcon(smallIcon(context))
    .setColor(if (session.isBreak) AMBER else GREEN)
    .setColorized(false)
    .setOngoing(true)
    .setOnlyAlertOnce(true)
    .setSilent(true)
    .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
    .setPriority(NotificationCompat.PRIORITY_LOW)
    .setContentIntent(open(context))
    .addExtras(Bundle().apply { putBoolean(EXTRA_REQUEST_PROMOTED_ONGOING, true) })

  private fun post(context: Context, id: Int, notification: Notification) {
    if (!NotificationManagerCompat.from(context).areNotificationsEnabled()) return
    try {
      NotificationManagerCompat.from(context).notify(id, notification)
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

  private fun clock(at: Long) = SimpleDateFormat("HH:mm", Locale("tr", "TR")).format(Date(at))

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
      lockscreenVisibility = Notification.VISIBILITY_PUBLIC
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
