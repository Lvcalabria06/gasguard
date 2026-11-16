import { connection } from "next/server";
import { redirect } from "next/navigation";

import { Dashboard } from "@/components/dashboard/dashboard";
import { signOut } from "@/app/login/actions";
import { getSessionUser } from "@/services/auth/get-session";
import { getRecentReadings } from "@/services/report/report-service";

export default async function Home() {
  await connection();
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const initial = await getRecentReadings();
  return (
    <Dashboard initial={initial} user={user} signOutAction={signOut} />
  );
}
