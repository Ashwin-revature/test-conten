import { test, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import App from "../starter/src/App.jsx";
import { stubSecuredFetch, signInAs } from "./helpers.js";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function card(name) {
  return screen.getByRole("heading", { level: 3, name }).closest("li");
}

test("task 6: a 403 shows a not-allowed message without signing the user out", async () => {
  // The operator may ask, the server says 403, and the session survives.
  stubSecuredFetch();
  render(
    <MemoryRouter initialEntries={["/"]}>
      <App />
    </MemoryRouter>,
  );
  let user = userEvent.setup();
  await screen.findByRole("heading", { level: 2, name: "Sign in to Beacon" });
  await signInAs("omar", screen, user);
  await screen.findByRole("heading", { level: 3, name: "Catalog API" });

  await user.click(
    within(card("Catalog API")).getByRole("button", {
      name: "Request restart",
    }),
  );
  const alert = await screen.findByRole("alert");
  expect(alert).toHaveTextContent("You are not allowed to do that.");
  expect(screen.getByText(/Signed in as Omar Reed/)).toBeInTheDocument();
  expect(
    screen.getByRole("heading", { level: 2, name: "Service overview" }),
  ).toBeInTheDocument();

  cleanup();
  vi.unstubAllGlobals();

  // The admin's same action succeeds.
  stubSecuredFetch();
  render(
    <MemoryRouter initialEntries={["/"]}>
      <App />
    </MemoryRouter>,
  );
  user = userEvent.setup();
  await screen.findByRole("heading", { level: 2, name: "Sign in to Beacon" });
  await signInAs("avery", screen, user);
  await screen.findByRole("heading", { level: 3, name: "Catalog API" });

  await user.click(
    within(card("Catalog API")).getByRole("button", {
      name: "Request restart",
    }),
  );
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Restart requested for Catalog API.",
  );
});
