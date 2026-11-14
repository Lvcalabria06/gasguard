export function authProxyDecision(
  pathname: string,
  hasSessionCookie: boolean,
): "next" | { redirect: string } {
  if (pathname.startsWith("/api/auth")) return "next";

  const isAuthPage = pathname === "/login" || pathname === "/cadastro";
  if (isAuthPage) return "next";

  if (!hasSessionCookie) return { redirect: "/login" };
  return "next";
}
