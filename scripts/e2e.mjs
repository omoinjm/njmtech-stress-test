// End-to-end smoke test against a running app + its local D1 database.
// Usage: node --env-file=.env.local scripts/e2e.mjs [--load]
//   E2E_BASE=http://localhost:8787 for `pnpm preview` (real Cloudflare Workflows), default next dev :3000.
import { execFileSync, spawn } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";

const BASE = process.env.E2E_BASE ?? "http://localhost:3000";
const TARGET = "http://localhost:4010";
const WITH_LOAD = process.argv.includes("--load");
const q = (v) => (v === null ? "NULL" : `'${String(v).replaceAll("'", "''")}'`);
/** Tagged template → SQL against local D1 via wrangler (values are quoted, test-only helper). */
const sql = (strings, ...vals) => {
  const command = strings.reduce((acc, s, i) => acc + s + (i < vals.length ? q(vals[i]) : ""), "");
  const out = execFileSync("pnpm", ["exec", "wrangler", "d1", "execute", "njmtech-security", "--local", "--json", "--command", command], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  return JSON.parse(out)[0].results;
};
sql.end = async () => {};
const email = (process.env.ADMIN_EMAILS ?? "admin@localhost.test").split(",")[0].trim();
let cookie = "";
let failures = 0;

const check = (name, cond, extra = "") => {
  console.log(`${cond ? "✓" : "✗"} ${name}${extra ? `  (${extra})` : ""}`);
  if (!cond) failures++;
};
const req = (path, init = {}) =>
  fetch(BASE + path, { redirect: "manual", ...init, headers: { cookie, ...(init.headers ?? {}) } });
const json = (path, body) =>
  req(path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

// 1. Login via a magic-link token inserted directly (simulates clicking the email link).
const token = randomBytes(24).toString("base64url");
void sql`insert into login_tokens (token_hash, email, redirect_to, expires_at, created_at)
          values (${createHash("sha256").update(token).digest("hex")}, ${email}, '/dashboard', ${Date.now() + 600_000}, ${Date.now()})`;
let r = await req(`/auth/callback?token=${token}`);
cookie = (r.headers.get("set-cookie") ?? "").split(";")[0];
check("magic link signs in", r.status === 307 && cookie.startsWith("st_session="), `${r.status}`);
r = await fetch(`${BASE}/auth/callback?token=${token}`, { redirect: "manual" });
check("magic link is single-use", (r.headers.get("location") ?? "").includes("error=expired"));

// 2. Add the weak test site (fresh each run: drop any earlier copy + its scans).
void sql`delete from domains where origin = ${TARGET}`;

// 2a. Public scan: no session, no verification, only passive checks.
const weakPublic = spawn(process.execPath, ["scripts/weak-test-server.mjs"], { stdio: "ignore" });
await new Promise((res) => setTimeout(res, 800));
try {
  r = await fetch(`${BASE}/api/scans/public`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ site: TARGET, email }) });
  const pub = await r.json();
  check("public scan starts without sign-in or verification", r.status === 201 && pub.url?.includes("?t="), pub.error ?? pub.url);
  const [pubPath, pubQuery] = pub.url.split("?");
  r = await fetch(`${BASE}/api/scans/${pub.id}`);
  check("public scan JSON needs the access link", r.status === 401);
  let pv;
  for (let i = 0; i < 120; i++) {
    pv = await (await fetch(`${BASE}/api/scans/${pub.id}?${pubQuery}`)).json();
    if (pv.status === "done" || pv.status === "failed") break;
    await new Promise((res) => setTimeout(res, 1000));
  }
  check("public scan finished", pv.status === "done" && pv.kind === "public", `${pv.status} ${pv.progress}/${pv.total}`);
  const pubKeys = sql`select key from findings where scan_id = ${pub.id}`.map((f) => f.key);
  const probing = pubKeys.filter((k) => /^exposed\.|^cors\.|wp-user-enum|wp-xmlrpc/.test(k));
  check("public scan ran no probing checks", probing.length === 0, probing.join(",") || pubKeys.join(", "));
  check("public scan still finds passive issues", pubKeys.includes("headers.csp-missing") && pubKeys.includes("cms.outdated-jquery"));
  check("anonymous viewer is not treated as owner", pv.viewerIsOwner === false && !!pv.ownerEmailHint);
  r = await fetch(BASE + pubPath, { redirect: "manual" });
  check("report page without link → sign-in", r.status === 307 && (r.headers.get("location") ?? "").includes("/login"));
  r = await fetch(`${BASE}${pubPath}?${pubQuery}`);
  check("report page with link renders", r.status === 200 && (await r.text()).includes("Public scan"));
} finally {
  weakPublic.kill();
}
r = await req(`/domains/add?site=${encodeURIComponent(TARGET)}`);
const domainId = (r.headers.get("location") ?? "").split("/domains/")[1];
check("domain added", !!domainId, r.headers.get("location") ?? "");
const [{ verify_token: vt }] = sql`select verify_token from domains where id = ${domainId}`;

// 3. Guards: unauthenticated and unverified scans are refused.
r = await fetch(`${BASE}/api/scans`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ domainId, acceptTerms: true }) });
check("no session → 401", r.status === 401);
r = await json("/api/scans", { domainId, acceptTerms: true });
check("unverified domain → 403", r.status === 403, (await r.json()).error);

// 3a. One-click email approval (simulates the admin clicking the emailed link).
const vtok = randomBytes(24).toString("base64url");
void sql`insert into domain_verifications (token_hash, domain_id, email, expires_at, created_at)
    values (${createHash("sha256").update(vtok).digest("hex")}, ${domainId}, 'admin@example.test', ${Date.now() + 600_000}, ${Date.now()})`;
r = await fetch(`${BASE}/verify-domain?token=${vtok}`, { redirect: "manual" });
check("email approval link verifies the domain", (r.headers.get("location") ?? "").includes(`/verified?site=`) &&
  sql`select verify_method from domains where id = ${domainId}`[0].verify_method === "email");
r = await fetch(`${BASE}/verify-domain?token=${vtok}`, { redirect: "manual" });
check("email approval link is single-use", (r.headers.get("location") ?? "").includes("error=expired"));
void sql`update domains set verified_at = NULL, verify_method = NULL where id = ${domainId}`; // reset to also test file method

// 4. Ownership verification via the well-known file served by the weak server.
const weak = spawn(process.execPath, ["scripts/weak-test-server.mjs"], { env: { ...process.env, VERIFY_TOKEN: vt }, stdio: "ignore" });
await new Promise((res) => setTimeout(res, 800));
try {
  r = await json(`/api/domains/${domainId}/verify`, {});
  check("ownership verified via file", r.status === 200, JSON.stringify(await r.json()));

  r = await json("/api/scans", { domainId, acceptTerms: false });
  check("terms not accepted → 400", r.status === 400);

  // 5. Run the scan and poll until done.
  r = await json("/api/scans", { domainId, acceptTerms: true, includeLoadTest: WITH_LOAD });
  const { id: scanId } = await r.json();
  check("scan started", r.status === 201, scanId);
  r = await json("/api/scans", { domainId, acceptTerms: true });
  check("concurrent scan of same site → 409", r.status === 409);

  let view;
  for (let i = 0; i < 240; i++) {
    view = await (await req(`/api/scans/${scanId}`)).json();
    if (view.status === "done" || view.status === "failed") break;
    await new Promise((res) => setTimeout(res, 1000));
  }
  check("scan finished", view.status === "done", `${view.status} ${view.error ?? ""} progress ${view.progress}/${view.total}`);

  // 6. Teaser redaction.
  const rep = view.report;
  const total = rep.locked.length + (rep.unlocked ? 1 : 0);
  check("findings detected", total >= 10, `${total} findings, score ${rep.score}`);
  check("one unlocked finding with fix", !!rep.unlocked?.fix, rep.unlocked?.title);
  check("unlocked is DIY-friendly", rep.unlocked?.diyFriendly === true);
  const leaked = rep.locked.filter((l) => Object.keys(l).some((k) => !["id", "severity", "title", "locked"].includes(k)));
  check("locked findings contain no evidence/fix", leaked.length === 0);
  check("raw secret never in teaser JSON", !JSON.stringify(view).includes("hunter2"));
  const teaserHtml = await (await req(`/scans/${scanId}`)).text();
  check("teaser HTML has no locked fix text", !teaserHtml.includes("Assume every secret in it is compromised"));
  const expected = ["exposed.env", "exposed.git", "cors.reflected-credentials", "cookies.insecure-flags", "cms.wp-user-enum",
    "cms.wp-xmlrpc", "cms.outdated-jquery", "leak.server-version", "leak.powered-by", "tls.no-https"];
  const found = sql`select key from findings where scan_id = ${scanId}`.map((f) => f.key);
  const missing = expected.filter((k) => !found.includes(k));
  check("expected findings stored (full report)", missing.length === 0, missing.length ? `missing ${missing}` : found.join(", "));
  if (WITH_LOAD) check("load test recorded", !!view.loadTest, JSON.stringify(view.loadTest));

  // 7. Payments: unlock checkout is created server-side with a server-decided amount.
  r = await json("/api/payments/checkout", { scanId, kind: "fix" });
  check("fix payment without a quote → 409", r.status === 409);
  r = await json("/api/payments/checkout", { scanId, kind: "report_unlock" });
  const pay = await r.json();
  if (process.env.YOCO_SECRET_KEY) {
    check("Yoco checkout created (test mode)", r.status === 200 && /^https:\/\/.*yoco/.test(pay.redirectUrl ?? ""), pay.redirectUrl ?? pay.error);
  } else {
    console.log("- skipped Yoco checkout (no YOCO_SECRET_KEY)");
  }
  r = await fetch(`${BASE}/api/webhooks/yoco`, { method: "POST", body: "{}", headers: { "webhook-id": "x", "webhook-timestamp": "1", "webhook-signature": "v1,x" } });
  check("unsigned webhook rejected", r.status === 403);
  // Simulate a confirmed payment (Yoco would confirm it via webhook/API) → report unlocks.
  void sql`update scans set unlocked_at = ${Date.now()} where id = ${scanId}`;
  view = await (await req(`/api/scans/${scanId}`)).json();
  check("unlocked report returns every finding with fixes", view.full?.findings?.length === total && view.full.findings.every((f) => f.fix), `${view.full?.findings?.length}`);

  // 8. Lead capture + admin full report.
  r = await req(`/scans/${scanId}`);
  const html = await r.text();
  check("teaser page renders", r.status === 200);
  check("unlocked HTML shows full fixes", html.includes("Assume every secret in it is compromised"));
  r = await req(`/admin/scans/${scanId}`);
  const adminHtml = await r.text();
  check("admin full report renders all fixes", r.status === 200 && adminHtml.includes("Assume every secret in it is compromised"));
  await sql`insert into leads (id, scan_id, user_id, name, status, created_at) select ${crypto.randomUUID()}, ${scanId}, user_id, 'E2E Tester', 'new', ${Date.now()} from scans where id = ${scanId}`;
  r = await req("/admin");
  check("lead visible in admin", (await r.text()).includes("E2E Tester"));
  console.log(`\nTeaser: ${BASE}/scans/${scanId}\nAdmin:  ${BASE}/admin/scans/${scanId}`);
} finally {
  weak.kill();
  await sql.end();
}
console.log(failures ? `\n${failures} check(s) FAILED` : "\nAll E2E checks passed");
process.exit(failures ? 1 : 0);
