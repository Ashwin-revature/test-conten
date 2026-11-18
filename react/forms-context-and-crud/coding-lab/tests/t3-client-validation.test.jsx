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

  await user.click(screen.getByRole("button", { name: "Save service" }));

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
  await user.click(screen.getByRole("button", { name: "Save service" }));
  expect(
    screen.queryByText("Enter a service name."),
  ).not.toBeInTheDocument();
});
