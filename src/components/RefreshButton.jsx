// /src/components/RefreshButton.jsx
import React from "react";
import "../index.css";

export default function RefreshButton({
  onRefresh,
  refreshing = false,
  isStale = false,   // true once the next hour begins
  canRefresh = false // true only once per current-hour window
}) {
  let buttonLabel = "Data is up-to-date";
  if (refreshing) buttonLabel = "Refreshing…";
  else if (isStale && canRefresh) buttonLabel = "Refresh (New hour)";
  else if (isStale && !canRefresh) buttonLabel = "Already refreshed this hour";
  else buttonLabel = "Refresh available next hour";

  const disabled = refreshing || !canRefresh;

  return (
    <button
      className="refresh-btn"
      onClick={onRefresh}
      disabled={disabled}
      title={
        refreshing
          ? "Fetching the newest hour…"
          : isStale
          ? canRefresh
            ? "Fetch the latest hourly data"
            : "You've already refreshed this hour"
          : "New data publishes hourly; try after the next hour begins"
      }
    >
      {buttonLabel}
    </button>
  );
}
