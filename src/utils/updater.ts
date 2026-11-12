import { Capacitor } from '@capacitor/core';
import { APP_VERSION, DEFAULT_APK_DOWNLOAD_URL, VERSION_CHECK_URL, type VersionInfo } from '../version';

/**
 * Compares two semantic version strings (e.g. "3.2.0" vs "3.1.0").
 * Returns true if remote is strictly newer than current.
 */
export function isNewerVersion(remote: string, current: string): boolean {
  if (!remote || !current) return false;
  if (remote === current) return false;

  const remoteParts = remote.split('.').map(p => parseInt(p, 10) || 0);
  const currentParts = current.split('.').map(p => parseInt(p, 10) || 0);

  const len = Math.max(remoteParts.length, currentParts.length);
  for (let i = 0; i < len; i++) {
    const r = remoteParts[i] ?? 0;
    const c = currentParts[i] ?? 0;
    if (r > c) return true;
    if (r < c) return false;
  }
  return false;
}

export interface CheckUpdateResult {
  hasUpdate: boolean;
  currentVersion: string;
  latestVersion?: string;
  versionInfo?: VersionInfo;
  error?: string;
}

/**
 * Checks the remote server for available updates.
 */
export async function checkForUpdate(): Promise<CheckUpdateResult> {
  try {
    const res = await fetch(`${VERSION_CHECK_URL}?t=${Date.now()}`, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });

    if (!res.ok) {
      throw new Error(`Servidor respondeu com status ${res.status}`);
    }

    const data: VersionInfo = await res.json();
    if (!data || !data.version) {
      return { hasUpdate: false, currentVersion: APP_VERSION };
    }

    const hasUpdate = isNewerVersion(data.version, APP_VERSION);
    return {
      hasUpdate,
      currentVersion: APP_VERSION,
      latestVersion: data.version,
      versionInfo: data
    };
  } catch (err: any) {
    return {
      hasUpdate: false,
      currentVersion: APP_VERSION,
      error: err?.message || 'Falha ao verificar atualização'
    };
  }
}

/**
 * Performs a 1-click update.
 * - On Web/PWA: clears cache, unregisters service workers, and reloads immediately with fresh code.
 * - On Android Capacitor: opens the direct APK download / installer URL.
 */
export async function applyOneClickUpdate(versionInfo?: VersionInfo): Promise<void> {
  const isNative = Capacitor.isNativePlatform();

  if (!isNative) {
    // 1-Click Update for Web / PWA:
    try {
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map(k => caches.delete(k)));
      }
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map(r => r.unregister()));
      }
    } catch {
      // Ignore cache clearing errors and force reload anyway
    }

    // Force hard reload with timestamp to bust browser HTTP cache
    const targetUrl = new URL(window.location.href);
    targetUrl.searchParams.set('v_updated', Date.now().toString());
    window.location.replace(targetUrl.toString());
    return;
  }

  // 1-Click Update for Android / Native:
  const downloadUrl = versionInfo?.apkUrl || DEFAULT_APK_DOWNLOAD_URL;
  window.open(downloadUrl, '_system');
}
