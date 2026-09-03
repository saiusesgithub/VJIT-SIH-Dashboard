import "server-only";
import { getDb } from "@/lib/db";
import { requireAdminSession } from "@/lib/require-admin-session";

export async function getFacultyTeamQrData() {
  await requireAdminSession();
  const db = getDb();
  const event = await db.hackathon.findFirst({ where: { status: "LIVE" }, orderBy: { startDate: "desc" }, select: { id: true, name: true } })
    ?? await db.hackathon.findFirst({ orderBy: { startDate: "desc" }, select: { id: true, name: true } });
  if (!event) return { event: null, teams: [], venues: [] };
  const [teams, venues] = await Promise.all([
    db.team.findMany({ where: { hackathonId: event.id }, orderBy: { teamCode: "asc" }, select: {
      id: true, teamCode: true, teamName: true,
      venue: { select: { id: true, name: true, roomNumber: true } },
      problemStatement: { select: { code: true, title: true } },
    } }),
    db.venue.findMany({ where: { hackathonId: event.id }, orderBy: { displayOrder: "asc" }, select: { id: true, name: true, roomNumber: true } }),
  ]);
  return { event, teams, venues };
}
