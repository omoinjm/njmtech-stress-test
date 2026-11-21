import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { verifyDomain } from "@/lib/domains";

export async function POST(_req: Request, ctx: RouteContext<"/api/domains/[id]/verify">) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const r = await verifyDomain(id, user.id);
  if (!r.ok) return NextResponse.json({ verified: false, reason: r.reason }, { status: r.reason === "not_found" ? 404 : 422 });
  return NextResponse.json({ verified: true, method: r.method });
}
