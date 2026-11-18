import { test, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import App from "../starter/src/App.jsx";
import { stubCrudFetch, mutationCalls } from "./helpers.js";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

test("task 3: submitting invalid input shows accessible field errors without calling the API", async () => {
  const api = stubCrudFetch();
  render(
    <MemoryRouter initialEntries={["/services/new"]}>
      <App />
    </MemoryRouter>,
  );
  const user = userEvent.setup();

  // Record whether the submit event was cancelled. React's handler runs
  // before the event bubbles up to window.
  const submits = [];
  const record = (event) => submits.push(event.defaultPrevented);
  window.addEventListener("submit", record);
  await user.click(screen.getByRole("button", { name: "Save service" }));
  window.removeEventListener("submit", record);
  expect(submits).toEqual([true]);

  const nameError = await screen.findByText("Enter a service name.");
  expect(nameError).toHaveAttribute("id", "name-error");
  const teamError = screen.getByText("Choose the owning team.");
  expect(teamError).toHaveAttribute("id", "team-error");

  const name = screen.getByLabelText("Service name");
  expect(name).toHaveAttribute("aria-describedby", "name-error");
  expect(name).toHaveAttribute("aria-invalid", "true");
  const team = screen.getByLabelText("Owning team");
  expect(team).toHaveAttribute("aria-describedby", "team-error");
  expect(team).toHaveAttribute("aria-invalid", "true");

  // The client check happens before any request is sent.
  expect(mutationCalls(api)).toHaveLength(0);

  // Fixing the fields clears the errors on the next submit.
  await user.type(name, "Image Resizer");
  await user.selectOptions(team, "Storefront");
  // Hold the request so the form stays mounted while we look.
  api.holdNextMutation = true;
  await user.click(screen.getByRole("button", { name: "Save service" }));
  expect(screen.queryByText("Enter a service name.")).not.toBeInTheDocument();
  expect(screen.queryByText("Choose the owning team.")).not.toBeInTheDocument();
  expect(name).not.toHaveAttribute("aria-invalid", "true");
  expect(team).not.toHaveAttribute("aria-invalid", "true");

  // Once task 4 sends the request, let it finish so nothing is left in flight.
  if (api.releaseHeld) {
    api.releaseHeld();
    await screen.findByRole("heading", { level: 3, name: "Image Resizer" });
  }
});
