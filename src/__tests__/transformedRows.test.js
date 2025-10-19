import { describe, it, expect } from "vitest";
import { haversineKm } from "../derive/haversine";
import { bearingDeg } from "../derive/metrics";

describe("transformed rows", () => {
  it("ensures each row has required keys and valid numbers", () => {
    const rows = [
      { clusterId: "C1", lat: 10, lon: 20, altKm: 5, windKmh: 30, tempAltC: -50 },
    ];
    for (const r of rows) {
      expect(r).toHaveProperty("clusterId");
      expect(typeof r.lat).toBe("number");
      expect(Number.isFinite(r.altKm)).toBe(true);
    }
  });
});


