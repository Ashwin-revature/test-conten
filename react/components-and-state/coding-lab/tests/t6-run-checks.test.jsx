import { test, expect } from "vitest";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../starter/src/App.jsx";

test("task 6: one click of Run checks performs all three regional checks", async () => {
  render(<App />);
  const user = userEvent.setup();
  const runChecks = screen.getByRole("button", { name: "Run checks" });
  const counter = screen.getByText(/checks run/);

  expect(counter).toHaveTextContent("0 checks run");
  await user.click(runChecks);
  expect(counter).toHaveTextContent("3 checks run");

  // Two quick clicks inside one act(): React handles both clicks before it
  // re-renders, so the second click still sees the old checksRun value. Only
  // updater functions count all six probes from these two clicks.
  act(() => {
    runChecks.click();
    runChecks.click();
  });
  expect(counter).toHaveTextContent("9 checks run");
});
