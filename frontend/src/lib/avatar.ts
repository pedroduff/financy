import { ApiError } from './graphql';
import type { User } from './models';

export function avatarEndpoint(path: string) {
  const endpoint = import.meta.env.VITE_BACKEND_URL;
  if (!endpoint)
    throw new ApiError(
      'Configure a conexão com o servidor para continuar.',
      'CONFIGURATION_ERROR',
    );
  return new URL(path, new URL(endpoint, window.location.origin)).href;
}

export async function uploadAvatar(file: File, expectedVersion: number) {
  const body = new FormData();
  body.append('expectedVersion', String(expectedVersion));
  body.append('file', file);
  let response: Response;
  try {
    response = await fetch(avatarEndpoint('/me/avatar'), {
      method: 'POST',
      credentials: 'include',
      headers: { 'X-Financy-Request': '1' },
      body,
    });
  } catch {
    throw new ApiError(
      'Não foi possível conectar ao servidor. Tente novamente.',
      'NETWORK_ERROR',
    );
  }
  if (!response.ok) {
    const result = (await response.json().catch(() => null)) as {
      code?: string;
      message?: string;
    } | null;
    throw new ApiError(
      result?.message ?? 'Não foi possível salvar a foto. Tente novamente.',
      result?.code ??
        (response.status === 401 ? 'UNAUTHENTICATED' : 'HTTP_ERROR'),
    );
  }
  return (await response.json()) as User;
}
