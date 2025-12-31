import Link from "next/link";

import { prisma } from "@/lib/prisma";
import { getServerAuthSession } from "@/lib/session";
import AdminEventClient from "./admin-event-client";

type PageProps = {
  params: Promise<{ publicId: string }>;
};

export default async function EventAdminPage({ params }: PageProps) {
  const { publicId } = await params;
  const session = await getServerAuthSession();
  const event = await prisma.event.findUnique({
    where: { publicId },
    select: { id: true, ownerUserId: true, publicId: true, name: true },
  });

  if (!event) {
    return (
      <main className="min-h-screen bg-[#f6f1ea] px-4 py-12 text-[#1f1b16] sm:px-6 sm:py-16">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-2xl font-semibold">イベントが見つかりません</h1>
        </div>
      </main>
    );
  }

  if (!session?.user?.id || session.user.id !== event.ownerUserId) {
    return (
      <main className="min-h-screen bg-[#f6f1ea] px-4 py-12 text-[#1f1b16] sm:px-6 sm:py-16">
        <div className="mx-auto max-w-3xl rounded-3xl border border-[#e6d6c9] bg-white/80 p-8">
          <h1 className="text-2xl font-semibold">アクセスできません</h1>
          <p className="mt-2 text-sm text-[#6b5a4b]">
            幹事のみが管理ページを利用できます。
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/login"
              className="rounded-full bg-[#1f1b16] px-6 py-3 text-sm font-semibold text-white"
            >
              ログイン
            </Link>
            <Link
              href={`/e/${event.publicId}`}
              className="rounded-full border border-[#1f1b16] px-6 py-3 text-sm font-semibold text-[#1f1b16]"
            >
              イベントページへ
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return <AdminEventClient publicId={publicId} />;
}
