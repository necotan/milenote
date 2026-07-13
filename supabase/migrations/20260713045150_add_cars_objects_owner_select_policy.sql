-- cars バケットの storage.objects に SELECT ポリシーを追加する
-- クライアントからの storage.list() が常に空配列を返していたため、削除対象を発見できず動作していなかった
-- 他ユーザーのファイル一覧は見せないよう、自分のフォルダ（user_id）配下のみ許可する

create policy "cars_objects_owner_select"
on storage.objects
as permissive
for select
to authenticated
using (((bucket_id = 'cars'::text) AND ((storage.foldername(name))[1] = (( SELECT auth.uid() AS uid))::text)));
