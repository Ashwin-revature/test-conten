import { vi } from "vitest";

export const SERVICES = [
  {
    id: "catalog-api",
    name: "Catalog API",
    team: "Storefront",
    status: "operational",
    uptime: "99.98%",
    summary: "Product and price lookups for the storefront.",
  },
  {
    id: "checkout-api",
    name: "Checkout API",
    team: "Payments",
    status: "degraded",
    uptime: "97.21%",
    summary: "Order placement and payment capture.",
  },
  {
    id: "email-relay",
    name: "Email Relay",
    team: "Messaging",
    status: "down",
    uptime: "91.44%",
    summary: "Outbound transactional mail.",
  },
  {
    id: "image-cdn",
    name: "Image CDN",
    team: "Storefront",
    status: "operational",
    uptime: "99.99%",
    summary: "Resized product images at the edge.",
  },
  {
    id: "search-index",
    name: "Search Index",
    team: "Discovery",
    status: "degraded",
    uptime: "98.05%",
    summary: "Full-text product search.",
  },
  {
    id: "auth-service",
    name: "Auth Service",
    team: "Platform",
    status: "operational",
    uptime: "99.95%",
    summary: "Sign-in and session management.",
  },
];

export function jsonResponse(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  };
}

// Standard happy-path API: list and detail routes, 404 for unknown ids.
export function stubRoutedFetch() {
  const fetchMock = vi.fn(async (url, options = {}) => {
    const path = String(url).split("?")[0];
    if (path === "/api/services") {
      return jsonResponse(200, SERVICES);
    }
    const detail = path.match(/^\/api\/services\/([a-z0-9-]+)$/);
    if (detail) {
      const service = SERVICES.find((entry) => entry.id === detail[1]);
      return service
        ? jsonResponse(200, service)
        : jsonResponse(404, { error: "unknown service" });
    }
    return jsonResponse(404, { error: "unknown endpoint" });
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

// A fetch whose promise never settles until you resolve it; records the
// AbortSignal it was called with.
export function stubPendingFetch() {
  const state = { signal: null, resolve: null };
  const fetchMock = vi.fn(
    (url, options = {}) =>
      new Promise((resolve, reject) => {
        state.signal = options.signal ?? null;
        state.resolve = (status, body) => resolve(jsonResponse(status, body));
        if (options.signal) {
          options.signal.addEventListener("abort", () => {
            const error = new Error("The operation was aborted.");
            error.name = "AbortError";
            reject(error);
          });
        }
      }),
  );
  vi.stubGlobal("fetch", fetchMock);
  return state;
}

export function stubFailingFetch(status) {
  const fetchMock = vi.fn(async () => jsonResponse(status, { error: "boom" }));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

export function stubEmptyListFetch() {
  const fetchMock = vi.fn(async () => jsonResponse(200, []));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}
