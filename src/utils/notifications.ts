import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';

export const isNotificationSupported = (): boolean => {
  return typeof window !== 'undefined' && ('Notification' in window || Capacitor.isNativePlatform());
};

export const getNotificationPermissionStatus = (): 'granted' | 'denied' | 'default' | 'unsupported' => {
  if (typeof window !== 'undefined' && 'Notification' in window) {
    return Notification.permission;
  }
  return 'unsupported';
};

export const requestNotificationPermissions = async (): Promise<boolean> => {
  try {
    if (Capacitor.isNativePlatform()) {
      const permStatus = await LocalNotifications.requestPermissions();
      return permStatus.display === 'granted';
    } else if (typeof window !== 'undefined' && 'Notification' in window) {
      const perm = await Notification.requestPermission();
      return perm === 'granted';
    }
  } catch (e) {
    console.warn('Safe catch in requestNotificationPermissions:', e);
  }
  return false;
};

export const showWebNotification = (
  title: string, 
  options?: NotificationOptions & { onClick?: () => void }
): Notification | null => {
  try {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      const notif = new Notification(title, {
        icon: '/timenest.ico',
        badge: '/timenest.ico',
        ...options,
      });
      notif.onclick = () => {
        window.focus();
        if (options?.onClick) options.onClick();
        notif.close();
      };
      return notif;
    }
  } catch (e) {
    console.warn('Failed to dispatch web notification', e);
  }
  return null;
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
