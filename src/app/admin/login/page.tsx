import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ArrowRight, LockKeyhole } from "lucide-react";
import { ADMIN_SESSION_COOKIE, sanitizeAdminRedirect, verifyAdminSessionToken } from "@/lib/admin-auth";

export const metadata: Metadata = {
  title: "Faculty access",
  robots: { index: false, follow: false },
};

function Mark() {
  return (
    <div className="grid size-9 grid-cols-2 gap-0.5 rounded-lg bg-zinc-950 p-2" aria-hidden="true">
      <span className="rounded-[2px] bg-white" /><span className="rounded-[2px] bg-blue-500" />
      <span className="rounded-[2px] bg-blue-500" /><span className="rounded-[2px] bg-white" />
    </div>
  );
}

export default async function AdminLoginPage({ searchParams }: { searchParams: Promise<{ returnTo?: string; error?: string }> }) {
  const params = await searchParams;
  const returnTo = sanitizeAdminRedirect(params.returnTo);
  const session = (await cookies()).get(ADMIN_SESSION_COOKIE)?.value;
  if (await verifyAdminSessionToken(session)) redirect(returnTo);

  const error = params.error === "incorrect"
    ? "Incorrect PIN. Please try again."
    : params.error === "unavailable"
      ? "Dashboard access is not configured. Contact the event coordinator."
      : null;

  return (
    <main className="grid min-h-screen place-items-center bg-stone-50 px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-7 flex items-center justify-center gap-3"><Mark /><div><p className="text-sm font-semibold tracking-tight text-zinc-950">VJIT SIH Internal Hackathon</p><p className="text-xs text-zinc-500">Faculty Dashboard</p></div></div>
        <section className="rounded-xl border border-zinc-200 bg-white p-6 sm:p-7">
          <div className="flex size-9 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50"><LockKeyhole className="size-4 text-zinc-600" /></div>
          <h1 className="mt-5 text-xl font-semibold tracking-tight text-zinc-950">Enter Admin PIN</h1>
          <p className="mt-1.5 text-sm leading-6 text-zinc-500">Use the shared access PIN provided by the event coordinator.</p>
          <form action="/admin/login/submit" method="post" className="mt-6">
            <input type="hidden" name="returnTo" value={returnTo} />
            <label htmlFor="admin-pin" className="text-xs font-medium text-zinc-700">Admin PIN</label>
            <input id="admin-pin" name="pin" type="password" autoComplete="current-password" autoFocus required maxLength={128} className="mt-2 h-11 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm tracking-[0.2em] text-zinc-950 outline-none transition-colors placeholder:tracking-normal placeholder:text-zinc-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100" placeholder="Enter PIN" aria-describedby={error ? "login-error" : "access-note"} />
            {error ? <p id="login-error" role="alert" className="mt-2.5 text-xs font-medium text-red-600">{error}</p> : null}
            <button type="submit" className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-zinc-950 px-4 text-sm font-medium text-white transition-colors hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:ring-offset-2">Continue <ArrowRight className="size-4" /></button>
          </form>
        </section>
        <p id="access-note" className="mt-4 text-center text-xs leading-5 text-zinc-400">Restricted to authorized faculty and event coordinators.</p>
      </div>
    </main>
  );
}
