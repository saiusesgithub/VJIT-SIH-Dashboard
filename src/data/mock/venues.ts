import type { Venue } from "@/types/domain";

export const venues: Venue[] = [
  { id: "lab-1", name: "Lab 1", room: "A-201", problemStatementIds: ["ps001", "ps002", "ps003"], judgeId: "judge-1" },
  { id: "lab-2", name: "Lab 2", room: "A-202", problemStatementIds: ["ps004", "ps005", "ps006"], judgeId: "judge-2" },
  { id: "lab-3", name: "Lab 3", room: "A-203", problemStatementIds: ["ps007", "ps008", "ps009"], judgeId: "judge-3" },
  { id: "lab-4", name: "Lab 4", room: "B-101", problemStatementIds: ["ps010", "ps011", "ps012"], judgeId: "judge-4" },
];
