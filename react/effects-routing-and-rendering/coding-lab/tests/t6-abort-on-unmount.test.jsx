import { test, expect, afterEach, vi } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import App from "../starter/src/App.jsx";
import { stubPendingFetch } from "./helpers.js";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

test("task 6: an unmounted request is aborted through the effect cleanup", async () => {
  const pending = stubPendingFetch();
  const view = render(
    <MemoryRouter initialEntries={["/"]}>
      <App />
    </MemoryRouter>,
  );

  // The request was started with an AbortSignal...
  expect(pending.signal).not.toBeNull();
  expect(pending.signal.aborted).toBe(false);

  // ...and leaving the page aborts it instead of letting it hang around.
  view.unmount();
  expect(pending.signal.aborted).toBe(true);
});
