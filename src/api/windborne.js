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
  const h = Math.sin(dLat/2)**2 + Math.cos(sLat1)*Math.cos(sLat2)*Math.sin(dLon/2)**2;
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
    const { data } = await axios.get(`${BASE}/${String(i).padStart(2,"0")}.json`, { timeout: 8000 });
    return data;
  } catch {
    return null;
  }
}
const MAX_LINK = 1200e3; 

export async function fetchConstellation24h() {
  const hours = await Promise.all(Array.from({ length: 24 }, (_, i) => fetchHour(i)));


  const firstGood = hours.findIndex(Boolean);
  if (firstGood === -1) return demoFallback();

  const baseNow = Date.now() - firstGood * 3600_000;


  /** @type {Record<string, Array<{t:Date,lat:number,lon:number,alt:number|null}>>} */
  const byId = {};
  let nextId = 0;

  
  /** @type {Array<{id:string, lat:number, lon:number}>} */
  let tails = [];

  for (let i = firstGood; i < 24; i++) {
    const payload = hours[i];
    if (!payload) continue;

    const t = new Date(baseNow - i * 3600_000);

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
  return byId;
}