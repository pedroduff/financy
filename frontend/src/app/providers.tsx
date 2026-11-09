import {
  MutationCache,
  QueryCache,
  QueryClient,
  QueryClientProvider,
  useQuery,
} from '@tanstack/react-query';
import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useState,
} from 'react';
import { ApiError, graphql } from '../lib/graphql';
import type { User } from '../lib/models';

function handleAuthError(error: Error) {
  if (error instanceof ApiError && error.code === 'UNAUTHENTICATED') {
    queryClient.removeQueries({
      predicate: (query) => query.queryKey.at(0) !== 'me',
    });
    queryClient.setQueryData(['me'], null);
  }
}

export const queryClient = new QueryClient({
  queryCache: new QueryCache({ onError: handleAuthError }),
  mutationCache: new MutationCache({ onError: handleAuthError }),
  defaultOptions: {
    queries: { retry: false, staleTime: 30_000, refetchOnWindowFocus: true },
    mutations: { retry: false },
  },
});

const FeedbackContext = createContext<((message: string) => void) | null>(null);

export function Providers({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState('');
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(''), 5000);
    return () => clearTimeout(timer);
  }, [message]);
  return (
    <QueryClientProvider client={queryClient}>
      <FeedbackContext value={setMessage}>
        {children}
        <div className="toast-region" aria-live="polite" aria-atomic="true">
          {message && (
            <div className="toast">
              {message}
              <button
                type="button"
                onClick={() => setMessage('')}
                aria-label="Fechar mensagem"
              >
                ×
              </button>
            </div>
          )}
        </div>
      </FeedbackContext>
    </QueryClientProvider>
  );
}

export function useFeedback() {
  const notify = useContext(FeedbackContext);
  if (!notify) throw new Error('Feedback provider ausente.');
  return notify;
}

export function useCurrentUser() {
  return useQuery({
    queryKey: ['me'],
    queryFn: async ({ signal }) =>
      (
        await graphql<{ me: User | null }>(
          '{me{id name email avatarUrl avatarVersion}}',
          {},
          signal,
        )
      ).me,
  });
}

export async function clearSession() {
  await queryClient.cancelQueries();
  queryClient.clear();
  queryClient.setQueryData(['me'], null);
}

export async function refreshFinances() {
  await queryClient.invalidateQueries({
    predicate: (query) => query.queryKey.at(0) !== 'me',
  });
}
