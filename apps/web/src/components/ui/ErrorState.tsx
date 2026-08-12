import { Button } from './Button';

export function ErrorState({
  message = 'Data tidak dapat dimuat.',
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <section className="ui-error-state">
      <h2 className="ui-section-title">Terjadi kesalahan</h2>
      <p className="ui-muted">{message}</p>
      {onRetry ? (
        <Button variant="secondary" onClick={onRetry}>
          Coba Lagi
        </Button>
      ) : null}
    </section>
  );
}
