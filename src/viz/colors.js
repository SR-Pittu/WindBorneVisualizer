export function tailHeadColor(delta) {
  if (delta == null) return "#3388ff";
  if (delta <= 45) return "#29a34a";       // tailwind
  if (delta <= 135) return "#d0b000";      // crosswind
  return "#d64545";                        // headwind
}
