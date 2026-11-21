import { NextResponse, type NextRequest } from "next/server";
import { getUser } from "@/lib/auth";
import { addDomain, InputError } from "@/lib/domains";

/** Landing-page flow continues here after the magic link: register the site, go verify it. */
export async function GET(req: NextRequest) {
  const site = req.nextUrl.searchParams.get("site") ?? "";
  const user = await getUser();
  if (!user) {
    return NextResponse.redirect(new URL(`/login?next=${encodeURIComponent(`/domains/add?site=${site}`)}`, req.url));
  }
  try {
    const d = await addDomain(user.id, site);
    return NextResponse.redirect(new URL(`/domains/${d.id}`, req.url));
  } catch (e) {
    const msg = e instanceof InputError ? e.message : "Could not add that website.";
    return NextResponse.redirect(new URL(`/dashboard?error=${encodeURIComponent(msg)}`, req.url));
  }
}
