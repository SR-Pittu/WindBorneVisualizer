import { describe, it, expect } from "vitest";
import { attachWeatherForClusters } from "../derive/enrichWeather";

describe("attachWeatherForClusters", () => {
  it("adds weather properties to clusters", async () => {
    const clusters = [{ id: "C1", centroid: { lat: 10, lon: 10, altKm: 5 } }];
    const wx = await attachWeatherForClusters(clusters);
    expect(wx).toBeTypeOf("object");
    expect(Object.keys(wx)[0]).toContain("C1");
  });
});
