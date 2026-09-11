import { NextResponse } from "next/server";
import { Resend } from "resend";
import { verifySuperAdminSessionToken, ADMIN_SESSION_COOKIE } from "@/lib/admin-auth";
import { getTeamLeadMailMerge } from "@/lib/repositories/operations-repository";
import { cookies } from "next/headers";

function escapeHtml(value: string) { return value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[character] ?? character)); }

export const runtime = "nodejs";
export async function POST(request: Request) {
  if (!(await verifySuperAdminSessionToken((await cookies()).get(ADMIN_SESSION_COOKIE)?.value))) return new Response("Forbidden", { status: 403 });
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM;
  if (!apiKey || !from) return NextResponse.redirect(new URL("/admin/communications?error=Set%20RESEND_API_KEY%20and%20MAIL_FROM%20in%20Vercel%20first", request.url), 303);
  const rows = (await getTeamLeadMailMerge()).filter((row): row is typeof row & { email: string; accessCode: string } => Boolean(row.email && row.accessCode));
  const resend = new Resend(apiKey);
  const origin = process.env.APP_URL || new URL(request.url).origin;
  try {
    for (let index = 0; index < rows.length; index += 100) {
      const batch = rows.slice(index, index + 100).map((row) => ({ from, to: row.email, subject: `VJIT SIH student portal access · ${row.code}`, html: `<p>Hello ${escapeHtml(row.leadName)},</p><p>Your team <strong>${escapeHtml(row.code)} · ${escapeHtml(row.name)}</strong> can access the VJIT SIH student dashboard here:</p><p><a href="${origin}/team/login">Open student dashboard</a></p><p><strong>Team secret code:</strong> <code>${escapeHtml(row.accessCode)}</code></p><p>After signing in, use the <a href="${origin}/team/feedback">Feedback</a> section to share your hackathon experience.</p><p>Please keep this code private and share it only with your team members.</p><p>Regards,<br>VJIT SIH Internal Hackathon team</p>` }));
      await resend.batch.send(batch);
    }
  } catch { return NextResponse.redirect(new URL("/admin/communications?error=Email%20sending%20failed%20%2D%20no%20codes%20were%20removed", request.url), 303); }
  return NextResponse.redirect(new URL(`/admin/communications?sent=${rows.length}`, request.url), 303);
}
