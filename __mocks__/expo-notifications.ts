// Manual Jest mock for expo-notifications.
//
// The real module's index.ts has a side effect at import time (DevicePushTokenAutoRegistration.fx)
// that warns about remote push token registration being unavailable under Expo Go/Jest — noisy
// and irrelevant here since this app only schedules local notifications, never registers for
// remote push. Mocking the module avoids that warning and any native-module lookups under Jest.
export function setNotificationHandler(): void {}

export async function requestPermissionsAsync(): Promise<{ status: string }> {
  return { status: "granted" };
}

export async function scheduleNotificationAsync(): Promise<string> {
  return "mock-notification-id";
}
