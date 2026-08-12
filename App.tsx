import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ActivityIndicator, View } from 'react-native';
import RootNavigator from './src/navigation/RootNavigator';
import { initApiClient } from './src/api/client';
import { setupPushNotifications } from './src/services/NotificationService';

export default function App() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    initApiClient()
      // Push notification setup runs after the API client is ready (it
      // needs apiClient's baseURL configured to register the device token
      // with the correct backend), but a permission dialog or a slow
      // network call here should never block the app from loading — so
      // its own failures are caught and logged rather than propagated.
      .then(() => setupPushNotifications().catch((err) => console.warn('Push notification setup failed:', err)))
      .finally(() => setReady(true));
  }, []);

  if (!ready) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}