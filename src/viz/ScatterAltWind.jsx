import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ZAxis, Legend
} from "recharts";
import ChartTitle from "../components/ChartTitle";

export default function ScatterAltWind({ rows = [] }) {
  const data = rows
    .filter(r => Number.isFinite(r.altKm) && Number.isFinite(r.windKmh))
    .map(r => ({ x: r.altKm, y: r.windKmh, z: r.speedKmh || 0 }));

  return (
    <div className="panel">
      <ChartTitle
        title="Wind Layers Distribution"
        detail="Plots altitude against wind speed for the latest balloon samples, revealing how wind intensity varies across atmospheric layers."
      />

      <ResponsiveContainer width="100%" height={450}>
        <ScatterChart margin={{ top: 8, right: 12, bottom: 8, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" />

          <XAxis
            type="number"
            dataKey="x"
            name="Altitude"
            unit=" km"
            domain={['dataMin - 1', 'dataMax + 1']}
            tickMargin={6}
          />

          {/* More ticks on Y axis */}
          <YAxis
            type="number"
            dataKey="y"
            name="Wind @ alt"
            unit=" km/h"
            domain={['dataMin - 5', 'dataMax + 5']}
            tickCount={7}            // ← add a few more ticks
            allowDecimals={true}
            tickMargin={6}
          />

          <ZAxis type="number" dataKey="z" range={[60, 200]} />

          <Tooltip
            cursor={{ strokeDasharray: '3 3' }}
            formatter={(v, n, p) => {
              if (p.dataKey === 'x') return [`${v} km`, 'Altitude'];
              if (p.dataKey === 'y') return [`${v} km/h`, 'Wind @ alt'];
              if (p.dataKey === 'z') return [`${v} km/h`, 'Speed'];
              return [v, n];
            }}
          />

          {/* Legend at the bottom as requested */}
          <Legend
            verticalAlign="bottom"
            align="right"
            height={24}
            wrapperStyle={{ lineHeight: '24px' }}
          />

          <Scatter name="Samples" data={data} fill="#f59e0b" />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
