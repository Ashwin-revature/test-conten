import { test, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import DashboardHeader from "../starter/src/components/DashboardHeader.jsx";

test("task 1: the masthead is valid JSX with a computed service count", () => {
  render(<DashboardHeader serviceCount={6} />);
  const banner = screen.getByRole("banner");
  expect(banner).toHaveClass("masthead");
  expect(
    screen.getByRole("heading", { level: 1, name: "Beacon" }),
  ).toBeInTheDocument();
  expect(screen.getByRole("img", { name: "Beacon logo" })).toBeInTheDocument();
  expect(banner.textContent).toMatch(/6 services monitored/);
  expect(banner.textContent).toMatch(/All times UTC/);
});
