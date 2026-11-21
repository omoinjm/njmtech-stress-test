import { NextResponse, type NextRequest } from "next/server";
import { consumeMagicLink } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token") ?? "";
  const next = token ? await consumeMagicLink(token) : null;
  const url = req.nextUrl.clone();
  url.search = "";
  url.pathname = next ?? "/login";
  if (!next) url.searchParams.set("error", "expired");
  else if (next.includes("?")) {
    const [p, q] = next.split("?");
    url.pathname = p;
    url.search = q;
  }
  return NextResponse.redirect(url);
}
