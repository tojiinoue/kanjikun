# API エンドポイント一覧

本プロジェクトで使用する主要 API を一覧化しています。

## 認証
- `POST /api/auth/signup` ユーザー登録
- `GET|POST /api/auth/[...nextauth]` NextAuth ハンドラ

## イベント
- `POST /api/events` イベント作成
- `GET /api/events/{publicId}` イベント取得
- `PATCH /api/events/{publicId}` イベント情報更新（幹事のみ）

## 日程候補
- `PUT /api/events/{publicId}/candidates` 候補日保存（幹事のみ）

## 投票
- `POST /api/events/{publicId}/votes` 投票作成
- `PATCH /api/events/{publicId}/votes/{voteId}` 投票更新
- `DELETE /api/events/{publicId}/votes/{voteId}` 投票削除

## 投票締切
- `POST /api/events/{publicId}/lock` 投票締切/解除（幹事のみ）

## 市区町村検索
- `GET /api/municipalities?pref=13&q=しん&limit=30&offset=0` 市区町村検索
  - `pref` は都道府県コード（例: `13`）
  - `q` は検索文字列（未入力でも可）
  - `limit` / `offset` はページング
  - レスポンス: `{ municipalities: [{ id, name }], nextOffset }`

## 日程確定
- `POST /api/events/{publicId}/schedule` 日程確定（幹事のみ）
- `DELETE /api/events/{publicId}/schedule` 日程確定の取り消し（幹事のみ）

## 出席管理
- `POST /api/events/{publicId}/attendance` 出席更新/追加（幹事のみ）

## 会計
- `POST /api/events/{publicId}/accounting` 会計確定（幹事のみ）
- `DELETE /api/events/{publicId}/accounting` 会計確定の取り消し（幹事のみ）

## 支払
- `POST /api/events/{publicId}/payments/apply` 支払申請
- `POST /api/events/{publicId}/payments/cancel` 支払申請の取消
- `POST /api/events/{publicId}/payments/{paymentId}/approve` 支払承認（幹事のみ）
- `POST /api/events/{publicId}/payments/{paymentId}/reject` 支払差し戻し（幹事のみ）

## マイページ
- `GET /api/my/events` 作成イベント一覧（ログイン必須）
