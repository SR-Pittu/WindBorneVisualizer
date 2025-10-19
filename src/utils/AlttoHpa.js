// crude isothermal barometric model, good enough for bucketing
export function altKmToHpa(altKm) {
  // scale height ~7.0 km; p = p0 * e^(-z/H)
  const H = 7.0;
  return 1013.25 * Math.exp(-altKm / H);
}

// snap to common pressure levels Open-Meteo exposes
export function nearestLevel(hpa) {
  const levels = [1000, 925, 850, 700, 600, 500, 400, 300, 250, 200, 150, 100, 70, 50, 30, 20, 10];
  return levels.reduce((best, l) =>
    Math.abs(l - hpa) < Math.abs(best - hpa) ? l : best, levels[0]);
}
