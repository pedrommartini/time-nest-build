export const APP_VERSION = '3.1.1';
export const APP_BUILD_NUMBER = 12;
export const VERSION_CHECK_URL = 'https://time-nest-two.vercel.app/version.json';
export const DEFAULT_APK_DOWNLOAD_URL = 'https://time-nest-two.vercel.app/timenest.apk';

export interface VersionInfo {
  version: string;
  buildNumber?: number;
  releaseDate?: string;
  title?: string;
  notes?: string[];
  apkUrl?: string;
  forceUpdate?: boolean;
}
