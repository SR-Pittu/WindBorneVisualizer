// useDashboardData.jsx
import { useEffect, useMemo, useState } from "react";
import { fetchConstellation24h } from "../api/windborne";
import { clusterLatestPoints } from "../derive/clusters";
import { attachWeatherForClusters } from "../derive/enrichWeather";
import { deriveHeadingsSpeedAndTailwind } from "../derive/metrics";

const toNum = v => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
const avg = arr => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null);

// helpers for angle math
const norm360 = d => ((d % 360) + 360) % 360;
const signedDelta = (aDeg, bDeg) => {
  let d = norm360(bDeg) - norm360(aDeg);
  if (d > 180) d -= 360;
  if (d <= -180) d += 360;
  return d;
};

export default function useDashboardData(k = 100) {
  const [allTracks, setAllTracks] = useState(null);
  const [clusters, setClusters] = useState([]);
  const [wxByCluster, setWxByCluster] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const byId = await fetchConstellation24h();
        if (cancelled) return;
        setAllTracks(byId);

        const cls = clusterLatestPoints(byId, k);
        if (cancelled) return;
        setClusters(cls);

        const wx = await attachWeatherForClusters(cls);
        if (cancelled) return;
        setWxByCluster(wx);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [k]);

  // per-balloon speed & headings (no wind needed here)
  const derived = useMemo(() => {
    if (!allTracks) return null;
    return deriveHeadingsSpeedAndTailwind(allTracks);
  }, [allTracks]);

  const rows = useMemo(() => {
    if (!clusters?.length) return [];

    const speedMap   = derived?.speedKmhById || {};
    const headingMap = derived?.headingsById || {};

    return clusters.map(c => {
      const wx = wxByCluster[c.id] || {};
      const members = c.memberIds || c.ids || c.members || [];

      // compute tailwind Δ per member using cluster wind direction
      let avgTailDelta = null;
      const wFrom = toNum(wx.windFromDeg);
      if (members.length && wFrom != null) {
        const wTo = norm360(wFrom + 180); // FROM -> TO
        const deltas = members
          .map(id => headingMap[id])
          .filter(Number.isFinite)
          .map(hdg => Math.abs(signedDelta(hdg, wTo)));
        avgTailDelta = avg(deltas);
      }

      // average speed across members if available
      const memberSpeeds = members
        .map(id => toNum(speedMap[id]))
        .filter(v => v != null);
      const avgSpeedKmh = avg(memberSpeeds);

      return {
        clusterId: c.id,
        size: c.size,
        lat: +c.centroid.lat.toFixed(3),
        lon: +c.centroid.lon.toFixed(3),
        altKm: +c.centroid.alt.toFixed(2),

        levelHpa: wx.levelHpa ?? null,
        windKmh: toNum(wx.windKmh),
        windFromDeg: wFrom,
        tempGroundC: toNum(wx.tempGroundC),
        tempAltC: toNum(wx.tempAltC),

        speedKmh: avgSpeedKmh,           // km/h
        tailHeadDelta: avgTailDelta,     // degrees (0=tail, 180=head)
      };
    });
  }, [clusters, wxByCluster, derived]);

  return { allTracks, clusters, rows, wxByCluster, loading };
}
