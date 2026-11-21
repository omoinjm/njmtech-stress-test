import type { CheckContext, Fetcher, HttpResult } from "@/lib/scanner/types";

export function res(partial: Partial<HttpResult> = {}): HttpResult {
  return { url: "https://shop.example.com/", status: 200, headers: {}, setCookies: [], body: "", ...partial };
}

/** Fake fetcher: route table keyed by path; unknown paths 404. */
export function fakeFetch(routes: Record<string, Partial<HttpResult>>): Fetcher {
  return async (url) => {
    const u = new URL(url);
    const r = routes[u.pathname] ?? routes[url];
    return r ? res({ url, ...r }) : res({ url, status: 404, body: "Not found" });
  };
}

export function ctx(home: Partial<HttpResult>, routes: Record<string, Partial<HttpResult>> = {}): CheckContext {
  return { origin: "https://shop.example.com", hostname: "shop.example.com", home: res(home), fetch: fakeFetch(routes) };
}
