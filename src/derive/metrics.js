import { haversineKm } from "./haversine";

export function bearingDeg(a, b) {
  const toRad = d => d * Math.PI / 180;
  const toDeg = r => r * 180 / Math.PI;
  const φ1 = toRad(a.lat), φ2 = toRad(b.lat);
  const Δλ = toRad(b.lon - a.lon);
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  const θ = Math.atan2(y, x);
  return (toDeg(θ) + 360) % 360;
}

export const norm360 = d => ((d % 360) + 360) % 360;
const degToRad = d => d * Math.PI / 180;

const coerceMs = (v) => {
  if (v == null) return NaN;
  if (typeof v === "number") return v < 1e12 ? v * 1000 : v;
  if (typeof v === "string") {
    const n = Number(v);
    if (Number.isFinite(n)) return n < 1e12 ? n * 1000 : n;
    const p = Date.parse(v);
    return Number.isFinite(p) ? p : NaN;
  }
  return NaN;
};

const pickTimeMs = (p) => {
  const tRaw =
    (p && (p.t ?? p.ts ?? p.time ?? p.date ?? p.timestamp ?? p.datetime)) ??
    (Array.isArray(p) ? p[3] : undefined);
  return coerceMs(tRaw);
};

const toNum = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const signedDelta = (aDeg, bDeg) => {
  let d = norm360(bDeg) - norm360(aDeg);
  if (d > 180) d -= 360;
  if (d <= -180) d += 360;
  return d;
};

export function deriveHeadingsSpeedAndTailwind(byId) {
  const latestById = {};
  const headingsById = {};
  const speedKmhById = {};
  const windKmhById = {};
  const windFromDegById = {};
  const windToDegById = {};
  const tailwindDeltaDegById = {};
  const tailwindKmhById = {};
  const crosswindKmhById = {};

  for (const [id, ptsRaw] of Object.entries(byId || {})) {
    if (!Array.isArray(ptsRaw) || ptsRaw.length === 0) continue;

    const pts = ptsRaw
      .map((p) => {
        if (Array.isArray(p)) {
          const [lat, lon, altKm] = p;
          return { lat, lon, altKm, t: pickTimeMs(p) };
        }
        return { ...p, t: pickTimeMs(p) };
      })
      .filter((p) => Number.isFinite(p.t))
      .sort((a, b) => a.t - b.t);

    if (!pts.length) continue;

    const b = pts[pts.length - 1];
    latestById[id] = b;

    if (pts.length >= 2) {
      const a = pts[pts.length - 2];

      if (toNum(a.lat) != null && toNum(a.lon) != null && toNum(b.lat) != null && toNum(b.lon) != null) {
        const dKm = haversineKm(a.lat, a.lon, b.lat, b.lon);
        const dtH = (b.t - a.t) / (1000 * 3600);
        const v = dtH > 0 ? dKm / dtH : null;
        if (toNum(v) != null) speedKmhById[id] = Math.round(v * 100) / 100;


        const hdg = bearingDeg(a, b);
        if (Number.isFinite(hdg)) {
          headingsById[id] = hdg;
        }

        const wSpd = toNum(b.windKmh);
        const wFrom = toNum(b.windFromDeg ?? b.windDirDegFrom);
        if (Number.isFinite(hdg) && wFrom != null) {
          const wTo = norm360(wFrom + 180);
          windFromDegById[id] = wFrom;
          windToDegById[id] = wTo;
          if (wSpd != null) windKmhById[id] = wSpd;

          const dSigned = signedDelta(hdg, wTo);
          const dAbs = Math.abs(dSigned);
          tailwindDeltaDegById[id] = dAbs;

          if (wSpd != null) {
            const dRad = degToRad(dSigned);
            tailwindKmhById[id] = wSpd * Math.cos(dRad);
            crosswindKmhById[id] = wSpd * Math.sin(dRad);
          }
        }
      }
    }
  }

  return {
    latestById,
    headingsById,
    speedKmhById,
    windKmhById,
    windFromDegById,
    windToDegById,
    tailwindDeltaDegById,
    tailwindKmhById,
    crosswindKmhById,
  };
}
