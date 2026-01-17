# データベース運用（Prisma）

## マイグレーション適用（本番）
本番DBに対してマイグレーションを適用します。

```bash
export DATABASE_URL="postgresql://..."
npx prisma migrate deploy
```

## Prisma Client 生成
ローカル/ビルド時に必要です。

```bash
npm run prisma:generate
```

## 市区町村データの投入
e-Stat から CSV を取得し、JSON に変換して seed します。

```bash
# data/municipalities.csv を配置してから実行
npm run municipalities:convert
npx prisma db seed
```

## 注意
- `DATABASE_URL` は **Vercel に設定している本番URLと一致**させる。
- Schema変更時は **先にマイグレーション**を作成してからデプロイする。
- 本番DBは `prisma migrate reset` を使わない（データが消えるため）。
