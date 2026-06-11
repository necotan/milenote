// グローバルCSS（CSS Modules以外）の副作用インポートに型を与える宣言
// Next.jsの型定義は *.module.css のみ宣言しているため、./globals.css のような
// 副作用インポートに対するエディタの型エラーをこの宣言で解消する
declare module "*.css"
