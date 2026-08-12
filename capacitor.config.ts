import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'io.timenest.app',
  appName: 'Time Nest',
  webDir: 'dist',
  plugins: {
    GoogleAuth: {
      scopes: [
        'profile', 
        'email', 
        'openid', 
        'https://www.googleapis.com/auth/calendar.events', 
        'https://www.googleapis.com/auth/tasks'
      ],
      serverClientId: '898129156349-qm7fannl6mbgfrhim2ujatddh6tb21sk.apps.googleusercontent.com',
      forceCodeForRefreshToken: true,
    },
  },
};

export default config;
