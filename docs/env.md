# 環境変数一覧

## 必須
- `DATABASE_URL` PostgreSQL の接続文字列
- `NEXTAUTH_SECRET` NextAuth の署名キー
- `NEXTAUTH_URL` アプリのベースURL（例: `https://kanjikun.vercel.app`）

## オプション（使う場合のみ必須）
- `GOOGLE_CLIENT_ID` Google OAuth クライアントID
- `GOOGLE_CLIENT_SECRET` Google OAuth クライアントシークレット
- `AWS_SES_REGION` SES リージョン
- `AWS_SES_ACCESS_KEY_ID` SES アクセスキー
- `AWS_SES_SECRET_ACCESS_KEY` SES シークレット
- `MAIL_FROM` SES 送信元メールアドレス（検証済み）

## 注意
- `DATABASE_URL` は **接続文字列のみ** を設定する（`psql ...` は不可）。
- `NEXTAUTH_URL` は **本番ドメイン** に合わせる（Preview URL だと OAuth エラーの原因になる）。
- `MAIL_FROM` は SES で検証済みのアドレスを指定する（サンドボックスでは送信先も検証が必要）。
