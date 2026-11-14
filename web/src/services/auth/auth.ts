import "server-only";


import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

import { getAuthSqlitePath } from "./sqlite-path";

const path = getAuthSqlitePath();
mkdirSync(dirname(path), { recursive: true });

export const auth = betterAuth({
  database: new Database(path),
  emailAndPassword: { enabled: true },
  plugins: [nextCookies()],
});
