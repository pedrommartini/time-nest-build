// Google Tasks API & Metadata Serialization Utilities for TimeNest

import type { Task } from './time';

export interface TaskMetadata {
  duration?: number;
  size?: 'Pequena' | 'Média' | 'Grande';
  priority?: 'Alta' | 'Média' | 'Baixa';
  category?: string;
  alarmEnabled?: boolean;
  notificationOffset?: number;
  recurrenceRule?: 'NONE' | 'DAILY' | 'WEEKLY' | 'MONTHLY';
  projectId?: string;
}

const META_PREFIX = '[timenest-meta:';
const META_SUFFIX = ']';

/**
 * Serializes user description and TimeNest task metadata into Google Tasks notes format
 */
export function serializeTaskNotes(description?: string, meta?: TaskMetadata): string {
  const cleanDesc = (description || '').trim();
  if (!meta || Object.keys(meta).length === 0) {
    return cleanDesc;
  }

  // Filter out undefined keys to keep payload minimal
  const compactMeta: Record<string, any> = {};
  for (const [key, value] of Object.entries(meta)) {
    if (value !== undefined && value !== null) {
      compactMeta[key] = value;
    }
  }

  if (Object.keys(compactMeta).length === 0) {
    return cleanDesc;
  }

  const metaString = `${META_PREFIX}${JSON.stringify(compactMeta)}${META_SUFFIX}`;
  if (!cleanDesc) {
    return metaString;
  }
  return `${cleanDesc}\n\n${metaString}`;
}

/**
 * Deserializes Google Tasks notes into user description and TimeNest task metadata
 */
export function deserializeTaskNotes(notes?: string): { description: string; meta: TaskMetadata } {
  if (!notes || typeof notes !== 'string') {
    return { description: '', meta: {} };
  }

  const regex = /\[timenest-meta:(\{.*?\})\]/s;
  const match = notes.match(regex);

  if (!match) {
    return { description: notes.trim(), meta: {} };
  }

  try {
    const meta = JSON.parse(match[1]) as TaskMetadata;
    const description = notes.replace(match[0], '').trim();
    return { description, meta };
  } catch (e) {
    return { description: notes.trim(), meta: {} };
  }
}

/**
 * Converts a TimeNest Task into Google Tasks REST API payload
 */
export function taskToGoogleTaskPayload(task: Task) {
  const meta: TaskMetadata = {
    duration: task.estimatedDuration,
    size: task.size,
    priority: task.priority,
    category: task.category,
    alarmEnabled: task.alarmEnabled,
    notificationOffset: task.notificationOffset,
    recurrenceRule: task.recurrenceRule,
    projectId: task.projectId
  };

  return {
    title: task.title,
    status: task.status === 'completed' ? 'completed' : 'needsAction',
    notes: serializeTaskNotes(task.description, meta)
  };
}

/**
 * Converts a Google Tasks REST API item into a TimeNest Task
 */
export function googleTaskItemToTimeNestTask(item: any, existingTask?: Task): Task {
  const { description, meta } = deserializeTaskNotes(item.notes);

  const duration = meta.duration ?? existingTask?.estimatedDuration ?? 30;
  let size: 'Pequena' | 'Média' | 'Grande' = meta.size ?? existingTask?.size ?? 'Média';
  if (!meta.size && !existingTask) {
    if (duration <= 15) size = 'Pequena';
    else if (duration >= 60) size = 'Grande';
  }

  return {
    id: `google-${item.id}`,
    title: item.title || existingTask?.title || 'Sem título',
    description: description || existingTask?.description || undefined,
    estimatedDuration: duration,
    size,
    priority: meta.priority ?? existingTask?.priority ?? 'Média',
    status: item.status === 'completed' ? 'completed' : 'pending',
    category: meta.category ?? existingTask?.category ?? 'Google Tasks',
    createdAt: item.updated || item.created || existingTask?.createdAt || new Date().toISOString(),
    source: 'google',
    alarmEnabled: meta.alarmEnabled ?? existingTask?.alarmEnabled ?? false,
    notificationOffset: meta.notificationOffset ?? existingTask?.notificationOffset,
    recurrenceRule: meta.recurrenceRule ?? existingTask?.recurrenceRule,
    projectId: meta.projectId ?? existingTask?.projectId
  };
}
