# セキュリティ/機密情報

## 基本方針
- 環境変数は Vercel / `.env` で管理し、リポジトリに含めない
- `DATABASE_URL` / OAuth Secrets / SES Keys は漏えい禁止

## 認可
- 幹事権限はログインユーザー（ownerUserId）一致のみ
- 参加者はログイン不要でイベントURLから投票可能

## ログ
- 個人情報を含むログ出力は避ける
