# 店舗情報表示 デザイン

## 概要
幹事ページで店舗情報を登録/編集し、イベントページのヘッダー付近に表示する。

## データモデル
- `Event` に以下のカラムを追加（すべて nullable）
  - `shopName` 店名
  - `shopUrl` 店舗リンク
  - `courseName` コース
  - `courseUrl` コースリンク
  - `shopAddress` 住所
  - `shopPrice` 料金
  - `shopSchedule` 日程

## API
- `PATCH /api/events/{publicId}` に店舗情報の更新項目を追加
- `GET /api/events/{publicId}` で店舗情報を返す

## UI
### 幹事ページ
- イベント情報編集フォーム内に店舗情報入力欄を追加
- 全項目任意（空で保存可能）
- URL項目はプレースホルダで形式を示す

### イベントページ
- ヘッダーのイベント名・メモ付近に店舗情報ブロックを追加
- 表示順: 日程 → 店名 → 住所 → 店舗リンク → コース → コースリンク → 料金
- URLはリンク表示（タップ可能）
- 未入力の項目は非表示
- 店舗情報はコピーボタンで一括コピーできる

### 自動反映
- 日程確定 API で `shopSchedule` が空の場合、確定日を文字列で自動反映する。
- 既に入力済みの場合は上書きしない。

## バリデーション
- 最大長（暫定）
  - 店名: 80
  - 店舗リンク: 200
  - コース: 80
  - コースリンク: 200
  - 住所: 120
  - 料金: 40
  - 日程: 80
- URLは簡易チェック（空の場合は許可）

## 影響範囲
- `prisma/schema.prisma`
- `app/api/events/[publicId]/route.ts`
- `app/e/[publicId]/admin/admin-event-client.tsx`
- `app/e/[publicId]/public-event-client.tsx`
