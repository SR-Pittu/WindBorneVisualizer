import axios from "axios";

// Map approximate flight altitude (km) to nearest pressure level hPa
export function altKmToNearestHpa(altKm) {
  const table = [
    { h: 50,  km: 20.5 },
    { h: 70,  km: 18.5 },
    { h: 100, km: 16.2 },
    { h: 200, km: 12.0 },
    { h: 300, km: 9.5  },
    { h: 400, km: 7.5  },
    { h: 500, km: 6.0  },
    { h: 700, km: 3.5  },
  ];
  let best = table[0].h, bestD = Infinity;
  for (const r of table) {
    const d = Math.abs(altKm - r.km);
    if (d < bestD) { bestD = d; best = r.h; }
  }
  return best;
}

// simple promise pool
async function runWithConcurrency(items, limit, worker) {
  const ret = new Array(items.length);
  let i = 0, running = 0;
  return new Promise((resolve) => {
    const kick = () => {
      if (i >= items.length && running === 0) return resolve(ret);
      while (running < limit && i < items.length) {
        const idx = i++, payload = items[idx];
        running++;
        Promise.resolve(worker(payload, idx))
          .then(res => { ret[idx] = res; })
          .catch(() => { ret[idx] = null; })
          .finally(() => { running--; kick(); });
      }
    };
    kick();
  });
}

// retry with exp backoff + jitter
async function withRetry(fn, attempts = 2, baseMs = 600) {
  let err;
  for (let a = 1; a <= attempts; a++) {
    try { return await fn(); }
    catch (e) {
      err = e;
      const j = Math.floor(Math.random() * 250);
      const wait = baseMs * Math.pow(1.8, a-1) + j;
      await new Promise(r => setTimeout(r, wait));
    }
  }
  throw err;
}

async function fetchSingleForecast({ lat, lon, levelHpa }) {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    pressure_levels: String(levelHpa),
    hourly: [
      `windspeed_${levelHpa}hPa`,
      `winddirection_${levelHpa}hPa`,
      `temperature_${levelHpa}hPa`,
      "temperature_2m",
    ].join(","),
    timezone: "UTC",
  });
  const url = `https://api.open-meteo.com/v1/forecast?${params.toString()}`;
  const { data } = await axios.get(url, { timeout: 150000 });

  const t = data?.hourly?.time;
  if (!t || !t.length) return null;

  // last hour as "current-ish"
  const i = t.length - 1;
  const windKmh = data.hourly[`windspeed_${levelHpa}hPa`]?.[i] ?? null;
  const windFromDeg = data.hourly[`winddirection_${levelHpa}hPa`]?.[i] ?? null;
  const tempAltC = data.hourly[`temperature_${levelHpa}hPa`]?.[i] ?? null;
  const tempGroundC = data.hourly[`temperature_2m`]?.[i] ?? null;

  return { windKmh, windFromDeg, tempAltC, tempGroundC, levelHpa };
}

/**
 * Fetch weather **for clusters**: one request per cluster centroid (reduced load).
 * Concurrency is capped; retries handle 429.
 * @param {Array} clusters [{id, centroid:{lat,lon,alt}}]
 * @returns {Object} wxByClusterId
 */
export async function fetchWeatherForClusters(clusters) {
  if (!clusters?.length) return {};

  // Build request list
  const reqs = clusters.map(c => {
    const levelHpa = altKmToNearestHpa(c.centroid.alt);
    return { clusterId: c.id, lat: c.centroid.lat, lon: c.centroid.lon, levelHpa };
  });

  const worker = async (r) => withRetry(
    () => fetchSingleForecast({ lat: r.lat, lon: r.lon, levelHpa: r.levelHpa }),
    2, 700
  );

  const out = await runWithConcurrency(reqs, /*limit*/ 4, worker);

  const byId = {};
  out.forEach((wx, i) => {
    const { clusterId, levelHpa } = reqs[i];
    if (wx) byId[clusterId] = { ...wx, levelHpa };
  });
  return byId;
}
