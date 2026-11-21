import { NextResponse, type NextRequest } from "next/server";
import { getUser } from "@/lib/auth";
import { settleByLookup } from "@/lib/payments";

/** Customer lands here from Yoco. We confirm with Yoco's API (never trust the redirect alone). */
export async function GET(req: NextRequest) {
  const pid = req.nextUrl.searchParams.get("pid") ?? "";
  const result = req.nextUrl.searchParams.get("result");
  const user = await getUser();
  if (!user || !/^[0-9a-f-]{36}$/i.test(pid)) return NextResponse.redirect(new URL("/dashboard", req.url));

  const r = await settleByLookup(pid).catch((e) => {
    console.error("settle lookup failed", e);
    return null;
  });
  const scanId = r?.payment?.userId === user.id ? r.payment.scanId : null;
  if (!scanId) return NextResponse.redirect(new URL("/dashboard", req.url));
  const status = r?.ok ? "paid" : result === "cancel" ? "cancelled" : r?.reason === "processing" || r?.reason === "started" ? "processing" : "failed";
  return NextResponse.redirect(new URL(`/scans/${scanId}?payment=${status}`, req.url));
}
