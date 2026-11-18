import { test, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import StatusBadge, {
  STATUS_LABELS,
} from "../starter/src/components/StatusBadge.jsx";

test("task 3: StatusBadge lives in its own module with named status labels", () => {
  expect(STATUS_LABELS).toEqual({
    operational: "Operational",
    degraded: "Degraded",
    down: "Down",
  });
  expect(typeof StatusBadge).toBe("function");
  render(<StatusBadge status="down" />);
  const badge = screen.getByText("Down");
  expect(badge).toHaveClass("badge");
  expect(badge).toHaveClass("badge-down");
});
