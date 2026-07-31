import { apiClient } from '../api/client';

// History password is now stored server-side (hashed) and shared across
// every device — no more per-device AsyncStorage copy.

export async function isHistoryPasswordSet(): Promise<boolean> {
  const response = await apiClient.get<{ isSet: boolean }>('/settings/history-password');
  return response.data.isSet;
}

export async function verifyHistoryPassword(password: string): Promise<boolean> {
  const response = await apiClient.post<{ valid: boolean }>('/settings/history-password/verify', {
    password,
  });
  return response.data.valid;
}

// oldPassword is null only for the very first time a password is being set.
export async function setHistoryPassword(oldPassword: string | null, newPassword: string): Promise<void> {
  await apiClient.put('/settings/history-password', { oldPassword, newPassword });
}

export async function removeHistoryPassword(password: string): Promise<void> {
  await apiClient.delete('/settings/history-password', { data: { password } });
}