import { Resend } from "resend";
import { env } from "./env";

type Mail = { to: string; subject: string; text: string; replyTo?: string };

/** Sends via Resend (from security@send.njmtech.co.za); without a key it logs instead (local dev). */
export async function sendEmail({ to, subject, text, replyTo }: Mail) {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.log(`\n📧 [dev email] To: ${to}\nSubject: ${subject}\n\n${text}\n`);
    return;
  }
  const { error } = await new Resend(key).emails.send({
    from: env.emailFrom(),
    replyTo: replyTo ?? env.emailReplyTo(),
    to,
    subject,
    text,
  });
  if (error) throw new Error(`Email failed: ${error.message}`);
}
