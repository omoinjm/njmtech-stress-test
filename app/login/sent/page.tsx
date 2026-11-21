import { Card } from "@/components/ui";

export default function Sent() {
  return (
    <Card className="mx-auto max-w-md text-center">
      <div className="text-4xl">📬</div>
      <h1 className="mt-2 text-xl font-semibold">Check your inbox</h1>
      <p className="mt-2 text-sm text-slate-500">
        We sent you a sign-in link. It&apos;s valid for 20 minutes. Check your spam folder if it isn&apos;t there.
      </p>
    </Card>
  );
}
