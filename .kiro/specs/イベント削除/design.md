# イベント削除 デザイン

## 概要
幹事がマイページ・幹事ページからイベントを削除できるようにする。

## データ削除方針
- `Event` を起点に関連データを全削除する。
- 対象: `CandidateDate`, `Vote`, `VoteChoice`, `Attendance`, `Payment`
- Prisma の `delete` と `deleteMany` を組み合わせる。

## API
- `DELETE /api/events/{publicId}` を追加
  - 認証必須（幹事のみ）
  - 成功時: `{ ok: true }`

## UI
### マイページ
- イベントカードに「削除」ボタンを配置
- 確認ダイアログを表示
- 削除後は一覧を更新

### 幹事ページ
- イベント情報エリアに「イベント削除」ボタンを配置
- 確認ダイアログを表示
- 削除後はマイページへ遷移

## 権限
- `ownerUserId` 一致のみ許可

## エラーハンドリング
- 失敗時はエラーメッセージを表示

## 影響範囲
- `app/api/events/[publicId]/route.ts`
- `app/mypage/page.tsx`
- `app/e/[publicId]/admin/admin-event-client.tsx`

