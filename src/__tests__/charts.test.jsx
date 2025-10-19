import { render } from "@testing-library/react";
import ScatterAltWind from "../viz/ScatterAltWind";
import WindRose from "../viz/WindRose";

test("renders ScatterAltWind without crashing", () => {
  const mockRows = [{ altKm: 5, windKmh: 40, speedKmh: 20 }];
  render(<ScatterAltWind rows={mockRows} />);
});

test("renders WindRose with valid rows", () => {
  const mockRows = [{ windFromDeg: 90, speedKmh: 25 }];
  render(<WindRose rows={mockRows} />);
});
