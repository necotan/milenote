// 未認証でもアクセスできる公開ルートの判定
export const isPublicRoute = (pathname: string): boolean =>
  pathname.startsWith("/login") ||
  pathname === "/terms" ||
  pathname === "/privacy" ||
  pathname === "/reset-password";
