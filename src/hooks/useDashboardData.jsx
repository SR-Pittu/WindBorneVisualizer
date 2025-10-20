// useDashboardData.jsx
import { useEffect, useMemo, useState, useCallback } from "react"; // ADDED useCallback
import { fetchConstellation24h } from "../api/windborne";
import { clusterLatestPoints } from "../derive/clusters";
import { attachWeatherForClusters } from "../derive/enrichWeather";
import { deriveHeadingsSpeedAndTailwind } from "../derive/metrics";

const toNum = v => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
const avg = arr => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null);

const norm360 = d => ((d % 360) + 360) % 360;
const signedDelta = (aDeg, bDeg) => {
  let d = norm360(bDeg) - norm360(aDeg);
  if (d > 180) d -= 360;
  if (d <= -180) d += 360;
  return d;
};

const REFRESH_INTERVAL_MS = 3600000; 

export default function useDashboardData(k = 100) {
  const [allTracks, setAllTracks] = useState(null);
  const [clusters, setClusters] = useState([]);
  const [wxByCluster, setWxByCluster] = useState({});
  const [loading, setLoading] = useState(true);
  
  const fetchData = useCallback(async () => {
    let cancelled = false;
    const safeSetState = (setter, value) => {
      if (!cancelled) setter(value);
    };

    setLoading(true);
    try {
      const byId = await fetchConstellation24h();
      safeSetState(setAllTracks, byId);

      const cls = clusterLatestPoints(byId, k);
      safeSetState(setClusters, cls);

      const wx = await attachWeatherForClusters(cls);
      safeSetState(setWxByCluster, wx);
      
    } catch (error) {
        console.error("Dashboard data fetch failed:", error);
    } finally {
      safeSetState(setLoading, false);
    }
    
    return () => { cancelled = true; };
  }, [k]);


  useEffect(() => {
    let cleanupAsync = fetchData(); 
    const intervalId = setInterval(() => {
        if (typeof cleanupAsync === 'function') cleanupAsync(); 
        cleanupAsync = fetchData(); 
    }, REFRESH_INTERVAL_MS);

    return () => {
        clearInterval(intervalId);
        if (typeof cleanupAsync === 'function') cleanupAsync();
    };
  }, [fetchData]); 

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
      let avgTailDelta = null;
      const wFrom = toNum(wx.windFromDeg);
      if (members.length && wFrom != null) {
        const wTo = norm360(wFrom + 180); 
        const deltas = members
          .map(id => headingMap[id])
          .filter(Number.isFinite)
          .map(hdg => Math.abs(signedDelta(hdg, wTo)));
        avgTailDelta = avg(deltas);
      }
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

        speedKmh: avgSpeedKmh,          
        tailHeadDelta: avgTailDelta,     
      };
    });
  }, [clusters, wxByCluster, derived]);

  return { allTracks, clusters, rows, wxByCluster, loading };
}