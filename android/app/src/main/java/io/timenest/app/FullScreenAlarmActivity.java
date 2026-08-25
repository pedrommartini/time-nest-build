package io.timenest.app;

import android.app.Activity;
import android.app.KeyguardManager;
import android.content.Context;
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

public class FullScreenAlarmActivity extends Activity {

    private Ringtone ringtone;
    private PowerManager.WakeLock wakeLock;

    private int dpToPx(int dp) {
        float density = getResources().getDisplayMetrics().density;
        return Math.round(dp * density);
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
        if (intentType == null) intentType = "pre-event";

        if (title != null && title.startsWith("TimeNest: ")) {
            title = title.substring("TimeNest: ".length());
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
        String snooze2 = "+10 min";
        String snooze3 = "+15 min";
        String dismissText = "Dispensar";

        switch (intentType) {
            case "sleep":
            case "pre-event":
                haloColor = 0x227C3AED;
                badgeText = "EM 15 MIN";
                timeColor = 0xFF7C3AED;
                okText = "Vou me preparar agora";
                primaryBtnBgColor = 0xFF432C81;
                break;
            case "task":
            case "task-now":
                haloColor = 0x227C3AED;
                badgeText = "AGORA";
                timeColor = 0xFF7C3AED;
                okText = "Começar foco agora";
                primaryBtnBgColor = 0xFF432C81;
                break;
            case "medication":
            case "critical":
                haloColor = 0x22DC2626; // red/orange halo
                badgeText = "URGENTE";
                badgeTextColor = 0xFFDC2626;
                timeColor = 0xFFDC2626;
                okText = "Estou saindo agora";
                primaryBtnBgColor = 0xFFDC2626;
                dismissText = "Não posso ir";
                break;
            case "test":
                haloColor = 0x227C3AED;
                badgeText = "TESTE";
                timeColor = 0xFF7C3AED;
                okText = "Ok, entendi";
                primaryBtnBgColor = 0xFF432C81;
                break;
            case "snooze": // Represents the "Precisa de mais tempo?" screen
                titleColor = 0xFF191439;
                title = "Precisa de\nmais tempo?";
                message = "Evento • 19:30"; // Example
                timeColor = 0xFF7C3AED;
                badgeText = "ADIAR";
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
        centerParams.bottomMargin = dpToPx(80); // shift up a bit to make room for buttons
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
        badgeBg.setStroke(dpToPx(1), 0x22000000); // subtle border
        badgeBg.setColor(Color.WHITE);
        badge.setBackground(badgeBg);
        LinearLayout.LayoutParams badgeParams = new LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.WRAP_CONTENT,
            ViewGroup.LayoutParams.WRAP_CONTENT
        );
        badgeParams.bottomMargin = dpToPx(24);
        badge.setLayoutParams(badgeParams);
        centerContent.addView(badge);

        // Title (Huge, bold, dark)
        TextView titleView = new TextView(this);
        titleView.setText(title != null ? title : "Alarme");
        titleView.setTextSize(52f);
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

        // Time / duration label (Large, colored)
        TextView timeView = new TextView(this);
        timeView.setText("19:30"); // Replace with dynamic time if available, or just generic for now
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
        msgView.setText("✓ " + (message != null ? message : "Tarefa"));
        msgView.setTextSize(14f);
        msgView.setTextColor(0xFF6B7280); // gray
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

        if ("snooze".equals(intentType)) {
            // Snooze screen has multiple snooze options
            String[] options = {snooze1, snooze2, snooze3, "Quando eu terminar a tarefa atual"};
            for (String opt : options) {
                Button btn = new Button(this);
                btn.setText(opt);
                btn.setTextSize(16f);
                btn.setTextColor(primaryBtnBgColor);
                btn.setTypeface(null, Typeface.BOLD);
                btn.setAllCaps(false);
                GradientDrawable bg = new GradientDrawable();
                bg.setCornerRadius(dpToPx(100));
                bg.setStroke(dpToPx(1), 0x22000000);
                bg.setColor(Color.WHITE);
                btn.setBackground(bg);
                LinearLayout.LayoutParams btnParams = new LinearLayout.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT,
                    dpToPx(56)
                );
                btnParams.bottomMargin = dpToPx(12);
                btn.setLayoutParams(btnParams);
                btn.setOnClickListener(v -> finish());
                bottomLayout.addView(btn);
            }
            
            // "Voltar" text button
            Button backBtn = new Button(this);
            backBtn.setText("Voltar");
            backBtn.setTextSize(14f);
            backBtn.setTextColor(titleColor);
            backBtn.setAllCaps(false);
            backBtn.setBackground(null);
            bottomLayout.addView(backBtn);
            backBtn.setOnClickListener(v -> finish());
        } else {
            // Normal alarm screen
            // Primary button
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
            okBtn.setOnClickListener(v -> finish());
            bottomLayout.addView(okBtn);

            // Snooze button
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
            snoozeBtn.setOnClickListener(v -> finish());
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
            dismissBtn.setOnClickListener(v -> finish());
            bottomLayout.addView(dismissBtn);
        }

        root.addView(bottomLayout);
        setContentView(root);

        // Play alarm ringtone
        Uri alarmUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM);
        if (alarmUri == null) {
            alarmUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
        }
        ringtone = RingtoneManager.getRingtone(getApplicationContext(), alarmUri);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            ringtone.setAudioAttributes(new AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_ALARM)
                .build());
        }
        ringtone.play();

        // Vibrate
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            VibratorManager vm = (VibratorManager) getSystemService(VIBRATOR_MANAGER_SERVICE);
            if (vm != null) {
                long[] pattern = {0, 500, 200, 500, 200, 500};
                VibrationEffect effect = VibrationEffect.createWaveform(pattern, -1); // not repeating for now, could put 0 to repeat
                vm.getDefaultVibrator().vibrate(effect);
            }
        } else {
            Vibrator vib = (Vibrator) getSystemService(VIBRATOR_SERVICE);
            if (vib != null) {
                long[] pattern = {0, 500, 200, 500, 200, 500};
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    vib.vibrate(VibrationEffect.createWaveform(pattern, -1));
                } else {
                    vib.vibrate(pattern, -1);
                }
            }
        }
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        if (ringtone != null && ringtone.isPlaying()) {
            ringtone.stop();
        }
        if (wakeLock != null && wakeLock.isHeld()) {
            wakeLock.release();
        }
    }
}
