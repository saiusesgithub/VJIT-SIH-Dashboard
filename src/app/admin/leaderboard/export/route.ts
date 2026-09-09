import { getFacultyLeaderboard } from "@/lib/repositories/leaderboard-repository";
import { parseLeaderboardExportOptions, selectLeaderboardExportEntries } from "@/lib/leaderboard-export";
import { createLeaderboardWorkbook } from "@/lib/leaderboard-workbook";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const data = await getFacultyLeaderboard();
  const options = parseLeaderboardExportOptions(new URL(request.url).searchParams);
  if (!options) return new Response("Invalid export options", { status: 400 });
  if (!data.event) return new Response("No hackathon is available", { status: 404 });
  const entries = selectLeaderboardExportEntries(data.entries, options);
  const generatedAt = new Date();
  const workbook = await createLeaderboardWorkbook({ eventName: data.event.name, roundCount: data.roundCount, generatedAt, options, entries });
  const suffix = options.limit === null ? "all" : `top-${options.limit}`;
  const filename = `vjit-sih-${options.scope}-${suffix}.xlsx`;
  return new Response(workbook, { headers: {
    "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "Content-Disposition": `attachment; filename="${filename}"`,
    "Content-Length": String(workbook.byteLength),
    "Cache-Control": "private, no-store, max-age=0",
    "X-Content-Type-Options": "nosniff",
  } });
}
