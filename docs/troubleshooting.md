# トラブルシューティング

## OAuth の redirect_uri_mismatch
原因: Google 側のリダイレクト URI が実際の URL と一致していない。  
対応:
- `https://<domain>/api/auth/callback/google` を登録
- `NEXTAUTH_URL` を本番ドメインに合わせて Redeploy

## Prisma P2021（テーブルが存在しない）
原因: マイグレーション未適用。  
対応:
```bash
export DATABASE_URL="postgresql://..."
npx prisma migrate deploy
```

## 市区町村が出ない/候補が0件
原因: seed 未実行、または `data/municipalities.csv` の変換未実施。  
対応:
```bash
npm run municipalities:convert
npx prisma db seed
```

## 500（/api/auth/signup など）
原因:
- `DATABASE_URL` 未設定/誤設定
- DB マイグレーション未適用  
対応:
- 環境変数を修正 → Redeploy
- マイグレーション適用

## メール通知が届かない
原因:
- `RESEND_API_KEY` / `MAIL_FROM` 未設定
- `MAIL_SEND_ENABLED` が `true` でない
対応:
- 環境変数を設定 → Redeploy
