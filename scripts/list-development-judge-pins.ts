import { developmentPinForAssignment, officialVenues } from "../src/data/seed/event-configuration";

console.table(officialVenues.flatMap((venue, venueIndex) =>
  venue.judges.map((judge, judgeIndex) => ({
    venue: venue.name,
    room: venue.roomNumber,
    role: judge.role === "EXTERNAL" ? "External" : "Internal",
    judge: judge.name,
    pin: developmentPinForAssignment(venueIndex + 1, judgeIndex, judge),
  })),
));
