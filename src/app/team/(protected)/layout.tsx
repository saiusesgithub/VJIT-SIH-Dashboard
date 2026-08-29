import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { TeamShell } from "@/components/team/team-shell";
import { getTeamSessionData } from "@/lib/repositories/team-repository";
import { requireTeamSession } from "@/lib/require-team-session";

export const dynamic = "force-dynamic";
export default async function ProtectedTeamLayout({ children }: { children: ReactNode }) {
  const session = await requireTeamSession();
  const team = await getTeamSessionData(session);
  if (!team) redirect("/team/login");
  return <TeamShell identity={{ code: team.teamCode, name: team.teamName }} notificationVersions={team.notificationVersions}>{children}</TeamShell>;
}
