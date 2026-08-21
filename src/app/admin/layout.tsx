import type { ReactNode } from "react";
import { AdminShell } from "@/components/admin/admin-shell";
import { getAdminShellData } from "@/lib/repositories/evaluation-repository";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const data = await getAdminShellData();
  return <AdminShell data={data}>{children}</AdminShell>;
}
