import { render, screen } from "@testing-library/react";
import Summary from "../viz/summary";

test("renders flight summary title", () => {
  render(<Summary rows={[]} />);
  expect(screen.getByText(/Flight Summary/i)).toBeInTheDocument();
});

test("Summary layout snapshot", () => {
  const { asFragment } = render(<Summary rows={[]} />);
  expect(asFragment()).toMatchSnapshot();
});