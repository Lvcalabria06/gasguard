import { connection } from "next/server";

import { Dashboard } from "@/components/dashboard/dashboard";
import { getSession } from "@/services/auth/session";
import { getRecentReadings } from "@/services/report/report-service";

export default async function Home() {
  await connection();
  const initial = await getRecentReadings();
  const session = await getSession();
  return <Dashboard initial={initial} email={session?.email ?? null} />;
}
