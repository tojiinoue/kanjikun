# PayPayID登録 タスク

## 実装タスク
1. Prismaに `User.paypayId` を追加しマイグレーション作成
2. `PATCH /api/my/profile` を実装（認証必須、paypayId保存）
3. マイページにPayPay ID入力欄と保存ボタンを追加
4. イベントページの出席一覧にPayPay IDを表示
5. 文言・UX文書を更新（必要に応じて）

## テスト/確認
- マイページでPayPay IDが保存/削除できる
- 出席一覧でPayPay IDが表示される
- 未登録の場合は表示されない

