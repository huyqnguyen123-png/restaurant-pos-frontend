import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'backend_host';

// Now defaults to the Railway production backend, so a fresh app install
// works out of the box without anyone needing to open Settings first.
const DEFAULT_HOST = 'restaurant-pos-backend-production-ba85.up.railway.app';

export async function getStoredBackendHost(): Promise<string> {
  try {
    const saved = await AsyncStorage.getItem(STORAGE_KEY);
    return saved || DEFAULT_HOST;
  } catch {
    return DEFAULT_HOST;
  }
}

export async function saveBackendHost(host: string): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, host);
}

// If the user already typed a full URL (e.g. "http://192.168.0.6:8080" for
// local testing), use it as-is. Otherwise assume it's a bare domain and use
// HTTPS - this matches Railway's domain format, which has no explicit scheme
// or port.
export function buildBaseUrl(host: string): string {
  if (host.startsWith('http://') || host.startsWith('https://')) {
    return `${host}/api`;
  }
  return `https://${host}/api`;
}