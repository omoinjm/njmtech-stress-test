import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { Suspense } from "react";
import { Clarity } from "@/components/clarity";
import { LogoMark } from "@/components/logo-mark";
import { validClarityId } from "@/lib/analytics";
import { getUser } from "@/lib/auth";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  // Resolves relative canonical/OG URLs to the production domain.
  metadataBase: new URL("https://security.njmtech.co.za"),
  title: "NJM Tech Security: Website Security & Stress Check",
  description: "Find security holes and performance problems on your website, online store or web app before attackers do.",
};

async function NavUser() {
  const user = await getUser();
  if (!user) {
    return (
      <div className="flex items-center gap-3 text-sm">
      <Link href="/blog" className="font-medium">Blog</Link>
      <Link href="/login" className="rounded-md px-3 py-1.5 text-sm font-medium hover:bg-black/5 dark:hover:bg-white/10">
        Sign in
      </Link>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-3 text-sm">
      <Link href="/blog" className="font-medium">Blog</Link>
      {user.isAdmin && <Link href="/admin" className="font-medium text-amber-600">Admin</Link>}
      <Link href="/dashboard" className="font-medium">Dashboard</Link>
      <form action="/auth/signout" method="post">
        <button className="text-slate-500 hover:underline">Sign out</button>
      </form>
    </div>
  );
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  const clarityId = process.env.CLARITY_PROJECT_ID;
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <header className="no-print border-b border-black/10 dark:border-white/10">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
            <Link href="/" className="flex items-center gap-2 font-semibold">
              <LogoMark />
              NJM Tech Security
            </Link>
            <Suspense fallback={<span className="h-5 w-24" />}>
              <NavUser />
            </Suspense>
          </div>
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>
        {validClarityId(clarityId) && <Clarity projectId={clarityId} />}
        <footer className="no-print border-t border-black/10 py-6 text-center text-xs text-slate-500 dark:border-white/10">
          Only owner-verified websites are scanned. Checks are non-destructive. <Link href="/terms" className="underline">Terms</Link>
        </footer>
      </body>
    </html>
  );
}
