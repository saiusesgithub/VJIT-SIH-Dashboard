import type { Venue } from "@/types/domain";

export const venues: Venue[] = [
  { id: "lab-1", name: "Venue 1", room: "A-204", problemStatementIds: ["ps001", "ps002", "ps003"], judgeId: "judge-1", location: "A-Block 2nd Floor", theme: "Disaster Management", teamCodeRange: "DM-01 to DM-16", plannedTeamCount: 16 },
  { id: "lab-2", name: "Venue 2", room: "A-211", problemStatementIds: ["ps004", "ps005", "ps006"], judgeId: "judge-2", location: "A-Block 2nd Floor", theme: "Disaster Management", teamCodeRange: "DM-17 to DM-32", plannedTeamCount: 16 },
  { id: "lab-3", name: "Venue 3", room: "B-201", problemStatementIds: ["ps007", "ps008", "ps009"], judgeId: "judge-3", location: "B-Block 2nd & 3rd Floor", theme: "MedTech / BioTech / HealthTech", teamCodeRange: "MH-01 to MH-10", plannedTeamCount: 10 },
  { id: "lab-4", name: "Venue 4", room: "B-301", problemStatementIds: ["ps010", "ps011", "ps012"], judgeId: "judge-4", location: "B-Block 2nd & 3rd Floor", theme: "MedTech / BioTech / HealthTech", teamCodeRange: "MH-11 to MH-21", plannedTeamCount: 11 },
];
