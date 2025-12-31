import { getServerAuthSession } from "@/lib/session";

export default async function Home() {
  const session = await getServerAuthSession();
  const isLoggedIn = Boolean(session?.user?.id);

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f6f1ea] text-[#1f1b16]">
      <div className="pointer-events-none absolute -left-20 top-20 h-80 w-80 rounded-full bg-[#f0d9c7] blur-[120px]" />
      <div className="pointer-events-none absolute -right-16 bottom-10 h-72 w-72 rounded-full bg-[#e8c8a9] blur-[140px]" />

      <div className="mx-auto flex min-h-screen w-full max-w-6xl items-center px-4 py-12 sm:px-6 sm:py-16">
        <div className="grid w-full gap-8 sm:gap-12 md:grid-cols-[1.1fr_0.9fr]">
          <section className="flex flex-col justify-center">
            <p className="text-xs uppercase tracking-[0.35em] text-[#a1714f]">
              幹事くん
            </p>
            <h1 className="mt-4 text-3xl font-semibold leading-tight sm:text-4xl md:text-5xl">
              飲み会の準備とお金を
              <br />
              きちんと終わらせる。
            </h1>
            <p className="mt-6 text-base leading-7 text-[#5e4c3d] sm:text-lg">
              日程調整から当日出席、割り勘、支払申請まで。
              幹事の“やり残し”をなくすための管理ツールです。
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              {isLoggedIn ? (
                <a
                  href="/events/new"
                  className="w-full rounded-full bg-[#1f1b16] px-6 py-3 text-center text-sm font-semibold text-white transition hover:bg-[#3a312a] sm:w-auto"
                >
                  イベントを作成する
                </a>
              ) : (
                <>
                  <a
                    href="/login"
                    className="w-full rounded-full bg-[#1f1b16] px-6 py-3 text-center text-sm font-semibold text-white transition hover:bg-[#3a312a] sm:w-auto"
                  >
                    幹事ログイン
                  </a>
                  <a
                    href="/signup"
                    className="w-full rounded-full border border-[#1f1b16] px-6 py-3 text-center text-sm font-semibold text-[#1f1b16] transition hover:bg-[#f3e8dd] sm:w-auto"
                  >
                    アカウント作成
                  </a>
                </>
              )}
            </div>
            <div className="mt-10 flex flex-wrap gap-6 text-sm text-[#7a6453]">
              <div>
                <p className="text-xs uppercase tracking-[0.2em]">流れ</p>
                <p className="mt-2">投票 → 確定 → 出席 → 会計 → 申請</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.2em]">招待</p>
                <p className="mt-2">URLだけで参加できる</p>
              </div>
            </div>
            <div className="mt-6">
              <a
                href="/guide"
                className="text-sm font-semibold text-[#5a4638] underline decoration-dotted underline-offset-4 transition hover:text-[#2f231b]"
              >
                使い方を見る
              </a>
            </div>
          </section>

          <section className="rounded-3xl border border-[#e7d6c7] bg-white/80 p-6 shadow-[0_20px_50px_rgba(31,27,22,0.1)] sm:p-8">
            <h2 className="text-lg font-semibold">今日の幹事ボード</h2>
            <p className="mt-2 text-sm text-[#6b5a4b]">
              進行が見えると、抜け漏れが減ります。
            </p>
            <div className="mt-6 space-y-4 text-sm">
              {[
                "候補日を登録",
                "投票を締切",
                "日程を確定",
                "出席者を確定",
                "会計を入力",
                "支払申請を承認",
              ].map((label, index) => (
                <div
                  key={label}
                  className="flex items-center justify-between rounded-2xl border border-[#e8d7c8] bg-white px-4 py-3"
                >
                  <span>{label}</span>
                  <span className="rounded-full bg-[#f3e8dd] px-3 py-1 text-xs text-[#7a6453]">
                    ステップ {index + 1}
                  </span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
