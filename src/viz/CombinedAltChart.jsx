// src/viz/CombinedAltChart.jsx
import { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import ChartTitle from "../components/ChartTitle";

// Distinct palette for lines
const PALETTE = [
  "#2563eb", "#059669", "#dc2626", "#d97706", "#9333ea",
  "#0ea5e9", "#16a34a", "#f43f5e", "#f59e0b", "#22c55e",
];
const minuteKey = (t) => {
  const d = t instanceof Date ? new Date(t) : new Date(t);
  d.setSeconds(0, 0);
  return d.toISOString();
};
const mean = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null);

function kMeans(points, k, iters = 12) {
  const n = points.length;
  if (!n) return { labels: [], centroids: [] };
  k = Math.max(1, Math.min(k, n));

  const step = n / k;
  let centroids = Array.from({ length: k }, (_, i) => points[Math.floor(i * step)]);

  let labels = new Array(n).fill(0);
  for (let it = 0; it < iters; it++) {
    // assign step
    for (let i = 0; i < n; i++) {
      const p = points[i];
      let best = 0, bestD = Infinity;
      for (let c = 0; c < k; c++) {
        const q = centroids[c];
        const d =
          (p[0] - q[0]) * (p[0] - q[0]) +
          (p[1] - q[1]) * (p[1] - q[1]) +
          (p[2] - q[2]) * (p[2] - q[2]);
        if (d < bestD) { bestD = d; best = c; }
      }
      labels[i] = best;
    }
    // update step
    const sums = Array.from({ length: k }, () => [0, 0, 0, 0]); // lat,lon,alt,count
    for (let i = 0; i < n; i++) {
      const c = labels[i];
      const p = points[i];
      sums[c][0] += p[0];
      sums[c][1] += p[1];
      sums[c][2] += p[2];
      sums[c][3] += 1;
    }
    for (let c = 0; c < k; c++) {
      if (sums[c][3] > 0) {
        centroids[c] = [
          sums[c][0] / sums[c][3],
          sums[c][1] / sums[c][3],
          sums[c][2] / sums[c][3],
        ];
      }
    }
  }
  return { labels, centroids };
}
export default function CombinedAltChart({
  tracks,
  k = 10,
  maxIds = 2000,
  height = 360,
}) {
  const { data, seriesKeys, counts } = useMemo(() => {
    if (!tracks || !Object.keys(tracks).length) {
      return { data: [], seriesKeys: [], counts: [] };
    }

    // 1) Choose ids (cap for safety/perf)
    const allIds = Object.keys(tracks);
    const ids = allIds.slice(0, maxIds);

    // 2) Build feature vectors from latest points
    const features = [];
    const idList = [];
    for (const id of ids) {
      const segs = tracks[id] || [];
      if (!segs.length) continue;
      const last = segs[segs.length - 1];
      if (last?.lat == null || last?.lon == null || last?.alt == null) continue;
      features.push([+last.lat, +last.lon, +last.alt]);
      idList.push(id);
    }
    if (!features.length) {
      return { data: [], seriesKeys: [], counts: [] };
    }

    // 3) Run k-means directly on ALL balloons’ latest points
    const kEff = Math.max(1, Math.min(k, features.length));
    const { labels } = kMeans(features, kEff);

    // 4) Build cluster membership id lists
    const members = Array.from({ length: kEff }, () => []);
    labels.forEach((c, i) => { members[c].push(idList[i]); });

    // 5) Precompute per-id minute-binned altitude series and a unified time axis
    const perIdSeries = new Map(); 
    const allTimes = new Set();
    for (const id of idList) {
      const segs = tracks[id] || [];
      const m = new Map();
      for (const p of segs) {
        if (p?.t == null || p?.alt == null) continue;
        const tk = minuteKey(p.t);
        if (!m.has(tk)) m.set(tk, +p.alt);
      }
      if (m.size) {
        perIdSeries.set(id, m);
        for (const tk of m.keys()) allTimes.add(tk);
      }
    }
    const timeKeys = Array.from(allTimes).sort();

    // 6) Aggregate mean altitude per cluster at each time
    const seriesKeys = members.map((_, i) => `C${i + 1}`);
    const data = timeKeys.map((tk) => {
      const timeTs = new Date(tk).getTime(); 
      const row = { timeTs };
      members.forEach((idsInCluster, ci) => {
        const vals = [];
        for (const id of idsInCluster) {
          const m = perIdSeries.get(id);
          if (!m) continue;
          const v = m.get(tk);
          if (Number.isFinite(v)) vals.push(v);
        }
        const avg = mean(vals);
        if (avg != null) row[seriesKeys[ci]] = +avg;
      });
      return row;
    });

    const counts = members.map((m) => m.length);
    return { data, seriesKeys, counts };
  }, [tracks, k, maxIds]);

  // Empty states
  if (!tracks || !Object.keys(tracks).length) {
    return (
      <section className="panel">
        <h2>Altitude Trends by Cluster</h2>
        <p className="muted">No track data.</p>
      </section>
    );
  }
  if (!data.length) {
    return (
      <section className="panel">
        <ChartTitle
          title={`Altitude Trends by Cluster (k=${k})`}
          detail="No time-aligned altitude data available to render."
        />
      </section>
    );
  }

  return (
    <section className="panel">
      <ChartTitle
        title={`Altitude Trends by Cluster (k=${k})`}
        detail="Displays the mean altitude over time for each cluster. Balloons are grouped into up to k clusters using their latest latitude, longitude, and altitude, then averaged per minute to reveal distinct flight layers and patterns."
      />
      <p className="muted">
        Clusters are computed only for this chart using all balloons’ latest positions.
      </p>
      <div style={{ width: "100%", height }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 16, right: 24, bottom: 32, left: 12 }}>
            <CartesianGrid strokeOpacity={0.2} />
            <XAxis
              dataKey="timeTs"
              type="number"
              domain={["dataMin", "dataMax"]}
              scale="time"
              tickFormatter={(v) => new Date(v).toISOString().slice(11, 16)} // HH:MM UTC
              tickMargin={8}
            />
            <YAxis
              label={{ value: "Altitude (km)", angle: -90, position: "insideLeft" }}
              tickMargin={8}
            />
            <Tooltip
              labelFormatter={(v) =>
                new Date(v).toISOString().replace("T", " ").slice(0, 16) + " UTC"
              }
            />
            {seriesKeys.map((ck, i) => (
              <Line
                key={ck}
                type="monotone"
                dataKey={ck}
                stroke={PALETTE[i % PALETTE.length]}
                dot={false}
                strokeWidth={2}
                isAnimationActive={false}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
      {counts?.length ? (
        <small className="muted">
          Clusters: {counts.map((n, i) => `C${i + 1}=${n}`).join(" · ")}
        </small>
      ) : null}
    </section>
  );
}
