import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Legend,
  Tooltip
} from "recharts";
import ChartTitle from "../components/ChartTitle";

function norm360(a) {
  const num = Number(a);
  if (!Number.isFinite(num)) return NaN;
  const x = num % 360;
  return x < 0 ? x + 360 : x;
}

function sectorIdx(deg) {
  const d = norm360(deg);
  if (!Number.isFinite(d)) return -1;
  return Math.floor(d / 30) % 12;
}

function buildSectors(rows = [], { mode = "wind" } = {}) {
  const sectors = Array.from({ length: 12 }, (_, i) => ({
    dir: `${i * 30}°`,
    n: 0,
    sumSpeed: 0
  }));

  const angleKey = mode === "heading" ? "headingDeg" : "windFromDeg";

  for (const r of rows) {
    if (!r) continue;
    const angle = r[angleKey];                      
    const idx = sectorIdx(angle);
    if (idx < 0) continue;

    sectors[idx].n += 1;

    const v = Number(r.speedKmh);
    if (Number.isFinite(v)) sectors[idx].sumSpeed += v;
  }
  return sectors.map(s => ({
    dir: s.dir,
    n: s.n,
    avg: s.n > 0 ? Math.round(s.sumSpeed / s.n) : 0
  }));
}

export default function WindRose({
  rows = [],
  mode = "wind",   
  metric = "avg"   
}) {
  const sectors = buildSectors(rows, { mode });
  const totalCount = sectors.reduce((a, b) => a + b.n, 0);
  const allAvgZero = sectors.every(s => s.avg === 0);

  const useMetric = metric === "avg" && allAvgZero ? "n" : metric;
  const dataKey = useMetric === "avg" ? "avg" : "n";
  const seriesLabel = useMetric === "avg" ? "Avg speed (km/h)" : "Sample count";

  if (totalCount === 0) {
    return (
      <div className="panel">
        <ChartTitle
          title="Directional Wind Profile"
          detail={`No valid ${mode === "wind" ? "wind direction" : "heading"} samples found to render the wind rose.`}
        />
        <div className="muted" style={{ padding: 12 }}>
          Ensure rows include <code>{mode === "wind" ? "windFromDeg" : "headingDeg"}</code>
          {useMetric === "avg" ? " and speedKmh" : ""}. Strings are OK; they’re coerced to numbers.
        </div>
      </div>
    );
  }

  return (
    <div className="panel">
      <ChartTitle
        title="Directional Wind Profile"
        detail={
          useMetric === "avg"
            ? `Average ${mode === "wind" ? "wind" : "heading"} speed per 30° sector; highlights dominant flow directions and prevailing currents.`
            : `Distribution of ${mode === "wind" ? "wind" : "heading"} occurrences per 30° sector; highlights dominant directions.`
        }
      />

      <ResponsiveContainer width="100%" height={400}>
        <RadarChart data={sectors} outerRadius="85%">
          <PolarGrid />
          <PolarAngleAxis dataKey="dir" />
          <PolarRadiusAxis angle={90} domain={[0, "auto"]} />
          <Tooltip
            formatter={(v, k) => (k === "avg" ? [`${v} km/h`, "Avg speed"] : [v, "Count"])}
            labelFormatter={(label) => `Sector ${label}`}
          />
          <Radar
            name={seriesLabel}
            dataKey={dataKey}
            stroke="#34d399"
            fill="#34d399"
            fillOpacity={0.55}
          />
          <Legend />
        </RadarChart>
      </ResponsiveContainer>

      {metric === "avg" && allAvgZero && (
        <div className="muted" style={{ marginTop: 8 }}>
          Note: No speed values were available; showing sector counts instead.
        </div>
      )}
    </div>
  );
}
