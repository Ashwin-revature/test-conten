import { test, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../starter/src/App.jsx";

test("task 6: one click of Run checks performs all three regional checks", async () => {
  render(<App />);
  const user = userEvent.setup();

  expect(screen.getByText("0 checks run")).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Run checks" }));
  expect(screen.getByText("3 checks run")).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Run checks" }));
  expect(screen.getByText("6 checks run")).toBeInTheDocument();
});
