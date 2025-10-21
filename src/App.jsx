// /src/App.jsx
import "./index.css";
import { useMemo } from "react";

import Summary from "./viz/summary";
import HistTailwind from "./viz/HistTailwind";
import WindRose from "./viz/WindRose";
import ScatterAltWind from "./viz/ScatterAltWind";
import TempComparison from "./viz/TempComparision";
import ReportTableClusters from "./viz/ReportTable";
import CombinedAltChart from "./viz/CombinedAltChart";
import LoadingPage from "./components/LoadingPage";
import EmptyState from "./components/EmptyState";
import RefreshButton from "./components/RefreshButton";
import useDashboardData from "./hooks/useDashboardData";

export default function App() {
  const {
    allTracks,
    rows,
    loading,
    refreshing,
    refresh,
    lastUpdated,
    latestFeedTime,
    isStale,
    canRefresh,
    loadError,
    upstreamEmpty,
  } = useDashboardData(100);

  const showLoading = loading || refreshing;

  const headerTime = useMemo(() => {
    const iso = latestFeedTime || lastUpdated || null;
    return iso ? new Date(iso) : null;
  }, [latestFeedTime, lastUpdated]);

  if (showLoading) {
    return (
      <div className="container">
        <h1 style={{ textAlign: "center", marginTop: 40 }}>WindBorne Insights</h1>
        <LoadingPage
          message={loading ? "Loading latest baloon & weather…" : "Refreshing with the newest hour…"}
          timeoutMs={800}
        />
      </div>
    );
  }

  if ((!rows || rows.length === 0) && (upstreamEmpty || loadError)) {
    return (
      <div className="container">
        <h1>WindBorne Insights</h1>
        <EmptyState onRetry={refresh} />
      </div>
    );
  }

  if (!rows || rows.length === 0) {
    return (
      <div className="container">
        <h1>WindBorne Insights</h1>
        <div className="panel">
          No clusters available yet. New data typically lands at the top of each hour.
          Try again once the next hour begins.
          <div style={{ marginTop: 12 }}>
            <button className="btn" onClick={refresh} disabled={!canRefresh}>
              {canRefresh ? "Refresh" : "Refresh available next hour"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <header className="app-header">
        <div>
          <h1>WindBorne Insights</h1>
          <h3 className="muted">
            Real-time balloon network analytics, clustered into 100 atmospheric groups with weather profiles computed per centroid.
          </h3>
          <small className="muted">
            New data is published hourly. To avoid API rate limits (429), refresh only after the next
            hour starts. Once refreshed, the button disables until the following hour.
          </small>
        </div>

        <div className="header-meta">
          {headerTime && (
            <div className="last-updated">
              <span>Latest feed time:&nbsp;</span>
              <strong>
                {headerTime.toLocaleString(undefined, {
                  weekday: "short",
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </strong>
            </div>
          )}

          <RefreshButton
            onRefresh={refresh}
            refreshing={refreshing}
            isStale={isStale}
            canRefresh={canRefresh}
          />
        </div>
      </header>

      <Summary rows={rows} />

      <CombinedAltChart
        tracks={allTracks}
        k={10}
        height={380}
        latestFeedTime={latestFeedTime || lastUpdated}
      />

      <div className="grid2">
        <HistTailwind rows={rows} />
        <WindRose rows={rows} />
      </div>

      <div className="grid2">
        <ScatterAltWind rows={rows} />
        <TempComparison rows={rows} />
      </div>

      <ReportTableClusters rows={rows} />

      <footer>
        <small>Data: WindBorne Systems &amp; Open-Meteo | Visualization © 2025</small>
      </footer>
    </div>
  );
}
