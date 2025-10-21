// /src/components/EmptyState.jsx
export default function EmptyState({ onRetry }) {
  return (
    <div className="mx-auto my-16 max-w-xl rounded-2xl bg-white shadow p-6 text-center">
      <h2 className="text-lg font-semibold">No data available</h2>
      <p className="mt-2 text-slate-600">
        We couldn’t get valid points from the live feed. This sometimes happens when the upstream
        hour files are missing or corrupted. New data typically lands at the top of each hour.
      </p>
      <button
        onClick={onRetry}
        className="mt-4 rounded-lg bg-blue-600 text-white px-3 py-1.5 hover:bg-blue-700"
      >
        Try Refresh
      </button>
    </div>
  );
}
