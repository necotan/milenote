-- 巨大な文字列の保存で DB 容量を使い切られないよう上限を設ける（通常利用では到達しない値）

ALTER TABLE "public"."cars"
  ADD CONSTRAINT "cars_name_length" CHECK (char_length("name") <= 100),
  ADD CONSTRAINT "cars_maker_length" CHECK (char_length("maker") <= 100),
  ADD CONSTRAINT "cars_model_code_length" CHECK (char_length("model_code") <= 100),
  ADD CONSTRAINT "cars_grade_length" CHECK (char_length("grade") <= 100),
  ADD CONSTRAINT "cars_color_length" CHECK (char_length("color") <= 100),
  ADD CONSTRAINT "cars_image_url_length" CHECK (char_length("image_url") <= 2048);

ALTER TABLE "public"."records"
  ADD CONSTRAINT "records_memo_length" CHECK (char_length("memo") <= 2000),
  ADD CONSTRAINT "records_entry_ic_length" CHECK (char_length("entry_ic") <= 100),
  ADD CONSTRAINT "records_exit_ic_length" CHECK (char_length("exit_ic") <= 100);

ALTER TABLE "public"."recurring_costs"
  ADD CONSTRAINT "recurring_costs_memo_length" CHECK (char_length("memo") <= 2000);

ALTER TABLE "public"."wishlists"
  ADD CONSTRAINT "wishlists_item_name_length" CHECK (char_length("item_name") <= 200),
  ADD CONSTRAINT "wishlists_url_length" CHECK (char_length("url") <= 2048),
  ADD CONSTRAINT "wishlists_memo_length" CHECK (char_length("memo") <= 2000);

ALTER TABLE "public"."users"
  ADD CONSTRAINT "users_username_length" CHECK (char_length("username") <= 50),
  ADD CONSTRAINT "users_display_name_length" CHECK (char_length("display_name") <= 100),
  ADD CONSTRAINT "users_avatar_url_length" CHECK (char_length("avatar_url") <= 2048),
  ADD CONSTRAINT "users_maint_settings_size" CHECK (octet_length("maint_settings"::text) <= 16384);
