import { describe, it, expect } from "vitest";
import { clusterLatestPoints } from "../derive/clusters";

describe("clusterLatestPoints", () => {
  it("groups nearby points into clusters", () => {
    const sample = {
      A: [{ lat: 10, lon: 10, alt: 100 }],
      B: [{ lat: 10.1, lon: 10.1, alt: 100 }],
      C: [{ lat: -20, lon: 150, alt: 100 }],
    };
    const clusters = clusterLatestPoints(sample, 2);
    expect(clusters.length).toBeGreaterThan(0);
    expect(clusters[0]).toHaveProperty("centroid");
  });
});
