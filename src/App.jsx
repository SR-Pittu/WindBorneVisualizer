import "./index.css";

import Summary from "./viz/summary";
import HistTailwind from "./viz/HistTailwind";
import WindRose from "./viz/WindRose";
import ScatterAltWind from "./viz/ScatterAltWind";
import TempComparison from "./viz/TempComparision";
import ReportTableClusters from "./viz/ReportTable";
import CombinedAltChart from "./viz/CombinedAltChart"; // you can pass allTracks if you want time series
import useDashboardData from "./hooks/useDashboardData";

export default function App() {
  // k=100 clusters over ALL balloons
  const { allTracks, rows, clusters, loading } = useDashboardData(100);
  const id = rows.map(r => r.id);

  return (
    <div className="container">
      <header>
        <h1>WindBorne Insights</h1>
        <h3 className="muted">
          Real-time balloon network analytics, clustered into 100 atmospheric groups with weather profiles computed per centroid.
        </h3>
      </header>


      {loading && <div className="panel">Clustering fleet and fetching cluster weather…</div>}

      {!loading && (
        <>
          <Summary rows={rows}/>
          {allTracks ? (
            <>
              <CombinedAltChart tracks={allTracks} k={10} height={380} />
            </>
          ) : null}


          <div className="grid2">
            <HistTailwind rows={rows} />
            <WindRose rows={rows} />
          </div>
          <div className="grid2">
            <ScatterAltWind rows={rows} />
            <TempComparison rows={rows} />
          </div>
          {/* 
          <div className="toolbar">
            <ExportButton rows={rows} filename="windborne_clusters.csv" />
          </div> */}

          <ReportTableClusters rows={rows} />

          <footer>
            <small>Data: WindBorne Systems & Open-Meteo | Visualization © 2025</small>
          </footer>
        </>
      )}
    </div>
  );
}
