export interface RegistrationRow {
  teamCode: string;
  teamName: string;
  theme: string;
  category: string;
  ideaTitle: string;
  leadName: string;
  leadRollNumber: string;
  leadDepartment: string;
  leadPhone: string;
  leadEmail: string;
  problemStatementCode: string;
}

export interface RegistrationImportSummary {
  teamCount: number;
  venueCounts: Record<string, number>;
  themeCounts: Record<string, number>;
}

const venueRanges = [
  { prefix: "AR", first: 1, last: 10, venueId: "venue-22" },
  { prefix: "AR", first: 11, last: 20, venueId: "venue-23" },
  { prefix: "AR", first: 21, last: 30, venueId: "venue-24" },
  { prefix: "AR", first: 31, last: 36, venueId: "venue-25" },
  { prefix: "BC", first: 1, last: 10, venueId: "venue-05" },
  { prefix: "BC", first: 11, last: 20, venueId: "venue-06" },
  { prefix: "BC", first: 21, last: 30, venueId: "venue-07" },
  { prefix: "BC", first: 31, last: 40, venueId: "venue-08" },
  { prefix: "CG", first: 1, last: 7, venueId: "venue-27" },
] as const;

export function normalizeTeamCode(value: string) {
  const compact = value.trim().toUpperCase().replace(/\s+/g, "").replace(/[-_]/g, "");
  const match = compact.match(/^([A-Z]+)(\d+)$/);
  if (!match) throw new Error(`Invalid team ID: ${value}`);
  return `${match[1]}-${match[2].padStart(2, "0")}`;
}

export function normalizeProblemStatementCode(value: string) {
  const compact = value.trim().toUpperCase().replace(/[\s._-]/g, "");
  const match = compact.match(/^(?:SIH|PS)?(\d+)$/);
  if (!match) return compact;
  const digits = match[1];
  return digits.length <= 3 ? `PS${digits.padStart(3, "0")}` : `SIH${digits}`;
}

export function getVenueIdForTeamCode(teamCode: string) {
  const match = teamCode.match(/^([A-Z]+)-(\d+)$/);
  if (!match) throw new Error(`Invalid normalized team code: ${teamCode}`);
  const [, prefix, sequenceText] = match;
  const sequence = Number(sequenceText);
  const assignment = venueRanges.find((range) => range.prefix === prefix && sequence >= range.first && sequence <= range.last);
  if (!assignment) throw new Error(`No official venue allocation exists for ${teamCode}.`);
  return assignment.venueId;
}

export function inferAcademicYear(rollNumber: string) {
  const batch = Number(rollNumber.trim().match(/^(\d{2})/)?.[1]);
  if (batch === 23) return 4;
  if (batch === 24) return 3;
  if (batch === 25) return 2;
  if (batch === 26) return 1;
  return 1;
}

export function createRegistrationSummary(rows: RegistrationRow[]): RegistrationImportSummary {
  return rows.reduce<RegistrationImportSummary>((summary, row) => {
    const venueId = getVenueIdForTeamCode(row.teamCode);
    summary.teamCount += 1;
    summary.venueCounts[venueId] = (summary.venueCounts[venueId] ?? 0) + 1;
    summary.themeCounts[row.theme] = (summary.themeCounts[row.theme] ?? 0) + 1;
    return summary;
  }, { teamCount: 0, venueCounts: {}, themeCounts: {} });
}
