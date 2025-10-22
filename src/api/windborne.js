import axios from "axios";

const BASE = "/wb";

function demoFallback() {
  console.warn("API failure: Falling back to empty track data.");
  return {};
}

const EARTH_R = 6371e3;
const toRad = d => d * Math.PI / 180;
const haversine = (a, b) => {
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const sLat1 = toRad(a.lat), sLat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(sLat1) * Math.cos(sLat2) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_R * Math.asin(Math.sqrt(h));
};

const isNum = x => Number.isFinite(x);
const toPoint = (p) => {
  if (Array.isArray(p) && p.length >= 2) {
    const [lat, lon, alt] = p;
    return (isNum(lat) && isNum(lon)) ? { lat, lon, alt: isNum(alt) ? alt : null } : null;
  }
  if (p && isNum(p.lat) && isNum(p.lon)) return { lat: p.lat, lon: p.lon, alt: isNum(p.alt) ? p.alt : null };
  return null;
};

async function fetchHour(i) {
  try {
    const url = `${BASE}/${String(i).padStart(2, "0")}.json`;
    const resp = await axios.get(url, {
      timeout: 8000,
      params: { _ts: Date.now() },
      headers: { "Cache-Control": "no-cache", "Pragma": "no-cache" },
      validateStatus: s => (s >= 200 && s < 300) || s === 304,
    });
    if (resp.status === 304 || resp.data == null || resp.data === "") return null;
    return resp.data;
  } catch {
    return null;
  }
}

const MAX_LINK = 1200e3;

export async function fetchConstellation24h() {
  const hours = await Promise.all(Array.from({ length: 24 }, (_, i) => fetchHour(i)));
  const firstGood = hours.findIndex(Boolean);
  if (firstGood === -1) return demoFallback();

  const now = Date.now();
  const topOfCurrentHourMs = (() => {
    const d = new Date(now);
    d.setMinutes(0, 0, 0);
    d.setSeconds(0);
    d.setMilliseconds(0);
    return d.getTime();
  })();

  const byId = {};
  let nextId = 0;
  let tails = [];

  for (let i = firstGood; i < 24; i++) {
    const payload = hours[i];
    if (!payload) continue;
    const t = new Date(topOfCurrentHourMs - i * 3600_000);

    let pts = [];
    if (Array.isArray(payload)) {
      pts = payload.map(toPoint).filter(Boolean);
    } else if (payload && typeof payload === "object") {
      for (const [k, v] of Object.entries(payload)) {
        const p = toPoint(v?.position ?? v?.pos ?? v?.location ?? v);
        if (p) pts.push({ ...p, _hintId: k });
      }
    }

    if (tails.length === 0) {
      pts.forEach(p => {
        const id = `b${String(nextId++).padStart(3, "0")}`;
        byId[id] = [{ t, lat: p.lat, lon: p.lon, alt: p.alt ?? null }];
        tails.push({ id, lat: p.lat, lon: p.lon });
      });
      continue;
    }

    const candidates = [];
    for (let ti = 0; ti < tails.length; ti++) {
      for (let pi = 0; pi < pts.length; pi++) {
        const d = haversine(tails[ti], pts[pi]);
        if (d <= MAX_LINK) candidates.push({ ti, pi, d });
      }
    }
    candidates.sort((a, b) => a.d - b.d);

    const takenT = new Set();
    const takenP = new Set();
    const assignments = [];

    for (const c of candidates) {
      if (takenT.has(c.ti) || takenP.has(c.pi)) continue;
      takenT.add(c.ti); takenP.add(c.pi);
      assignments.push(c);
    }

    for (const { ti, pi } of assignments) {
      const tail = tails[ti];
      const p = pts[pi];
      byId[tail.id].push({ t, lat: p.lat, lon: p.lon, alt: p.alt ?? null });
    }

    for (let pi = 0; pi < pts.length; pi++) {
      if (takenP.has(pi)) continue;
      const p = pts[pi];
      const id = `b${String(nextId++).padStart(3, "0")}`;
      byId[id] = [{ t, lat: p.lat, lon: p.lon, alt: p.alt ?? null }];
      tails.push({ id, lat: p.lat, lon: p.lon });
    }

    tails = tails.map(tl => {
      const last = byId[tl.id][byId[tl.id].length - 1];
      return { id: tl.id, lat: last.lat, lon: last.lon };
    });
  }

  for (const id of Object.keys(byId)) {
    byId[id].sort((a, b) => a.t - b.t);
    if (byId[id].length < 2) delete byId[id];
  }

  if (Object.keys(byId).length === 0) return demoFallback();

  try {
    let latestMs = 0;
    for (const arr of Object.values(byId)) {
      if (!Array.isArray(arr) || !arr.length) continue;
      const last = arr[arr.length - 1];
      const tMs = last?.t instanceof Date ? last.t.getTime() : Date.parse(last?.t);
      if (Number.isFinite(tMs) && tMs > latestMs) latestMs = tMs;
    }

    if (latestMs > 0 && typeof window !== "undefined" && window.location) {
      const toHourFloor = (ms) => {
        const d = new Date(ms);
        d.setMinutes(0, 0, 0);
        return d.getTime();
      };
      const currHour = toHourFloor(latestMs);
      const prevHour = Number(sessionStorage.getItem("WB_LAST_HOUR_MS")) || 0;
      if (prevHour && currHour > prevHour) {
        sessionStorage.setItem("WB_LAST_HOUR_MS", String(currHour));
        window.location.reload();
      } else if (!prevHour) {
        sessionStorage.setItem("WB_LAST_HOUR_MS", String(currHour));
      }
    }
  } catch {}

  if (typeof document !== "undefined") {
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") {
        window.location.reload();
      }
    });
  }

  return byId;
}
