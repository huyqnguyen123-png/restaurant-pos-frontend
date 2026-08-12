import {
  getMessaging,
  requestPermission,
  getToken,
  onTokenRefresh,
  AuthorizationStatus,
} from '@react-native-firebase/messaging';
import { PermissionsAndroid, Platform } from 'react-native';
import { deviceTokenApi } from '../api/deviceTokenApi';

// Requests notification permission (required on Android 13+), retrieves
// the device's unique FCM token, and registers it with the backend — so
// the backend knows exactly which device to push a notification to when a
// new order or reservation arrives from the website.
export async function setupPushNotifications(): Promise<void> {
  if (Platform.OS === 'android' && Platform.Version >= 33) {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
    );
    if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
      console.warn('Notification permission denied');
      return;
    }
  }

  const messaging = getMessaging();

  const authStatus = await requestPermission(messaging);
  const enabled =
    authStatus === AuthorizationStatus.AUTHORIZED ||
    authStatus === AuthorizationStatus.PROVISIONAL;

  if (!enabled) {
    console.warn('Firebase messaging permission not granted');
    return;
  }

  try {
    const token = await getToken(messaging);
    await deviceTokenApi.register(token);
  } catch (err) {
    console.warn('Failed to register device token:', err);
  }

  // Firebase occasionally rotates the token — re-register whenever that
  // happens so the backend always has the current, valid one.
  onTokenRefresh(messaging, async (newToken: string) => {
    try {
      await deviceTokenApi.register(newToken);
    } catch (err) {
      console.warn('Failed to register refreshed device token:', err);
    }
  });
}