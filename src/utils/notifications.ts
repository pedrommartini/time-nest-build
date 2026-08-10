import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';

export const requestNotificationPermissions = async () => {
  if (Capacitor.isNativePlatform()) {
    const permStatus = await LocalNotifications.requestPermissions();
    return permStatus.display === 'granted';
  }
  return false;
};

export const scheduleTaskNotification = async (taskId: string, title: string, scheduledDate: Date, message: string) => {
  if (!Capacitor.isNativePlatform()) return;

  try {
    const id = Math.abs(hashCode(taskId)); // LocalNotifications require an int32 ID
    await LocalNotifications.schedule({
      notifications: [
        {
          title: 'TimeNest Aviso',
          body: message || title,
          id: id,
          schedule: { at: scheduledDate },
          sound: undefined, // default sound
          actionTypeId: '',
          extra: null,
        },
      ],
    });
    console.log(`Scheduled notification for ${title} at ${scheduledDate}`);
  } catch (error) {
    console.error('Failed to schedule notification', error);
  }
};

export const cancelNotification = async (taskId: string) => {
  if (!Capacitor.isNativePlatform()) return;
  const id = Math.abs(hashCode(taskId));
  await LocalNotifications.cancel({ notifications: [{ id }] });
};

// Simple hash to convert string UUID to int32 for capacitor local notifications
function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0, len = str.length; i < len; i++) {
      let chr = str.charCodeAt(i);
      hash = (hash << 5) - hash + chr;
      hash |= 0; // Convert to 32bit integer
  }
  return hash;
}
