// src/derive/cluster.js

// --- tiny helpers ------------------------------------------------------------
const centroid3 = (pts) => {
  if (!pts.length) return { lat: 0, lon: 0, alt: 0 };
  let lat = 0, lon = 0, alt = 0;
  for (const p of pts) { lat += p.lat; lon += p.lon; alt += p.alt; }
  const n = pts.length;
  return { lat: lat / n, lon: lon / n, alt: alt / n };
};

const sqDist = (a, b) =>
  (a.lat - b.lat) * (a.lat - b.lat) +
  (a.lon - b.lon) * (a.lon - b.lon) +
  (a.alt - b.alt) * (a.alt - b.alt);

// --- k-means in 3D (lat, lon, alt) ------------------------------------------
/**
 * @param {Array<{lat:number, lon:number, alt:number}>} points
 * @param {number} k
 * @param {number} iters
 * @returns {{labels:number[], centroids:Array<{lat:number,lon:number,alt:number}>}}
 */
export function kMeans(points, k, iters = 10) {
  const n = points?.length || 0;
  if (!n) return { labels: [], centroids: [] };

  // clamp k
  k = Math.max(1, Math.min(k || 1, n));

  // deterministic-ish init: evenly spaced seeds
  const step = n / k;
  let centroids = Array.from({ length: k }, (_, i) => {
    const p = points[Math.floor(i * step)];
    return { lat: +p.lat, lon: +p.lon, alt: +p.alt };
  });

  let labels = new Array(n).fill(0);

  for (let iter = 0; iter < iters; iter++) {
    // assign
    for (let i = 0; i < n; i++) {
      const p = points[i];
      let best = 0;
      let bestD = Infinity;
      for (let c = 0; c < k; c++) {
        const d = sqDist(p, centroids[c]);
        if (d < bestD) { bestD = d; best = c; }
      }
      labels[i] = best;
    }

    // update
    const buckets = Array.from({ length: k }, () => []);
    for (let i = 0; i < n; i++) buckets[labels[i]].push(points[i]);
    for (let c = 0; c < k; c++) {
      if (buckets[c].length) {
        centroids[c] = centroid3(buckets[c]);
      }
      // if a bucket is empty, keep the old centroid to avoid NaNs
    }
  }

  return { labels, centroids };
}

// --- public API --------------------------------------------------------------
/**
 * Build clusters from WindBorne 24h tracks, using **latest** point per balloon.
 * @param {{[id:string]: Array<{t:string|number, lat:number, lon:number, alt:number}>}} byId
 * @param {number} k desired cluster count (auto-reduced if needed)
 * @returns {Array<{id:string, size:number, centroid:{lat:number,lon:number,alt:number}, members:string[]}>}
 */
export function clusterLatestPoints(byId, k = 100) {
  if (!byId || typeof byId !== "object") return [];

  const ids = Object.keys(byId);
  const latestPts = [];
  const idList = [];

  for (const id of ids) {
    const segs = byId[id];
    if (!Array.isArray(segs) || !segs.length) continue;
    const last = segs[segs.length - 1];
    const lat = +last?.lat, lon = +last?.lon, alt = +last?.alt;
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || !Number.isFinite(alt)) continue;
    latestPts.push({ lat, lon, alt });
    idList.push(id);
  }

  if (!latestPts.length) return [];

  const kEff = Math.max(1, Math.min(k, latestPts.length));
  const { labels, centroids } = kMeans(latestPts, kEff);

  // collect members per label
  const members = Array.from({ length: kEff }, () => []);
  labels.forEach((c, i) => members[c].push(idList[i]));

  // compute final centroids from real members (more stable)
  const clusters = members.map((m, i) => {
    const pts = m.map(id => {
      const segs = byId[id];
      const last = segs[segs.length - 1];
      return { lat: +last.lat, lon: +last.lon, alt: +last.alt };
    });
    const cen = pts.length ? centroid3(pts) : centroids[i]; // fallback to kmeans centroid
    return {
      id: `C${i + 1}`,
      size: m.length,
      centroid: cen,
      members: m,
    };
  });

  return clusters;
}
