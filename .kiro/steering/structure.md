# 構成方針

本プロジェクトは Next.js App Router を前提に、UI と API を `app/` 配下へ集約する。

## ディレクトリ構成
- `app/`: 画面とルート（App Router）
  - `page.tsx` / `layout.tsx` / `globals.css`: ルートページ/共通レイアウト/グローバルCSS
  - `_components/`: 複数画面で共有するUIコンポーネント
  - `api/`: Route Handlers
    - `app/api/auth/`: NextAuth とサインアップ
    - `app/api/events/`: イベント作成/取得
    - `app/api/events/[publicId]/`: 投票/候補日/日程確定/出欠/会計/支払/ロック
    - `app/api/my/events/`: 幹事のイベント一覧
  - `e/[publicId]/`: 参加者・幹事のイベントページ
  - `events/new/`, `login/`, `signup/`, `mypage/`: 画面単位のルート
- `lib/`: 認証・認可・DB・通知などの共通ロジック
  - `auth.ts` / `session.ts` / `authorization.ts`
  - `prisma.ts` / `password.ts`
  - `mailer.ts` / `notifications.ts`
- `prisma/`: Prisma スキーマとマイグレーション
- `types/`: 型宣言（NextAuth/bcryptjs の拡張）
- `public/`: 静的アセット
- `.kiro/`: ステアリングと仕様（specs）
- `docker-compose.yml`: ローカル用 PostgreSQL

## 命名規則
- ルートファイルは Next.js 規約に従い `page.tsx` / `layout.tsx` / `route.ts` を使用する
- 共有コンポーネントは `app/_components/` に置き、ファイル名はケバブケース（例: `site-header.tsx`）
- クライアントコンポーネントは `*-client.tsx` の接尾辞を付け、先頭に `"use client"` を置く
- 動的ルートは `[param]` 形式で表現する（例: `app/e/[publicId]/`）

## 依存関係
- `app/` から `lib/` は参照してよいが、`lib/` から `app/` へは依存しない
- `app/api/` は `lib/` と `prisma/` を利用して処理を完結させる
- `types/` はアプリ全体から参照可能な補助型のみを置く
