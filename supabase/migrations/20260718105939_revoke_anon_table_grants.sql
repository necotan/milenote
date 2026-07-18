-- anonロールへの過剰なテーブル権限を削除
--
-- 全テーブルはRLSで保護されており、未認証(anon)でテーブルへアクセスする処理は、アプリに存在しない(signup/reset-passwordはsupabase.authのみ使用)ため、多層防御としてGRANT自体も取り消す

REVOKE ALL ON TABLE "public"."cars" FROM "anon";
REVOKE ALL ON TABLE "public"."records" FROM "anon";
REVOKE ALL ON TABLE "public"."recurring_costs" FROM "anon";
REVOKE ALL ON TABLE "public"."users" FROM "anon";
REVOKE ALL ON TABLE "public"."wishlists" FROM "anon";

-- 今後作成されるテーブルにanonへ自動でGRANTされるデフォルト権限も取り消す
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" REVOKE ALL ON TABLES FROM "anon";
