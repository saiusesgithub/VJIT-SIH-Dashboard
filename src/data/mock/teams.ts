import type { Team, TeamMember } from "@/types/domain";
import { venues } from "./venues";

const teamNames = [
  "ByteForge", "CivicStack", "AquaPulse", "Nexora", "KisanLink", "LearnAble",
  "ResolveAI", "CropCircuit", "Saarthi Labs", "TerraTrace", "SignalWorks", "MediBridge",
  "RapidGrid", "EcoRoute", "NyayaSetu", "ResQ Labs", "LoopCycle", "BhashaCore",
  "CrisisCanvas", "GreenLedger", "JalNet", "UrbanMint", "FieldSense", "OpenAccess",
  "SafeStep", "Solaris", "HeritageXR", "Nirmaan", "AegisNet", "VoltVision",
  "SiteStory", "Pragati", "Drishti Labs", "Samvaad", "Atlas Works", "FluxFoundry",
  "Rakshak", "UrjaFlow", "Kalakruti", "SentinelX", "GridCraft", "ArchiveOS",
  "JanMitra", "InnoVerse", "CoreShift", "ImpactLoop", "Syntax Squad", "Project Aster",
];

const firstNames = ["Aarav", "Aditi", "Akash", "Ananya", "Arjun", "Bhavya", "Charan", "Deepika", "Harsha", "Ishita", "Karthik", "Kavya", "Meghana", "Nikhil", "Pranav", "Priya", "Rahul", "Sanjana", "Siddharth", "Sneha", "Tanvi", "Varun", "Vivek", "Yashaswi"];
const lastNames = ["Reddy", "Sharma", "Rao", "Patel", "Iyer", "Nair", "Verma", "Kulkarni", "Joshi", "Gupta", "Singh", "Kumar"];
const roles: TeamMember["role"][] = ["Team Lead", "Developer", "Designer", "Researcher"];
const departments = ["CSE", "CSE (AI & ML)", "Information Technology", "Electronics & Communication"];

function createMembers(teamNumber: number): TeamMember[] {
  return roles.map((role, index) => {
    const memberNumber = (teamNumber - 1) * 4 + index;
    return {
      id: `member-${teamNumber}-${index + 1}`,
      name: `${firstNames[memberNumber % firstNames.length]} ${lastNames[(memberNumber * 5) % lastNames.length]}`,
      rollNumber: `23R01A${String(teamNumber * 4 + index).padStart(4, "0")}`,
      department: departments[index],
      year: index === 3 ? 2 : 3,
      role,
    };
  });
}

export const teams: Team[] = venues.flatMap((venue, venueIndex) =>
  Array.from({ length: 12 }, (_, teamIndex) => {
    const teamNumber = venueIndex * 12 + teamIndex + 1;
    return {
      id: `team-${String(teamNumber).padStart(3, "0")}`,
      code: `T${String(teamNumber).padStart(3, "0")}`,
      name: teamNames[teamNumber - 1],
      venueId: venue.id,
      problemStatementId: venue.problemStatementIds[teamIndex % venue.problemStatementIds.length],
      members: createMembers(teamNumber),
    };
  }),
);
