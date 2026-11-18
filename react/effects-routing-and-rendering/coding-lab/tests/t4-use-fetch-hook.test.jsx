import { test, expect, afterEach, vi } from "vitest";
import { renderHook, waitFor, cleanup } from "@testing-library/react";
import { useFetch } from "../starter/src/hooks/use-fetch.js";
import { jsonResponse } from "./helpers.js";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

test("task 4: useFetch manages loading, data and errors and refetches when the url changes", async () => {
  const bodies = {
    "/api/a": { from: "a" },
    "/api/b": { from: "b" },
  };
  const fetchMock = vi.fn(async (url) => {
    if (url === "/api/fails") {
      return jsonResponse(500, { error: "boom" });
    }
    return jsonResponse(200, bodies[url]);
  });
  vi.stubGlobal("fetch", fetchMock);

  const { result, rerender } = renderHook(({ url }) => useFetch(url), {
    initialProps: { url: "/api/a" },
  });

  // Loading state first, no data yet.
  expect(result.current.loading).toBe(true);
  expect(result.current.data).toBeNull();
  expect(result.current.error).toBeNull();

  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.data).toEqual({ from: "a" });
  expect(result.current.error).toBeNull();

  // Changing the url must re-run the Effect (it is a dependency).
  rerender({ url: "/api/b" });
  await waitFor(() => expect(result.current.data).toEqual({ from: "b" }));
  expect(fetchMock.mock.calls.length).toBeGreaterThanOrEqual(2);

  // A non-2xx response becomes an error, not data.
  rerender({ url: "/api/fails" });
  await waitFor(() => expect(result.current.error).not.toBeNull());
  expect(result.current.error.message).toBe("HTTP 500");
  expect(result.current.data).toBeNull();
  expect(result.current.loading).toBe(false);

  // Two components calling the hook keep independent state.
  const first = renderHook(() => useFetch("/api/a"));
  const second = renderHook(() => useFetch("/api/b"));
  await waitFor(() => expect(first.result.current.data).toEqual({ from: "a" }));
  await waitFor(() =>
    expect(second.result.current.data).toEqual({ from: "b" }),
  );
});
