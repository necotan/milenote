-- records / recurring_costs に他ユーザーの car_id を指定できないよう、wishlists と同じく cars の所有者を検証する

DROP POLICY "records_insert_own" ON "public"."records";
DROP POLICY "records_update_own" ON "public"."records";

CREATE POLICY "records_insert_own" ON "public"."records" FOR INSERT TO "authenticated"
  WITH CHECK (
    (( SELECT "auth"."uid"() AS "uid") = "user_id")
    AND (EXISTS ( SELECT 1 FROM "public"."cars"
      WHERE (("cars"."id" = "records"."car_id") AND ("cars"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))
  );

CREATE POLICY "records_update_own" ON "public"."records" FOR UPDATE TO "authenticated"
  USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"))
  WITH CHECK (
    (( SELECT "auth"."uid"() AS "uid") = "user_id")
    AND (EXISTS ( SELECT 1 FROM "public"."cars"
      WHERE (("cars"."id" = "records"."car_id") AND ("cars"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))
  );

DROP POLICY "recurring_costs_insert_own" ON "public"."recurring_costs";
DROP POLICY "recurring_costs_update_own" ON "public"."recurring_costs";

CREATE POLICY "recurring_costs_insert_own" ON "public"."recurring_costs" FOR INSERT TO "authenticated"
  WITH CHECK (
    (( SELECT "auth"."uid"() AS "uid") = "user_id")
    AND (EXISTS ( SELECT 1 FROM "public"."cars"
      WHERE (("cars"."id" = "recurring_costs"."car_id") AND ("cars"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))
  );

CREATE POLICY "recurring_costs_update_own" ON "public"."recurring_costs" FOR UPDATE TO "authenticated"
  USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"))
  WITH CHECK (
    (( SELECT "auth"."uid"() AS "uid") = "user_id")
    AND (EXISTS ( SELECT 1 FROM "public"."cars"
      WHERE (("cars"."id" = "recurring_costs"."car_id") AND ("cars"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))
  );
