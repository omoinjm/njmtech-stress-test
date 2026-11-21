// process.env is populated from wrangler vars + secrets in Workers (nodejs_compat) and by
// OpenNext for Next.js server code; in `next dev` it comes from .dev.vars / wrangler.jsonc.
const v = (k: string) => process.env[k] ?? "";

export const env = {
  appUrl: () => (v("APP_URL") || "http://localhost:3000").replace(/\/$/, ""),
  adminEmails: () =>
    v("ADMIN_EMAILS")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  allowPrivateTargets: () => v("ALLOW_PRIVATE_TARGETS") === "true" && !v("APP_URL").startsWith("https://"),
  reportPriceCents: () => Number(v("REPORT_PRICE_CENTS") || 49900),
  emailFrom: () => v("EMAIL_FROM") || "NJM Tech Security <security@send.njmtech.co.za>",
  emailReplyTo: () => v("EMAIL_REPLY_TO") || undefined,
};

/** The owner/admin accounts. They use the tool for free: no paywall, no daily scan quotas. */
export const isAdminEmail = (email: string | null | undefined) => !!email && env.adminEmails().includes(email.trim().toLowerCase());

export const formatZar = (cents: number) =>
  `R${(cents / 100).toLocaleString("en-ZA", { minimumFractionDigits: cents % 100 ? 2 : 0 })}`;
