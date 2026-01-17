# 2次会の出席と会計 - 設計

## 概要
イベント内に複数の「回（1次会/2次会/3次会...）」を持たせ、回ごとに出席と会計を管理する。
初期は 1次会のみ。幹事が追加することで回を増やす。

## 画面設計
### 幹事ページ
- 「会の管理」ブロックを追加
  - 回のタブ/セクションを表示（1次会, 2次会, 3次会...）
  - 「回を追加」ボタン（＋）
  - 各回ごとに以下を表示
    - 出席一覧（出席/未確定/追加）
    - 会計確定（合計金額/調整/1人あたり）
    - 支払承認は全回合計の金額で実施

### イベントページ
- 回ごとの出席・会計情報を表示（閲覧）
- 参加者の自己入力は現状と同じ範囲のみ（支払申請は全回合計）

## データ設計
### 新規モデル
`EventRound`（イベント内の回）
- id: String (cuid)
- eventId: String (FK)
- order: Int（1,2,3...）
- name: String（表示名: "1次会" など）
- createdAt / updatedAt

### 既存モデル拡張
`Attendance`
- roundId: String (FK) を追加

`Payment`
- roundId: String (FK) を追加

`Event`
- round管理のためのリレーション追加

## API 設計
### 回の追加
- `POST /api/events/{publicId}/rounds`
  - body: `{ name?: string }`
  - 既存の最大 order + 1 を付与

### 回の取得
- `GET /api/events/{publicId}` に `rounds` を含める

### 出席・会計
- 既存APIに `roundId` を渡せるよう拡張
  - `/api/events/{publicId}/attendance`
  - `/api/events/{publicId}/accounting`
  - `/api/events/{publicId}/payments/*` は全回合計額を対象とする

## UI/UX 仕様
- 1次会が必ず先頭
- 回の切り替えはタブ/セクションで表示
- 追加後は新しい回にフォーカス
- 回削除は非対応（要件外）
- 支払申請/承認は合計額を表示（回別内訳は補足表示）

## エラーハンドリング
- 回追加に失敗した場合はトースト/メッセージ表示
- 不正な roundId で操作した場合は 400 を返す

## 影響範囲
- Prisma schema / migrations
- 幹事ページ / イベントページ UI
- API route handlers
- docs/api.md / docs/ux-copy.md / diagrams 更新

## 非対応
- 回ごとの日程投票/予約情報/支払申請
- 回の削除/並び替え
