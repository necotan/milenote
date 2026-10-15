# セキュリティポリシー

## 対象バージョン
本番環境（https://milenote.vercel.app）で稼働している `main` ブランチの最新版のみを対象とします。

## 脆弱性の報告方法
脆弱性を見つけた場合は、**公開の Issue や Pull Request には書かず**、GitHub の Private vulnerability reporting から報告してください。

**[脆弱性を報告する](https://github.com/NECOTAN/milenote/security/advisories/new)**

GitHub アカウントをお持ちでない場合は、necotan.works@gmail.com までメールでご連絡ください。

報告には、可能な範囲で次の情報を含めてください。
- 脆弱性の内容と、想定される影響
- 再現手順
- 該当するファイルや URL

## 対応について
個人で開発・運営しているため、返信や修正までにお時間をいただく場合があります。報告いただいた内容は、修正が完了するまで公開しないようお願いします。

## 調査時のお願い
- 他の利用者のアカウントやデータにアクセスしたり、変更したりしないでください。確認には、ご自身で作成したアカウントを使用してください
- 大量のリクエストを送るなど、サービスの稼働を妨げる調査は行わないでください
- Supabase や Vercel など、外部サービス自体の脆弱性は、それぞれの提供事業者に報告してください

# Security Policy (English)

## Supported Versions
Only the latest version of the `main` branch, running in production at https://milenote.vercel.app, is supported.

## Reporting a Vulnerability
If you find a vulnerability, **please do not open a public issue or pull request**. Instead, report it through GitHub's Private vulnerability reporting.

**[Report a vulnerability](https://github.com/NECOTAN/milenote/security/advisories/new)**

If you do not have a GitHub account, please email necotan.works@gmail.com.

Where possible, please include:
- A description of the vulnerability and its potential impact
- Steps to reproduce
- The affected files or URLs

## What to Expect
This project is developed and operated by an individual, so responses and fixes may take some time. Please do not disclose the details until a fix has been released.

## Testing Guidelines
- Do not access or modify other users' accounts or data. Use accounts you created yourself for testing.
- Do not perform testing that disrupts the service, such as sending large volumes of requests.
- Report vulnerabilities in external services such as Supabase or Vercel directly to their respective providers.
