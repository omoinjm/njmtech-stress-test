import { z } from "zod";

const contactSchema = z.object({
  name: z.string().trim().min(2, "Please enter your name.").max(120),
  email: z.string().trim().email("Enter a valid email address.").max(200),
  website: z.string().trim().max(300).optional(),
  message: z.string().trim().min(10, "Please tell us a little more (at least 10 characters).").max(3000),
});

export type ContactMessage = z.infer<typeof contactSchema>;

/**
 * Screens a contact-form submission. Bots fill the hidden `fax` honeypot and submit instantly;
 * those are silently dropped (`spam`) so they get no signal to adapt to.
 */
export function screenContact(fd: FormData, now = Date.now()):
  | { spam: true }
  | { spam: false; error: string }
  | { spam: false; data: ContactMessage } {
  const startedAt = Number(fd.get("startedAt") ?? 0);
  if (String(fd.get("fax") ?? "") !== "" || !startedAt || now - startedAt < 3000 || startedAt > now) return { spam: true };
  const parsed = contactSchema.safeParse({
    name: fd.get("name"),
    email: fd.get("email"),
    website: fd.get("website") || undefined,
    message: fd.get("message"),
  });
  if (!parsed.success) return { spam: false, error: parsed.error.issues[0].message };
  return { spam: false, data: parsed.data };
}
