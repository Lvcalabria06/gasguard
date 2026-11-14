import "server-only";

import Database from "better-sqlite3";

import { getAuthSqlitePath } from "./sqlite-path";

export function listUserEmails(): string[] {
  try {
    const db = new Database(getAuthSqlitePath(), {
      readonly: true,
      fileMustExist: true,
    });
    try {
      const rows = db.prepare("select email from user").all() as {
        email: string;
      }[];
      return rows.map((row) => row.email);
    } finally {
      db.close();
    }
  } catch {
    return [];
  }
}
