import Link from "next/link";

import HeaderActions from "@/app/_components/site-header-actions";

import { getServerAuthSession } from "@/lib/session";

export default async function SiteHeader() {
  const session = await getServerAuthSession();
  const isLoggedIn = Boolean(session?.user?.id);

  return (
    <header className="border-b border-[#e6d6c9] bg-white/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4 text-sm text-[#1f1b16]">
        <Link href="/" className="text-base font-semibold">
          幹事くん
        </Link>
        <HeaderActions isLoggedIn={isLoggedIn} />
      </div>
    </header>
  );
}
