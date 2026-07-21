-- 高速料金の区間（入口IC/出口IC）をmemoの文字列パースではなく専用カラムで持つようにする

ALTER TABLE "public"."records"
  ADD COLUMN "entry_ic" "text",
  ADD COLUMN "exit_ic" "text";

-- memoに埋め込まれていた区間表記から entry_ic / exit_ic を抽出し、残りの自由記述部分だけをmemoに残す
-- 下の正規表現中の文字列は、過去にmemoへ実際に保存されていた旧プレフィックスと一致させるための照合パターンであり、新規保存やUI表示では使用しない
WITH parsed AS (
  SELECT
    "id",
    (regexp_match("memo", '^【区間】(.*?) ➡ (.*?)(?:\n([\s\S]*))?$'))[1] AS "entry",
    (regexp_match("memo", '^【区間】(.*?) ➡ (.*?)(?:\n([\s\S]*))?$'))[2] AS "exit",
    (regexp_match("memo", '^【区間】(.*?) ➡ (.*?)(?:\n([\s\S]*))?$'))[3] AS "rest"
  FROM "public"."records"
  WHERE "category" = 'highway' AND "memo" ~ '^【区間】.* ➡ '
)
UPDATE "public"."records" "r"
SET
  "entry_ic" = NULLIF(NULLIF("parsed"."entry", '未入力'), ''),
  "exit_ic" = NULLIF(NULLIF("parsed"."exit", '未入力'), ''),
  "memo" = NULLIF("parsed"."rest", '')
FROM "parsed"
WHERE "r"."id" = "parsed"."id";

WITH parsed AS (
  SELECT
    "id",
    (regexp_match("memo", '^Route: (.*?) ➡ (.*?)(?:\n([\s\S]*))?$'))[1] AS "entry",
    (regexp_match("memo", '^Route: (.*?) ➡ (.*?)(?:\n([\s\S]*))?$'))[2] AS "exit",
    (regexp_match("memo", '^Route: (.*?) ➡ (.*?)(?:\n([\s\S]*))?$'))[3] AS "rest"
  FROM "public"."records"
  WHERE "category" = 'highway' AND "memo" ~ '^Route: .* ➡ '
)
UPDATE "public"."records" "r"
SET
  "entry_ic" = NULLIF(NULLIF("parsed"."entry", 'N/A'), ''),
  "exit_ic" = NULLIF(NULLIF("parsed"."exit", 'N/A'), ''),
  "memo" = NULLIF("parsed"."rest", '')
FROM "parsed"
WHERE "r"."id" = "parsed"."id";
