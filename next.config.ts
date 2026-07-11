import type { NextConfig } from "next";

// 全ルートに付与するセキュリティヘッダ
const securityHeaders = [
  // クリックジャッキング対策（古いブラウザ向けに X-Frame-Options も併用）
  { key: "X-Frame-Options", value: "DENY" },
  // MIMEタイプスニッフィング抑止
  { key: "X-Content-Type-Options", value: "nosniff" },
  // リファラから外部へURLが漏れるのを抑止
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // HTTPSの強制
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  // 未使用のブラウザ機能を無効化
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
  // document 系のみの CSP（スクリプト/スタイルは制限せず、フレーム埋め込み、base乗っ取り、プラグイン、フォーム送信先を制限）
  {
    key: "Content-Security-Policy",
    value: [
      "base-uri 'self'",
      "object-src 'none'",
      "frame-ancestors 'none'",
      "form-action 'self'",
      "upgrade-insecure-requests",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  allowedDevOrigins: ["*.devtunnels.ms"],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
