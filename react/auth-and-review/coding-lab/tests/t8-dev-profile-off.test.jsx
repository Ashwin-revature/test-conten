import { test, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import App from "../starter/src/App.jsx";
import { apiUrl } from "../starter/src/api.js";
import { stubSecuredFetch } from "./helpers.js";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

test("task 8: the dev auto-sign-in is off and the API address comes from the environment", async () => {
  // Nobody is signed in automatically any more: the app starts at the login
  // page, exactly like production without the dev profile.
  stubSecuredFetch();
  render(
    <MemoryRouter initialEntries={["/"]}>
      <App />
    </MemoryRouter>,
  );
  expect(
    await screen.findByRole("heading", { level: 2, name: "Sign in to Beacon" }),
  ).toBeInTheDocument();
  expect(screen.queryByText(/Dev Admin/)).not.toBeInTheDocument();

  // The API base address is an environment concern, not a code edit.
  expect(apiUrl("/services")).toBe("/api/services");
  vi.stubEnv("VITE_API_URL", "https://status.example.com/api");
  expect(apiUrl("/services")).toBe(
    "https://status.example.com/api/services",
  );
  vi.stubEnv("VITE_API_URL", "https://staging.example.net/api");
  expect(apiUrl("/login")).toBe("https://staging.example.net/api/login");
});
