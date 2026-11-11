import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const JAPANESE = "/[\\u3040-\\u30ff\\u4e00-\\u9fff]/";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["**/*.tsx"],
    rules: {
      // 表示文言は翻訳キーを通す
      // 記号、単位、ブランド名だけ直書きを認める
      "react/jsx-no-literals": [
        "error",
        {
          ignoreProps: true,
          allowedStrings: [
            "Milenote",
            "¥",
            "+¥",
            "-¥",
            "±¥0",
            "/",
            ":",
            "：",
            "%",
            "-",
            "|",
            "!",
            "x",
            "&#8203;",
          ],
        },
      ],
    },
  },
  {
    files: ["**/*.ts", "**/*.tsx"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: `Literal[value=${JAPANESE}]`,
          message: "日本語の文言は lib/i18n/locales に置き、t() で参照する",
        },
        {
          selector: `TemplateElement[value.raw=${JAPANESE}]`,
          message: "日本語の文言は lib/i18n/locales に置き、t() で参照する",
        },
        {
          selector: `JSXText[value=${JAPANESE}]`,
          message: "日本語の文言は lib/i18n/locales に置き、t() で参照する",
        },
        {
          selector: "ClassDeclaration[superClass]",
          message: "コンポーネントは関数と Hooks で書く",
        },
      ],
    },
  },
  {
    // manifest は React の外で評価され t() を使えない。lib/i18n は日付書式そのものを定義する
    files: ["app/manifest.ts", "lib/i18n/index.tsx"],
    rules: {
      "no-restricted-syntax": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
