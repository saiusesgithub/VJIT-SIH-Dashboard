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
  // Agriculture, FoodTech & Rural Development
  { prefix: "AR", first: 1, last: 10, venueId: "venue-22" },
  { prefix: "AR", first: 11, last: 20, venueId: "venue-23" },
  { prefix: "AR", first: 21, last: 30, venueId: "venue-24" },
  { prefix: "AR", first: 31, last: 36, venueId: "venue-25" },
  // Blockchain & Cybersecurity
  { prefix: "BC", first: 1, last: 10, venueId: "venue-05" },
  { prefix: "BC", first: 11, last: 20, venueId: "venue-06" },
  { prefix: "BC", first: 21, last: 30, venueId: "venue-07" },
  { prefix: "BC", first: 31, last: 40, venueId: "venue-08" },
  // Clean & Green Technology
  { prefix: "CG", first: 1, last: 7, venueId: "venue-27" },
  // Disaster Management
  { prefix: "DM", first: 1, last: 16, venueId: "lab-1" },
  { prefix: "DM", first: 17, last: 32, venueId: "lab-2" },
  // Fitness & Sports
  { prefix: "FS", first: 1, last: 2, venueId: "venue-27" },
  // Heritage & Culture
  { prefix: "HC", first: 1, last: 6, venueId: "venue-26a" },
  // MedTech / BioTech / HealthTech
  { prefix: "MH", first: 1, last: 10, venueId: "lab-3" },
  { prefix: "MH", first: 11, last: 21, venueId: "lab-4" },
  // Renewable / Sustainable Energy
  { prefix: "RS", first: 1, last: 3, venueId: "venue-26a" },
  // Robotics and Drones
  { prefix: "RD", first: 1, last: 3, venueId: "venue-26a" },
  // Smart Automation
  { prefix: "SA", first: 1, last: 10, venueId: "venue-14" },
  { prefix: "SA", first: 11, last: 15, venueId: "venue-15" },
  { prefix: "SA", first: 16, last: 20, venueId: "venue-16" },
  { prefix: "SA", first: 21, last: 30, venueId: "venue-17" },
  { prefix: "SA", first: 31, last: 40, venueId: "venue-18" },
  { prefix: "SA", first: 41, last: 50, venueId: "venue-19" },
  { prefix: "SA", first: 51, last: 60, venueId: "venue-20" },
  { prefix: "SA", first: 61, last: 69, venueId: "venue-21" },
  // Smart Education
  { prefix: "SE", first: 1, last: 9, venueId: "venue-09" },
  { prefix: "SE", first: 10, last: 18, venueId: "venue-10" },
  { prefix: "SE", first: 19, last: 27, venueId: "venue-11" },
  // Smart Vehicles
  { prefix: "SV", first: 1, last: 4, venueId: "venue-27" },
  // Space Technology
  { prefix: "ST", first: 1, last: 12, venueId: "venue-29" },
  // Tourism
  { prefix: "TO", first: 1, last: 7, venueId: "venue-27" },
  // Transportation & Logistics
  { prefix: "TL", first: 1, last: 15, venueId: "venue-28" },
  // Toys and Games
  { prefix: "TG", first: 1, last: 2, venueId: "venue-26a" },
  // Miscellaneous
  { prefix: "MI", first: 1, last: 12, venueId: "venue-12" },
  { prefix: "MI", first: 13, last: 26, venueId: "venue-13" },
] as const;

export function normalizeTeamCode(value: string) {
  const compact = value.trim().toUpperCase().replace(/\s+/g, "").replace(/[-_]/g, "");
  // Step 1: split at the first real digit — this gives the correct prefix for all well-formed
  // codes including those whose prefix ends in a vowel like "TO", "SA", etc.
  const firstDigit = compact.search(/\d/);
  if (firstDigit < 1) throw new Error(`Invalid team ID: ${value}`);
  const prefix = compact.slice(0, firstDigit);
  const suffix = compact.slice(firstDigit);
  // Validate: prefix must be all letters, suffix must be all digits.
  if (!/^[A-Z]+$/.test(prefix) || !/^\d+$/.test(suffix)) throw new Error(`Invalid team ID: ${value}`);
  return `${prefix}-${suffix.padStart(2, "0")}`;
}

export function normalizeTeamCodeWithOCorrection(value: string) {
  // All registered theme prefixes are exactly two letters (AR, BC, CG, DM, FS, HC, MH, RD, RS,
  // SA, SE, ST, SV, TL, TO). If normalizing produces a prefix longer than 2 letters ending in O,
  // treat that trailing O as a digit-zero typo (e.g. "RSO1" → prefix "RSO" → corrected "RS01").
  const result = normalizeTeamCode(value);
  const prefixMatch = result.match(/^([A-Z]+)-/);
  if (prefixMatch && prefixMatch[1].length > 2 && prefixMatch[1].endsWith("O")) {
    const compact = value.trim().toUpperCase().replace(/\s+/g, "").replace(/[-_]/g, "");
    // Drop the trailing O from the prefix and prepend a 0 to the suffix.
    const corrected = compact.slice(0, compact.search(/\d/) - 1) + "0" + compact.slice(compact.search(/\d/) - 1).replace(/^O/, "");
    return normalizeTeamCode(corrected);
  }
  return result;
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
