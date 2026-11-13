import { connection } from "next/server";

import { Dashboard } from "@/components/dashboard/dashboard";
import { getRecentReadings } from "@/services/report/report-service";

export default async function Home() {
  await connection();
  const initial = await getRecentReadings();
  return <Dashboard initial={initial} />;
}
