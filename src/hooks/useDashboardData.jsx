import { useEffect, useMemo, useRef, useState } from "react";
import useStickyState from "./useStickyState";
import { fetchConstellation24h } from "../api/windborne";
import { clusterLatestPoints } from "../derive/clusters";
import { attachWeatherForClusters } from "../derive/enrichWeather";
import { deriveHeadingsSpeedAndTailwind } from "../derive/metrics";

const CACHE_KEY = "wb_dashboard_v1";

const hourFloor = (ms) => {
  const d = new Date(ms);
  d.setMinutes(0, 0, 0);
  return d.getTime();
};

export default function useDashboardData(k = 100) {
  const [allTracks, setAllTracks] = useState(null);
  const [clusters, setClusters] = useState([]);
  const [wxByCluster, setWxByCluster] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [upstreamEmpty, setUpstreamEmpty] = useState(false);
  const lastManualRefreshHourRef = useRef(null);

  const [cache, setCache] = useStickyState(CACHE_KEY, null);
  const [derived, setDerived] = useState(null);

  useEffect(() => {
    if (allTracks && Object.keys(allTracks).length > 0) {
      const id = setTimeout(() => {
        const result = deriveHeadingsSpeedAndTailwind(allTracks);
        setDerived(result);
      }, 250);
      return () => clearTimeout(id);
    } else {
      setDerived(null);
    }
  }, [allTracks, refreshing, loading]);


  const runFetchPipeline = async () => {
    setLoadError(null);
    setUpstreamEmpty(false);
    const byId = await fetchConstellation24h();

    const hasAny =
      byId &&
      typeof byId === "object" &&
      Object.values(byId).some((v) => Array.isArray(v) && v.length);

    if (!hasAny) {
      setUpstreamEmpty(true);
      setLastUpdated(new Date().toISOString());
      return;
    }

    setAllTracks(byId);

    const cls = clusterLatestPoints(byId, k);
    setClusters(cls);

    const wx = await attachWeatherForClusters(cls);
    setWxByCluster(wx);

    setLastUpdated(new Date().toISOString());
  };

  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 30_000);
    const onVis = () => setNowMs(Date.now());
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const hydrateFromCache = () => {
      if (!cache) return false;
      try {
        const {
          allTracks: cTracks,
          clusters: cClusters,
          wxByCluster: cWx,
          lastUpdated: cUpdated,
          upstreamEmpty: cEmpty,
          loadError: cErr,
          lastManualRefreshHour: cLastHr,
        } = cache || {};

        if (cTracks || (Array.isArray(cClusters) && cClusters.length)) {
          setAllTracks(cTracks || null);
          setClusters(Array.isArray(cClusters) ? cClusters : []);
          setWxByCluster(cWx || {});
          setLastUpdated(cUpdated || null);
          setUpstreamEmpty(!!cEmpty);
          setLoadError(cErr || null);
          if (Number.isFinite(cLastHr)) lastManualRefreshHourRef.current = cLastHr;
          setLoading(false);
          return true;
        }
      } catch { }
      return false;
    };

    const didHydrate = hydrateFromCache();
    if (!didHydrate) {
      (async () => {
        setLoading(true);
        try {
          await runFetchPipeline();
        } catch (e) {
          if (!cancelled) setLoadError(e?.message || "Fetch failed");
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();
    }

    return () => {
      cancelled = true;
    };
  }, []);

  const latestFeedTime = useMemo(() => {
    if (!allTracks || typeof allTracks !== "object") return null;
    let latest = 0;
    for (const arr of Object.values(allTracks)) {
      if (!Array.isArray(arr) || !arr.length) continue;
      const last = arr[arr.length - 1];

      let t = NaN;
      if (Array.isArray(last)) {
        t = Date.parse(last[3]);
      } else if (last && last.t) {
        t =
          last.t instanceof Date
            ? last.t.getTime()
            : Date.parse(last.t);
      }
      if (Number.isFinite(t) && t > latest) latest = t;
    }
    return latest > 0 ? new Date(latest).toISOString() : null;
  }, [allTracks]);

  const referenceFeedIso = latestFeedTime || lastUpdated || null;

  const isStale = useMemo(() => {
    if (!referenceFeedIso) return false;
    const feedMs = Date.parse(referenceFeedIso);
    if (!Number.isFinite(feedMs)) return false;
    const nextHourMs = hourFloor(feedMs) + 60 * 60 * 1000;
    return nowMs >= nextHourMs;
  }, [referenceFeedIso, nowMs]);

  const canRefresh = useMemo(() => {
    if (!isStale) return false;
    const nowHour = hourFloor(nowMs);
    return lastManualRefreshHourRef.current !== nowHour;
  }, [isStale, nowMs]);

  const lastManualRefreshAtRef = useRef(0);
  const MIN_REFRESH_GAP_MS = 15_000;

  const refresh = async (opts = { force: true }) => {
    const now = Date.now();
    if (!opts?.force && !canRefresh) return;
    if (now - lastManualRefreshAtRef.current < MIN_REFRESH_GAP_MS) return;
    lastManualRefreshAtRef.current = now;

    setRefreshing(true);
    try {
      await runFetchPipeline();
      lastManualRefreshHourRef.current = hourFloor(now);
    } catch (e) {
      setLoadError(e?.message || "Refresh failed");
    } finally {
      setRefreshing(false);
    }
  };


  useEffect(() => {
    if (isStale && !refreshing) {
      refresh({ force: true });
    }
  }, [isStale, refreshing]);

  useEffect(() => {
    setCache({
      allTracks,
      clusters,
      wxByCluster,
      lastUpdated,
      upstreamEmpty,
      loadError,
      lastManualRefreshHour: lastManualRefreshHourRef.current ?? null,
    });
  }, [
    allTracks,
    clusters,
    wxByCluster,
    lastUpdated,
    upstreamEmpty,
    loadError,
    setCache,
  ]);

  useEffect(() => {
    const saveNow = () => {
      try {
        localStorage.setItem(
          CACHE_KEY,
          JSON.stringify({
            allTracks,
            clusters,
            wxByCluster,
            lastUpdated,
            upstreamEmpty,
            loadError,
            lastManualRefreshHour: lastManualRefreshHourRef.current ?? null,
          })
        );
      } catch { }
    };

    const onFreeze = () => saveNow();
    const onPageHide = () => saveNow();
    const onBeforeUnload = () => saveNow();
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") saveNow();
    };

    window.addEventListener("freeze", onFreeze);
    window.addEventListener("pagehide", onPageHide);
    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.removeEventListener("freeze", onFreeze);
      window.removeEventListener("pagehide", onPageHide);
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [allTracks, clusters, wxByCluster, lastUpdated, upstreamEmpty, loadError]);

  // const derived = useMemo(() => {
  //   if (!allTracks) return null;
  //   return deriveHeadingsSpeedAndTailwind(allTracks);
  // }, [allTracks]);

  const rows = useMemo(() => {
    if (!clusters?.length) return [];
    const speedMap = derived?.speedKmhById || {};
    const headingMap = derived?.headingsById || {};

    const toNum = (v) => (Number.isFinite(Number(v)) ? Number(v) : null);
    const avg = (arr) =>
      arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null;
    const norm360 = (d) => ((d % 360) + 360) % 360;
    const signedDelta = (aDeg, bDeg) => {
      let d = norm360(bDeg) - norm360(aDeg);
      if (d > 180) d -= 360;
      if (d <= -180) d += 360;
      return d;
    };

    return clusters.map((c) => {
      const wx = wxByCluster[c.id] || {};
      const members = c.memberIds || c.ids || c.members || [];

      let avgTailDelta = null;
      const wFrom = toNum(wx.windFromDeg);
      if (members.length && wFrom != null) {
        const wTo = norm360(wFrom + 180);
        const deltas = members
          .map((id) => headingMap[id])
          .filter(Number.isFinite)
          .map((hdg) => Math.abs(signedDelta(hdg, wTo)));
        avgTailDelta = avg(deltas);
      }

      const memberSpeeds = members
        .map((id) => toNum(speedMap[id]))
        .filter((v) => v != null);
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

  return {
    allTracks,
    clusters,
    rows,
    latestFeedTime,
    wxByCluster,
    loading,
    refreshing,
    refresh,
    lastUpdated,
    isStale,
    canRefresh,
    loadError,
    upstreamEmpty,
  };
}
