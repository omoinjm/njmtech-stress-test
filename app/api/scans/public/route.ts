import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { InputError } from "@/lib/domains";
import { createPublicScan, ScanError } from "@/lib/scans";

const body = z.object({ site: z.string().min(3).max(300), email: z.string().trim().email("Enter a valid email address.") });

/** Landing page: instant passive scan, no sign-in or verification needed. */
export async function POST(req: NextRequest) {
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request." }, { status: 400 });
  const ip = req.headers.get("cf-connecting-ip") ?? req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? null;
  try {
    const scan = await createPublicScan({ ...parsed.data, ip });
    return NextResponse.json({ id: scan.id, url: `/scans/${scan.id}?t=${scan.accessToken}` }, { status: 201 });
  } catch (e) {
    if (e instanceof InputError) return NextResponse.json({ error: e.message }, { status: 400 });
    if (e instanceof ScanError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error(e);
    return NextResponse.json({ error: "Could not start the scan." }, { status: 500 });
  }
}
