// Summary.jsx
import ChartTitle from "../components/ChartTitle";

const toNum = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const avgOf = (rows, key, predicate = () => true) => {
  const vals = rows
    .filter(predicate)
    .map((r) => toNum(r[key]))
    .filter((v) => v != null);
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
};

const fmt = (val, suffix = "", round = true) =>
  val == null ? "—" : `${round ? Math.round(val) : val}${suffix}`;

const KPI = ({ k, v }) => (
  <div className="card">
    <div className="k">{k}</div>
    <div className="v">{v}</div>
  </div>
);

export default function Summary({ rows = [] }) {
  const n = rows.length;

  const hasWind = (r) => toNum(r.windKmh) != null;
  const hasDelta = (r) => toNum(r.tailHeadDelta) != null;
  // console.log("Valid deltas:", rows.filter(hasDelta).map(r => r.tailHeadDelta));
  const numWithWind = rows.filter(hasWind).length;

  const avgSpeed = avgOf(rows, "speedKmh");
  const avgWind = avgOf(rows, "windKmh", hasWind);
  const avgDelta = avgOf(rows, "tailHeadDelta", hasDelta);

  // Percentage of rows with weather (show em dash if no rows)
  const withWxPct =
    n > 0 ? `${Math.round((numWithWind / n) * 100)}%` : "—";

  return (
    <div className="panel summary">
      <ChartTitle
        title="Flight Summary"
        detail="Key counts and averages for the current dataset, with all balloons clustered into 100 groups based on their latest positions."
      />
      <div className="kpis">
        <KPI k="Balloons" v={fmt(n, "", false)} />
        <KPI k="With Weather" v={`${fmt(numWithWind, "", false)} (${withWxPct})`} />
        <KPI k="Avg Speed" v={fmt(avgSpeed, " km/h")} />
        <KPI k="Avg Wind @ alt" v={fmt(avgWind, " km/h")} />
        <KPI k="Avg Tailwind Δ" v={fmt(avgDelta, "°")} />
      </div>
    </div>
  );
}
