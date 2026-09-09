export type OfficialJudgeRole = "EXTERNAL" | "INTERNAL";

export interface OfficialJudgeSeed {
  id: string;
  name: string;
  role: OfficialJudgeRole;
  department?: string;
  phone?: string;
  developmentPin?: string;
  isPrimary?: boolean;
}

export interface OfficialCoordinatorSeed {
  id: string;
  name: string;
  department?: string;
  phone?: string;
}

export interface OfficialVenueSeed {
  id: string;
  code: string;
  name: string;
  roomNumber: string;
  location?: string;
  theme: string;
  teamCodeRange?: string;
  plannedTeamCount?: number;
  sourceSerial: number;
  judges: OfficialJudgeSeed[];
  coordinators: OfficialCoordinatorSeed[];
}

const external = (id: string, name: string, phone?: string, developmentPin?: string): OfficialJudgeSeed => ({
  id,
  name,
  phone,
  developmentPin,
  role: "EXTERNAL",
  department: "External",
});

const internal = (id: string, name: string, department?: string, phone?: string, developmentPin?: string, isPrimary?: boolean): OfficialJudgeSeed => ({
  id,
  name,
  department,
  phone,
  developmentPin,
  isPrimary,
  role: "INTERNAL",
});

const coordinator = (id: string, name: string, phone?: string, department?: string): OfficialCoordinatorSeed => ({ id, name, phone, department });

// Transcribed from SIH-2026-VENUES.xlsx. Repeated values in merged cells are
// intentionally carried to every room covered by the merge.
export const officialVenues: OfficialVenueSeed[] = [
  {
    id: "lab-1", code: "V01", name: "Venue 1", roomNumber: "A-204", location: "A-Block 2nd Floor",
    theme: "Disaster Management", teamCodeRange: "DM-01 to DM-16", plannedTeamCount: 16, sourceSerial: 1,
    judges: [external("judge-1", "Mr. Dileep Boorla", "9154527454", "1111"), internal("internal-ravi-kumar", "Dr. Ravi Kumar", "CSE (DS)", "7660000939")],
    coordinators: [coordinator("coordinator-v01-praveen", "Mr. P. Praveen", "8500656504")],
  },
  {
    id: "lab-2", code: "V02", name: "Venue 2", roomNumber: "A-211", location: "A-Block 2nd Floor",
    theme: "Disaster Management", teamCodeRange: "DM-17 to DM-32", plannedTeamCount: 16, sourceSerial: 2,
    judges: [external("judge-2", "Mr. Sai Kumar Peddarmaji", "7981668856", "2222"), internal("internal-bhoopesh", "Dr. Bhoopesh", "EEE", "9849153841")],
    coordinators: [coordinator("coordinator-v02-praveen", "Mr. P. Praveen", "8500656504")],
  },
  {
    id: "lab-3", code: "V03", name: "Venue 3", roomNumber: "B-201", location: "B-Block 2nd & 3rd Floor",
    theme: "MedTech / BioTech / HealthTech", teamCodeRange: "MH-01 to MH-10", plannedTeamCount: 10, sourceSerial: 3,
    judges: [external("judge-3", "Mr. Pavan Kumar Bavirisetty", "9701062618", "3333"), internal("judge-4", "Dr. Pramod Reddy", "CSE", "9030585518")],
    coordinators: [coordinator("coordinator-v03-srinu", "Mr. Srinu Nayak", "9494433028")],
  },
  {
    id: "lab-4", code: "V04", name: "Venue 4", roomNumber: "B-301", location: "B-Block 2nd & 3rd Floor",
    theme: "MedTech / BioTech / HealthTech", teamCodeRange: "MH-11 to MH-21", plannedTeamCount: 11, sourceSerial: 4,
    judges: [external("judge-3", "Mr. Pavan Kumar Bavirisetty", "9701062618"), internal("judge-4", "Dr. Pramod Reddy", "CSE", "9030585518", "4444", true)],
    coordinators: [coordinator("coordinator-v04-shilpa", "Mrs. Shilpa", "7416915855")],
  },
  {
    id: "venue-05", code: "V05", name: "Venue 5", roomNumber: "C-201", location: "C-Block 2nd Floor",
    theme: "Blockchain & Cybersecurity", teamCodeRange: "BC-01 to BC-10", plannedTeamCount: 10, sourceSerial: 5,
    judges: [external("external-vinay-reddy", "Mr. Chetelli Vinay Reddy", "9182356834"), external("external-shankar-reddy", "Mr. Shankar Reddy", "9392281393"), internal("internal-madhuri-paul", "Dr. Madhuri Paul", "CSE", "9059308401")],
    coordinators: [coordinator("coordinator-v05-udaya", "Mr. M. Udaya Kumar", "9966053457", "IT")],
  },
  {
    id: "venue-06", code: "V06", name: "Venue 6", roomNumber: "C-203", location: "C-Block 2nd Floor",
    theme: "Blockchain & Cybersecurity", teamCodeRange: "BC-11 to BC-20", plannedTeamCount: 10, sourceSerial: 6,
    judges: [external("external-vinay-reddy", "Mr. Chetelli Vinay Reddy", "9182356834"), external("external-shankar-reddy", "Mr. Shankar Reddy", "9392281393"), internal("internal-madhuri-paul", "Dr. Madhuri Paul", "CSE", "9059308401")],
    coordinators: [coordinator("coordinator-v06-group", "Mrs. D. Ashwini / Mrs. D. Sridevi / Mrs. Ambika", "9492436754")],
  },
  {
    id: "venue-07", code: "V07", name: "Venue 7", roomNumber: "C-205", location: "C-Block 2nd Floor",
    theme: "Blockchain & Cybersecurity", teamCodeRange: "BC-21 to BC-30", plannedTeamCount: 10, sourceSerial: 7,
    judges: [external("external-mohammed-adil", "Mr. Mohammed Adil", "9908487187"), internal("internal-deepika", "Dr. Deepika", "CSE", "8142699299")],
    coordinators: [coordinator("coordinator-v07-group", "Mrs. S. Bhavani Reddy / Mrs. M. Vijaya / Mrs. N. Bharathi", "9963857515")],
  },
  {
    id: "venue-08", code: "V08", name: "Venue 8", roomNumber: "C-209", location: "C-Block 2nd Floor",
    theme: "Blockchain & Cybersecurity", teamCodeRange: "BC-31 to BC-40", plannedTeamCount: 10, sourceSerial: 8,
    judges: [external("external-mohammed-adil", "Mr. Mohammed Adil", "9908487187"), internal("internal-deepika", "Dr. Deepika", "CSE", "8142699299")],
    coordinators: [coordinator("coordinator-v08-group", "Mr. V. Mallikarjun / Mrs. Divya", "9908284921")],
  },
  {
    id: "venue-09", code: "V09", name: "Venue 9", roomNumber: "C-306", location: "C-Block 3rd Floor",
    theme: "Smart Education", teamCodeRange: "SE-01 to SE-09", plannedTeamCount: 9, sourceSerial: 9,
    judges: [external("external-sujith-g", "Mr. Sujith G.", "9666366629"), internal("internal-marlin-linda", "Dr. Marlin Linda", "CSE", "9176260061")],
    coordinators: [coordinator("coordinator-v09-suresh", "Mr. M. Suresh Babu", undefined, "IT")],
  },
  {
    id: "venue-10", code: "V10", name: "Venue 10", roomNumber: "C-307", location: "C-Block 3rd Floor",
    theme: "Smart Education", teamCodeRange: "SE-10 to SE-18", plannedTeamCount: 9, sourceSerial: 10,
    judges: [external("external-sujith-g", "Mr. Sujith G.", "9666366629"), internal("internal-marlin-linda", "Dr. Marlin Linda", "CSE", "9176260061")],
    coordinators: [coordinator("coordinator-v10-lalitha", "Mrs. K. Lalitha", undefined, "IT")],
  },
  {
    id: "venue-11", code: "V11", name: "Venue 11", roomNumber: "C-309", location: "C-Block 3rd Floor",
    theme: "Smart Education", teamCodeRange: "SE-19 to SE-27", plannedTeamCount: 9, sourceSerial: 11,
    judges: [external("external-himaja-k", "Ms. Himaja K.", "9177945745"), internal("internal-babu-rao", "Dr. Babu Rao", "CSE (DS)", "9949676760")],
    coordinators: [coordinator("coordinator-v11-anitha", "Mrs. Anitha", undefined, "IT")],
  },
  {
    id: "venue-12", code: "V12", name: "Venue 12", roomNumber: "S-103", location: "S-Block 1st & 2nd Floor",
    theme: "Miscellaneous", teamCodeRange: "MI-01 to MI-12", plannedTeamCount: 12, sourceSerial: 12,
    judges: [external("external-ravi-kanth", "Mr. Ravi Kanth Koppala", "9989855554"), internal("internal-ganeshan", "Dr. Ganeshan", "ECE", "9884161831")],
    coordinators: [coordinator("coordinator-v12-ananda", "Mr. CH. Ananda Kumar Reddy", "9396354999")],
  },
  {
    id: "venue-13", code: "V13", name: "Venue 13", roomNumber: "S-201", location: "S-Block 1st & 2nd Floor",
    theme: "Miscellaneous", teamCodeRange: "MI-13 to MI-26", plannedTeamCount: 14, sourceSerial: 13,
    judges: [external("external-revanth-vaddi", "Mr. Revanth Vaddi", "6300459994"), internal("internal-nandhitha", "Dr. Nandhitha", "AIML", "9676467629")],
    coordinators: [coordinator("coordinator-v13-nagaraju", "Mr. Nagaraju", undefined, "IT")],
  },
  {
    id: "venue-14", code: "V14", name: "Venue 14", roomNumber: "S-303", location: "S-Block 3rd Floor",
    theme: "Smart Automation", teamCodeRange: "SA-01 to SA-10", plannedTeamCount: 10, sourceSerial: 14,
    judges: [external("external-chaithanya", "Mr. Chaithanya Moturi", "6303159614"), internal("internal-vadivel", "Dr. Vadivel", "ECE", "9443069524")],
    coordinators: [coordinator("coordinator-v14-praveen", "Mr. Praveen", undefined, "IT")],
  },
  {
    id: "venue-15", code: "V15", name: "Venue 15", roomNumber: "N-104",
    theme: "Smart Automation", teamCodeRange: "SA-11 to SA-15", plannedTeamCount: 5, sourceSerial: 15,
    judges: [external("external-chaithanya", "Mr. Chaithanya Moturi", "6303159614"), internal("internal-vadivel", "Dr. Vadivel", "ECE", "9443069524")],
    coordinators: [coordinator("coordinator-v15-archana", "Mrs. Archana Reddy", "9908360599")],
  },
  {
    id: "venue-16", code: "V16", name: "Venue 16", roomNumber: "Seminar Hall", location: "C-Block 2nd Floor",
    theme: "Smart Automation", teamCodeRange: "SA-16 to SA-20", plannedTeamCount: 5, sourceSerial: 16,
    judges: [external("external-chaithanya", "Mr. Chaithanya Moturi", "6303159614"), internal("internal-vadivel", "Dr. Vadivel", "ECE", "9443069524")],
    coordinators: [coordinator("coordinator-v16-swetha", "Mrs. CH. Swetha", "9550381682")],
  },
  {
    id: "venue-17", code: "V17", name: "Venue 17", roomNumber: "N-203", location: "N-Block 1st, 2nd & 3rd Floor",
    theme: "Smart Automation", teamCodeRange: "SA-21 to SA-30", plannedTeamCount: 10, sourceSerial: 17,
    judges: [external("external-sachin-dubey", "Mr. Sachin Dubey", "7842153300"), internal("internal-heppzi", "Dr. Heppzi", "AIML", "9150398660")],
    coordinators: [coordinator("coordinator-v17-group", "Mr. P. Ganesh / Mr. CH. Ramakrishna / Mr. P. V. S. Sharma", "9494433617")],
  },
  {
    id: "venue-18", code: "V18", name: "Venue 18", roomNumber: "N-208", location: "N-Block 1st, 2nd & 3rd Floor",
    theme: "Smart Automation", teamCodeRange: "SA-31 to SA-40", plannedTeamCount: 10, sourceSerial: 18,
    judges: [external("external-mohit-chokda", "Mr. Mohit Chokda", "7799222341"), internal("internal-marlene-grace", "Dr. Marlene Grace", "CSE", "9398193911")],
    coordinators: [coordinator("coordinator-v18-group", "Mrs. D. Madhu Mitha / Mrs. K. Radhika", "7675895312")],
  },
  {
    id: "venue-19", code: "V19", name: "Venue 19", roomNumber: "N-304", location: "N-Block 1st, 2nd & 3rd Floor",
    theme: "Smart Automation", teamCodeRange: "SA-41 to SA-50", plannedTeamCount: 10, sourceSerial: 19,
    judges: [external("external-mohit-chokda", "Mr. Mohit Chokda", "7799222341"), internal("internal-marlene-grace", "Dr. Marlene Grace", "CSE", "9398193911")],
    coordinators: [coordinator("coordinator-v19-reddy", "Mr. M. Reddy", undefined, "DS")],
  },
  {
    id: "venue-20", code: "V20", name: "Venue 20", roomNumber: "N-307", location: "N-Block 1st, 2nd & 3rd Floor",
    theme: "Smart Automation", teamCodeRange: "SA-51 to SA-60", plannedTeamCount: 10, sourceSerial: 20,
    judges: [external("external-sri-charan", "Mr. Sri Charan J.", "9390604365"), internal("internal-kalyani", "Dr. Kalyani", "ECE", "9704827499")],
    coordinators: [coordinator("coordinator-v20-nandana", "Mrs. Nandana", undefined, "DS")],
  },
  {
    id: "venue-21", code: "V21", name: "Venue 21", roomNumber: "D-209", location: "D-Block 2nd Floor",
    theme: "Smart Automation", teamCodeRange: "SA-61 to SA-69", plannedTeamCount: 9, sourceSerial: 21,
    judges: [external("external-sri-charan", "Mr. Sri Charan J.", "9390604365"), internal("internal-kalyani", "Dr. Kalyani", "ECE", "9704827499")],
    coordinators: [coordinator("coordinator-v21-parijatha", "Mrs. Parijatha", "9640646409")],
  },
  {
    id: "venue-22", code: "V22", name: "Venue 22", roomNumber: "E-011", location: "E-Block Ground, 1st & 3rd Floor",
    theme: "Agriculture, FoodTech & Rural Development", teamCodeRange: "AR-01 to AR-10", plannedTeamCount: 10, sourceSerial: 22,
    judges: [external("external-harshitha", "Ms. K. Harshitha", "9494782196"), internal("internal-sailaja", "Dr. Sailaja", "CSE", "9963142619")],
    coordinators: [coordinator("coordinator-v22-rama-mohan", "Mr. P. Rama Mohan", "9490123753")],
  },
  {
    id: "venue-23", code: "V23", name: "Venue 23", roomNumber: "E-012", location: "E-Block Ground, 1st & 3rd Floor",
    theme: "Agriculture, FoodTech & Rural Development", teamCodeRange: "AR-11 to AR-20", plannedTeamCount: 10, sourceSerial: 23,
    judges: [external("external-harshitha", "Ms. K. Harshitha", "9494782196"), internal("internal-sailaja", "Dr. Sailaja", "CSE", "9963142619")],
    coordinators: [coordinator("coordinator-v23-satya", "Mr. Satya Vara Prasad", "9440478319")],
  },
  {
    id: "venue-24", code: "V24", name: "Venue 24", roomNumber: "E-108", location: "E-Block Ground, 1st & 3rd Floor",
    theme: "Agriculture, FoodTech & Rural Development", teamCodeRange: "AR-21 to AR-30", plannedTeamCount: 10, sourceSerial: 24,
    judges: [external("external-praveen-martin", "Mr. Praveen Martin", "9491358081"), internal("internal-tarangini", "Mrs. Tarangini", "ECE", "9642177893")],
    coordinators: [coordinator("coordinator-v24-qudsia", "Mrs. Qudsia", "8686012312")],
  },
  {
    id: "venue-25", code: "V25", name: "Venue 25", roomNumber: "E-310", location: "E-Block Ground, 1st & 3rd Floor",
    theme: "Agriculture, FoodTech & Rural Development", teamCodeRange: "AR-31 to AR-36", plannedTeamCount: 6, sourceSerial: 25,
    judges: [external("external-praveen-martin", "Mr. Praveen Martin", "9491358081"), internal("internal-tarangini", "Mrs. Tarangini", "ECE", "9642177893")],
    coordinators: [coordinator("coordinator-v25-anees", "Mrs. Anees Fathima", "9945423545")],
  },
  {
    id: "venue-26a", code: "V26A", name: "Venue 26A", roomNumber: "Seminar Hall", location: "C-Block 1st Floor",
    theme: "Heritage & Culture; Renewable / Sustainable Energy; Robotics and Drones; Toys and Games", teamCodeRange: "HC-01 to HC-06; RS-01 to RS-03; RD-01 to RD-03; TG-01 to TG-02", plannedTeamCount: 14, sourceSerial: 26,
    judges: [external("external-anubha-mathew", "Ms. Anubha Mathew"), internal("internal-srinivasa-rao", "Mr. G. Srinivasa Rao", "CSE (DS)", "9989978583")],
    coordinators: [coordinator("coordinator-v26a-siraj", "Mr. Sirajjudin", "7702448347", "IT"), coordinator("coordinator-v26a-chiranjeevi", "Mr. Chiranjeevi", "9121048779", "IT")],
  },
  {
    id: "venue-26b", code: "V26B", name: "Venue 26B", roomNumber: "C-207", location: "Seminar Hall, C-Block 2nd Floor",
    theme: "Heritage & Culture; Renewable / Sustainable Energy; Robotics and Drones; Toys and Games", sourceSerial: 26,
    judges: [external("external-anubha-mathew", "Ms. Anubha Mathew"), internal("internal-srinivasa-rao", "Mr. G. Srinivasa Rao", "CSE (DS)", "9989978583")],
    coordinators: [coordinator("coordinator-v26b-siraj", "Mr. Sirajjudin", "7702448347", "IT"), coordinator("coordinator-v26b-chiranjeevi", "Mr. Chiranjeevi", "9121048779", "IT")],
  },
  {
    id: "venue-27", code: "V27", name: "Venue 27", roomNumber: "S-204", location: "S-Block 2nd Floor",
    theme: "Clean & Green Technology; Tourism; Smart Vehicles; Fitness & Sports", teamCodeRange: "CG-01 to CG-07; TO-01 to TO-07; SV-01 to SV-04; FS-01 to FS-02", plannedTeamCount: 20, sourceSerial: 27,
    judges: [external("external-siddartha", "Mr. Siddartha Thatikonda", "7842220311"), external("external-krishna-vardhan", "Mr. Chilamakuri Krishna Vardhan", "9603340166"), internal("internal-chandrashekhar", "Dr. Chandrashekhar Reddy", "EEE", "9885747095"), internal("internal-phanindra", "Dr. Phanindra", undefined, "9866046824")],
    coordinators: [coordinator("coordinator-v27-vijaya-laxmi", "Mrs. M. Vijaya Laxmi", "9966746398", "IT")],
  },
  {
    id: "venue-28", code: "V28", name: "Venue 28", roomNumber: "S-304", location: "S-Block 3rd Floor",
    theme: "Transportation & Logistics", teamCodeRange: "TL-01 to TL-15", plannedTeamCount: 15, sourceSerial: 28,
    judges: [external("external-vamshi-dande", "Mr. Vamshi Krishna Dande", "9390682425"), internal("internal-umashankar", "Dr. Umashankar", "Civil", "9777728801")],
    coordinators: [coordinator("coordinator-v28-keerthi", "Mrs. Keerthi", "6304961016", "IT")],
  },
  {
    id: "venue-29", code: "V29", name: "Venue 29", roomNumber: "S-302", location: "S-Block 3rd Floor",
    theme: "Space Technology", teamCodeRange: "ST-01 to ST-12", plannedTeamCount: 12, sourceSerial: 29,
    judges: [external("external-raghu-kiran", "Mr. Raghu Kiran Gajula", "9959877720"), internal("internal-ashwin-kumar", "Mr. Ashwin Kumar", "Civil", "9030433014")],
    coordinators: [coordinator("coordinator-v29-nasreen", "Mrs. Nasreen", "8186086784", "IT")],
  },
];

export const officialPlannedTeamCount = officialVenues.reduce((total, venue) => total + (venue.plannedTeamCount ?? 0), 0);

export function developmentPinForAssignment(venueIndex: number, judgeIndex: number, judge: OfficialJudgeSeed) {
  if (judge.developmentPin) return judge.developmentPin;
  const roleBase = judge.role === "EXTERNAL" ? 5000 : 7000;
  return String(roleBase + venueIndex * 10 + judgeIndex + 1);
}
