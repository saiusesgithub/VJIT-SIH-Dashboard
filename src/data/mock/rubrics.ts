import type { Rubric } from "@/types/domain";

export const rubrics: Rubric[] = [
  { id: "rubric-1", name: "Concept Review", criteria: [
    { id: "innovation", label: "Innovation / Idea", maxScore: 20 },
    { id: "understanding", label: "Problem Understanding", maxScore: 20 },
    { id: "feasibility", label: "Feasibility", maxScore: 20 },
    { id: "technical", label: "Technical Approach", maxScore: 25 },
    { id: "presentation", label: "Presentation", maxScore: 15 },
  ] },
  { id: "rubric-2", name: "Prototype Review", criteria: [
    { id: "progress", label: "Implementation Progress", maxScore: 25 },
    { id: "architecture", label: "Technical Architecture", maxScore: 20 },
    { id: "validation", label: "Solution Validation", maxScore: 20 },
    { id: "usability", label: "Usability", maxScore: 15 },
    { id: "execution", label: "Team Execution", maxScore: 20 },
  ] },
  { id: "rubric-3", name: "Final Review", criteria: [
    { id: "solution", label: "Solution Completeness", maxScore: 25 },
    { id: "impact", label: "Impact & Relevance", maxScore: 20 },
    { id: "quality", label: "Technical Quality", maxScore: 20 },
    { id: "demo", label: "Live Demonstration", maxScore: 20 },
    { id: "pitch", label: "Final Pitch", maxScore: 15 },
  ] },
];
