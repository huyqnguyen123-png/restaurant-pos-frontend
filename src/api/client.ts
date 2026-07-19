import axios from 'axios';
import { getStoredBackendHost, buildBaseUrl } from '../utils/backendConfig';

export const apiClient = axios.create({
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Called once when the app starts, so every screen's first API call already
// uses whatever backend address was last saved in Settings.
export async function initApiClient(): Promise<void> {
  const host = await getStoredBackendHost();
  apiClient.defaults.baseURL = buildBaseUrl(host);
}

// Called immediately after the user saves a new address in Settings,
// so subsequent calls use it without needing to restart the app.
export function setApiClientHost(host: string): void {
  apiClient.defaults.baseURL = buildBaseUrl(host);
}