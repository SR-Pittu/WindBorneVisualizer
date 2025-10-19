import { render } from "@testing-library/react";
import Summary from "../viz/summary";

test("Summary layout snapshot", () => {
  const { asFragment } = render(<Summary rows={[]} />);
  expect(asFragment()).toMatchSnapshot();
});
