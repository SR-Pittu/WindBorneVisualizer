import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import ChartTitle from "../components/ChartTitle";

const bins = [
  [0, 14], [15, 29], [30, 44], [45, 59], [60, 74], [75, 90], [90, 104], [105, 119], [120, 134], [135, 149], [150, 164], [165, 179], [180, 180]
];

export default function HistTailwind({ rows }) {
  const hs = rows.map(r => r.tailHeadDelta).filter(Number.isFinite);
  const counts = bins.map(([a, b]) => ({
    bucket: `${a}°–${b}°`,
    n: hs.filter(x => x >= a && x <= b).length
  }));

  return (
    <div className="panel">
      <ChartTitle
        title="Tailwind Efficiency Analysis"
        detail="Distribution of the angular difference between balloon heading and wind direction. Lower Δ angles represent favorable tailwinds, while higher ones indicate opposing winds."
      />
      <ResponsiveContainer width="100%" height={350}>
        <BarChart data={counts}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="bucket" angle={-35} textAnchor="end" height={60} />
          <YAxis allowDecimals={false} />
          <Tooltip />
          <Bar dataKey="n" name="Count" fill="#60a5fa" />
        </BarChart>
      </ResponsiveContainer>
      <div className="muted" style={{ marginTop: 8 }}>0° = pure tailwind, 180° = pure headwind</div>
    </div>
  );
}
