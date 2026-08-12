import type { ReactNode } from 'react';

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <section className="ui-empty">
      <h2 className="ui-section-title">{title}</h2>
      <p className="ui-muted">{description}</p>
      {action}
    </section>
  );
}
