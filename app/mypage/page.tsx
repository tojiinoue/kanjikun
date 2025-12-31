import Link from "next/link";

import { prisma } from "@/lib/prisma";
import { getServerAuthSession } from "@/lib/session";

function formatDate(value: Date) {
  return value.toLocaleString("ja-JP");
}

export default async function MyPage() {
  const session = await getServerAuthSession();

  if (!session?.user?.id) {
    return (
      <main className="min-h-screen bg-[#f6f1ea] px-6 py-16 text-[#1f1b16]">
        <div className="mx-auto max-w-4xl rounded-3xl border border-[#e6d6c9] bg-white/80 p-10 text-center">
          <h1 className="text-2xl font-semibold">ログインしてください</h1>
          <p className="mt-3 text-sm text-[#6b5a4b]">
            マイページを見るにはログインが必要です。
          </p>
          <Link
            href="/login"
            className="mt-6 inline-flex rounded-full bg-[#1f1b16] px-6 py-3 text-sm font-semibold text-white"
          >
            ログイン
          </Link>
        </div>
      </main>
    );
  }

  const events = await prisma.event.findMany({
    where: { ownerUserId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: {
      candidateDates: {
        orderBy: { startsAt: "asc" },
      },
    },
  });

  return (
    <main className="min-h-screen bg-[#f6f1ea] px-6 py-16 text-[#1f1b16]">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[#5fa85a] text-[#5fa85a]">
              <span className="text-xl">👤</span>
            </div>
            <div>
              <p className="text-sm text-[#6b5a4b]">マイページ</p>
              <h1 className="text-2xl font-semibold">
                {session.user.name ?? "幹事"}さんのマイページ
              </h1>
            </div>
          </div>
          <Link
            href="/events/new"
            className="rounded-full bg-[#4a9d41] px-5 py-3 text-sm font-semibold text-white shadow-sm"
          >
            新しいイベントを作る
          </Link>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_280px]">
          <section className="space-y-6">
            <div className="flex items-center gap-2 text-lg font-semibold">
              <span className="text-[#4a9d41]">★</span>
              イベント履歴
            </div>
            {events.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#d9cbbd] bg-white/70 p-8 text-sm text-[#6b5a4b]">
                まだイベントがありません。新しいイベントを作成してください。
              </div>
            ) : (
              events.map((event) => (
                <Link
                  key={event.id}
                  href={`/e/${event.publicId}/admin`}
                  className="block rounded-2xl border border-[#e2d6c9] bg-white/90 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="flex items-center justify-between rounded-t-2xl bg-[#4a9d41] px-5 py-3 text-xs text-white">
                    <span className="rounded-full bg-white/20 px-3 py-1">
                      幹事
                    </span>
                    <span>{formatDate(event.createdAt)}</span>
                  </div>
                  <div className="space-y-3 p-5">
                    <h2 className="text-lg font-semibold">{event.name}</h2>
                    <div className="flex flex-wrap gap-2 text-xs">
                      {event.candidateDates.map((candidate) => {
                        const isConfirmed =
                          event.confirmedCandidateDateId === candidate.id;
                        return (
                          <span
                            key={candidate.id}
                            className={`rounded-full border px-3 py-1 ${
                              isConfirmed
                                ? "border-[#4a9d41] bg-[#eaf4ee] text-[#2f7f3b]"
                                : "border-[#e2d6c9] bg-white text-[#6b5a4b]"
                            }`}
                          >
                            {candidate.startsAt.toLocaleDateString("ja-JP", {
                              month: "numeric",
                              day: "numeric",
                              weekday: "short",
                            })}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </Link>
              ))
            )}
          </section>

          <aside className="rounded-2xl border border-[#e2d6c9] bg-white/90 p-5 text-sm">
            <p className="text-sm font-semibold text-[#4a4a4a]">メニュー</p>
            <div className="mt-4 space-y-3 text-sm text-[#5a4d42]">
              {[
                "マイページトップ",
                "プロフィール設定",
                "メール受信設定",
                "退会設定",
              ].map((label) => (
                <div
                  key={label}
                  className="flex items-center justify-between rounded-xl border border-[#e8ddd2] bg-[#faf7f3] px-4 py-3"
                >
                  <span>{label}</span>
                  <span className="text-[#a08f82]">›</span>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
