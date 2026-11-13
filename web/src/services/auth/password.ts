import "server-only";

import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

export const MIN_PASSWORD_LENGTH = 8;

const KEY_LEN = 64;
const SALT_LEN = 16;

export function passwordError(password: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return "A senha precisa ter pelo menos 8 caracteres.";
  }
  return null;
}

export function hashPassword(password: string): string {
  const salt = randomBytes(SALT_LEN);
  const key = scryptSync(password, salt, KEY_LEN);
  return `${salt.toString("hex")}:${key.toString("hex")}`;
}

function equalHex(left: string, right: string): boolean {
  try {
    const a = Buffer.from(left, "hex");
    const b = Buffer.from(right, "hex");
    if (a.length === 0 || a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function verifyPassword(password: string, stored: string): boolean {
  const sep = stored.indexOf(":");
  if (sep === -1) return false;
  const saltHex = stored.slice(0, sep);
  const keyHex = stored.slice(sep + 1);
  let salt: Buffer;
  try {
    salt = Buffer.from(saltHex, "hex");
  } catch {
    return false;
  }
  if (salt.length !== SALT_LEN) return false;
  const key = scryptSync(password, salt, KEY_LEN);
  return equalHex(key.toString("hex"), keyHex);
}
