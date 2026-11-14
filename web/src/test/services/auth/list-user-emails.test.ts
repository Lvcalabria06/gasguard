import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

describe("listUserEmails", () => {
  let dir: string;
  let dbPath: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "gg-auth-"));
    dbPath = join(dir, "auth.sqlite");
    process.env.AUTH_SQLITE_PATH = dbPath;
  });

  afterEach(() => {
    delete process.env.AUTH_SQLITE_PATH;
    rmSync(dir, { recursive: true, force: true });
  });

  it("returns [] when the database file is missing", async () => {
    const { listUserEmails } = await import("@/services/auth/list-user-emails");
    expect(listUserEmails()).toEqual([]);
  });

  it("returns emails from the user table", async () => {
    const db = new Database(dbPath);
    db.exec(
      `create table user (id text primary key, email text not null, name text);`,
    );
    db.prepare(`insert into user (id, email, name) values (?, ?, ?)`).run(
      "1",
      "ada@example.com",
      "Ada",
    );
    db.prepare(`insert into user (id, email, name) values (?, ?, ?)`).run(
      "2",
      "bob@example.com",
      "Bob",
    );
    db.close();

    const { listUserEmails } = await import("@/services/auth/list-user-emails");
    expect(listUserEmails().sort()).toEqual([
      "ada@example.com",
      "bob@example.com",
    ]);
  });
});
