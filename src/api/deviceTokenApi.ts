import { apiClient } from './client';

export interface RegisterDeviceTokenRequest {
  token: string;
}

export const deviceTokenApi = {
  register: async (token: string): Promise<void> => {
    await apiClient.post('/device-tokens', { token } satisfies RegisterDeviceTokenRequest);
  },
};