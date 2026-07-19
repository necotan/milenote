# Milenote

自身の車の維持費や出費を管理するために開発した、個人利用メインの出費管理アプリケーションです。

## 🚀 機能
- **車両維持費の管理**: ガソリン代、保険料、車検、メンテナンス費用などを一元管理
- **定期出費の管理**: サブスクリプションやローンなどの定期的な支払いを記録・管理
- **統計・グラフ**: 月間・年間の出費額をグラフで可視化
- **レスポンシブ**: スマートフォンからでもPCからでも使いやすいUI/UX設計

## ⚡ クイックスタート
セットアップ不要で、ブラウザからすぐに試せます。

**[milenote.vercel.app](https://milenote.vercel.app/)**

### 📱 ホーム画面に追加（推奨）
スマートフォンではホーム画面に追加すると、アドレスバーなどのブラウザUIが表示されず、ネイティブアプリのような使い心地で利用できます。

- **iOS（Safari）**: 共有ボタン から「ホーム画面に追加」
- **Android（Chrome）**: メニュー（⋮）から「ホーム画面に追加」

自分の環境で動かしたい場合は、下記のローカル起動方法を参照してください。

## 📥 ローカル起動方法
本アプリケーションはローカル環境（Next.js + Supabase）で動作します。以下の手順でセットアップしてください。

### 前提条件
- Node.js 18以上
- [Supabase](https://supabase.com/) アカウント
- [Docker Desktop](https://docs.docker.com/desktop)（Supabase CLI でDB初期化に必要）

### 手順

1. リポジトリのクローン
   ```bash
   git clone https://github.com/NECOTAN/milenote.git
   cd milenote
   ```
2. 依存関係のインストール
   ```bash
   npm install
   ```
3. Supabaseプロジェクトの作成
   [Supabase Dashboard](https://supabase.com/dashboard) で新規プロジェクトを作成し、以下を控えておきます。
   - **Project URL**（Settings → API → Project URL）
   - **anon public key**（Settings → API → Project API keys → anon）
   - **Project ID**（Settings → General → Reference ID）
   - **Database password**（プロジェクト作成時に設定したもの）

4. 環境変数の設定
   プロジェクトのルートに `.env.local` を作成し、3.で控えた値を設定します。
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

5. データベーススキーマの初期化
   Supabase CLIでマイグレーションを適用します。
   ```bash
   # Docker Desktop を起動しておく
   npx supabase login
   npx supabase link --project-ref <your_project_id>
   npx supabase db push
   ```
   これで `supabase/migrations/` 以下のSQLが順番に適用され、テーブル・関数・トリガー・RLSポリシー・Storageバケット・ポリシーが全て作成されます。

6. 開発サーバーの起動
   ```bash
   npm run dev
   ```
7. ブラウザで `http://localhost:3000` にアクセスします。

### データベース構成について
`supabase/migrations/` 配下のSQLファイルでスキーマを管理しています。スキーマを変更したい場合は新しいマイグレーションファイルを追加してください。

migrationの追加・適用・ドリフト対処などの詳しい運用手順は [manuals/supabase_migrations.md](manuals/supabase_migrations.md) を参照してください。

## 🎨 技術スタック・クレジット (Tech Stack & Credits)
このプロジェクトは以下の優れた技術およびオープンソースライブラリを使用して構築されています。

- **Framework**: [Next.js](https://nextjs.org/) (App Router) / [React](https://react.dev/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) (v4)
- **Database & Auth**: [Supabase](https://supabase.com/)
- **UI Components**: [shadcn/ui](https://ui.shadcn.com/)
- **Charts**: [Recharts](https://recharts.org/)
- **Icons**: [Lucide React](https://lucide.dev/) (Licensed under ISC)
- **Hosting**: [Vercel](https://vercel.com/)

## ⚠️ 免責事項 (Disclaimer)

**1. データの取り扱いとプライバシー**
本アプリケーションは、入力された出費データや車両情報をデータベース（Supabase）に保存します。個人利用を想定して開発されているため、第三者へのデータの提供や外部サーバーへの意図しないデータ送信を行うことはありません。データの管理およびデータベースのセキュリティ設定（RLS等）は、ユーザーご自身の責任において適切に行ってください。

**2. データの損失について**
本ソフトウェアは個人開発による成果物です。予期せぬ不具合、データベースの障害、または誤操作等により、保存された出費データや記録が消失する可能性があります。重要なデータについては、ご自身で定期的にバックアップを取得することを強く推奨します。

**3. 動作の保証範囲**
本アプリケーションは、最新のモダンブラウザ（Chrome, Safari, Edge等）での動作を想定していますが、すべてのデバイスやOS環境での完全な動作を保証するものではありません。

**4. 免責と責任の制限**
本ソフトウェアは「現状有姿（As-Is）」で提供されます。本アプリケーションの導入、利用、またはデータの消失等により生じたいかなる損害（金銭的損失、精神的苦痛などを含む）についても、開発者は一切の責任を負いません。ご自身の責任においてご利用ください。

**5. 外部環境の変化**
使用している技術スタック（Next.js, Supabase, Vercel等）のアップデートや仕様変更により、予告なく一部機能が利用できなくなる、あるいは修正が必要になる可能性があります。開発者はこれらに対する恒久的なメンテナンスやアップデートの義務を負いません。

**6. ライセンス**
本プロジェクトのソースコードは [MIT License](LICENSE) の下で公開されています。商用・非商用を問わず、ライセンス条項の範囲内で自由にご利用いただけます。
