import ChartTitle from "../components/ChartTitle";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

export default function TempComparison({ rows }) {
  const data = rows.map((r, i) => ({
    idx: i + 1,
    ground: r.tempGroundC,
    alt: r.tempAltC,
  }));

  const tickEvery = Math.max(1, Math.ceil(data.length / 8));

  return (
    <div className="panel">
      <ChartTitle
        title="Temperature Gradient Analysis"
        detail="Compares surface temperature with temperature at flight level to highlight thermal gradients, inversions, and colder atmospheric layers aloft."
      />
      <ResponsiveContainer width="100%" height={500}>
        <LineChart
          data={data}
          margin={{ top: 12, right: 24, bottom: 24, left: 12 }}
        >
          <CartesianGrid strokeDasharray="3 6" stroke="#374151" />  {/* dim grid for dark bg */}
          <XAxis
            dataKey="idx"
            tick={{ fill: "#d1d5db", fontSize: 11 }}     // light gray ticks
            interval={tickEvery - 1}
            tickMargin={2}
            label={{
              value: "Samples",
              position: "insideBottom",
              offset: -6,
              style: { fill: "#9ca3af" },
            }}
          />
          <YAxis
            unit="°C"
            tick={{ fill: "#d1d5db", fontSize: 12 }}
            tickMargin={8}
            label={{
              value: "Temperature (°C)",
              angle: -90,
              position: "insideLeft",
              offset: 10,
              style: { fill: "#9ca3af" },
            }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#1f2937",
              border: "1px solid #374151",
              borderRadius: "8px",
              color: "#f3f4f6",
            }}
            formatter={(v) => `${Number(v)?.toFixed(1)} °C`}
            labelFormatter={(l) => `Sample #${l}`}
          />

          <Legend
            verticalAlign="bottom"
            align="center"
            height={2}
            wrapperStyle={{ color: "#e5e7eb", paddingTop: 8 }}
          />

          {/* 🔥 vivid orange & cool blue for contrast */}
          <Line
            type="monotone"
            dataKey="ground"
            name="Ground Temp"
            dot={false}
            stroke="#f97316"       // vivid warm orange
            strokeWidth={3}
            activeDot={{ r: 6, fill: "#fb923c" }}
          />
          <Line
            type="monotone"
            dataKey="alt"
            name="Altitude Temp"
            dot={false}
            stroke="#3b82f6"       // bright sky-blue
            strokeWidth={3}
            activeDot={{ r: 6, fill: "#60a5fa" }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
