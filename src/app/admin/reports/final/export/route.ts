import { cookies } from "next/headers";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionToken } from "@/lib/admin-auth";
import { createFinalReportWorkbook } from "@/lib/final-report-workbook";
import { getFinalReportData } from "@/lib/repositories/final-report-repository";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  if (!(await verifyAdminSessionToken((await cookies()).get(ADMIN_SESSION_COOKIE)?.value))) return new Response("Unauthorized", { status: 401 });
  const data = await getFinalReportData();
  if (!data) return new Response("No hackathon is available", { status: 404 });
  const workbook = await createFinalReportWorkbook({ ...data, generatedAt: new Date() });
  return new Response(workbook, { headers: {
    "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "Content-Disposition": "attachment; filename=\"vjit-sih-final-evaluation-report.xlsx\"",
    "Content-Length": String(workbook.byteLength),
    "Cache-Control": "private, no-store, max-age=0",
    "X-Content-Type-Options": "nosniff",
  } });
}
