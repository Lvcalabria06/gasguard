import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

import { cookies } from "next/headers";

import { parseEmail } from "./users";

export const SESSION_COOKIE = "gg_session";

function equal(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function signSession(email: string, secret: string): string {
  const payload = Buffer.from(email, "utf8").toString("base64url");
  const mac = createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${mac}`;
}

export function verifySession(
  token: string,
  secret: string,
): { email: string } | null {
  const sep = token.lastIndexOf(".");
  if (sep === -1) return null;
  const payload = token.slice(0, sep);
  const mac = token.slice(sep + 1);
  const expected = createHmac("sha256", secret)
    .update(payload)
    .digest("base64url");
  if (!equal(mac, expected)) return null;
  let email: string;
  try {
    email = Buffer.from(payload, "base64url").toString("utf8");
  } catch {
    return null;
  }
  const normalized = parseEmail(email);
  if (normalized === null) return null;
  return { email: normalized };
}

function authSecret(): string | null {
  const secret = process.env.AUTH_SECRET;
  return secret ? secret : null;
}

export async function getSession(): Promise<{ email: string } | null> {
  const secret = authSecret();
  if (secret === null) return null;
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySession(token, secret);
}

export async function setSession(email: string): Promise<void> {
  const secret = authSecret();
  if (secret === null) throw new Error("AUTH_SECRET missing");
  const jar = await cookies();
  jar.set(SESSION_COOKIE, signSession(email, secret), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
  });
}

export async function clearSession(): Promise<void> {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}
