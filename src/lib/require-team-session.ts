import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { TEAM_SESSION_COOKIE, verifyTeamSessionToken } from "@/lib/team-session";

export const requireTeamSession = cache(async () => {
  const token = (await cookies()).get(TEAM_SESSION_COOKIE)?.value;
  const session = await verifyTeamSessionToken(token);
  if (!session) redirect("/team/login");
  return session;
});
