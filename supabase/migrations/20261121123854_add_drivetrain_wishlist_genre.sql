ALTER TABLE "public"."wishlists"
  DROP CONSTRAINT "wishlists_genre_check",
  ADD CONSTRAINT "wishlists_genre_check"
    CHECK ("genre" IN ('wheels', 'exhaust_intake', 'aero_exterior', 'suspension', 'drivetrain', 'interior', 'other'));
