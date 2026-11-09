import { Button } from './button';

export function ErrorMessage({ error }: { error: Error | null | undefined }) {
  return error ? (
    <div className="error-message" role="alert">
      {error.message}
    </div>
  ) : null;
}

export function Loading({ label = 'Carregando…' }: { label?: string }) {
  return (
    <div className="loading" role="status">
      <span className="spinner" />
      {label}
    </div>
  );
}

export function ErrorState({
  error,
  retry,
}: {
  error: Error;
  retry: () => void;
}) {
  return (
    <div className="empty-state">
      <ErrorMessage error={error} />
      <Button variant="outline" onClick={retry}>
        Tentar novamente
      </Button>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="empty-state">
      <h3>{title}</h3>
      <p>{description}</p>
      {children}
    </div>
  );
}
