# 2次会の出席と会計 - タスク

## 1. DB設計・マイグレーション
- [ ] `EventRound` モデル追加（eventId, order, name）
- [ ] `Attendance` に `roundId` 追加
- [ ] `Payment` に `roundId` 追加
- [ ] マイグレーション作成・適用

## 2. API拡張
- [ ] `POST /api/events/{publicId}/rounds` 追加（回の追加）
- [ ] `GET /api/events/{publicId}` に `rounds` を含める
- [ ] `attendance` API に `roundId` 対応
- [ ] `accounting` API に `roundId` 対応
- [ ] 支払申請/承認は「全回合計」になるよう計算ロジックを更新

## 3. 幹事ページUI
- [ ] 回タブ/セクションUI追加
- [ ] 「回を追加」ボタン追加
- [ ] 回ごとの出欠・会計UIに切替
- [ ] 1次会のみ表示だった既存UIの整理

## 4. イベントページUI
- [ ] 回ごとの出席・会計情報を表示
- [ ] 支払申請UIに合計表示（回別内訳を補足）

## 5. ドキュメント
- [ ] `docs/api.md` 更新
- [ ] `docs/ux-copy.md` 更新
- [ ] `docs/diagrams/flow-accounting.md` / `flow-payment.md` 更新
