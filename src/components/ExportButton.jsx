function toCsv(rows) {
  const headers = [
    "clusterId", "size", "lat", "lon", "altKm",
    "speedKmh", "levelHpa", "windKmh", "windFromDeg",
    "tempGroundC", "tempAltC"
  ];
  const esc = v => (v == null ? "" : String(v).replaceAll('"', '""'));
  const lines = [
    headers.join(","),
    ...rows.map(r => headers.map(h => `"${esc(r[h])}"`).join(","))
  ];
  return lines.join("\n");
}

export default function ExportButton({ rows, filename }) {
  const dl = () => {
    if (!rows?.length) return;
    const blob = new Blob([toCsv(rows)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename || "report.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <button className="btn" onClick={dl}>
      Export CSV
    </button>
  );
}
