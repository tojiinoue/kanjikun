# PayPayID登録 デザイン

## 概要
マイページでPayPay IDを登録/編集/削除し、イベントページの出席一覧で表示する。表示は参加者全員に公開される。

## 変更点
### データモデル
- `User` に `paypayId` (nullable string) を追加する。

### API
- `PATCH /api/my/profile` を追加
  - body: `{ paypayId: string | null }`
  - 認証必須
  - `paypayId` はトリムして保存（空文字は null）

### UI
#### マイページ
- プロフィール/アカウント付近に「PayPay ID」入力欄を追加
- 保存ボタンで更新
- 保存失敗時はエラー文言を表示

#### イベントページ
- 出席一覧で、名前の近くに `PayPay ID: {id}` を表示
- 未登録の場合は表示しない
- スマホでは折り返し可能な表示とする

## バリデーション
- 最大長 64 文字（暫定）
- 前後の空白はトリム

## セキュリティ/公開範囲
- 登録は本人のみ
- 表示はイベントページの出席一覧で全参加者に公開

## 移行
- Prisma マイグレーションで `User.paypayId` を追加
- 既存ユーザーは null

## 影響範囲
- `prisma/schema.prisma`
- `app/api/my/profile/route.ts` (新規)
- `app/mypage/page.tsx`
- `app/e/[publicId]/public-event-client.tsx`

