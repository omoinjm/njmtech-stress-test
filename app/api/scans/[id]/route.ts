import { NextResponse, type NextRequest } from "next/server";
import { getUser } from "@/lib/auth";
import { getScanView } from "@/lib/reports";

/** Scan JSON for the owner or the holder of the access link. Locked findings never carry evidence/fixes. */
export async function GET(req: NextRequest, ctx: RouteContext<"/api/scans/[id]">) {
  const user = await getUser();
  const { id } = await ctx.params;
  const data = await getScanView(id, { userId: user?.id, token: req.nextUrl.searchParams.get("t") });
  if (!data) return NextResponse.json({ error: "Not found." }, { status: user ? 404 : 401 });
  return NextResponse.json(data, { headers: { "cache-control": "no-store" } });
}
