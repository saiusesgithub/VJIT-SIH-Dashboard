import type { Rubric } from "@/types/domain";

export const rubrics: Rubric[] = [
  ...[1, 2, 3].map((round) => ({
    id: `rubric-${round}`,
    name: `Review ${round} Evaluation`,
    criteria: [
      { id: "novelty", label: "Novelty of the Idea", maxScore: 10 },
      { id: "complexity", label: "Complexity", maxScore: 10 },
      { id: "clarity", label: "Clarity and Details in the Prescribed Format", maxScore: 10 },
      { id: "feasibility", label: "Feasibility", maxScore: 10 },
      { id: "practicability", label: "Practicability", maxScore: 10 },
      { id: "sustainability", label: "Sustainability", maxScore: 10 },
      { id: "impact", label: "Scale of Impact", maxScore: 10 },
      { id: "user-experience", label: "User Experience", maxScore: 10 },
      { id: "future-progression", label: "Potential for Future Work Progression", maxScore: 10 },
      { id: "presentation", label: "Presentation", maxScore: 10 },
    ],
  })),
];
