import { toNextJsHandler } from "better-auth/next-js";

import { auth } from "@/services/auth/auth";

export const { GET, POST } = toNextJsHandler(auth);
