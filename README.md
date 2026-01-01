# 幹事くん

飲み会の「日程調整 → 出席管理 → 会計 → 支払申請・承認」を一気通貫で管理する幹事向けサービスです。

## クイックスタート

### 開発環境

```bash
npm install
npm run dev
```

`http://localhost:3000` を開きます。

### 必要な環境変数（例）

```
DATABASE_URL=postgresql://...
NEXTAUTH_SECRET=...
NEXTAUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=... # Googleログインを使う場合
GOOGLE_CLIENT_SECRET=... # Googleログインを使う場合
AWS_SES_REGION=... # SES通知を使う場合
AWS_SES_ACCESS_KEY_ID=...
AWS_SES_SECRET_ACCESS_KEY=...
```

## ドキュメント

- 運用ドキュメント一覧: `docs/README.md`
- 実装書: `.kiro/specs/飲み会管理/implementation.md`

## デプロイ（Vercel）

Prisma を利用しているため、ビルド前に `prisma generate` が必要です。

```
npm run prisma:generate && npm run build
```
