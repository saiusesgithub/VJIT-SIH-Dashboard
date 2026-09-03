import { type NextRequest, NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionToken } from "@/lib/admin-auth";
import { saveShortlistingDecision } from "@/lib/repositories/shortlisting-repository";

function json(body: object, status: number) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== request.nextUrl.origin || !(await verifyAdminSessionToken(request.cookies.get(ADMIN_SESSION_COOKIE)?.value))) return json({ ok: false, code: "forbidden" }, 403);
  if (!request.headers.get("content-type")?.includes("application/json")) return json({ ok: false, code: "invalid" }, 400);
  if (Number(request.headers.get("content-length") ?? 0) > 2048) return json({ ok: false, code: "invalid" }, 413);
  let input: unknown;
  try { input = await request.json(); } catch { return json({ ok: false, code: "invalid" }, 400); }
  try {
    const result = await saveShortlistingDecision(input);
    return json(result, result.ok ? 200 : result.code === "forbidden" ? 403 : result.code === "not_found" ? 404 : result.code === "invalid" ? 400 : 409);
  } catch {
    return json({ ok: false, code: "unavailable" }, 503);
  }
}
