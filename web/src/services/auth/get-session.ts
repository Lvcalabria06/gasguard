import "server-only";

import { headers } from "next/headers";

import { auth } from "./auth";

export async function getSessionUser(): Promise<{
  name: string;
  email: string;
} | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.email) return null;
  return { name: session.user.name, email: session.user.email };
}
