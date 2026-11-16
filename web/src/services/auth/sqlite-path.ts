import "server-only";


import { resolve } from "node:path";

export function getAuthSqlitePath(): string {
  return resolve(
    /* turbopackIgnore: true */ process.cwd(),
    process.env.AUTH_SQLITE_PATH ?? ".data/auth.sqlite",
  );
}
