export const isPublicRoute = (pathname: string): boolean =>
  pathname.startsWith("/login") ||
  pathname === "/terms" ||
  pathname === "/privacy" ||
  pathname === "/reset-password";
