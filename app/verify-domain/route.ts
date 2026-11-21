import { NextResponse, type NextRequest } from "next/server";
import { confirmDomainVerification } from "@/lib/domains";

/** Link from the approval email sent to admin@/webmaster@/… at the domain. No sign-in required to approve. */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token") ?? "";
  const d = token ? await confirmDomainVerification(token) : null;
  const url = new URL(d ? `/verified?site=${encodeURIComponent(d.hostname)}&domain=${d.id}` : "/verified?error=expired", req.url);
  return NextResponse.redirect(url);
}
