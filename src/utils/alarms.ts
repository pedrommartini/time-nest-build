import { registerPlugin } from '@capacitor/core';

export interface NativeAlarmPlugin {
  scheduleAlarm(options: { title: string; message: string; timestamp: number; id?: number; intentType?: string }): Promise<{ success: boolean; id: number }>;
  cancelAlarm(options: { id: number }): Promise<{ success: boolean }>;
  requestPermissions(): Promise<{ success: boolean; exactAlarmRequested?: boolean }>;
}

const NativeAlarm = registerPlugin<NativeAlarmPlugin>('NativeAlarm');

export const scheduleEventAlarm = async (taskId: string, title: string, scheduledDate: Date, message: string, intentType: string = 'pre-event') => {
  try {
    const timestamp = scheduledDate.getTime();
    if (timestamp <= Date.now()) return; // Past

    // Always request exact alarm & notification permissions before scheduling
    try {
      await NativeAlarm.requestPermissions();
    } catch (e) {
      console.warn('NativeAlarm.requestPermissions not available or failed', e);
    }

    const id = Math.abs(hashCode(taskId));
    await NativeAlarm.scheduleAlarm({
      title: title,
      message,
      timestamp,
      id,
      intentType
    });
    console.log(`Scheduled lock-screen alarm for ${title} at ${scheduledDate}`);
  } catch (error) {
    console.error('Failed to schedule NativeAlarm', error);
  }
};

export const cancelEventAlarm = async (taskId: string) => {
  try {
    const id = Math.abs(hashCode(taskId));
    await NativeAlarm.cancelAlarm({ id });
  } catch (error) {
    console.error('Failed to cancel NativeAlarm', error);
  }
};

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0, len = str.length; i < len; i++) {
      let chr = str.charCodeAt(i);
      hash = (hash << 5) - hash + chr;
      hash |= 0;
  }
  return hash;
}
