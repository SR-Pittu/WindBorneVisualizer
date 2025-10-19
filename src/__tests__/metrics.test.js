import { describe, it, expect } from "vitest";
import { haversineKm } from "../derive/haversine";
import { deriveHeadingsSpeedAndTailwind } from "../derive/metrics";
import { bearingDeg } from "../derive/metrics";
import { norm360 } from "../derive/metrics";


describe("haversineKm", () => {
  it("computes distance between two coordinates", () => {
    const d = haversineKm(0, 0, 0, 1);
    expect(d).toBeGreaterThan(100);
  });
});

describe("deriveHeadingsSpeedAndTailwind", () => {
  it("returns valid tailwind delta", () => {
    const byId = {
      A: [
        { lat: 10, lon: 10, t: 0, windKmh: 50, windFromDeg: 0 },
        { lat: 10, lon: 11, t: 3600000, windKmh: 50, windFromDeg: 0 }
      ]
    };
    const result = deriveHeadingsSpeedAndTailwind(byId);
    expect(result.tailwindDeltaDegById.A).toBeDefined();
  });
});

it("computes ~111 km between 1° lon at equator", () => {
  expect(Math.round(haversineKm(0, 0, 0, 1))).toBe(111);
});

it("bearing from (0,0) to (0,1) should be east (≈90°)", () => {
  const d = bearingDeg({ lat: 0, lon: 0 }, { lat: 0, lon: 1 });
  expect(Math.round(d)).toBeCloseTo(90, 0);
});


it("normalizes angles correctly", () => {
  expect(norm360(-10)).toBe(350);
  expect(norm360(370)).toBe(10);
});