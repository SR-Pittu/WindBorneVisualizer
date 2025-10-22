
import "./index.css";
import { useMemo,useEffect } from "react";

import Summary from "./viz/summary";
import HistTailwind from "./viz/HistTailwind";
import WindRose from "./viz/WindRose";
import ScatterAltWind from "./viz/ScatterAltWind";
import TempComparison from "./viz/TempComparision";
import ReportTableClusters from "./viz/ReportTable";
import CombinedAltChart from "./viz/CombinedAltChart";
import LoadingPage from "./components/LoadingPage";
import EmptyState from "./components/EmptyState";
import useDashboardData from "./hooks/useDashboardData";

export default function App() {
  const {
    allTracks,
    rows,
    loading,
    refreshing,
    lastUpdated,
    latestFeedTime,
    loadError,
    upstreamEmpty,
  } = useDashboardData(100);
useEffect(() => {
  if (!loading && !refreshing && rows && rows.length > 0) {
    let interval;
    const checkVersion = async () => {
      try {
        const res = await fetch("/version.json", { cache: "no-store" });
        const data = await res.json();
        const currentVersion = localStorage.getItem("APP_VERSION");
        if (currentVersion && currentVersion !== data.version) {
          console.log("New deployment detected — refreshing...");
          window.location.reload(true);
        } else {
          localStorage.setItem("APP_VERSION", data.version);
        }
      } catch (e) {
        console.warn("Version check failed", e);
      }
    };

    checkVersion(); 
    interval = setInterval(checkVersion, 60000); 

    return () => clearInterval(interval);
  }
}, [loading, refreshing, rows]);


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
          message={
            loading
              ? "Loading latest balloon & weather…"
              : "Auto-refreshing with the newest hour…"
          }
          timeoutMs={800}
        />
      </div>
    );
  }

  if ((!rows || rows.length === 0) && (upstreamEmpty || loadError)) {
    return (
      <div className="container">
        <h1>WindBorne Insights</h1>
        <EmptyState />
      </div>
    );
  }

  if (!rows || rows.length === 0) {
    return (
      <div className="container">
        <h1>WindBorne Insights</h1>
        <div className="panel">
          No clusters available yet. New data typically lands at the top of each hour.
          Please check back after the next hour begins.
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
            Real-time balloon network analytics, clustered into 100 atmospheric groups with weather
            profiles computed per centroid.
          </h3>
          <small className="muted">
            Data auto-refreshes every hour when new WindBorne files are published.
          </small>
        </div>

        <div className="header-meta">
          {headerTime && (
            <div className="last-updated">
              <span>Last auto-refresh:&nbsp;</span>
              <strong>
                {headerTime.toLocaleString(undefined, {
                  weekday: "short",
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                  timeZoneName: "short",
                })}
              </strong>
            </div>
          )}
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
