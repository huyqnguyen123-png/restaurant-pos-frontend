import { apiClient } from './client';
import { MenuItem } from '../types/menu';

export const menuApi = {
  getAll: async (): Promise<MenuItem[]> => {
    const response = await apiClient.get<MenuItem[]>('/menu-items');
    return response.data;
  },

  create: async (name: string, price: number): Promise<MenuItem> => {
    const response = await apiClient.post<MenuItem>('/menu-items', { name, price });
    return response.data;
  },

  update: async (id: number, name: string, price: number): Promise<MenuItem> => {
    const response = await apiClient.put<MenuItem>(`/menu-items/${id}`, { name, price });
    return response.data;
  },

  remove: async (id: number): Promise<void> => {
    await apiClient.delete(`/menu-items/${id}`);
  },

  search: async (keyword: string): Promise<MenuItem[]> => {
    const response = await apiClient.get<MenuItem[]>('/menu-items', { params: { search: keyword } });
    return response.data;
  },
};