"use server";

import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getUser, normalizeEmail, requireAdmin, requireUser, sendMagicLink } from "@/lib/auth";
import { getDb, t } from "@/lib/db";
import { addDomain, InputError, normalizeOrigin, verifyDomain } from "@/lib/domains";
import { sendEmail } from "@/lib/email";
import { env, formatZar } from "@/lib/env";
import type { LeadStatus } from "@/lib/db/schema";

export type FormState = { error?: string; ok?: boolean } | undefined;

const emailSchema = z.string().trim().email("Enter a valid email address.");

/** Landing page: email + website → magic link that lands on the verification page. */
export async function startScanAction(_: FormState, fd: FormData): Promise<FormState> {
  const email = emailSchema.safeParse(fd.get("email"));
  if (!email.success) return { error: email.error.issues[0].message };
  const site = String(fd.get("site") ?? "");
  try {
    normalizeOrigin(site);
  } catch (e) {
    return { error: e instanceof InputError ? e.message : "Invalid website." };
  }
  const next = `/domains/add?site=${encodeURIComponent(site)}`;
  const current = await getUser();
  if (current && current.email === normalizeEmail(email.data)) redirect(next);
  if (!(await sendMagicLink(email.data, next))) return { error: "Too many sign-in emails. Try again in an hour." };
  redirect(`/login/sent?email=${encodeURIComponent(email.data)}`);
}

export async function loginAction(_: FormState, fd: FormData): Promise<FormState> {
  const email = emailSchema.safeParse(fd.get("email"));
  if (!email.success) return { error: email.error.issues[0].message };
  const next = String(fd.get("next") ?? "/dashboard");
  if (!(await sendMagicLink(email.data, next))) return { error: "Too many sign-in emails. Try again in an hour." };
  redirect(`/login/sent?email=${encodeURIComponent(email.data)}`);
}

export async function addDomainAction(_: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  let id: string;
  try {
    id = (await addDomain(user.id, String(fd.get("site") ?? ""))).id;
  } catch (e) {
    return { error: e instanceof InputError ? e.message : "Could not add that website." };
  }
  redirect(`/domains/${id}`);
}

export async function verifyDomainAction(_: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  const id = String(fd.get("domainId"));
  const r = await verifyDomain(id, user.id);
  if (!r.ok) {
    return {
      error:
        r.reason === "not_found"
          ? "Website not found."
          : "We couldn't find the verification record yet. DNS changes can take a few minutes. Try again shortly.",
    };
  }
  revalidatePath(`/domains/${id}`);
  return { ok: true };
}

const leadSchema = z.object({
  scanId: z.string().uuid(),
  name: z.string().trim().min(2, "Please enter your name.").max(120),
  phone: z.string().trim().max(40).optional(),
  company: z.string().trim().max(120).optional(),
  message: z.string().trim().max(2000).optional(),
});

export async function submitLeadAction(_: FormState, fd: FormData): Promise<FormState> {
  const db = await getDb();
  const user = await requireUser();
  const parsed = leadSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const scan = await db.query.scans.findFirst({
    where: and(eq(t.scans.id, parsed.data.scanId), eq(t.scans.userId, user.id)),
  });
  if (!scan) return { error: "Scan not found." };

  await db.insert(t.leads).values({ ...parsed.data, userId: user.id });
  for (const admin of env.adminEmails()) {
    await sendEmail({
      to: admin,
      subject: `🔥 New fix request: ${new URL(scan.origin).hostname}`,
      text:
        `Name: ${parsed.data.name}\nEmail: ${user.email}\nPhone: ${parsed.data.phone ?? "-"}\nCompany: ${parsed.data.company ?? "-"}\n\n` +
        `${parsed.data.message ?? ""}\n\nFull report: ${env.appUrl()}/admin/scans/${scan.id}`,
    });
  }
  return { ok: true };
}

const LEAD_STATUSES: LeadStatus[] = ["new", "contacted", "quoted", "paid", "won", "lost"];

/** Admin sets a fixed price for the fix work; the customer gets a "Pay now" button + email. */
export async function setQuoteAction(fd: FormData) {
  await requireAdmin();
  const db = await getDb();
  const leadId = String(fd.get("leadId"));
  const rands = Number(String(fd.get("amount") ?? "").replace(/[^\d.]/g, ""));
  if (!Number.isFinite(rands) || rands < 50 || rands > 500_000) return;
  const quoteCents = Math.round(rands * 100);
  const note = String(fd.get("note") ?? "").trim().slice(0, 1000) || null;
  const [lead] = await db.update(t.leads).set({ quoteCents, quoteNote: note, status: "quoted" }).where(eq(t.leads.id, leadId)).returning();
  if (!lead) return;
  const user = await db.query.users.findFirst({ where: eq(t.users.id, lead.userId) });
  if (user) {
    await sendEmail({
      to: user.email,
      subject: `Your quote to fix your website's security issues: ${formatZar(quoteCents)}`,
      text: `Hi ${lead.name},\n\nWe've reviewed your security report. We can fix the issues for a fixed price of ${formatZar(quoteCents)}.\n${note ? `\n${note}\n` : ""}\nReview and pay securely here: ${env.appUrl()}/scans/${lead.scanId}\n\nNJM Tech Security`,
    });
  }
  revalidatePath("/admin");
}

export async function updateLeadStatusAction(fd: FormData) {
  const db = await getDb();
  await requireAdmin();
  const status = String(fd.get("status")) as LeadStatus;
  if (!LEAD_STATUSES.includes(status)) return;
  await db.update(t.leads).set({ status }).where(eq(t.leads.id, String(fd.get("leadId"))));
  revalidatePath("/admin");
}
