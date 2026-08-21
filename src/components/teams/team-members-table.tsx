import { Section } from "@/components/ui/section";
import type { TeamMember } from "@/types/domain";

export function TeamMembersTable({ members }: { members: TeamMember[] }) {
  return (
    <Section title="Team members" description={`${members.length} registered participants`}>
      <div className="overflow-x-auto"><table className="w-full min-w-[650px] text-left text-xs"><thead className="border-b border-zinc-200 bg-zinc-50/80 text-[11px] uppercase tracking-wide text-zinc-500"><tr><th className="px-5 py-2.5 font-medium">Name</th><th className="px-4 py-2.5 font-medium">Roll number</th><th className="px-4 py-2.5 font-medium">Department</th><th className="px-4 py-2.5 font-medium">Year</th><th className="px-5 py-2.5 font-medium">Role</th></tr></thead><tbody className="divide-y divide-zinc-100">{members.map((member) => <tr key={member.id}><td className="px-5 py-3.5 font-medium text-zinc-900">{member.name}</td><td className="px-4 py-3.5 font-mono text-[11px] text-zinc-600">{member.rollNumber}</td><td className="px-4 py-3.5 text-zinc-600">{member.department}</td><td className="px-4 py-3.5 text-zinc-600">Year {member.year}</td><td className="px-5 py-3.5 text-zinc-600">{member.role}</td></tr>)}</tbody></table></div>
    </Section>
  );
}
