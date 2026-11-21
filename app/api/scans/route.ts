import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getUser } from "@/lib/auth";
import { createScan, ScanError } from "@/lib/scans";

const body = z.object({
  domainId: z.string().uuid(),
  includeLoadTest: z.boolean().default(false),
  acceptTerms: z.boolean(),
});

export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  const ip = req.headers.get("cf-connecting-ip") ?? req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? null;
  try {
    const scan = await createScan({ ...parsed.data, userId: user.id, ip });
    return NextResponse.json({ id: scan.id }, { status: 201 });
  } catch (e) {
    if (e instanceof ScanError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error(e);
    return NextResponse.json({ error: "Could not start the scan." }, { status: 500 });
  }
}
