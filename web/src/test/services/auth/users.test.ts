import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  createUser,
  findUser,
  getUsersPath,
  listUsers,
  parseEmail,
} from "./users";

const originalPath = process.env.AUTH_USERS_PATH;

let tmpDir: string;

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), "gasguard-users-"));
  process.env.AUTH_USERS_PATH = join(tmpDir, "users.json");
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  rmSync(tmpDir, { recursive: true, force: true });
  if (originalPath === undefined) delete process.env.AUTH_USERS_PATH;
  else process.env.AUTH_USERS_PATH = originalPath;
});

describe("parseEmail", () => {
  it("trims, lowercases, and rejects malformed addresses", () => {
    expect(parseEmail("  Ada@Example.COM ")).toBe("ada@example.com");
    expect(parseEmail("")).toBeNull();
    expect(parseEmail("sem-arroba")).toBeNull();
    expect(parseEmail("a@b")).toBeNull();
    expect(parseEmail("a b@c.com")).toBeNull();
  });
});

describe("users.json", () => {
  it("resolves AUTH_USERS_PATH when set, otherwise .data/users.json", () => {
    expect(getUsersPath()).toBe(join(tmpDir, "users.json"));
    delete process.env.AUTH_USERS_PATH;
    expect(getUsersPath()).toMatch(/\.data\/users\.json$/);
  });

  it("treats a missing file as an empty list", () => {
    expect(listUsers()).toEqual([]);
    expect(findUser("ada@example.com")).toBeNull();
  });

  it("creates a user and finds them case-insensitively", () => {
    expect(createUser("Ada@Example.COM", "password1")).toBe("created");
    expect(createUser("ada@example.com", "password1")).toBe("duplicate");

    const user = findUser("ADA@example.com");
    expect(user?.email).toBe("ada@example.com");
    expect(user?.passwordHash).toMatch(/^[0-9a-f]{32}:[0-9a-f]{128}$/);

    const raw = JSON.parse(
      readFileSync(join(tmpDir, "users.json"), "utf8"),
    ) as Array<{ email: string }>;
    expect(raw).toEqual([{ email: "ada@example.com", passwordHash: user?.passwordHash }]);
  });

  it("returns [] and logs when the JSON is invalid", () => {
    writeFileSync(join(tmpDir, "users.json"), "{not json", "utf8");

    expect(listUsers()).toEqual([]);
    expect(console.error).toHaveBeenCalledWith(
      "[auth] invalid users.json",
      expect.anything(),
    );
  });
});
