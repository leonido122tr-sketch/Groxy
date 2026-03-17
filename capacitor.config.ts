/// <reference types="@capacitor/push-notifications" />
import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.groxy.app',
  appName: 'Groxy',
  webDir: 'out',
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
}

export default config
