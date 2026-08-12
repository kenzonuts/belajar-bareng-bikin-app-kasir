export function LoadingBlock({ label }: { label: string }) {
  return (
    <p className="loading-block" aria-live="polite">
      {label}
    </p>
  );
}
