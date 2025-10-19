import { describe, it, expect } from "vitest";
import { deriveHeadingsSpeedAndTailwind } from "../derive/metrics";

describe("deriveHeadingsSpeedAndTailwind - edge cases", () => {
  it("handles identical coordinates (zero movement)", () => {
    const byId = {
      A: [
        { lat: 10, lon: 10, t: 0 },
        { lat: 10, lon: 10, t: 1000 },
      ],
    };
    const r = deriveHeadingsSpeedAndTailwind(byId);
  expect(r.speedKmhById.A ?? null).toBe(0);
  });

  it("handles missing wind data safely", () => {
    const byId = {
      A: [
        { lat: 10, lon: 10, t: 0 },
        { lat: 10, lon: 11, t: 3600000 },
      ],
    };
    const r = deriveHeadingsSpeedAndTailwind(byId);
    expect(r.tailwindDeltaDegById.A ?? null).toBe(null);
  });
});
