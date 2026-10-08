package expo.modules.livetimer

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

// Ongoing Kronometre notification with a native countdown chronometer. On
// Android 16+ it also asks to be promoted to a Live Update (status-bar chip
// and lock screen); older versions show a regular ongoing notification.
class LiveTimerModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  override fun definition() = ModuleDefinition {
    Name("LiveTimer")

    AsyncFunction("start") { title: String, text: String, endsAt: Double, isBreak: Boolean ->
      ensureChannel()
      val endsAtMillis = endsAt.toLong()
      val accent = if (isBreak) 0xFFF59E0B.toInt() else 0xFF00A870.toInt()
      val launch = Intent(Intent.ACTION_VIEW, Uri.parse("calisiyo://kronometre")).apply {
        setPackage(context.packageName)
        flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
      }
      val contentIntent = PendingIntent.getActivity(
        context, NOTIFICATION_ID, launch,
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
      )
      val builder = NotificationCompat.Builder(context, CHANNEL_ID)
        .setSmallIcon(smallIcon())
        .setContentTitle(title)
        .setContentText(text)
        .setColor(accent)
        .setColorized(false)
        .setOngoing(true)
        .setOnlyAlertOnce(true)
        .setSilent(true)
        .setCategory(NotificationCompat.CATEGORY_STOPWATCH)
        .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
        .setPriority(NotificationCompat.PRIORITY_LOW)
        .setShowWhen(true)
        .setWhen(endsAtMillis)
        .setUsesChronometer(true)
        .setChronometerCountDown(true)
        .setContentIntent(contentIntent)
        .addExtras(Bundle().apply { putBoolean(EXTRA_REQUEST_PROMOTED_ONGOING, true) })
      val remaining = endsAtMillis - System.currentTimeMillis()
      if (remaining > 0) builder.setTimeoutAfter(remaining + 5_000)
      if (NotificationManagerCompat.from(context).areNotificationsEnabled()) {
        try {
          NotificationManagerCompat.from(context).notify(NOTIFICATION_ID, builder.build())
        } catch (_: SecurityException) {
          // POST_NOTIFICATIONS was revoked; the in-app timer keeps working.
        }
      }
    }

    AsyncFunction<Unit>("stop") {
      NotificationManagerCompat.from(context).cancel(NOTIFICATION_ID)
    }
  }

  private fun smallIcon(): Int {
    val id = context.resources.getIdentifier("notification_icon", "drawable", context.packageName)
    return if (id != 0) id else context.applicationInfo.icon
  }

  private fun ensureChannel() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
    val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    if (manager.getNotificationChannel(CHANNEL_ID) != null) return
    val channel = NotificationChannel(CHANNEL_ID, "Canlı Kronometre", NotificationManager.IMPORTANCE_LOW).apply {
      description = "Çalışan odak veya mola süresini bildirimde gösterir"
      setShowBadge(false)
      lockscreenVisibility = android.app.Notification.VISIBILITY_PUBLIC
    }
    manager.createNotificationChannel(channel)
  }

  companion object {
    private const val CHANNEL_ID = "kronometre_live"
    private const val NOTIFICATION_ID = 4201
    private const val EXTRA_REQUEST_PROMOTED_ONGOING = "android.requestPromotedOngoing"
  }
}
