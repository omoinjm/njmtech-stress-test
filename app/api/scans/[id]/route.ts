import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { getScanViewForUser } from "@/lib/reports";

/** Teaser JSON for the scan owner. Redaction happens in buildTeaser: locked items carry no evidence/fix. */
export async function GET(_req: Request, ctx: RouteContext<"/api/scans/[id]">) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const { id } = await ctx.params;
  const data = await getScanViewForUser(id, user.id);
  if (!data) return NextResponse.json({ error: "Not found." }, { status: 404 });
  return NextResponse.json(data, { headers: { "cache-control": "no-store" } });
}
