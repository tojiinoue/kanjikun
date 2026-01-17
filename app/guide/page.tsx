import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "使い方ガイド",
  description:
    "幹事くんの使い方を7ステップで紹介。日程調整から2次会管理、支払承認までの流れをわかりやすくまとめています。",
  alternates: {
    canonical: "/guide",
  },
  openGraph: {
    title: "使い方ガイド",
    description:
      "幹事くんの使い方を7ステップで紹介。日程調整から2次会管理、支払承認までの流れをわかりやすくまとめています。",
    url: "/guide",
  },
};

const steps = [
  {
    title: "1. イベントを作成",
    body: "候補日・メモを入力してイベントを作成します。参加者URLが発行されます。",
  },
  {
    title: "2. 参加者が投票",
    body: "参加者はURLから投票します。名前をクリックすると投票の編集ができます。",
  },
  {
    title: "3. 幹事が日程確定",
    body: "投票結果を見て日程を確定します。",
  },
  {
    title: "4. 予約情報を共有",
    body: "店名や住所、コース、料金などの予約情報を入力して参加者に共有します。",
  },
  {
    title: "5. 2次会以降を追加",
    body: "回の管理から2次会・3次会を追加します。各回で出席者を確定します。",
  },
  {
    title: "6. 回ごとに会計を確定",
    body: "各回の合計金額と調整額を入力し、会計を確定します。",
  },
  {
    title: "7. 合計で支払申請と承認",
    body: "実出席者が全回の合計金額で支払申請し、幹事が承認します。",
  },
];

export default function GuidePage() {
  return (
    <main className="min-h-screen bg-[#f6f1ea] px-4 py-12 text-[#1f1b16] sm:px-6 sm:py-16">
      <div className="mx-auto w-full max-w-4xl space-y-10">
        <header className="rounded-3xl border border-[#e6d6c9] bg-white/80 p-6 shadow-[0_16px_36px_rgba(31,27,22,0.1)] sm:p-8">
          <p className="text-xs uppercase tracking-[0.3em] text-[#a1714f]">
            ガイド
          </p>
          <h1 className="mt-3 text-2xl font-semibold sm:text-3xl">
            幹事くんの使い方
          </h1>
          <p className="mt-3 text-sm text-[#6b5a4b]">
            日程調整から支払承認まで、7ステップで完結します。
          </p>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/events/new"
              className="w-full rounded-full bg-[#1f1b16] px-6 py-3 text-center text-sm font-semibold text-white transition active:scale-95 hover:bg-[#3a312a] sm:w-auto"
            >
              イベントを作成する
            </Link>
            <Link
              href="/"
              className="w-full rounded-full border border-[#1f1b16] px-6 py-3 text-center text-sm font-semibold text-[#1f1b16] transition active:scale-95 hover:bg-[#f3e8dd] sm:w-auto"
            >
              トップへ戻る
            </Link>
          </div>
        </header>

        <section className="grid gap-4 sm:grid-cols-2">
          {steps.map((step) => (
            <div
              key={step.title}
              className="rounded-3xl border border-[#eadbcf] bg-white/90 p-6 text-sm text-[#4d3f34]"
            >
              <h2 className="text-base font-semibold text-[#1f1b16]">
                {step.title}
              </h2>
              <p className="mt-2 text-[#6b5a4b]">{step.body}</p>
            </div>
          ))}
        </section>

        <section className="rounded-3xl border border-[#eadbcf] bg-white/80 p-6 text-sm text-[#6b5a4b] sm:p-8">
          <h2 className="text-base font-semibold text-[#1f1b16]">
            よくある質問
          </h2>
          <div className="mt-4 space-y-4">
            <div>
              <p className="font-semibold text-[#4d3f34]">
                参加者はログインが必要ですか？
              </p>
              <p className="mt-1">
                不要です。イベントURLからそのまま投票・支払申請ができます。
              </p>
            </div>
            <div>
              <p className="font-semibold text-[#4d3f34]">
                予約情報はどこで確認できますか？
              </p>
              <p className="mt-1">
                イベントページのヘッダー付近に表示されます。幹事が編集できます。
              </p>
            </div>
            <div>
              <p className="font-semibold text-[#4d3f34]">
                PayPay ID はどこに表示されますか？
              </p>
              <p className="mt-1">
                出席一覧の上部に表示されます。PayPayで支払う参加者はそのIDへ送金します。
              </p>
            </div>
            <div>
              <p className="font-semibold text-[#4d3f34]">
                支払申請はいつからできますか？
              </p>
              <p className="mt-1">
                すべての回の会計が確定した後、実出席者のみ申請できます。
              </p>
            </div>
            <div>
              <p className="font-semibold text-[#4d3f34]">
                2次会の出席はどう管理しますか？
              </p>
              <p className="mt-1">
                幹事ページの「回の管理」で2次会を追加し、出席管理からチェックします。
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
