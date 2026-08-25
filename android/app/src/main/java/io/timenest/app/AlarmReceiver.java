package io.timenest.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.PowerManager;
import android.util.Log;
import androidx.core.app.NotificationCompat;

public class AlarmReceiver extends BroadcastReceiver {
    private static final String CHANNEL_ID = "timenest_alarm_channel";

    @Override
    public void onReceive(Context context, Intent intent) {
        String title = intent.getStringExtra("title");
        String message = intent.getStringExtra("message");
        int id = intent.getIntExtra("id", 0);
        String intentType = intent.getStringExtra("intentType");

        Log.d("NativeAlarm", "Alarm Received: " + title);

        Intent alarmIntent = new Intent(context, FullScreenAlarmActivity.class);
        alarmIntent.putExtra("title", title);
        alarmIntent.putExtra("message", message);
        alarmIntent.putExtra("id", id);
        if (intentType != null) {
            alarmIntent.putExtra("intentType", intentType);
        }
        alarmIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        
        PendingIntent fullScreenPendingIntent = PendingIntent.getActivity(
                context,
                id,
                alarmIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        PowerManager pm = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
        PowerManager.WakeLock wakeLock = null;
        if (pm != null) {
            wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "TimeNest:AlarmReceiverWakeLock");
            wakeLock.acquire(10000); // 10 seconds max
        }

        NotificationManager notificationManager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    "Alarmes",
                    NotificationManager.IMPORTANCE_HIGH
            );
            channel.setDescription("Notificações em tela cheia para alarmes");
            notificationManager.createNotificationChannel(channel);
        }

        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_ID)
                .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
                .setContentTitle(title)
                .setContentText(message)
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setCategory(NotificationCompat.CATEGORY_ALARM)
                .setFullScreenIntent(fullScreenPendingIntent, true)
                .setAutoCancel(true);

        notificationManager.notify(id, builder.build());

        // Also try to start activity directly (works if we have SYSTEM_ALERT_WINDOW)
        try {
            context.startActivity(alarmIntent);
        } catch (Exception e) {
            Log.e("NativeAlarm", "Direct startActivity failed", e);
        }
        
        if (wakeLock != null) {
            wakeLock.release();
        }
    }
}
