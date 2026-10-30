// ホームから開く下層画面は、ナビゲーションでホームを選択中として表示する
export const isHomeSubRoute = (pathname: string): boolean =>
  pathname === "/maintenance" ||
  pathname === "/odo-history";
