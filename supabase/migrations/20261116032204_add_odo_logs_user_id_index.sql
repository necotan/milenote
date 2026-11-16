-- useOdoLogs と RLS（odo_logs_*_own）は user_id で絞り込むが、(car_id, date) の UNIQUE 制約しか無く user_id に使えるインデックスが無いため
-- 他のユーザー所有テーブル（cars / records / recurring_costs）の idx_*_user_id と揃える

CREATE INDEX IF NOT EXISTS "idx_odo_logs_user_id" ON "public"."odo_logs" USING "btree" ("user_id");
