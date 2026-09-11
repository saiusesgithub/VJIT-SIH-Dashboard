import { NextResponse } from "next/server";
import { verifySuperAdminSessionToken, ADMIN_SESSION_COOKIE } from "@/lib/admin-auth";
import { getTeamLeadMailMerge } from "@/lib/repositories/operations-repository";
import { cookies } from "next/headers";

export const runtime = "nodejs";

function escapeHtml(value: string) {
  return value.replace(/[&<>\"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '\"': "&quot;", "'": "&#39;" })[character] ?? character);
}

export async function POST(request: Request) {
  if (!(await verifySuperAdminSessionToken((await cookies()).get(ADMIN_SESSION_COOKIE)?.value))) return new Response("Forbidden", { status: 403 });
  const apiKey = process.env.BREVO_API_KEY;
  const fromEmail = process.env.BREVO_FROM_EMAIL;
  const fromName = process.env.BREVO_FROM_NAME || "VJIT SIH Internal Hackathon";
  if (!apiKey || !fromEmail) return NextResponse.redirect(new URL("/admin/communications?error=Set%20BREVO_API_KEY%20and%20BREVO_FROM_EMAIL%20in%20Vercel%20first", request.url), 303);
  const rows = (await getTeamLeadMailMerge()).filter((row): row is typeof row & { email: string; accessCode: string } => Boolean(row.email && row.accessCode));
  const origin = process.env.APP_URL || new URL(request.url).origin;
  try {
    const response = await fetch("https://api.brevo.com/v3/smtp/email", { method: "POST", headers: { "Content-Type": "application/json", accept: "application/json", "api-key": apiKey }, body: JSON.stringify({
      sender: { email: fromEmail, name: fromName },
      subject: "VJIT SIH student portal access details",
      htmlContent: "<p>Your VJIT SIH student portal access details are below.</p>",
      headers: { idempotencyKey: crypto.randomUUID() },
      messageVersions: rows.map((row) => {
        const leadName = escapeHtml(row.leadName);
        const teamCode = escapeHtml(row.code);
        const teamName = escapeHtml(row.name);
        const accessCode = escapeHtml(row.accessCode);
        return {
          to: [{ email: row.email, name: row.leadName }],
          subject: `VJIT SIH student portal access · ${row.code}`,
          htmlContent: `<p>Hello ${leadName},</p><p>Your team <strong>${teamCode} · ${teamName}</strong> can access the VJIT SIH student dashboard here:</p><p><a href="${origin}/team/login">Open student dashboard</a></p><p><strong>Team secret code:</strong> <code>${accessCode}</code></p><p>After signing in, use the <a href="${origin}/team/feedback">Feedback</a> section to share your hackathon experience.</p><p>Please keep this code private and share it only with your team members.</p><p>Regards,<br>VJIT SIH Internal Hackathon team</p>`,
        };
      }),
    }) });
    const result = await response.json().catch(() => null) as { messageIds?: string[]; messageId?: string } | null;
    if (!response.ok || (!result?.messageIds?.length && !result?.messageId)) throw new Error("Brevo rejected the bulk request");
  } catch { return NextResponse.redirect(new URL("/admin/communications?error=Email%20sending%20failed%20%2D%20no%20codes%20were%20removed", request.url), 303); }
  return NextResponse.redirect(new URL(`/admin/communications?sent=${rows.length}`, request.url), 303);
}
