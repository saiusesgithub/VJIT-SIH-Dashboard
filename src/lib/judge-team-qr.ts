const TEAM_PATH = /^\/judge\/teams\/([a-z0-9-]{1,64})$/i;

export function parseJudgeTeamQrValue(value: string, currentOrigin: string) {
  try {
    const target = new URL(value.trim(), currentOrigin);
    if (target.origin !== currentOrigin || target.search || target.hash) return null;
    const match = TEAM_PATH.exec(target.pathname);
    return match ? `/judge/teams/${encodeURIComponent(match[1])}` : null;
  } catch {
    return null;
  }
}
