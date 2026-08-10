package io.timenest.app;

import android.app.Activity;
import android.media.AudioAttributes;
import android.media.Ringtone;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.Gravity;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;

public class FullScreenAlarmActivity extends Activity {

    private Ringtone ringtone;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Required flags to show over lock screen and wake up screen
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true);
            setTurnScreenOn(true);
        } else {
            getWindow().addFlags(WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED |
                    WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON |
                    WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON |
                    WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD);
        }

        String title = getIntent().getStringExtra("title");
        String message = getIntent().getStringExtra("message");

        // Simple Programmatic UI
        LinearLayout layout = new LinearLayout(this);
        layout.setOrientation(LinearLayout.VERTICAL);
        layout.setGravity(Gravity.CENTER);
        layout.setBackgroundColor(0xFF0A0A0A); // Dark bg
        layout.setPadding(64, 64, 64, 64);

        TextView titleView = new TextView(this);
        titleView.setText(title != null ? title : "TimeNest");
        titleView.setTextSize(32);
        titleView.setTextColor(0xFF787CE1); // Brand color
        titleView.setGravity(Gravity.CENTER);
        
        TextView messageView = new TextView(this);
        messageView.setText(message != null ? message : "Tarefa em 5 minutos!");
        messageView.setTextSize(20);
        messageView.setTextColor(0xFFFFFFFF);
        messageView.setGravity(Gravity.CENTER);
        messageView.setPadding(0, 32, 0, 64);

        Button dismissButton = new Button(this);
        dismissButton.setText("DISMISS / OK");
        dismissButton.setBackgroundColor(0xFF787CE1);
        dismissButton.setTextColor(0xFFFFFFFF);
        dismissButton.setOnClickListener(v -> finish());

        layout.addView(titleView);
        layout.addView(messageView);
        layout.addView(dismissButton);

        setContentView(layout);

        // Play alarm sound
        Uri alarmUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM);
        if (alarmUri == null) {
            alarmUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
        }
        ringtone = RingtoneManager.getRingtone(getApplicationContext(), alarmUri);
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            ringtone.setAudioAttributes(new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_ALARM).build());
        }
        ringtone.play();
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        if (ringtone != null && ringtone.isPlaying()) {
            ringtone.stop();
        }
    }
}
