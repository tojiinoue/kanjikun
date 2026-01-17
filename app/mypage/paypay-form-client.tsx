"use client";

import { useState } from "react";

type Props = {
  initialPaypayId?: string | null;
};

export default function PaypayFormClient({ initialPaypayId }: Props) {
  const [paypayId, setPaypayId] = useState(initialPaypayId ?? "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);

    const response = await fetch("/api/my/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paypayId }),
    });

    if (!response.ok) {
      setMessage("保存に失敗しました。時間をおいてお試しください。");
      setSaving(false);
      return;
    }

    setMessage("保存しました。");
    setSaving(false);
  }

  return (
    <form onSubmit={submit} className="mt-4 space-y-3">
      <input
        value={paypayId}
        onChange={(event) => setPaypayId(event.target.value)}
        placeholder="PayPay IDを入力"
        maxLength={64}
        className="w-full rounded-xl border border-[#e2d6c9] bg-white px-4 py-3 text-sm"
      />
      {message ? <p className="text-xs text-[#6b5a4b]">{message}</p> : null}
      <button
        type="submit"
        disabled={saving}
        className="w-full rounded-full bg-[#1f1b16] px-4 py-2 text-xs font-semibold text-white transition active:scale-95 disabled:opacity-60"
      >
        {saving ? "保存中..." : "保存する"}
      </button>
    </form>
  );
}
