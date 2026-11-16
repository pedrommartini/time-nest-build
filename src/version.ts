export const APP_VERSION = '3.1.2';
export const APP_BUILD_NUMBER = 14;
export const VERSION_CHECK_URL = 'https://pedrommartini.github.io/time-nest-build/version.json';
export const DEFAULT_APK_DOWNLOAD_URL = 'https://github.com/pedrommartini/time-nest-build/releases/download/v3.1.2/timenest_v3.1.2.apk';

export interface VersionInfo {
  version: string;
  buildNumber?: number;
  releaseDate?: string;
  title?: string;
  notes?: string[];
  apkUrl?: string;
  forceUpdate?: boolean;
}
