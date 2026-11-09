export class ApiError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
  }
}

const endpoint = import.meta.env.VITE_BACKEND_URL;

export async function graphql<T>(
  query: string,
  variables: Record<string, unknown> = {},
  signal?: AbortSignal,
) {
  if (!endpoint)
    throw new ApiError(
      'Configure a conexão com o servidor para continuar.',
      'CONFIGURATION_ERROR',
    );
  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', 'X-Financy-Request': '1' },
      body: JSON.stringify({ query, variables }),
      signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError')
      throw error;
    throw new ApiError(
      'Não foi possível conectar ao servidor. Tente novamente.',
      'NETWORK_ERROR',
    );
  }
  if (!response.ok)
    throw new ApiError(
      response.status === 429
        ? 'Muitas tentativas. Aguarde alguns minutos.'
        : 'Não foi possível concluir a solicitação. Tente novamente.',
      'HTTP_ERROR',
    );
  const result = (await response.json()) as {
    data?: T;
    errors?: { message: string; extensions?: { code?: string } }[];
  };
  const error = result.errors?.at(0);
  if (error)
    throw new ApiError(
      error.message,
      error.extensions?.code ?? 'INTERNAL_ERROR',
    );
  if (!result.data)
    throw new ApiError(
      'O servidor retornou uma resposta inválida.',
      'INTERNAL_ERROR',
    );
  return result.data;
}
