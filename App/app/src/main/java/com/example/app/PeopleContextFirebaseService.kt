package com.example.app

import android.app.NotificationManager
import android.content.Context
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import com.example.sdk.PeopleContextSDK
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage

/**
 * Receives FCM tokens and push messages from the PeopleContext backend.
 *
 * Token lifecycle:
 *  - onNewToken  → immediately re-register the device so the backend has
 *                  the latest token (FCM rotates tokens periodically).
 *
 * Message lifecycle:
 *  - onMessageReceived → post a local notification when the app is in the
 *                        foreground (system auto-handles background messages).
 */
class PeopleContextFirebaseService : FirebaseMessagingService() {

    override fun onNewToken(token: String) {
        super.onNewToken(token)
        // Re-register with the backend so the FCM token stays fresh.
        PeopleContextSDK.registerDevice(fcmToken = token)
    }

    override fun onMessageReceived(message: RemoteMessage) {
        super.onMessageReceived(message)

        val title = message.notification?.title
            ?: message.data["title"]
            ?: "PeopleContext Alert"
        val body = message.notification?.body
            ?: message.data["body"]
            ?: return   // nothing to show

        postNotification(title, body, message.data["fence_id"]?.hashCode() ?: System.currentTimeMillis().toInt())
    }

    private fun postNotification(title: String, body: String, id: Int) {
        val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

        // Channel must exist before posting
        if (nm.getNotificationChannel(FENCE_CHANNEL_ID) == null) return

        val notification = NotificationCompat.Builder(this, FENCE_CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_dialog_map)
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(NotificationCompat.BigTextStyle().bigText(body))
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .build()

        NotificationManagerCompat.from(this).notify(id, notification)
    }
}
