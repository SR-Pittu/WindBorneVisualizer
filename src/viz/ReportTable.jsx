import { useState } from "react";
import ExportButton from "./ExportButton.jsx";
import ChartTitle from "../components/ChartTitle";

export default function ReportTable({ rows }) {
  const [showMessage, setShowMessage] = useState(false); // <-- ADD THIS LINE

  if (!rows?.length) {
    return (
      <section className="panel">
        <h2>Cluster Report</h2>
        <p className="muted">No clusters.</p>
      </section>
    );
  }

  const cols = [
    { key: "clusterId", label: "Cluster" },
    { key: "size", label: "Members" },
    { key: "lat", label: "Centroid Lat" },
    { key: "lon", label: "Centroid Lon" },
    { key: "altKm", label: "Centroid Alt (km)" },
    { key: "levelHpa", label: "Level (hPa)" },
    { key: "windKmh", label: "Wind (km/h)" },
    { key: "windFromDeg", label: "Wind From (°)" },
    { key: "tempGroundC", label: "Temp 2m (°C)" },
    { key: "tempAltC", label: "Temp @Level (°C)" },
  ];

  return (
    <section className="panel">
      <ChartTitle
        title="Cluster Composition Table"
        detail="Summarizes key metrics for each cluster, including size, centroid position, altitude, wind, and temperature averages derived from the latest balloon samples."
      />
      <div className="table-wrap">
        <table className="report">
          <colgroup>
            <col style={{ width: '7ch' }} />  
            <col style={{ width: '8ch' }} />  
            <col style={{ width: '12ch' }} />
            <col style={{ width: '12ch' }} />  
            <col style={{ width: '14ch' }} /> 
            <col style={{ width: '12ch' }} />   
            <col style={{ width: '14ch' }} />  
            <col style={{ width: '14ch' }} />  
            <col style={{ width: '14ch' }} />  
            <col style={{ width: '16ch' }} />  
          </colgroup>
          <thead>
            <tr>{cols.map((c) => <th key={c.key}>{c.label}</th>)}</tr>
          </thead>
          <tbody>
            {rows.slice(0, 50).map((r) => (
              <tr key={r.clusterId}>
                {cols.map((c) => <td key={c.key}>{r[c.key] ?? ""}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="toolbar">
        <button className="btn" onClick={() => setShowMessage(true)}>
          Show More
        </button>

        {showMessage && (
          <div className="overlay">
            <div className="message-box">
              <p>To see all clusters, please export the full CSV from the toolbar.</p>
              <ExportButton rows={rows} filename="cluster_report.csv" />
              <button onClick={() => setShowMessage(false)}>Close</button>

            </div>
          </div>
        )}
      </div>
    </section>
  );
}
