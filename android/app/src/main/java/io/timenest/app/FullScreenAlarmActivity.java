package io.timenest.app;

import android.app.Activity;
import android.app.AlarmManager;
import android.app.KeyguardManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.media.AudioAttributes;
import android.media.Ringtone;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.PowerManager;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.os.VibratorManager;
import android.util.Log;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

public class FullScreenAlarmActivity extends Activity {

    private Ringtone ringtone;
    private PowerManager.WakeLock wakeLock;

    private int dpToPx(int dp) {
        float density = getResources().getDisplayMetrics().density;
        return Math.round(dp * density);
    }

    private void stopSoundAndVibration() {
        try {
            if (ringtone != null && ringtone.isPlaying()) {
                ringtone.stop();
            }
        } catch (Exception e) {
            Log.e("FullScreenAlarm", "Error stopping ringtone", e);
        }
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                VibratorManager vm = (VibratorManager) getSystemService(VIBRATOR_MANAGER_SERVICE);
                if (vm != null) vm.getDefaultVibrator().cancel();
            } else {
                Vibrator vib = (Vibrator) getSystemService(VIBRATOR_SERVICE);
                if (vib != null) vib.cancel();
            }
        } catch (Exception e) {
            Log.e("FullScreenAlarm", "Error cancelling vibration", e);
        }
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Required flags to show over lock screen and wake up screen
        getWindow().addFlags(
                WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED |
                WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON |
                WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON |
                WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD |
                WindowManager.LayoutParams.FLAG_ALLOW_LOCK_WHILE_SCREEN_ON
        );

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true);
            setTurnScreenOn(true);
            KeyguardManager km = (KeyguardManager) getSystemService(Context.KEYGUARD_SERVICE);
            if (km != null) {
                km.requestDismissKeyguard(this, null);
            }
        }

        // Acquire WakeLock to forcefully wake up the device
        PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
        if (pm != null) {
            wakeLock = pm.newWakeLock(PowerManager.SCREEN_BRIGHT_WAKE_LOCK | PowerManager.ACQUIRE_CAUSES_WAKEUP, "TimeNest:AlarmWakeLock");
            wakeLock.acquire(10 * 60 * 1000L /*10 minutes*/);
        }

        String title = getIntent().getStringExtra("title");
        String message = getIntent().getStringExtra("message");
        String intentType = getIntent().getStringExtra("intentType");
        String eventTime = getIntent().getStringExtra("eventTime");
        String timeLabel = getIntent().getStringExtra("timeLabel");
        final int alarmId = getIntent().getIntExtra("id", (int) System.currentTimeMillis());

        if (intentType == null) intentType = "pre-event";

        if (title != null && title.startsWith("TimeNest: ")) {
            title = title.substring("TimeNest: ".length());
        }

        // Real dynamic time (HH:mm) if not specified
        if (eventTime == null || eventTime.trim().isEmpty()) {
            SimpleDateFormat sdf = new SimpleDateFormat("HH:mm", Locale.getDefault());
            eventTime = sdf.format(new Date());
        }

        // Base Light Theme
        int rootBgColor = 0xFFF9F9FB; // very light gray/purple
        int titleColor = 0xFF191439; // dark blue/purple
        
        int haloColor = 0x33B8A9E8; 
        String badgeText = "ALARME";
        int badgeTextColor = 0xFF6B5CA5;
        int timeColor = 0xFF7C3AED;
        
        String okText = "Ok, entendi";
        int primaryBtnBgColor = 0xFF432C81; // dark purple
        
        String snooze1 = "+5 min";
        String dismissText = "Dispensar";

        switch (intentType) {
            case "medication":
                haloColor = 0x25DC2626; // red/rose halo
                badgeText = "💊 MEDICAMENTO";
                badgeTextColor = 0xFFDC2626;
                timeColor = 0xFFDC2626;
                okText = "Tomar agora";
                primaryBtnBgColor = 0xFFDC2626;
                snooze1 = "+5 min";
                dismissText = "Lembrar mais tarde";
                break;
            case "sleep":
                haloColor = 0x25312E81; // deep indigo halo
                badgeText = "🌙 HORA DE DORMIR";
                badgeTextColor = 0xFF432C81;
                timeColor = 0xFF432C81;
                okText = "Vou me preparar agora";
                primaryBtnBgColor = 0xFF432C81;
                snooze1 = "+10 min";
                dismissText = "Adiar sono";
                break;
            case "pre-event":
                haloColor = 0x257C3AED; // vibrant purple halo
                badgeText = (timeLabel != null && !timeLabel.isEmpty()) ? ("📅 " + timeLabel.toUpperCase()) : "📅 COMPROMISSO";
                badgeTextColor = 0xFF7C3AED;
                timeColor = 0xFF7C3AED;
                okText = "Vou me preparar";
                primaryBtnBgColor = 0xFF6D28D9;
                snooze1 = "+5 min";
                dismissText = "Dispensar";
                break;
            case "task":
            case "task-now":
                haloColor = 0x250284C7; // sky blue halo
                badgeText = "🎯 HORA DO FOCO";
                badgeTextColor = 0xFF0284C7;
                timeColor = 0xFF0284C7;
                okText = "Iniciar foco agora";
                primaryBtnBgColor = 0xFF0284C7;
                snooze1 = "+5 min";
                dismissText = "Pular por enquanto";
                break;
            case "critical":
                haloColor = 0x25EA580C; // orange halo
                badgeText = "⚠️ URGENTE";
                badgeTextColor = 0xFFEA580C;
                timeColor = 0xFFEA580C;
                okText = "Confirmar";
                primaryBtnBgColor = 0xFFEA580C;
                snooze1 = "+5 min";
                dismissText = "Dispensar";
                break;
            case "test":
            default:
                haloColor = 0x257C3AED;
                badgeText = "🔔 TESTE DE ALARME";
                badgeTextColor = 0xFF7C3AED;
                timeColor = 0xFF7C3AED;
                okText = "Ok, entendi";
                primaryBtnBgColor = 0xFF432C81;
                snooze1 = "+5 min";
                dismissText = "Dispensar";
                break;
        }

        // ── Root container ──
        FrameLayout root = new FrameLayout(this);
        root.setLayoutParams(new FrameLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.MATCH_PARENT
        ));
        root.setBackgroundColor(rootBgColor);

        // ── Halo radial circle (Big soft gradient in the center) ──
        View halo = new View(this);
        int haloSize = dpToPx(380);
        FrameLayout.LayoutParams haloParams = new FrameLayout.LayoutParams(haloSize, haloSize);
        haloParams.gravity = Gravity.CENTER;
        haloParams.topMargin = -dpToPx(40);
        halo.setLayoutParams(haloParams);
        GradientDrawable haloDrawable = new GradientDrawable();
        haloDrawable.setShape(GradientDrawable.OVAL);
        haloDrawable.setGradientType(GradientDrawable.RADIAL_GRADIENT);
        haloDrawable.setGradientRadius(haloSize / 2f);
        haloDrawable.setColors(new int[]{haloColor, 0x00FFFFFF});
        halo.setBackground(haloDrawable);
        root.addView(halo);

        // ── Center Content Layout (Badge, Title, Time) ──
        LinearLayout centerContent = new LinearLayout(this);
        centerContent.setOrientation(LinearLayout.VERTICAL);
        centerContent.setGravity(Gravity.CENTER);
        FrameLayout.LayoutParams centerParams = new FrameLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.WRAP_CONTENT
        );
        centerParams.gravity = Gravity.CENTER;
        centerParams.bottomMargin = dpToPx(80);
        centerContent.setLayoutParams(centerParams);
        centerContent.setPadding(dpToPx(24), 0, dpToPx(24), 0);

        // Badge pill
        TextView badge = new TextView(this);
        badge.setText(badgeText);
        badge.setTextSize(12f);
        badge.setTextColor(badgeTextColor);
        badge.setTypeface(null, Typeface.BOLD);
        badge.setPadding(dpToPx(16), dpToPx(6), dpToPx(16), dpToPx(6));
        GradientDrawable badgeBg = new GradientDrawable();
        badgeBg.setCornerRadius(dpToPx(100));
        badgeBg.setStroke(dpToPx(1), 0x22000000);
        badgeBg.setColor(Color.WHITE);
        badge.setBackground(badgeBg);
        LinearLayout.LayoutParams badgeParams = new LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.WRAP_CONTENT,
            ViewGroup.LayoutParams.WRAP_CONTENT
        );
        badgeParams.bottomMargin = dpToPx(24);
        badge.setLayoutParams(badgeParams);
        centerContent.addView(badge);

        // Title (Bold, dark)
        TextView titleView = new TextView(this);
        titleView.setText(title != null ? title : "Alarme");
        titleView.setTextSize(36f);
        titleView.setTextColor(titleColor);
        titleView.setTypeface(null, Typeface.BOLD);
        titleView.setGravity(Gravity.CENTER);
        titleView.setLineSpacing(0f, 0.9f);
        LinearLayout.LayoutParams titleParams = new LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.WRAP_CONTENT
        );
        titleParams.bottomMargin = dpToPx(8);
        titleView.setLayoutParams(titleParams);
        centerContent.addView(titleView);

        // Time / duration label (Real Dynamic Time)
        TextView timeView = new TextView(this);
        timeView.setText(eventTime);
        timeView.setTextSize(48f);
        timeView.setTextColor(timeColor);
        timeView.setTypeface(null, Typeface.BOLD);
        timeView.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams timeParams = new LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.WRAP_CONTENT
        );
        timeParams.bottomMargin = dpToPx(16);
        timeView.setLayoutParams(timeParams);
        centerContent.addView(timeView);

        // Sub-message (Check icon + text)
        TextView msgView = new TextView(this);
        msgView.setText(message != null ? message : "Time Nest");
        msgView.setTextSize(14f);
        msgView.setTextColor(0xFF6B7280);
        msgView.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams msgParams = new LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.WRAP_CONTENT
        );
        msgView.setLayoutParams(msgParams);
        centerContent.addView(msgView);

        root.addView(centerContent);

        // ── Bottom Buttons Layout ──
        LinearLayout bottomLayout = new LinearLayout(this);
        bottomLayout.setOrientation(LinearLayout.VERTICAL);
        bottomLayout.setGravity(Gravity.BOTTOM | Gravity.CENTER_HORIZONTAL);
        FrameLayout.LayoutParams bottomParams = new FrameLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.WRAP_CONTENT
        );
        bottomParams.gravity = Gravity.BOTTOM;
        bottomLayout.setLayoutParams(bottomParams);
        bottomLayout.setPadding(dpToPx(24), dpToPx(16), dpToPx(24), dpToPx(32));

        // Primary button (Confirm / Take Med / Dismiss)
        Button okBtn = new Button(this);
        okBtn.setText(okText);
        okBtn.setTextSize(16f);
        okBtn.setTextColor(Color.WHITE);
        okBtn.setTypeface(null, Typeface.BOLD);
        okBtn.setAllCaps(false);
        GradientDrawable okBg = new GradientDrawable();
        okBg.setCornerRadius(dpToPx(100));
        okBg.setColor(primaryBtnBgColor);
        okBtn.setBackground(okBg);
        LinearLayout.LayoutParams okParams = new LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            dpToPx(60)
        );
        okParams.bottomMargin = dpToPx(16);
        okBtn.setLayoutParams(okParams);
        okBtn.setOnClickListener(v -> {
            stopSoundAndVibration();
            finish();
        });
        bottomLayout.addView(okBtn);

        // Snooze button (reschedules for +5 min)
        final String finalTitle = title;
        final String finalMsg = message;
        final String finalIntentType = intentType;
        final String finalEventTime = eventTime;

        Button snoozeBtn = new Button(this);
        snoozeBtn.setText(snooze1);
        snoozeBtn.setTextSize(15f);
        snoozeBtn.setTextColor(primaryBtnBgColor);
        snoozeBtn.setTypeface(null, Typeface.BOLD);
        snoozeBtn.setAllCaps(false);
        GradientDrawable snoozeBg = new GradientDrawable();
        snoozeBg.setCornerRadius(dpToPx(100));
        snoozeBg.setStroke(dpToPx(1), 0x22000000);
        snoozeBg.setColor(Color.WHITE);
        snoozeBtn.setBackground(snoozeBg);
        LinearLayout.LayoutParams snoozeParams = new LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            dpToPx(52)
        );
        snoozeParams.bottomMargin = dpToPx(16);
        snoozeBtn.setLayoutParams(snoozeParams);
        snoozeBtn.setOnClickListener(v -> {
            stopSoundAndVibration();
            try {
                AlarmManager am = (AlarmManager) getSystemService(Context.ALARM_SERVICE);
                if (am != null) {
                    Intent snoozeIntent = new Intent(this, AlarmReceiver.class);
                    snoozeIntent.putExtra("title", finalTitle);
                    snoozeIntent.putExtra("message", finalMsg + " (Soneca)");
                    snoozeIntent.putExtra("id", alarmId);
                    snoozeIntent.putExtra("intentType", finalIntentType);
                    snoozeIntent.putExtra("eventTime", finalEventTime);

                    PendingIntent pi = PendingIntent.getBroadcast(
                        this,
                        alarmId,
                        snoozeIntent,
                        PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
                    );

                    long snoozeTime = System.currentTimeMillis() + (5 * 60 * 1000L); // 5 minutes
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                        if (am.canScheduleExactAlarms()) {
                            am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, snoozeTime, pi);
                        } else {
                            am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, snoozeTime, pi);
                        }
                    } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                        am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, snoozeTime, pi);
                    } else {
                        am.setExact(AlarmManager.RTC_WAKEUP, snoozeTime, pi);
                    }
                    Log.d("FullScreenAlarm", "Rescheduled alarm for +5 mins: " + snoozeTime);
                }
            } catch (Exception e) {
                Log.e("FullScreenAlarm", "Failed to reschedule snooze alarm", e);
            }
            finish();
        });
        bottomLayout.addView(snoozeBtn);

        // Dismiss text button
        Button dismissBtn = new Button(this);
        dismissBtn.setText(dismissText);
        dismissBtn.setTextSize(14f);
        dismissBtn.setTextColor(titleColor);
        dismissBtn.setTypeface(null, Typeface.BOLD);
        dismissBtn.setAllCaps(false);
        dismissBtn.setBackground(null);
        LinearLayout.LayoutParams dismissParams = new LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            dpToPx(44)
        );
        dismissBtn.setLayoutParams(dismissParams);
        dismissBtn.setOnClickListener(v -> {
            stopSoundAndVibration();
            finish();
        });
        bottomLayout.addView(dismissBtn);

        root.addView(bottomLayout);
        setContentView(root);

        // Play alarm ringtone
        try {
            Uri alarmUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM);
            if (alarmUri == null) {
                alarmUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
            }
            ringtone = RingtoneManager.getRingtone(getApplicationContext(), alarmUri);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P && ringtone != null) {
                ringtone.setAudioAttributes(new AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_ALARM)
                    .build());
            }
            if (ringtone != null) {
                ringtone.play();
            }
        } catch (Exception e) {
            Log.e("FullScreenAlarm", "Error playing ringtone", e);
        }

        // Vibrate
        try {
            long[] pattern = {0, 500, 200, 500, 200, 500};
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                VibratorManager vm = (VibratorManager) getSystemService(VIBRATOR_MANAGER_SERVICE);
                if (vm != null) {
                    VibrationEffect effect = VibrationEffect.createWaveform(pattern, -1);
                    vm.getDefaultVibrator().vibrate(effect);
                }
            } else {
                Vibrator vib = (Vibrator) getSystemService(VIBRATOR_SERVICE);
                if (vib != null) {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        vib.vibrate(VibrationEffect.createWaveform(pattern, -1));
                    } else {
                        vib.vibrate(pattern, -1);
                    }
                }
            }
        } catch (Exception e) {
            Log.e("FullScreenAlarm", "Error vibrating", e);
        }
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        stopSoundAndVibration();
        if (wakeLock != null && wakeLock.isHeld()) {
            try {
                wakeLock.release();
            } catch (Exception e) {
                Log.e("FullScreenAlarm", "Error releasing wakeLock", e);
            }
        }
    }
}
