# Supabase Migration 運用ガイド

[English](supabase_migrations.md) | 日本語

milenote の Supabase データベーススキーマは `supabase/migrations/` 配下のSQLファイルで管理しています。本書はDB変更作業の手順書です。

## 基本ルール

> **Supabase Dashboard の SQL Editor で直接変更系SQL（CREATE / ALTER / DROP / INSERT 等）を実行しない。**

変更は必ず migration ファイル経由で行います。Dashboard の SQL Editor は **SELECT などの参照系のみ** に留めてください。

理由：Dashboard で直接実行するとローカルの migration ファイルとリモートDBにズレ（ドリフト）が生じ、別環境での再現や Git 上の履歴管理ができなくなります。

---

## 通常フロー：DBに変更を加える

### 1. 新しい migration ファイルを作成

```bash
npx supabase migration new <変更内容を表すスラッグ>
```

例：
```bash
npx supabase migration new add_nickname_to_cars
```

-> `supabase/migrations/<timestamp>_add_nickname_to_cars.sql` が生成されます。

### 2. SQL を記述

生成されたファイルに変更SQLを書きます。

```sql
-- supabase/migrations/20260601120000_add_nickname_to_cars.sql
ALTER TABLE public.cars ADD COLUMN nickname text;
```

### 3. バックアップ

`db push` の前に `scripts/backup.cmd` をダブルクリックして、本番DBと車の写真をバックアップします。列やテーブルの削除など、データが消える変更では必ず行ってください。

- 保存先：`ドキュメント\milenote\backups\<日付>`（`schema.sql`、`data.sql`、`storage\`）
- 事前に Docker Desktop を起動しておく
- DB のポート（5432 / 6543）への接続をファイアウォールなどで遮断しているネットワークでは実行できないため、接続できるネットワークで実行する
- 保存先を変える場合は `scripts/backup.ps1 -Destination <フォルダ>` で実行する。利用者のデータが入るため、リポジトリ内やクラウドの共有フォルダは指定しない

### 4. リモートに適用

```bash
npx supabase db push
```

未適用の migration ファイルが順番に実行されます。

### 5. コミット

```bash
git add supabase/migrations/<timestamp>_add_nickname_to_cars.sql
git commit -m "add: nickname column to cars table"
```

---

## ドリフト発生時の対処（うっかり Dashboard で実行してしまった場合）

リモートDBだけが変更され、ローカルと不一致になった状態を救済する手順。

### 1. ドリフト検知

```bash
npx supabase migration list
```

`Local` と `Remote` 列がズレていればドリフト発生中。

```
   Local          | Remote
  ----------------|----------------
   20260522022446 | 20260522022446   OK
                  | 20260601120000   リモートだけ進んでいる
```

### 2. リモートの変更を migration として取り込み

```bash
npx supabase db pull
```

-> 差分が新しい migration ファイルとして生成されます。

### 3. 生成されたファイルを確認・コミット

```bash
git add supabase/migrations/<timestamp>_remote_schema.sql
git commit -m "add: migration for changes made in the Dashboard"
```

---

## 既存リモートDBに「既に適用済み」としてマークする

新しい migration ファイルの内容が**既にリモートに反映済み**の場合に使用。

```bash
npx supabase migration repair --status applied <timestamp>
```

例：
```bash
npx supabase migration repair --status applied 20260522022447
```

これをしないと、次回 `db push` 時に未適用と判定されて再実行されます。

---

## 別環境（他PC・新規プロジェクト）でのセットアップ

```bash
git clone <repo>
cd milenote
npm install

# Docker Desktop を起動しておく
npx supabase login
npx supabase link --project-ref <project_id>
npx supabase db push    # migration が適用される
```

これで現行と同じスキーマが再現できます。

---

## コマンドチートシート

| やりたいこと | コマンド |
|---|---|
| 新規migration作成 | `npx supabase migration new <slug>` |
| 本番DBのバックアップ | `scripts/backup.cmd` をダブルクリック |
| リモートに適用 | `npx supabase db push` |
| リモートの状態を取り込み | `npx supabase db pull` |
| 適用状況確認 | `npx supabase migration list` |
| 履歴を「適用済み」に修正 | `npx supabase migration repair --status applied <timestamp>` |
| 履歴を「未適用」に戻す | `npx supabase migration repair --status reverted <timestamp>` |
| リモートとlink | `npx supabase link --project-ref <id>` |

---

## やってはいけないこと

| NG | 理由 |
|---|---|
| Dashboard の SQL Editor で `CREATE TABLE` / `ALTER TABLE` 等を直接実行 | migration とドリフトする |
| migration ファイルを後から編集（適用済みのもの） | 既に適用された履歴と不整合になる |
| migration ファイルのリネーム・削除 | タイムスタンプ順序が壊れる |
| `supabase/.temp/` や `supabase/.branches/` をコミット | 個人環境固有の状態が混入する（`.gitignore` 済み） |

適用済み migration を「修正したい」場合は、**新しい migration ファイルを作って打ち消す/上書きする** のが正しい流儀です。

---

## トラブルシューティング

### `db push` で「Docker Desktop is a prerequisite」エラー
Docker Desktop を起動してから再実行してください。タスクバーのDockerアイコンが「Engine running」になるまで待つこと。

### 「password authentication failed」
DBパスワードが間違っています。Dashboard -> Settings -> Database -> **Reset database password** で再設定してください（既存データには影響しません）。

### migration が大量にドリフトしてどうにもならない
最後の手段として、`supabase/migrations/` をローカルで一旦全削除して `db pull` で1ファイルにまとめ直す方法があります。ただし変更履歴が失われるので慎重に行ってください。