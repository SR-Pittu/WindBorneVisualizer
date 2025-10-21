// /src/components/LoadingPage.jsx
import { useEffect, useState } from "react";

export default function LoadingPage({
  message = "Fetching live balloon data…",
  timeoutMs = 1200,
}) {
  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setShowHint(true), timeoutMs);
    return () => clearTimeout(id);
  }, [timeoutMs]);

  return (
    <div className="loading-page">
      <div className="loading-spinner" />
      <h1 className="loading-message">{message}</h1>

      {showHint && (
        <div className="loading-hint">
          Live API responses can be slow or occasionally have gaps.
          If nothing appears after a while, try again after the next hour begins.
        </div>
      )}
    </div>
  );
}
