package io.timenest.app;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.util.Log;

import android.Manifest;
import android.content.pm.PackageManager;
import android.provider.Settings;
import androidx.core.content.ContextCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

@CapacitorPlugin(
    name = "NativeAlarm",
    permissions = {
        @Permission(
            strings = { Manifest.permission.POST_NOTIFICATIONS },
            alias = "notifications"
        )
    }
)
public class NativeAlarmPlugin extends Plugin {

    @PluginMethod
    public void requestPermissions(PluginCall call) {
        try {
            Context context = getContext();
            boolean needsExactAlarm = false;
            
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                try {
                    AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
                    if (alarmManager != null && !alarmManager.canScheduleExactAlarms()) {
                        needsExactAlarm = true;
                    }
                } catch (Exception e) {
                    Log.w("NativeAlarm", "Error checking exact alarm permission", e);
                }
            }

            if (Build.VERSION.SDK_INT >= 33) {
                try {
                    if (ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                        requestPermissionForAlias("notifications", call, "notificationsPermsCallback");
                        return;
                    }
                } catch (Exception e) {
                    Log.w("NativeAlarm", "Error requesting notifications permission", e);
                }
            }

            JSObject ret = new JSObject();
            ret.put("success", true);
            ret.put("exactAlarmRequested", needsExactAlarm);
            call.resolve(ret);
        } catch (Exception e) {
            Log.e("NativeAlarm", "Safe catch in requestPermissions", e);
            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        }
    }

    @PermissionCallback
    private void notificationsPermsCallback(PluginCall call) {
        try {
            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            Log.e("NativeAlarm", "Error in notificationsPermsCallback", e);
        }
    }

    @PluginMethod
    public void scheduleAlarm(PluginCall call) {
        String title = call.getString("title", "Alarme");
        String message = call.getString("message", "Hora de sua tarefa!");
        String intentType = call.getString("intentType", "pre-event");
        long timestamp = call.getLong("timestamp", 0L);
        int id = call.getInt("id", (int) System.currentTimeMillis());

        String eventTime = call.getString("eventTime", "");
        String timeLabel = call.getString("timeLabel", "");

        if (timestamp <= System.currentTimeMillis()) {
            call.reject("Timestamp must be in the future");
            return;
        }

        Context context = getContext();
        AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);

        Intent intent = new Intent(context, AlarmReceiver.class);
        intent.putExtra("title", title);
        intent.putExtra("message", message);
        intent.putExtra("id", id);
        intent.putExtra("intentType", intentType);
        intent.putExtra("eventTime", eventTime);
        intent.putExtra("timeLabel", timeLabel);

        PendingIntent pendingIntent = PendingIntent.getBroadcast(
                context,
                id,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            if (alarmManager.canScheduleExactAlarms()) {
                alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, timestamp, pendingIntent);
            } else {
                alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, timestamp, pendingIntent);
            }
        } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, timestamp, pendingIntent);
        } else {
            alarmManager.setExact(AlarmManager.RTC_WAKEUP, timestamp, pendingIntent);
        }

        JSObject ret = new JSObject();
        ret.put("success", true);
        ret.put("id", id);
        call.resolve(ret);
    }

    @PluginMethod
    public void cancelAlarm(PluginCall call) {
        int id = call.getInt("id", -1);
        if (id == -1) {
            call.reject("ID is required");
            return;
        }

        Context context = getContext();
        AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);

        Intent intent = new Intent(context, AlarmReceiver.class);
        PendingIntent pendingIntent = PendingIntent.getBroadcast(
                context,
                id,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        alarmManager.cancel(pendingIntent);
        
        JSObject ret = new JSObject();
        ret.put("success", true);
        call.resolve(ret);
    }
}
