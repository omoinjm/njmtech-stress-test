import type { Check, RawFinding } from "../types";

export const infoLeakCheck: Check = {
  key: "info-leak",
  label: "Information disclosure",
  async run({ home }) {
    const out: RawFinding[] = [];
    const server = home.headers["server"];
    if (server && /\d/.test(server)) {
      out.push({ key: "leak.server-version", evidence: `Server: ${server}` });
    }
    const leaks = ["x-powered-by", "x-aspnet-version", "x-aspnetmvc-version", "x-generator"]
      .filter((k) => home.headers[k])
      .map((k) => `${k}: ${home.headers[k]}`);
    if (leaks.length) out.push({ key: "leak.powered-by", evidence: leaks.join("\n") });
    return out;
  },
};
