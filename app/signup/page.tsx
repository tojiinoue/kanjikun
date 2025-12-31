"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";

export default function SignupPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSignup(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("name") || "");
    const email = String(formData.get("email") || "");
    const password = String(formData.get("password") || "");

    const response = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });

    if (!response.ok) {
      let message = "登録に失敗しました。";
      try {
        const payload = (await response.json()) as { error?: string };
        if (payload.error) {
          message = payload.error;
        }
      } catch {
        // JSONが返らない場合は汎用メッセージにフォールバックする
      }
      setError(message);
      setLoading(false);
      return;
    }

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);
    if (result?.error) {
      setError("登録後のログインに失敗しました。");
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
              幹事アカウント作成
            </h1>
            <p className="mt-2 text-sm text-[#6b5a4b]">
              まずはイベントを作ってみましょう。
            </p>
          </div>

          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label className="text-sm font-medium">表示名</label>
              <input
                name="name"
                type="text"
                className="mt-2 w-full rounded-xl border border-[#e2d6c9] bg-white px-4 py-3 text-sm outline-none transition focus:border-[#c08b65]"
              />
            </div>
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
              <label className="text-sm font-medium">
                パスワード（8文字以上）
              </label>
              <input
                name="password"
                type="password"
                required
                minLength={8}
                className="mt-2 w-full rounded-xl border border-[#e2d6c9] bg-white px-4 py-3 text-sm outline-none transition focus:border-[#c08b65]"
              />
            </div>
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-[#1f1b16] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#3a312a] disabled:opacity-60"
            >
              {loading ? "作成中..." : "アカウント作成"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-[#6b5a4b]">
            すでにアカウントをお持ちですか？{" "}
            <a className="font-semibold text-[#1f1b16]" href="/login">
              ログイン
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}
