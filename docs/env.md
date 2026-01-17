# 環境変数一覧

## 必須
- `DATABASE_URL` PostgreSQL の接続文字列
- `NEXTAUTH_SECRET` NextAuth の署名キー
- `NEXTAUTH_URL` アプリのベースURL（例: `https://kanjikun.com`）

## オプション（使う場合のみ必須）
- `GOOGLE_CLIENT_ID` Google OAuth クライアントID
- `GOOGLE_CLIENT_SECRET` Google OAuth クライアントシークレット
- `RESEND_API_KEY` Resend API キー
- `MAIL_FROM` Resend 送信元メールアドレス（検証済み）
- `MAIL_SEND_ENABLED` 送信有効化フラグ（`true` で送信）

## 注意
- `DATABASE_URL` は **接続文字列のみ** を設定する（`psql ...` は不可）。
- `NEXTAUTH_URL` は **本番ドメイン** に合わせる（Preview URL だと OAuth エラーの原因になる）。
- `MAIL_FROM` は Resend で検証済みのドメイン/アドレスを指定する（例: `no-reply@kanjikun.com`）。
- `MAIL_SEND_ENABLED` が `true` のときのみ送信される（未設定/false は送信しない）。
