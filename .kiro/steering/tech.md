# 技術方針（現行スタック）

現実装に合わせた技術スタックを記載する。

- フルスタック: Next.js（TypeScript / App Router）
- UI: Tailwind CSS v4
- DB: PostgreSQL（`docker-compose.yml` でローカル起動）
- ORM: Prisma
- 認証: NextAuth v4（Auth.js）
  - メール＋パスワード（Credentials）
  - Google OAuth
  - セッション: JWT
- メール通知: Resend（`resend`）
- テスト: 仕組みは未整備（Vitest/Playwright 未導入）

## アーキテクチャ概要

- Next.js にUIとAPI（Route Handlers）を集約した単一リポジトリ構成。
- データの正は PostgreSQL とし、Prisma スキーマをDBの契約として扱う。
- メール通知（投票通知/支払申請通知）は非同期で送信し、失敗しても主要フローは継続する。

## デプロイ方針

- 現状はデプロイ先未決定（Next.js 標準構成のまま）

## 認証・権限（実装状況）

- 幹事はログイン必須（NextAuth）。
- イベント管理権限は作成ユーザー（`ownerUserId`）一致のみで判定する。

## ルーティング/画面（実装状況）

- 参加者はイベントURLのみでアクセス（ログイン不要）。
- イベントURLは `publicId`（`randomUUID()`）を使用する。
- 主要ページ:
  - `/`（トップ）
  - `/login` / `/signup`
  - `/events/new`（幹事：イベント作成）
  - `/e/[publicId]`（参加者：投票/出欠/支払申請）
  - `/e/[publicId]/admin`（幹事：日程確定/出欠/会計/支払承認）
  - `/mypage`（幹事のイベント一覧）

※画面構成は requirements.md を正とし、Figmaは仕様の可視化（ワイヤー）として扱う。

## データモデル（現行）

Prisma スキーマ準拠のモデル構成。

- Event / CandidateDate / Vote / VoteChoice
- Attendance / Payment
- User / Account / Session / VerificationToken

## メール通知（実装状況）

- 通知種別:
  - 新規投票登録時（編集/削除は通知なし）
  - 支払申請（未申請→申請中）時
- 宛先: イベント作成者の登録メールアドレス
- 送信: Resend
- リトライ/保証: 厳密な到達保証は行わず、失敗時は握りつぶして主要フローを阻害しない。

## 品質・テスト方針（現状）

- 自動テストの仕組みは未整備。
- 仕様変更は `.kiro/specs/` を正として先に更新する。

## 運用・セキュリティ（最低限）

- 環境変数は `.env` で管理し、秘密情報はリポジトリに含めない。
- `publicId` は推測困難とし、イベントURLを知っている人は参加ページにアクセスできる（会計・承認は幹事のみ）。
- 参加者は投票・出欠・支払申請をログイン無しで実行できる。
