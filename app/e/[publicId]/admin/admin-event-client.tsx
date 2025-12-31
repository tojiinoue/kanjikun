"use client";

import { useEffect, useMemo, useState } from "react";

type CandidateDate = {
  id: string;
  startsAt: string;
};

type Attendance = {
  id: string;
  name: string;
  isActual: boolean;
};

type Payment = {
  id: string;
  attendanceId: string;
  amount: number;
  method: "CASH" | "PAYPAY" | "TRANSFER" | "OTHER" | null;
  status: "UNSUBMITTED" | "PENDING" | "APPROVED";
};

type EventResponse = {
  publicId: string;
  name: string;
  memo?: string | null;
  votingLocked: boolean;
  scheduleStatus: "PENDING" | "CONFIRMED";
  confirmedCandidateDateId?: string | null;
  accountingStatus: "PENDING" | "CONFIRMED";
  totalAmount?: number | null;
  perPersonAmount?: number | null;
  candidateDates: CandidateDate[];
  votes: { id: string }[];
  attendances: Attendance[];
  payments: Payment[];
};

type Props = {
  publicId: string;
};

function getOrCreateClientId() {
  if (typeof window === "undefined") {
    return "";
  }
  const existing = window.localStorage.getItem("client_id");
  if (existing) {
    return existing;
  }
  const generated = crypto.randomUUID();
  window.localStorage.setItem("client_id", generated);
  return generated;
}

function formatPaymentStatus(status: Payment["status"]) {
  switch (status) {
    case "UNSUBMITTED":
      return "未申請";
    case "PENDING":
      return "申請中";
    case "APPROVED":
      return "承認済み";
    default:
      return status;
  }
}

function formatPaymentMethod(method: Payment["method"]) {
  switch (method) {
    case "CASH":
      return "現金";
    case "PAYPAY":
      return "PayPay";
    case "TRANSFER":
      return "振込";
    case "OTHER":
      return "その他";
    default:
      return "未選択";
  }
}

export default function AdminEventClient({ publicId }: Props) {
  const [event, setEvent] = useState<EventResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clientId, setClientId] = useState("");
  const [selectedCandidateId, setSelectedCandidateId] = useState("");
  const [newAttendanceName, setNewAttendanceName] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [adjustments, setAdjustments] = useState<Record<string, string>>({});
  const [isEditingEvent, setIsEditingEvent] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [draftMemo, setDraftMemo] = useState("");
  const [eventEditError, setEventEditError] = useState<string | null>(null);
  const [candidateDrafts, setCandidateDrafts] = useState<
    Array<{ id?: string; startsAt: string }>
  >([]);
  const [candidateError, setCandidateError] = useState<string | null>(null);
  const [accountingError, setAccountingError] = useState<string | null>(null);
  const [bulkInput, setBulkInput] = useState("");
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());
  const [timeValue, setTimeValue] = useState("19:00");
  const [showCandidateEditor, setShowCandidateEditor] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setClientId(getOrCreateClientId());
  }, []);

  function formatDateTimeLocal(value: string) {
    const date = new Date(value);
    const pad = (num: number) => num.toString().padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
      date.getDate()
    )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  async function loadEvent(preserveScroll = false) {
    const scrollY =
      preserveScroll && typeof window !== "undefined" ? window.scrollY : null;
    if (!preserveScroll) {
      setLoading(true);
    }
    const response = await fetch(`/api/events/${publicId}`);
    if (!response.ok) {
      setError("イベントを取得できませんでした。");
      if (!preserveScroll) {
        setLoading(false);
      }
      return;
    }
    const data = (await response.json()) as EventResponse;
    setEvent(data);
    if (!isEditingEvent) {
      setDraftName(data.name);
      setDraftMemo(data.memo ?? "");
    }
    setSelectedCandidateId(data.confirmedCandidateDateId ?? "");
    setCandidateDrafts(
      data.candidateDates.map((candidate) => ({
        id: candidate.id,
        startsAt: formatDateTimeLocal(candidate.startsAt),
      }))
    );
    if (!preserveScroll) {
      setLoading(false);
    }
    if (scrollY !== null) {
      requestAnimationFrame(() => {
        window.scrollTo({ top: scrollY });
      });
    }
  }

  useEffect(() => {
    if (!publicId) {
      setError("イベントIDが取得できませんでした。");
      setLoading(false);
      return;
    }
    void loadEvent();
  }, [publicId]);

  async function saveEventDetails() {
    if (!draftName.trim()) {
      setEventEditError("イベント名を入力してください。");
      return;
    }
    setEventEditError(null);
    const response = await fetch(`/api/events/${publicId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: draftName,
        memo: draftMemo,
        ownerClientId: clientId,
      }),
    });
    if (!response.ok) {
      setEventEditError("イベント情報の更新に失敗しました。");
      return;
    }
    setIsEditingEvent(false);
    await loadEvent(true);
  }

  function cancelEventEdit() {
    if (!event) {
      setIsEditingEvent(false);
      return;
    }
    setDraftName(event.name);
    setDraftMemo(event.memo ?? "");
    setEventEditError(null);
    setIsEditingEvent(false);
  }

  const actualAttendances = useMemo(
    () => (event?.attendances ?? []).filter((attendance) => attendance.isActual),
    [event]
  );
  const attendanceNameById = useMemo(() => {
    const map = new Map<string, string>();
    (event?.attendances ?? []).forEach((attendance) => {
      map.set(attendance.id, attendance.name);
    });
    return map;
  }, [event]);
  const scheduleConfirmed = event?.scheduleStatus === "CONFIRMED";
  const accountingConfirmed = event?.accountingStatus === "CONFIRMED";

  function updateCandidateDraft(index: number, value: string) {
    setCandidateDrafts((prev) =>
      prev.map((candidate, i) =>
        i === index ? { ...candidate, startsAt: value } : candidate
      )
    );
  }

  function addCandidateDraft() {
    setCandidateDrafts((prev) => [...prev, { startsAt: "" }]);
  }

  function removeCandidateDraft(index: number) {
    setCandidateDrafts((prev) => prev.filter((_, i) => i !== index));
  }

  function addCandidatesFromBulk() {
    const lines = bulkInput
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    if (lines.length === 0) return;
    const next = lines.map((line) => {
      const date = new Date(line);
      if (Number.isNaN(date.getTime())) {
        return null;
      }
      return { startsAt: formatDateTimeLocal(date.toISOString()) };
    });
    const filtered = next.filter(Boolean) as Array<{ startsAt: string }>;
    if (filtered.length === 0) return;
    setCandidateDrafts((prev) => [...prev, ...filtered]);
    setBulkInput("");
  }

  function formatDateTimeLocalFromDate(date: Date, time: string) {
    const [hours, minutes] = time.split(":").map((value) => Number(value));
    const withTime = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      hours || 0,
      minutes || 0
    );
    return formatDateTimeLocal(withTime.toISOString());
  }

  function addCandidateFromDate(date: Date) {
    const startsAt = formatDateTimeLocalFromDate(date, timeValue);
    setCandidateDrafts((prev) => {
      if (prev.some((candidate) => candidate.startsAt === startsAt)) {
        return prev;
      }
      return [...prev, { startsAt }];
    });
  }

  function moveMonth(offset: number) {
    setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + offset, 1));
  }

  const weekStartsOn = 0;
  const weekdayLabels = ["日", "月", "火", "水", "木", "金", "土"];
  const displayWeekdays = [
    ...weekdayLabels.slice(weekStartsOn),
    ...weekdayLabels.slice(0, weekStartsOn),
  ];
  const monthMatrix = (() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const startDay = (firstDay.getDay() - weekStartsOn + 7) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const weeks: Array<Array<number | null>> = [];
    let currentDay = 1 - startDay;
    while (currentDay <= daysInMonth) {
      const week: Array<number | null> = [];
      for (let i = 0; i < 7; i += 1) {
        if (currentDay < 1 || currentDay > daysInMonth) {
          week.push(null);
        } else {
          week.push(currentDay);
        }
        currentDay += 1;
      }
      weeks.push(week);
    }
    return weeks;
  })();

  async function saveCandidates() {
    setCandidateError(null);
    const candidates = candidateDrafts.filter((candidate) => candidate.startsAt);
    if (candidates.length === 0) {
      setCandidateError("候補日を1つ以上入力してください。");
      return;
    }
    const response = await fetch(`/api/events/${publicId}/candidates`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        candidates,
        ownerClientId: clientId,
      }),
    });
    if (!response.ok) {
      setCandidateError("候補日の保存に失敗しました。");
      return;
    }
    await loadEvent(true);
  }

  function cancelCandidateEdits() {
    if (!event) return;
    setCandidateDrafts(
      event.candidateDates.map((candidate) => ({
        id: candidate.id,
        startsAt: formatDateTimeLocal(candidate.startsAt),
      }))
    );
    setCandidateError(null);
    setBulkInput("");
  }

  async function toggleVotingLock(locked: boolean) {
    setError(null);
    const response = await fetch(`/api/events/${publicId}/lock`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locked, ownerClientId: clientId }),
    });
    if (!response.ok) {
      setError("締切状態の更新に失敗しました。");
      return;
    }
    await loadEvent(true);
  }

  async function confirmSchedule() {
    if (!selectedCandidateId) return;
    const response = await fetch(`/api/events/${publicId}/schedule`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        candidateDateId: selectedCandidateId,
        ownerClientId: clientId,
      }),
    });
    if (!response.ok) {
      setError("日程の確定に失敗しました。");
      return;
    }
    await loadEvent(true);
  }

  async function cancelSchedule() {
    const ok = window.confirm(
      "日程確定を取り消すと出席・会計・支払情報がリセットされます。続行しますか？"
    );
    if (!ok) return;
    const response = await fetch(`/api/events/${publicId}/schedule`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ownerClientId: clientId }),
    });
    if (!response.ok) {
      setError("日程確定の取り消しに失敗しました。");
      return;
    }
    await loadEvent(true);
  }

  async function updateAttendance(attendanceId: string, isActual: boolean) {
    const response = await fetch(`/api/events/${publicId}/attendance`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        updates: [{ id: attendanceId, isActual }],
        ownerClientId: clientId,
      }),
    });
    if (!response.ok) {
      setError("出席の更新に失敗しました。");
      return;
    }
    await loadEvent(true);
  }

  async function addAttendance() {
    if (!newAttendanceName.trim()) {
      return;
    }
    const response = await fetch(`/api/events/${publicId}/attendance`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        additions: [{ name: newAttendanceName }],
        ownerClientId: clientId,
      }),
    });
    if (!response.ok) {
      setError("飛び入り参加者の追加に失敗しました。");
      return;
    }
    setNewAttendanceName("");
    await loadEvent(true);
  }

  async function confirmAccounting() {
    const amount = Number(totalAmount);
    if (!amount) return;
    setAccountingError(null);
    const response = await fetch(`/api/events/${publicId}/accounting`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        totalAmount: amount,
        adjustments: Object.entries(adjustments).map(([attendanceId, value]) => ({
          attendanceId,
          amount: Number(value),
        })),
        ownerClientId: clientId,
      }),
    });
    if (!response.ok) {
      let message = "会計確定に失敗しました。";
      try {
        const payload = (await response.json()) as { error?: string };
        if (payload.error === "Invalid adjustments") {
          message =
            "金額調整の合計が不正です。全員に調整を入れる場合は合計が一致するようにしてください。";
        } else if (payload.error === "Invalid total") {
          message = "合計金額が正しくありません。";
        } else if (payload.error === "No actual attendance") {
          message = "実出席者がいないため会計を確定できません。";
        }
      } catch {
        // JSONでない場合は既定メッセージ
      }
      setAccountingError(message);
      return;
    }
    setAccountingError(null);
    await loadEvent(true);
  }

  async function cancelAccounting() {
    const ok = window.confirm(
      "会計確定を取り消すと支払情報がリセットされます。続行しますか？"
    );
    if (!ok) return;
    const response = await fetch(`/api/events/${publicId}/accounting`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ownerClientId: clientId }),
    });
    if (!response.ok) {
      setError("会計の取り消しに失敗しました。");
      return;
    }
    await loadEvent(true);
  }

  async function approvePayment(paymentId: string) {
    const response = await fetch(
      `/api/events/${publicId}/payments/${paymentId}/approve`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ownerClientId: clientId }),
      }
    );
    if (!response.ok) {
      setError("承認に失敗しました。");
      return;
    }
    await loadEvent(true);
  }

  async function rejectPayment(paymentId: string) {
    const response = await fetch(
      `/api/events/${publicId}/payments/${paymentId}/reject`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ownerClientId: clientId }),
      }
    );
    if (!response.ok) {
      setError("差し戻しに失敗しました。");
      return;
    }
    await loadEvent(true);
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f6f1ea] px-4 py-12 text-[#1f1b16] sm:px-6 sm:py-16">
        <div className="mx-auto max-w-4xl">読み込み中...</div>
      </main>
    );
  }

  if (!event) {
    return (
      <main className="min-h-screen bg-[#f6f1ea] px-4 py-12 text-[#1f1b16] sm:px-6 sm:py-16">
        <div className="mx-auto max-w-4xl">
          <h1 className="text-2xl font-semibold">イベントが見つかりません</h1>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f6f1ea] px-4 py-12 text-[#1f1b16] sm:px-6 sm:py-16">
      <div className="mx-auto max-w-4xl space-y-8">
        <header className="rounded-3xl border border-[#e6d6c9] bg-white/80 p-6 sm:p-8">
          <p className="text-xs uppercase tracking-[0.3em] text-[#a1714f]">
            管理
          </p>
          {isEditingEvent ? (
            <div className="mt-3 space-y-6">
              <div>
                <label className="text-xs font-semibold text-[#6b5a4b]">
                  イベント名
                </label>
                <input
                  value={draftName}
                  onChange={(eventInput) => setDraftName(eventInput.target.value)}
                  className="mt-2 w-full rounded-xl border border-[#e2d6c9] bg-white px-4 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-[#6b5a4b]">
                  メモ（任意）
                </label>
                <textarea
                  value={draftMemo}
                  onChange={(eventInput) => setDraftMemo(eventInput.target.value)}
                  rows={3}
                  className="mt-2 w-full rounded-xl border border-[#e2d6c9] bg-white px-4 py-2 text-sm"
                />
              </div>
              {eventEditError ? (
                <p className="text-xs text-red-600">{eventEditError}</p>
              ) : null}
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={saveEventDetails}
                  className="rounded-full bg-[#1f1b16] px-4 py-2 text-xs font-semibold text-white"
                >
                  変更を保存
                </button>
                <button
                  type="button"
                  onClick={cancelEventEdit}
                  className="rounded-full border border-[#1f1b16] px-4 py-2 text-xs font-semibold text-[#1f1b16]"
                >
                  キャンセル
                </button>
              </div>
            </div>
          ) : (
            <>
              <h1 className="mt-3 text-2xl font-semibold sm:text-3xl">
                {event.name}
              </h1>
              {event.memo ? (
                <p className="mt-2 text-sm text-[#6b5a4b]">{event.memo}</p>
              ) : null}
              <div className="mt-6 flex flex-wrap gap-3">
                <a
                  className="inline-flex rounded-full border border-[#1f1b16] px-4 py-2 text-xs font-semibold text-[#1f1b16]"
                  href={`/e/${event.publicId}`}
                >
                  イベントページへ
                </a>
                <button
                  type="button"
                  onClick={() => setIsEditingEvent(true)}
                  className="inline-flex rounded-full border border-[#1f1b16] px-4 py-2 text-xs font-semibold text-[#1f1b16]"
                >
                  イベント情報を編集
                </button>
              </div>
            </>
          )}
          {!isEditingEvent ? (
            <div className="mt-4 flex flex-col gap-3 text-xs text-[#6b5a4b] sm:flex-row sm:flex-wrap sm:items-center">
              <span className="rounded-full bg-[#f3e8dd] px-3 py-1">
                参加者URL
              </span>
              <code className="rounded-full border border-[#e2d6c9] bg-white px-3 py-1 break-all sm:break-normal">
                {typeof window !== "undefined"
                  ? `${window.location.origin}/e/${event.publicId}`
                  : `/e/${event.publicId}`}
              </code>
              <button
                type="button"
                onClick={async () => {
                  await navigator.clipboard.writeText(
                    typeof window !== "undefined"
                      ? `${window.location.origin}/e/${event.publicId}`
                      : `/e/${event.publicId}`
                  );
                  setCopied(true);
                  window.setTimeout(() => setCopied(false), 1500);
                }}
                className="rounded-full border border-[#1f1b16] px-3 py-1 text-xs font-semibold text-[#1f1b16] transition hover:bg-[#f3e8dd]"
              >
                {copied ? "コピーしました" : "コピー"}
              </button>
            </div>
          ) : null}
          {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
        </header>

        <section className="rounded-3xl border border-[#e6d6c9] bg-white/80 p-6 sm:p-8">
          <h2 className="text-lg font-semibold">投票締切</h2>
          <p className="mt-2 text-sm text-[#6b5a4b]">
            {event.votingLocked ? "締切中" : "受付中"}
          </p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            {event.votingLocked ? (
              <button
                onClick={() => toggleVotingLock(false)}
                className="rounded-full border border-[#1f1b16] px-4 py-2 text-xs font-semibold text-[#1f1b16]"
              >
                締切を解除
              </button>
            ) : (
              <button
                onClick={() => toggleVotingLock(true)}
                className="rounded-full bg-[#1f1b16] px-4 py-2 text-xs font-semibold text-white"
              >
                締切にする
              </button>
            )}
          </div>
        </section>

        <section className="rounded-3xl border border-[#e6d6c9] bg-white/80 p-6 sm:p-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-lg font-semibold">日程候補の編集</h2>
            <button
              type="button"
              onClick={() => setShowCandidateEditor((prev) => !prev)}
              aria-label={
                showCandidateEditor
                  ? "日程候補編集を閉じる"
                  : "日程候補編集を開く"
              }
              className="flex h-9 w-full items-center justify-center gap-2 rounded-full border border-[#d9d0c6] bg-[#f7f4f0] text-xs font-semibold text-[#5c5147] shadow-sm transition hover:bg-[#efe9e2] sm:w-36"
            >
              {showCandidateEditor ? "閉じる" : "編集する"}
              <span className="text-base leading-none">
                {showCandidateEditor ? "▴" : "▾"}
              </span>
            </button>
          </div>
          {showCandidateEditor ? (
            <div className="mt-4 rounded-2xl border border-[#eadbcf] bg-white p-5 text-sm">
            <p className="font-semibold">日程候補の並び替えと削除</p>
            {scheduleConfirmed ? (
              <p className="mt-2 text-xs text-[#a34c3d]">
                日程確定後は候補日を編集できません。
              </p>
            ) : null}
            <div className="mt-4 space-y-2">
              {candidateDrafts.length === 0 ? (
                <p className="text-xs text-[#6b5a4b]">候補日を追加してください。</p>
              ) : (
                candidateDrafts.map((candidate, index) => (
                  <div
                    key={`${candidate.id ?? "new"}-${index}`}
                    className="flex items-center justify-between rounded-xl border border-[#ece1d8] bg-[#f9f6f2] px-3 py-2"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-[#9b8a7a]">⋮⋮</span>
                      <input
                        type="datetime-local"
                        value={candidate.startsAt}
                        onChange={(event) =>
                          updateCandidateDraft(index, event.target.value)
                        }
                        disabled={scheduleConfirmed}
                        className="rounded-lg border border-[#e2d6c9] bg-white px-3 py-1 text-sm"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeCandidateDraft(index)}
                      disabled={scheduleConfirmed}
                      className="text-sm font-semibold text-[#d14c4c] disabled:opacity-40"
                    >
                      🗑
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_280px]">
              <div>
                <p className="font-semibold">日程候補の追加</p>
                <p className="mt-2 text-xs text-[#6b5a4b]">
                  カレンダーをクリックすると候補日が追加されます。
                </p>
                <p className="mt-2 text-xs text-[#6b5a4b]">
                  こちらは日時をまとめて貼り付けるための入力欄です。
                </p>
                <textarea
                  value={bulkInput}
                  onChange={(event) => setBulkInput(event.target.value)}
                  rows={5}
                  placeholder="例: 2025-01-05 19:00"
                  disabled={scheduleConfirmed}
                  className="mt-3 w-full rounded-xl border border-[#e2d6c9] px-3 py-2 text-sm"
                />
                <button
                  type="button"
                  onClick={addCandidatesFromBulk}
                  disabled={scheduleConfirmed}
                  className="mt-3 rounded-full border border-[#1f1b16] px-4 py-2 text-xs font-semibold text-[#1f1b16] disabled:opacity-40"
                >
                  追加する
                </button>
              </div>
              <div>
                <div className="flex items-center justify-between text-sm font-semibold">
                  <span>カレンダー</span>
                  <label className="flex items-center gap-2 text-xs text-[#6b5a4b]">
                    <input
                      type="checkbox"
                      defaultChecked
                      className="accent-[#4a9d41]"
                    />
                    日付の後に時刻を追加する
                  </label>
                </div>
                <input
                  type="time"
                  value={timeValue}
                  onChange={(event) => setTimeValue(event.target.value)}
                  disabled={scheduleConfirmed}
                  className="mt-2 w-full rounded-xl border border-[#e2d6c9] px-3 py-2 text-sm"
                />
                <div className="mt-3 rounded-xl border border-[#eadbcf] bg-[#f7f1e8] p-3">
                  <div className="flex items-center justify-between text-sm font-semibold">
                    <button
                      type="button"
                      onClick={() => moveMonth(-1)}
                      className="rounded-full px-2 py-1 text-[#6b5a4b] hover:bg-[#efe5db]"
                    >
                      ←
                    </button>
                    <span>
                      {calendarMonth.getFullYear()}年
                      {calendarMonth.getMonth() + 1}月
                    </span>
                    <button
                      type="button"
                      onClick={() => moveMonth(1)}
                      className="rounded-full px-2 py-1 text-[#6b5a4b] hover:bg-[#efe5db]"
                    >
                      →
                    </button>
                  </div>
                  <div className="mt-2 grid grid-cols-7 gap-2 text-center text-xs">
                    {displayWeekdays.map((label) => (
                      <div key={label} className="font-semibold text-[#6b5a4b]">
                        {label}
                      </div>
                    ))}
                    {monthMatrix.map((week, weekIndex) =>
                      week.map((day, dayIndex) => {
                        if (!day) {
                          return (
                            <div key={`empty-${weekIndex}-${dayIndex}`} />
                          );
                        }
                        const date = new Date(
                          calendarMonth.getFullYear(),
                          calendarMonth.getMonth(),
                          day
                        );
                        return (
                          <button
                            key={`day-${weekIndex}-${dayIndex}`}
                            type="button"
                            onClick={() => addCandidateFromDate(date)}
                            disabled={scheduleConfirmed}
                            className="rounded-lg border border-[#cfe3c7] bg-[#d9ecd2] py-2 text-sm font-semibold text-[#46683f] hover:bg-[#cfe6c9] disabled:opacity-40"
                          >
                            {day}
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>

            {candidateError ? (
              <p className="mt-2 text-xs text-[#a34c3d]">{candidateError}</p>
            ) : null}
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={saveCandidates}
                disabled={scheduleConfirmed}
                className="rounded-full bg-[#1f1b16] px-4 py-2 text-xs font-semibold text-white disabled:opacity-40"
              >
                候補日を保存
              </button>
              <button
                type="button"
                onClick={cancelCandidateEdits}
                disabled={scheduleConfirmed}
                className="rounded-full border border-[#1f1b16] px-4 py-2 text-xs font-semibold text-[#1f1b16] disabled:opacity-40"
              >
                編集をキャンセル
              </button>
            </div>
          </div>
          ) : null}
        </section>

        <section className="rounded-3xl border border-[#e6d6c9] bg-white/80 p-6 sm:p-8">
          <h2 className="text-lg font-semibold">日程確定</h2>
          <p className="mt-2 text-sm text-[#6b5a4b]">
            {event.scheduleStatus === "CONFIRMED"
              ? "確定済み"
              : "未確定"}
          </p>
          <div className="mt-4 space-y-3">
            <select
              value={selectedCandidateId}
              onChange={(event) => setSelectedCandidateId(event.target.value)}
              disabled={scheduleConfirmed}
              className="w-full rounded-xl border border-[#e2d6c9] px-4 py-3 text-sm"
            >
              <option value="">候補日を選択</option>
              {event.candidateDates.map((candidate) => (
                <option key={candidate.id} value={candidate.id}>
                  {new Date(candidate.startsAt).toLocaleString("ja-JP")}
                </option>
              ))}
            </select>
            {scheduleConfirmed ? (
              <button
                onClick={cancelSchedule}
                className="rounded-full border border-[#1f1b16] px-4 py-2 text-xs font-semibold text-[#1f1b16]"
              >
                日程確定を取り消す
              </button>
            ) : (
              <button
                onClick={confirmSchedule}
                disabled={!selectedCandidateId}
                className="rounded-full bg-[#1f1b16] px-4 py-2 text-xs font-semibold text-white disabled:opacity-60"
              >
                日程を確定する
              </button>
            )}
          </div>
        </section>

        {scheduleConfirmed ? (
          <>
            <section className="rounded-3xl border border-[#e6d6c9] bg-white/80 p-6 sm:p-8">
              <h2 className="text-lg font-semibold">出席管理</h2>
              <div className="mt-4 space-y-3 text-sm">
                {event.attendances.length === 0 ? (
                  <p className="text-[#6b5a4b]">
                    出席者がまだ生成されていません。
                  </p>
                ) : (
                  event.attendances.map((attendance) => (
                    <label
                      key={attendance.id}
                      className="flex items-center justify-between rounded-2xl border border-[#eadbcf] bg-white px-4 py-3"
                    >
                      <span>{attendance.name}</span>
                      <input
                        type="checkbox"
                        checked={attendance.isActual}
                        onChange={(event) =>
                          updateAttendance(attendance.id, event.target.checked)
                        }
                      />
                    </label>
                  ))
                )}
              </div>
              <div className="mt-4 flex flex-wrap gap-3">
                <input
                  value={newAttendanceName}
                  onChange={(event) => setNewAttendanceName(event.target.value)}
                  placeholder="飛び入り参加者名"
                  className="flex-1 rounded-xl border border-[#e2d6c9] px-4 py-2 text-sm"
                />
                <button
                  onClick={addAttendance}
                  className="rounded-full border border-[#1f1b16] px-4 py-2 text-xs font-semibold text-[#1f1b16]"
                >
                  追加
                </button>
              </div>
            </section>

            <section className="rounded-3xl border border-[#e6d6c9] bg-white/80 p-6 sm:p-8">
              <h2 className="text-lg font-semibold">会計確定</h2>
              <p className="mt-2 text-sm text-[#6b5a4b]">
                {event.accountingStatus === "CONFIRMED"
                  ? "確定済み"
                  : "未確定"}
              </p>
              <div className="mt-4 space-y-3 text-sm">
                <input
                  value={totalAmount}
                  onChange={(event) => setTotalAmount(event.target.value)}
                  placeholder="合計金額"
                  disabled={accountingConfirmed}
                  className="w-full rounded-xl border border-[#e2d6c9] px-4 py-2"
                />
                <div className="space-y-2">
                  {actualAttendances.map((attendance) => (
                    <div
                      key={attendance.id}
                      className="flex items-center justify-between rounded-2xl border border-[#eadbcf] bg-white px-4 py-2"
                    >
                      <span>{attendance.name}</span>
                      <input
                        value={adjustments[attendance.id] ?? ""}
                        onChange={(event) =>
                          setAdjustments((prev) => ({
                            ...prev,
                            [attendance.id]: event.target.value,
                          }))
                        }
                        placeholder="金額調整"
                        disabled={accountingConfirmed}
                        className="w-32 rounded-lg border border-[#e2d6c9] px-2 py-1 text-xs"
                      />
                    </div>
                  ))}
                </div>
                {accountingError ? (
                  <p className="text-xs text-red-600">{accountingError}</p>
                ) : null}
                {accountingConfirmed ? (
                  <button
                    onClick={cancelAccounting}
                    className="rounded-full border border-[#1f1b16] px-4 py-2 text-xs font-semibold text-[#1f1b16]"
                  >
                    会計確定を取り消す
                  </button>
                ) : (
                  <button
                    onClick={confirmAccounting}
                    disabled={actualAttendances.length === 0}
                    className="rounded-full bg-[#1f1b16] px-4 py-2 text-xs font-semibold text-white disabled:opacity-60"
                  >
                    会計を確定する
                  </button>
                )}
              </div>
            </section>

            <section className="rounded-3xl border border-[#e6d6c9] bg-white/80 p-6 sm:p-8">
              <h2 className="text-lg font-semibold">支払管理</h2>
              <div className="mt-4 space-y-2 text-sm">
                {event.payments.length === 0 ? (
                  <p className="text-[#6b5a4b]">支払情報がまだありません。</p>
                ) : (
                  event.payments.map((payment) => (
                    <div
                      key={payment.id}
                      className={`flex flex-col items-start gap-3 rounded-2xl border border-[#eadbcf] px-4 py-2 sm:flex-row sm:items-center sm:justify-between ${
                        payment.status === "PENDING"
                          ? "bg-[#fff4e9]"
                          : "bg-white"
                      }`}
                    >
                      <span className="font-semibold text-[#1f1b16]">
                        {attendanceNameById.get(payment.attendanceId) ?? "名前不明"}
                      </span>
                      <span>金額: {payment.amount}円</span>
                      <span className="text-xs text-[#6b5a4b]">
                        {formatPaymentMethod(payment.method)} /{" "}
                        {formatPaymentStatus(payment.status)}
                      </span>
                      {payment.status === "PENDING" ? (
                        <div className="flex gap-2">
                          <button
                            onClick={() => approvePayment(payment.id)}
                            className="rounded-full bg-[#1f1b16] px-3 py-1 text-xs font-semibold text-white"
                          >
                            承認
                          </button>
                          <button
                            onClick={() => rejectPayment(payment.id)}
                            className="rounded-full border border-[#1f1b16] px-3 py-1 text-xs font-semibold text-[#1f1b16]"
                          >
                            差し戻し
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-[#6b5a4b]">
                          {formatPaymentStatus(payment.status)}
                        </span>
                      )}
                    </div>
                  ))
                )}
              </div>
            </section>
          </>
        ) : null}
      </div>
    </main>
  );
}
