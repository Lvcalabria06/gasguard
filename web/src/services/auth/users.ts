import "server-only";

import {
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { dirname, resolve } from "node:path";

import { hashPassword } from "./password";

export interface StoredUser {
  email: string;
  passwordHash: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function parseEmail(raw: string): string | null {
  const email = raw.trim().toLowerCase();
  if (!EMAIL_RE.test(email)) return null;
  return email;
}

export function getUsersPath(): string {
  return resolve(
    /* turbopackIgnore: true */ process.cwd(),
    process.env.AUTH_USERS_PATH ?? ".data/users.json",
  );
}

function readUsers(path: string): StoredUser[] {
  let raw: string;
  try {
    raw = readFileSync(path, "utf8");
  } catch {
    return [];
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) throw new Error("not an array");
    return parsed.filter(isStoredUser);
  } catch (error) {
    console.error("[auth] invalid users.json", error);
    return [];
  }
}

function isStoredUser(value: unknown): value is StoredUser {
  if (typeof value !== "object" || value === null) return false;
  const row = value as { email?: unknown; passwordHash?: unknown };
  return typeof row.email === "string" && typeof row.passwordHash === "string";
}

function writeUsers(path: string, users: StoredUser[]): void {
  mkdirSync(dirname(path), { recursive: true });
  const tmp = `${path}.tmp`;
  writeFileSync(tmp, `${JSON.stringify(users, null, 2)}\n`, "utf8");
  renameSync(tmp, path);
}

export function listUsers(): StoredUser[] {
  return readUsers(getUsersPath());
}

export function findUser(email: string): StoredUser | null {
  const normalized = parseEmail(email);
  if (normalized === null) return null;
  return listUsers().find((user) => user.email === normalized) ?? null;
}

export function createUser(
  email: string,
  password: string,
): "created" | "duplicate" {
  const normalized = parseEmail(email);
  if (normalized === null) {
    throw new Error("createUser requires a valid email");
  }
  const path = getUsersPath();
  const users = readUsers(path);
  if (users.some((user) => user.email === normalized)) return "duplicate";
  users.push({ email: normalized, passwordHash: hashPassword(password) });
  writeUsers(path, users);
  return "created";
}
