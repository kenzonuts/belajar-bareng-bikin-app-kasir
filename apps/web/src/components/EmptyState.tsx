export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
}: {
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <section className="empty-state">
      <h2>{title}</h2>
      <p>{description}</p>
      <button type="button" className="auth-button" onClick={onAction}>
        {actionLabel}
      </button>
    </section>
  );
}
