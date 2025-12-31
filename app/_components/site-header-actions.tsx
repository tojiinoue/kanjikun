"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";

type Props = {
  isLoggedIn: boolean;
};

export default function HeaderActions({ isLoggedIn }: Props) {
  if (!isLoggedIn) {
    return (
      <Link
        href="/login"
        className="rounded-full border border-[#1f1b16] px-4 py-2 text-xs font-semibold text-[#1f1b16] transition hover:bg-[#f3e8dd]"
      >
        ログイン
      </Link>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Link
        href="/mypage"
        className="rounded-full border border-[#1f1b16] px-4 py-2 text-xs font-semibold text-[#1f1b16] transition hover:bg-[#f3e8dd]"
      >
        マイページ
      </Link>
      <button
        type="button"
        onClick={() => signOut({ callbackUrl: "/" })}
        className="rounded-full border border-[#1f1b16] px-4 py-2 text-xs font-semibold text-[#1f1b16] transition hover:bg-[#f3e8dd]"
      >
        ログアウト
      </button>
    </div>
  );
}
