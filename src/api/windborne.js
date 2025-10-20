import axios from "axios";



const DEV = "/wb";       
const PROD = "https://a.windbornesystems.com/treasure";
const isLocal = () => location.hostname === "localhost" || location.hostname === "127.0.0.1";
const BASE = isLocal() ? DEV : PROD;


const EARTH_R = 6371e3;
const toRad = d => d * Math.PI / 180;
const haversine = (a, b) => {
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const sLat1 = toRad(a.lat), sLat2 = toRad(b.lat);
  const h = Math.sin(dLat/2)**2 + Math.cos(sLat1)*Math.cos(sLat2)*Math.sin(dLon/2)**2;
  return 2 * EARTH_R * Math.asin(Math.sqrt(h));
};

// accept arrays or objects
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
    const { data } = await axios.get(`${BASE}/${String(i).padStart(2,"0")}.json`, { timeout: 8000 });
    return data;
  } catch {
    return null;
  }
}

// Greedy nearest-neighbor assignment with a distance cap.
// If a point is farther than MAX_LINK from every existing track, start a new track.
const MAX_LINK = 1200e3; 

export async function fetchConstellation24h() {
  const hours = await Promise.all(Array.from({ length: 24 }, (_, i) => fetchHour(i)));

  // find the most recent good hour (00.json ideally)
  const firstGood = hours.findIndex(Boolean);
  if (firstGood === -1) return demoFallback();

  const baseNow = Date.now() - firstGood * 3600_000;

  // Active tracks keyed by id
  /** @type {Record<string, Array<{t:Date,lat:number,lon:number,alt:number|null}>>} */
  const byId = {};
  let nextId = 0;

  // Keep a list of current track tails (last point) for matching
  /** @type {Array<{id:string, lat:number, lon:number}>} */
  let tails = [];

  for (let i = firstGood; i < 24; i++) {
    const payload = hours[i];
    if (!payload) continue;

    const t = new Date(baseNow - i * 3600_000);

    // Normalize the hour’s points
    let pts = [];
    if (Array.isArray(payload)) {
      // payload like [[lat,lon,alt], ...]  (what you pasted)
      pts = payload.map(toPoint).filter(Boolean);
    } else if (payload && typeof payload === "object") {
      // fallback: object of { id: {position: ... } }
      for (const [k, v] of Object.entries(payload)) {
        const p = toPoint(v?.position ?? v?.pos ?? v?.location ?? v);
        if (p) pts.push({ ...p, _hintId: k });
      }
    }

    // First hour with data: seed tracks directly
    if (tails.length === 0) {
      pts.forEach(p => {
        const id = `b${String(nextId++).padStart(3, "0")}`;
        byId[id] = [{ t, lat: p.lat, lon: p.lon, alt: p.alt ?? null }];
        tails.push({ id, lat: p.lat, lon: p.lon });
      });
      continue;
    }

    // Build all candidate distances (track tail -> point)
    const candidates = [];
    for (let ti = 0; ti < tails.length; ti++) {
      for (let pi = 0; pi < pts.length; pi++) {
        const d = haversine(tails[ti], pts[pi]);
        if (d <= MAX_LINK) candidates.push({ ti, pi, d });
      }
    }
    // Sort by distance for greedy matching
    candidates.sort((a, b) => a.d - b.d);

    const takenT = new Set();
    const takenP = new Set();
    const assignments = [];

    for (const c of candidates) {
      if (takenT.has(c.ti) || takenP.has(c.pi)) continue;
      takenT.add(c.ti); takenP.add(c.pi);
      assignments.push(c);
    }

    // Append matched points to existing tracks
    for (const { ti, pi } of assignments) {
      const tail = tails[ti];
      const p = pts[pi];
      byId[tail.id].push({ t, lat: p.lat, lon: p.lon, alt: p.alt ?? null });
    }

    // Unmatched points start new tracks
    for (let pi = 0; pi < pts.length; pi++) {
      if (takenP.has(pi)) continue;
      const p = pts[pi];
      const id = `b${String(nextId++).padStart(3, "0")}`;
      byId[id] = [{ t, lat: p.lat, lon: p.lon, alt: p.alt ?? null }];
      tails.push({ id, lat: p.lat, lon: p.lon });
    }

    // Update tails to the hour’s last positions
    // (Set to each track’s last point to prepare for next hour)
    tails = tails.map(tl => {
      const last = byId[tl.id][byId[tl.id].length - 1];
      return { id: tl.id, lat: last.lat, lon: last.lon };
    });
  }

  // Cleanup + sort
  for (const id of Object.keys(byId)) {
    byId[id].sort((a, b) => a.t - b.t);
    // Optional: drop very short tracks (e.g., singletons)
    if (byId[id].length < 2) delete byId[id];
  }

  if (Object.keys(byId).length === 0) return demoFallback();
  return byId;
}