import { haversineKm } from "./haversine";

// Bearing from A->B (deg, 0..360)
export function bearingDeg(a, b) {
  const toRad = d => d * Math.PI / 180;
  const toDeg = r => r * 180 / Math.PI;

  const φ1 = toRad(a.lat), φ2 = toRad(b.lat);
  const Δλ = toRad(b.lon - a.lon);

  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1)*Math.sin(φ2) - Math.sin(φ1)*Math.cos(φ2)*Math.cos(Δλ);
  const θ = Math.atan2(y, x);
  return (toDeg(θ) + 360) % 360;
}

export const norm360 = d => ((d % 360) + 360) % 360;
const degToRad = d => d * Math.PI / 180;
const toMs = t => (t < 1e12 ? t * 1000 : t);
const toNum = v => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

// Signed smallest angle from a -> b in degrees (-180..+180]
const signedDelta = (aDeg, bDeg) => {
  let d = norm360(bDeg) - norm360(aDeg);
  if (d > 180) d -= 360;
  if (d <= -180) d += 360;
  return d;
};

/**
 * byId: { [id]: Array<{lat, lon, t: ms|s, windKmh?, windFromDeg? | windDirDegFrom?}> }
 * NOTE: wind direction is assumed "FROM". If your source is already "TO", remove the +180 conversion.
 */
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

  // ---- DEBUG counters ----
  let idsTotal = 0;
  let idsWith2pts = 0;
  let idsWithHeading = 0;
  let idsWithWindDir = 0;
  let idsWithWindSpd = 0;
  let idsWithDelta = 0;

  const idKeys = Object.keys(byId || {});
  idsTotal = idKeys.length;

  for (const [id, ptsRaw] of Object.entries(byId || {})) {
    if (!Array.isArray(ptsRaw) || ptsRaw.length === 0) continue;

    // normalize timestamps & sort
    const pts = ptsRaw
      .map(p => ({ ...p, t: toNum(p.t) != null ? toMs(toNum(p.t)) : NaN }))
      .sort((a, b) => (a.t ?? 0) - (b.t ?? 0));

    const b = pts[pts.length - 1];
    latestById[id] = b;

    if (pts.length >= 2) {
      idsWith2pts++;

      const a = pts[pts.length - 2];

      // Speed (km/h) from last hop
      if (toNum(a.lat) != null && toNum(a.lon) != null && toNum(b.lat) != null && toNum(b.lon) != null) {
        const dKm = haversineKm(a.lat, a.lon, b.lat, b.lon);
        const dtH = (b.t - a.t) / (1000 * 3600);
        const v = dtH > 0 ? dKm / dtH : null;
        if (toNum(v) != null) speedKmhById[id] = v;

        // Track heading (deg-to)
        const hdg = bearingDeg(a, b);
        if (Number.isFinite(hdg)) {
          headingsById[id] = hdg;
          idsWithHeading++;
        }

        // Wind fields on latest point (coerce)
        const wSpd  = toNum(b.windKmh);
        const wFrom = toNum(b.windFromDeg ?? b.windDirDegFrom);

        if (wFrom != null) idsWithWindDir++;
        if (wSpd != null)  idsWithWindSpd++;

        // Compute Δ even if speed is missing (speed only needed for components)
        if (Number.isFinite(hdg) && wFrom != null) {
          const wTo = norm360(wFrom + 180); // FROM -> TO
          windFromDegById[id] = wFrom;
          windToDegById[id] = wTo;
          if (wSpd != null) windKmhById[id] = wSpd;

          const dSigned = signedDelta(hdg, wTo); // wind-to vs track
          const dAbs = Math.abs(dSigned);
          tailwindDeltaDegById[id] = dAbs;
          idsWithDelta++;

          // Only compute components if wind speed exists
          if (wSpd != null) {
            const dRad = degToRad(dSigned);
            const tail = wSpd * Math.cos(dRad);  // +tail, -head
            const cross = wSpd * Math.sin(dRad); // +from right
            tailwindKmhById[id] = tail;
            crosswindKmhById[id] = cross;
            // DEBUG per-id (optional – comment if too noisy)
            // console.log(`[tail/cross] id=${id} tail=${tail.toFixed(1)} km/h cross=${cross.toFixed(1)} km/h Δ=${dAbs.toFixed(1)}°`);
          }
        }
      }
    }
  }

  // ---- One consolidated debug line so you see output even when no ids meet conditions ----
  // eslint-disable-next-line no-console
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
