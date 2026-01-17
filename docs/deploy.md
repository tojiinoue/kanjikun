# デプロイ（Vercel）

## 前提
- Vercel プロジェクトが作成済み
- 環境変数が設定済み（`docs/env.md` 参照）

## ビルド設定
- Build Command: `npm run prisma:generate && npm run build`
- Output Directory: Next.js default

## デプロイ手順
1. Vercel の Environment Variables を設定
2. `Deployments` から Redeploy または新規デプロイ
3. デプロイ完了後に動作確認（ログイン/イベント作成/投票/メール通知）

## 市区町村データの更新
e-Stat の CSV を更新した場合は、変換と seed を実行する。

```bash
npm run municipalities:convert
npx prisma db seed
```

## ロールバック
- Vercel の `Deployments` から過去のデプロイを `Promote to Production`

## OAuth リダイレクト確認
- Google OAuth を使う場合は以下を登録
  - JavaScript 生成元: `https://kanjikun.com`
  - リダイレクト URI: `https://kanjikun.com/api/auth/callback/google`
