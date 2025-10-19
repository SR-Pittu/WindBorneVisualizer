import { fetchWeatherForClusters } from "../api/weather";

/**
 * Given clusters [{id, centroid:{lat,lon,alt}, memberIds[]}]
 * returns weather per cluster id:
 * { CL001: { windKmh, windFromDeg, tempAltC, tempGroundC, levelHpa }, ... }
 */
export async function attachWeatherForClusters(clusters) {
  if (!clusters?.length) return {};
  try {
    return await fetchWeatherForClusters(clusters);
  } catch {
    return {};
  }
}
