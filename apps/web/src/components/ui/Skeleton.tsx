export function Skeleton({ height = 72 }: { height?: number }) {
  return <div className="ui-skeleton" style={{ height }} aria-hidden />;
}

export function ListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="ui-stack" aria-busy="true" aria-label="Memuat data">
      {Array.from({ length: count }).map((_, index) => (
        <Skeleton key={index} />
      ))}
    </div>
  );
}
