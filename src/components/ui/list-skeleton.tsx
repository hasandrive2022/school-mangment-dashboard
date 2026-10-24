/**
 * Loading placeholders (A8): lists and stat cards must show a skeleton
 * while data is in flight instead of misleading 0 / "কোনো রেকর্ড নেই".
 */
export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="r6-skeleton-list" aria-busy="true" aria-label="লোড হচ্ছে">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="r6-skeleton-row">
          <span className="r6-skeleton-block r6-skeleton-avatar" />
          <span className="r6-skeleton-block r6-skeleton-line wide" />
          <span className="r6-skeleton-block r6-skeleton-line" />
        </div>
      ))}
    </div>
  );
}

export function StatSkeleton() {
  return (
    <div className="card stat" aria-busy="true" aria-label="লোড হচ্ছে">
      <div>
        <div className="r6-skeleton-block r6-skeleton-value" />
        <div className="r6-skeleton-block r6-skeleton-line" />
      </div>
    </div>
  );
}
