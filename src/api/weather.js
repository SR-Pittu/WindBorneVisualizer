// weatherClient.js
import axios from "axios";

/**
 * Snap approximate flight altitude (km) to a common pressure level (hPa).
 * Values roughly follow GFS typical geopotential heights.
 */
export function altKmToNearestHpa(altKm) {
  const table = [
    { h: 300, km: 9.2 },  { h: 250, km: 10.4 }, { h: 200, km: 11.8 },
    { h: 150, km: 13.5 }, { h: 100, km: 15.8 }, { h: 70,  km: 17.7 },
    { h: 50,  km: 19.3 }, { h: 40,  km: 20.0 }, { h: 30,  km: 22.0 },
  ];
  let best = table[0].h, bestD = Infinity;
  for (const r of table) {
    const d = Math.abs(altKm - r.km);
    if (d < bestD) { bestD = d; best = r.h; }
  }
  return best;
}

/**
 * Very small promise pool to cap concurrency.
 * @template T,R
 * @param {T[]} items
 * @param {number} limit
 * @param {(item: T, index: number) => Promise<R>} worker
 * @returns {Promise<(R|null)[]>}
 */
async function runWithConcurrency(items, limit, worker) {
  const out = new Array(items.length);
  let i = 0, running = 0;
  return new Promise((resolve) => {
    const kick = () => {
      if (i >= items.length && running === 0) return resolve(out);
      while (running < limit && i < items.length) {
        const idx = i++;
        running++;
        Promise.resolve(worker(items[idx], idx))
          .then(res => { out[idx] = res; })
          .catch(() => { out[idx] = null; })
          .finally(() => { running--; kick(); });
      }
    };
    kick();
  });
}

/**
 * Retry helper with exponential backoff + jitter.
 * @template T
 * @param {() => Promise<T>} fn
 * @param {number} attempts
 * @param {number} baseMs
 * @returns {Promise<T>}
 */
async function withRetry(fn, attempts = 2, baseMs = 600) {
  let lastErr;
  for (let a = 1; a <= attempts; a++) {
    try { return await fn(); }
    catch (e) {
      lastErr = e;
      const jitter = Math.floor(Math.random() * 250);
      const wait = baseMs * Math.pow(1.8, a - 1) + jitter;
      await new Promise(r => setTimeout(r, wait));
    }
  }
  throw lastErr;
}

/**
 * Fetch a single pressure-level forecast near "now" for a coordinate.
 * Uses Open-Meteo hourly fields with explicit pressure_levels.
 * @param {{lat:number, lon:number, levelHpa:number}} args
 * @returns {Promise<{
 *   windKmh: number|null,
 *   windFromDeg: number|null,
 *   tempAltC: number|null,
 *   tempGroundC: number|null,
 *   levelHpa: number
 * } | null>}
 */
async function fetchSingleForecast({ lat, lon, levelHpa }) {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    pressure_levels: String(levelHpa),
    hourly: [
      `wind_speed_${levelHpa}hPa`,
      `wind_direction_${levelHpa}hPa`,
      `temperature_${levelHpa}hPa`,
      "temperature_2m",
    ].join(","),
    timezone: "UTC",
    // Optional: pick a model that supports pressure levels
    // models: "gfs_global",
  });

  const url = `https://api.open-meteo.com/v1/forecast?${params.toString()}`;
  const { data } = await axios.get(url, { timeout: 150000 });

  const t = data?.hourly?.time;
  if (!t || !t.length) return null;

  // Use the last hour as "current-ish"
  const i = t.length - 1;
  const windKmh = data.hourly?.[`wind_speed_${levelHpa}hPa`]?.[i] ?? null;
  const windFromDeg = data.hourly?.[`wind_direction_${levelHpa}hPa`]?.[i] ?? null;
  const tempAltC = data.hourly?.[`temperature_${levelHpa}hPa`]?.[i] ?? null;
  const tempGroundC = data.hourly?.["temperature_2m"]?.[i] ?? null;

  return { windKmh, windFromDeg, tempAltC, tempGroundC, levelHpa };
}

/**
 * Fetch weather for clusters by querying one point per cluster centroid.
 * Concurrency is limited and requests are retried to handle transient errors / 429s.
 *
 * @param {Array<{id:string|number, centroid:{lat:number, lon:number, alt:number}}>} clusters
 * @returns {Promise<Record<string|number, {
 *   windKmh: number|null,
 *   windFromDeg: number|null,
 *   tempAltC: number|null,
 *   tempGroundC: number|null,
 *   levelHpa: number
 * }>>}
 */
export async function fetchWeatherForClusters(clusters) {
  if (!clusters?.length) return {};

  // Build the request list (snap each centroid altitude to a pressure level)
  const reqs = clusters.map(c => {
    const levelHpa = altKmToNearestHpa(c.centroid.alt);
    return { clusterId: c.id, lat: c.centroid.lat, lon: c.centroid.lon, levelHpa };
  });

  // Work function with retry
  const worker = async (r) => withRetry(
    () => fetchSingleForecast({ lat: r.lat, lon: r.lon, levelHpa: r.levelHpa }),
    /* attempts */ 3,
    /* base backoff ms */ 700
  );

  // Limit concurrency to 4 to be gentle on the API
  const results = await runWithConcurrency(reqs, 4, worker);

  // Assemble output keyed by clusterId
  /** @type {Record<string|number, any>} */
  const byId = {};
  results.forEach((wx, i) => {
    const { clusterId } = reqs[i];
    if (wx) byId[clusterId] = wx;
  });

  return byId;
}
