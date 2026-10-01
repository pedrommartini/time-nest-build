// TimeNest Cloud Database Engine
// Persistent cloud storage for TimeNest users and their native tasks

import type { Task } from './time';

const MASTER_REGISTRY_ID = 'ff808181a09d98f701a0f575bda5529e';
const BASE_URL = 'https://api.restful-api.dev/objects';

export interface UserCloudRecord {
  email: string;
  updatedAt: string;
  tasks: Task[];
  projects?: any[];
  routines?: any[];
}

/**
 * Normalizes email to standard lowercase key
 */
export function normalizeUserEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Retrieves the master registry of TimeNest users from the cloud
 */
export async function fetchMasterRegistry(): Promise<Record<string, { objectId: string; updatedAt: string }>> {
  try {
    const res = await fetch(`${BASE_URL}/${MASTER_REGISTRY_ID}`);
    if (!res.ok) {
      console.warn('Could not fetch master registry:', res.status);
      return {};
    }
    const json = await res.json();
    return json.data?.users || {};
  } catch (err) {
    console.error('Error fetching master registry:', err);
    return {};
  }
}

/**
 * Updates the master registry with new or updated user references
 */
export async function updateMasterRegistry(users: Record<string, { objectId: string; updatedAt: string }>): Promise<void> {
  try {
    await fetch(`${BASE_URL}/${MASTER_REGISTRY_ID}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'timenest_master_users_registry_v1',
        data: { users }
      })
    });
  } catch (err) {
    console.error('Error updating master registry:', err);
  }
}

/**
 * Loads user tasks from TimeNest's cloud database for a given Google email
 */
export async function loadUserTasksFromCloud(email: string): Promise<{ objectId: string | null; tasks: Task[] }> {
  if (!email) return { objectId: null, tasks: [] };
  const cleanEmail = normalizeUserEmail(email);

  try {
    // 1. Check local cache for known objectId
    let objectId = localStorage.getItem(`timenest_cloud_obj_${cleanEmail}`);

    if (objectId) {
      const directRes = await fetch(`${BASE_URL}/${objectId}`);
      if (directRes.ok) {
        const doc = await directRes.json();
        if (doc.data?.tasks) {
          return { objectId, tasks: doc.data.tasks };
        }
      }
    }

    // 2. Fallback: Query Master Registry in cloud
    const users = await fetchMasterRegistry();
    const userEntry = users[cleanEmail];
    if (userEntry?.objectId) {
      objectId = userEntry.objectId;
      localStorage.setItem(`timenest_cloud_obj_${cleanEmail}`, objectId);

      const userRes = await fetch(`${BASE_URL}/${objectId}`);
      if (userRes.ok) {
        const userDoc = await userRes.json();
        return { objectId, tasks: userDoc.data?.tasks || [] };
      }
    }

    return { objectId: null, tasks: [] };
  } catch (err) {
    console.error('Failed to load user tasks from TimeNest cloud:', err);
    return { objectId: null, tasks: [] };
  }
}

let saveTimeout: any = null;

/**
 * Silently and automatically persists user tasks to TimeNest's cloud database
 */
export async function saveUserTasksToCloud(email: string, tasks: Task[]): Promise<string | null> {
  if (!email) return null;
  const cleanEmail = normalizeUserEmail(email);

  return new Promise((resolve) => {
    if (saveTimeout) clearTimeout(saveTimeout);

    // Debounce to batch rapid task updates (e.g. typing or fast clicks)
    saveTimeout = setTimeout(async () => {
      try {
        let objectId = localStorage.getItem(`timenest_cloud_obj_${cleanEmail}`);

        // If not cached, check master registry
        if (!objectId) {
          const users = await fetchMasterRegistry();
          if (users[cleanEmail]?.objectId) {
            objectId = users[cleanEmail].objectId;
          }
        }

        const payload: UserCloudRecord = {
          email: cleanEmail,
          updatedAt: new Date().toISOString(),
          tasks
        };

        if (objectId) {
          // Update existing cloud user document
          const putRes = await fetch(`${BASE_URL}/${objectId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: `timenest_user_${cleanEmail}`,
              data: payload
            })
          });

          if (putRes.ok) {
            localStorage.setItem(`timenest_cloud_obj_${cleanEmail}`, objectId);
            localStorage.setItem('timenest_last_cloud_sync', payload.updatedAt);
            resolve(objectId);
            return;
          }
        }

        // If objectId doesn't exist or was invalid, create a new document in the cloud database
        const createRes = await fetch(BASE_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: `timenest_user_${cleanEmail}`,
            data: payload
          })
        });

        if (createRes.ok) {
          const created = await createRes.json();
          const newObjectId = created.id;
          localStorage.setItem(`timenest_cloud_obj_${cleanEmail}`, newObjectId);
          localStorage.setItem('timenest_last_cloud_sync', payload.updatedAt);

          // Register user in Master Registry
          const users = await fetchMasterRegistry();
          users[cleanEmail] = { objectId: newObjectId, updatedAt: payload.updatedAt };
          await updateMasterRegistry(users);

          resolve(newObjectId);
          return;
        }

        resolve(null);
      } catch (err) {
        console.error('Failed to save tasks to TimeNest cloud database:', err);
        resolve(null);
      }
    }, 400);
  });
}
