import { request } from './client';

export async function deleteAccount(): Promise<void> {
  await request<unknown>('/api/v1/auth/me', {
    method: 'DELETE',
  });
}
