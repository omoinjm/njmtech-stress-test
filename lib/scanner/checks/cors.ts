import type { Check } from "../types";

const PROBE_ORIGIN = "https://cors-probe.invalid";

export const corsCheck: Check = {
  key: "cors",
  label: "Cross-origin (CORS) policy",
  async run({ origin, fetch }) {
    const res = await fetch(origin + "/", { headers: { origin: PROBE_ORIGIN }, maxBytes: 1 });
    const acao = res.headers["access-control-allow-origin"];
    const creds = (res.headers["access-control-allow-credentials"] ?? "").toLowerCase() === "true";
    if (acao === PROBE_ORIGIN && creds) {
      return [{
        key: "cors.reflected-credentials",
        evidence: `Origin: ${PROBE_ORIGIN} → Access-Control-Allow-Origin: ${acao}, Access-Control-Allow-Credentials: true`,
      }];
    }
    if (acao === "*" || acao === PROBE_ORIGIN) {
      return [{ key: "cors.wildcard", evidence: `Access-Control-Allow-Origin: ${acao}` }];
    }
    return [];
  },
};
