import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getUser } from "@/lib/auth";
import { PaymentError, startPayment } from "@/lib/payments";

const body = z.object({ scanId: z.string().uuid(), kind: z.enum(["report_unlock", "fix"]) });

export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  try {
    const redirectUrl = await startPayment(user.id, parsed.data.scanId, parsed.data.kind);
    return NextResponse.json({ redirectUrl });
  } catch (e) {
    if (e instanceof PaymentError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error(e);
    return NextResponse.json({ error: "Could not start the payment. Please try again." }, { status: 502 });
  }
}
