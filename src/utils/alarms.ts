import { registerPlugin } from '@capacitor/core';

export interface NativeAlarmPlugin {
  scheduleAlarm(options: { title: string; message: string; timestamp: number; id?: number }): Promise<{ success: boolean; id: number }>;
  cancelAlarm(options: { id: number }): Promise<{ success: boolean }>;
}

const NativeAlarm = registerPlugin<NativeAlarmPlugin>('NativeAlarm');

export const scheduleEventAlarm = async (taskId: string, title: string, scheduledDate: Date, message: string) => {
  try {
    const timestamp = scheduledDate.getTime();
    if (timestamp <= Date.now()) return; // Past

    const id = Math.abs(hashCode(taskId));
    await NativeAlarm.scheduleAlarm({
      title: 'TimeNest: ' + title,
      message,
      timestamp,
      id
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
