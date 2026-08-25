import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.dispensinadigitale.app',
  appName: 'Dispensina Digitale',
  webDir: 'www',
  plugins: {
    SplashScreen: {
      launchShowDuration: 800,
      launchAutoHide: false,
      backgroundColor: '#4caf50',
      androidSplashResourceName: 'splash',
      showSpinner: false,
    },
  },
};

export default config;
