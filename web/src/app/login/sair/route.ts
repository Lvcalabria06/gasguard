import { redirect } from "next/navigation";

import { clearSession } from "@/services/auth/session";

export async function POST() {
  await clearSession();
  redirect("/");
}
