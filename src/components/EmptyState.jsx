export default function EmptyState({ onRetry }) {
  return (
    <div className="empty-card">
      <h2 className="empty-title">No data available</h2>
      <p className="empty-text">
        We couldn’t get valid points from the live feed. This sometimes happens when the upstream
        hour files are missing or corrupted. New data typically lands at the top of each hour.
      </p>
      <button onClick={onRetry} className="empty-btn">
        Try Refresh
      </button>
    </div>
  );
}
