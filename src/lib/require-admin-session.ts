import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionToken } from "@/lib/admin-auth";

export async function hasAdminSession() {
  return verifyAdminSessionToken((await cookies()).get(ADMIN_SESSION_COOKIE)?.value);
}

export async function requireAdminSession() {
  if (!(await hasAdminSession())) redirect("/admin/login");
}
