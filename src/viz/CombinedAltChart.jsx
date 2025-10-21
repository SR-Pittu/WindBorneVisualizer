import { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import ChartTitle from "../components/ChartTitle";

const HOUR = 60 * 60 * 1000;
const hourFloor = (ms) => {
  const d = new Date(ms);
  d.setMinutes(0, 0, 0);
  return d.getTime();
};
const hourCeil = (ms) => {
  const base = hourFloor(ms);
  return base === ms ? ms : base + HOUR;
};

export default function CombinedAltChart({
  tracks,
  k = 10,
  height = 360,
  latestFeedTime,
  title = "Altitude Trends by Cluster",
  palette = null,
}) {

  const latestSampleMs = useMemo(() => {
    if (!tracks || typeof tracks !== "object") return null;
    let maxMs = 0;
    for (const arr of Object.values(tracks)) {
      if (!Array.isArray(arr)) continue;
      for (const row of arr) {
        let t = NaN;
        if (Array.isArray(row)) t = Date.parse(row[3]);
        else if (row && typeof row === "object") {
          t = Date.parse(row.t ?? row.ts ?? row.time ?? row.date ?? NaN);
        }
        if (Number.isFinite(t) && t > maxMs) maxMs = t;
      }
    }
    return maxMs || null;
  }, [tracks]);

  const referenceEndMs = useMemo(() => {
    const fromProp = latestFeedTime ? Date.parse(latestFeedTime) : NaN;
    const picked = Number.isFinite(fromProp) ? fromProp : latestSampleMs;
    return picked ? hourCeil(picked) : null;
  }, [latestFeedTime, latestSampleMs]);

  const series = useMemo(() => {
    if (!tracks || typeof tracks !== "object") return [];

    const rowsByTime = new Map();
    for (const [id, arr] of Object.entries(tracks)) {
      if (!Array.isArray(arr)) continue;
      for (const row of arr) {
        let t = NaN;
        let altKm = NaN;

        if (Array.isArray(row)) {
          t = Date.parse(row[3]);
          altKm = Number(row[2]);
        } else if (row && typeof row === "object") {
          t = Date.parse(row.t ?? row.ts ?? row.time ?? row.date ?? NaN);
          if (Number.isFinite(Number(row.altKm))) altKm = Number(row.altKm);
          else if (Number.isFinite(Number(row.alt_km))) altKm = Number(row.alt_km);
          else if (Number.isFinite(Number(row.alt))) altKm = Number(row.alt);
          else if (Number.isFinite(Number(row.altitude_m))) altKm = Number(row.altitude_m) / 1000;
          else if (Number.isFinite(Number(row.alt_m))) altKm = Number(row.alt_m) / 1000;
        }

        if (!Number.isFinite(t) || !Number.isFinite(altKm)) continue;

        if (!rowsByTime.has(t)) rowsByTime.set(t, { t });
        rowsByTime.get(t)[id] = altKm;
      }
    }

    return Array.from(rowsByTime.values()).sort((a, b) => a.t - b.t);
  }, [tracks]);

  const domain = useMemo(() => {
    if (!series.length) return ["auto", "auto"];

    const minT = series[0].t;
    const maxT = series[series.length - 1].t;
    const end = referenceEndMs && referenceEndMs > maxT ? referenceEndMs : maxT;
    const start = end - 24 * HOUR;

    return [Math.max(start, minT), end];
  }, [series, referenceEndMs]);

  const lineKeys = useMemo(() => {
    const ids = Object.keys(tracks || {});
    ids.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    return ids.slice(0, k);
  }, [tracks, k]);
  const defaultPalette = [
    "#1f77b4",
    "#ff7f0e",
    "#2ca02c",
    "#d62728",
    "#9467bd",
    "#8c564b",
    "#e377c2",
    "#7f7f7f",
    "#bcbd22",
    "#17becf",
  ];

  const paletteToUse = Array.isArray(palette) && palette.length ? palette : defaultPalette;

  const colorForId = (id) => {
    let h = 0;
    for (let i = 0; i < id.length; i++) h = (h << 5) - h + id.charCodeAt(i);
    const idx = Math.abs(h) % paletteToUse.length;
    return paletteToUse[idx];
  };

  const xTickFmt = (ts) =>
    new Date(ts).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  const tooltipLabelFmt = (ts) =>
    new Date(ts).toLocaleString(undefined, {
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });

  const hourlyTicks = useMemo(() => {
    if (!domain || !Array.isArray(domain) || domain[0] === "auto") return [];
    const [start, end] = domain;
    if (!Number.isFinite(start) || !Number.isFinite(end)) return [];
    const ticks = [];
    const startHour = hourCeil(start - HOUR); // ensure coverage
    for (let t = startHour; t <= end; t += HOUR) ticks.push(t);
    return ticks;
  }, [domain]);

  const noData = !series.length || !lineKeys.length;

  return (
    <div className="panel">

      <ChartTitle
        title={`Altitude Trends by Cluster (k=${k})`}
        detail="Displays the mean altitude over time for each cluster. Balloons are grouped into up to k clusters using their latest latitude, longitude, and altitude, then averaged per minute to reveal distinct flight layers and patterns."
      />
      <div className="chart-container" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          {noData ? (
            <LineChart data={[]} margin={{ top: 8, right: 24, left: 24, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis />
              <YAxis />
            </LineChart>
          ) : (
            <LineChart
              data={series}
              margin={{ top: 8, right: 24, left: 24, bottom: 8 }}
              key={domain.join("-")}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="t"
                type="number"
                domain={domain}
                ticks={hourlyTicks}
                tickFormatter={xTickFmt}
                tick={{ fontSize: 12 }}
                axisLine={{ stroke: "#888" }}
                tickLine={{ stroke: "#888" }}
              />
              <YAxis
                label={{ value: "Altitude (km)", angle: -90, position: "insideLeft" }}
                tick={{ fontSize: 12 }}
                allowDecimals
                axisLine={{ stroke: "#888" }}
                tickLine={{ stroke: "#888" }}
              />
              <Tooltip labelFormatter={tooltipLabelFmt} />
              <Legend />
              {lineKeys.map((id) => (
                <Line
                  key={id}
                  type="monotone"
                  dataKey={id}
                  dot={false}
                  strokeWidth={2}
                  stroke={colorForId(id)}
                  isAnimationActive={false}
                />
              ))}
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
