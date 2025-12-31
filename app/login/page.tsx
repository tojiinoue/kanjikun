"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleCredentials(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") || "");
    const password = String(formData.get("password") || "");

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);
    if (result?.error) {
      setError("メールアドレスまたはパスワードが違います。");
      return;
    }

    window.location.assign("/events/new");
  }

  return (
    <main className="min-h-screen bg-[#f6f1ea] text-[#1f1b16]">
      <div className="mx-auto flex min-h-screen w-full max-w-4xl items-center px-6 py-16">
        <div className="w-full rounded-3xl bg-white/90 p-10 shadow-[0_24px_60px_rgba(31,27,22,0.12)]">
          <div className="mb-8">
            <p className="text-sm uppercase tracking-[0.2em] text-[#a1714f]">
              幹事くん
            </p>
            <h1 className="mt-3 text-3xl font-semibold">
              幹事ログイン
            </h1>
            <p className="mt-2 text-sm text-[#6b5a4b]">
              ログインしてイベントを作成・管理します。
            </p>
          </div>

          <form onSubmit={handleCredentials} className="space-y-4">
            <div>
              <label className="text-sm font-medium">メールアドレス</label>
              <input
                name="email"
                type="email"
                required
                className="mt-2 w-full rounded-xl border border-[#e2d6c9] bg-white px-4 py-3 text-sm outline-none transition focus:border-[#c08b65]"
              />
            </div>
            <div>
              <label className="text-sm font-medium">パスワード</label>
              <input
                name="password"
                type="password"
                required
                className="mt-2 w-full rounded-xl border border-[#e2d6c9] bg-white px-4 py-3 text-sm outline-none transition focus:border-[#c08b65]"
              />
            </div>
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-[#1f1b16] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#3a312a] disabled:opacity-60"
            >
              {loading ? "ログイン中..." : "ログイン"}
            </button>
          </form>

          <div className="my-8 flex items-center gap-4 text-xs text-[#8a7767]">
            <span className="h-px w-full bg-[#e6dbcf]" />
            または
            <span className="h-px w-full bg-[#e6dbcf]" />
          </div>

          <button
            onClick={() => signIn("google", { callbackUrl: "/events/new" })}
            className="w-full rounded-full border border-[#1f1b16] px-6 py-3 text-sm font-semibold text-[#1f1b16] transition hover:bg-[#f3e8dd]"
          >
            Googleでログイン
          </button>

          <p className="mt-6 text-center text-sm text-[#6b5a4b]">
            はじめての方は{" "}
            <a className="font-semibold text-[#1f1b16]" href="/signup">
              アカウント作成
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}
