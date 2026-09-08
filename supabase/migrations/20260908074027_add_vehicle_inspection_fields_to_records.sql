-- サブカテゴリ vehicle_inspection（車検）の記録に、自賠責保険を含むかのフラグと車検満了日を持たせる
-- includes_compulsory_insurance: 金額に自賠責保険料が含まれているか（保険カテゴリでの二重計上を判別するため）
-- inspection_expiry_date: 車検証に記載された有効期間の満了する日

ALTER TABLE "public"."records"
  ADD COLUMN "includes_compulsory_insurance" boolean NOT NULL DEFAULT false,
  ADD COLUMN "inspection_expiry_date" date;
