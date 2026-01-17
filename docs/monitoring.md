# 監視・ログ

## Vercel ログ
- `Deployments` → 該当デプロイ → `Functions`
- API エラー（500/403/409）や Prisma エラーを確認

## 主要な確認ポイント
- `/api/auth/signup` での 500（DB未設定/未マイグレーション）
- `/api/events/*` での 403（権限不足）
- OAuth の `redirect_uri_mismatch`（Google設定）
- `/api/municipalities` での 500（seed未実行/DB接続/Prisma差分）
- 通知メール未送信（`MAIL_SEND_ENABLED` と `RESEND_API_KEY` を確認）
