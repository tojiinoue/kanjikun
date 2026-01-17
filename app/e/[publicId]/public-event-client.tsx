"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { formatAreaLabel } from "@/lib/area-options";

type CandidateDate = {
  id: string;
  startsAt: string;
};

type VoteChoice = {
  candidateDateId: string;
  response: "YES" | "MAYBE" | "NO";
};

type Vote = {
  id: string;
  name: string;
  comment?: string | null;
  createdAt: string;
  choices: VoteChoice[];
};

type Attendance = {
  id: string;
  name: string;
  isActual: boolean;
  roundId: string;
};

type Payment = {
  id: string;
  attendanceId: string;
  roundId: string;
  amount: number;
  method: "CASH" | "PAYPAY" | "TRANSFER" | "OTHER" | null;
  status: "UNSUBMITTED" | "PENDING" | "APPROVED";
};

type EventRound = {
  id: string;
  order: number;
  name: string;
  accountingStatus: "PENDING" | "CONFIRMED";
  totalAmount?: number | null;
  perPersonAmount?: number | null;
  attendances: Attendance[];
  payments: Payment[];
};

type EventResponse = {
  publicId: string;
  name: string;
  memo?: string | null;
  shopSchedule?: string | null;
  shopName?: string | null;
  shopUrl?: string | null;
  courseName?: string | null;
  courseUrl?: string | null;
  shopAddress?: string | null;
  shopPrice?: string | null;
  areaPrefCode?: string | null;
  areaMunicipalityName?: string | null;
  votingLocked: boolean;
  scheduleStatus: "PENDING" | "CONFIRMED";
  confirmedCandidateDateId?: string | null;
  accountingStatus: "PENDING" | "CONFIRMED";
  candidateDates: CandidateDate[];
  votes: Vote[];
  rounds: EventRound[];
  isOwnerUser: boolean;
  ownerPaypayId?: string | null;
};

type Props = {
  publicId: string;
};

const responseLabels = {
  YES: "◯",
  MAYBE: "△",
  NO: "✕",
} as const;

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

function formatDateHeaderParts(value: string) {
  const date = new Date(value);
  return {
    date: date.toLocaleDateString("ja-JP", {
      month: "numeric",
      day: "numeric",
      weekday: "short",
    }),
    time: date.toLocaleTimeString("ja-JP", {
      hour: "2-digit",
      minute: "2-digit",
    }),
  };
}

function formatShopScheduleDisplay(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("ja-JP", {
    month: "numeric",
    day: "numeric",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function PublicEventClient({ publicId }: Props) {
  const [event, setEvent] = useState<EventResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formComment, setFormComment] = useState("");
  const [editingVoteId, setEditingVoteId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [choices, setChoices] = useState<Record<string, VoteChoice["response"]>>(
    {}
  );
  const [clientId, setClientId] = useState("");
  const [paymentMethods, setPaymentMethods] = useState<Record<string, string>>(
    {}
  );
  const [applyingPaymentIds, setApplyingPaymentIds] = useState<
    Record<string, boolean>
  >({});
  const [cancelingPaymentIds, setCancelingPaymentIds] = useState<
    Record<string, boolean>
  >({});
  const formRef = useRef<HTMLDivElement | null>(null);
  const [copied, setCopied] = useState(false);
  const [shopCopied, setShopCopied] = useState(false);

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

  async function loadEvent(preserveScroll = false) {
    const scrollY =
      preserveScroll && typeof window !== "undefined" ? window.scrollY : null;
    if (!preserveScroll) {
      setLoading(true);
    }
    const response = await fetch(`/api/events/${publicId}`, {
      headers: {
        "x-owner-client-id": clientId,
      },
    });
    if (!response.ok) {
      setError("イベントを取得できませんでした。");
      if (!preserveScroll) {
        setLoading(false);
      }
      return;
    }
    const data = (await response.json()) as EventResponse;
    setEvent(data);
    if (!preserveScroll) {
      setLoading(false);
    }
    if (scrollY !== null) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          window.scrollTo({ top: scrollY });
        });
      });
    }
  }

  useEffect(() => {
    setClientId(getOrCreateClientId());
  }, []);

  useEffect(() => {
    if (!publicId) {
      setError("イベントIDが取得できませんでした。");
      setLoading(false);
      return;
    }
    if (!clientId) {
      return;
    }
    void loadEvent();
  }, [publicId, clientId]);

  useEffect(() => {
    if (!event) return;
    const initial: Record<string, VoteChoice["response"]> = {};
    event.candidateDates.forEach((candidate) => {
      initial[candidate.id] = "NO";
    });
    setChoices(initial);
  }, [event]);

  const voteList = useMemo(() => event?.votes ?? [], [event]);
  const sortedCandidates = useMemo(() => {
    if (!event) return [];
    return [...event.candidateDates].sort((a, b) =>
      a.startsAt < b.startsAt ? -1 : 1
    );
  }, [event]);
  const sortedVotes = useMemo(() => {
    return [...voteList].sort((a, b) => {
      const timeDiff =
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (timeDiff !== 0) return timeDiff;
      return a.name.localeCompare(b.name);
    });
  }, [voteList]);
  const attendeeGroups = useMemo(() => {
    if (!event) return [];
    const groups = new Map<
      string,
      {
        name: string;
        attendances: Array<
          Attendance & { roundName: string; roundOrder: number; roundStatus: EventRound["accountingStatus"] }
        >;
      }
    >();
    event.rounds.forEach((round) => {
      round.attendances.forEach((attendance) => {
        const existing =
          groups.get(attendance.name) ?? { name: attendance.name, attendances: [] };
        existing.attendances.push({
          ...attendance,
          roundName: round.name,
          roundOrder: round.order,
          roundStatus: round.accountingStatus,
        });
        groups.set(attendance.name, existing);
      });
    });
    return Array.from(groups.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    );
  }, [event]);
  const paymentSummaries = useMemo(() => {
    if (!event) return new Map<string, {
      totalAmount: number;
      status: Payment["status"];
      method: Payment["method"];
      breakdown: Array<{ roundName: string; amount: number; roundOrder: number }>;
    }>();
    const attendanceMeta = new Map<
      string,
      { name: string; roundName: string; roundOrder: number }
    >();
    event.rounds.forEach((round) => {
      round.attendances.forEach((attendance) => {
        attendanceMeta.set(attendance.id, {
          name: attendance.name,
          roundName: round.name,
          roundOrder: round.order,
        });
      });
    });
    const summaries = new Map<
      string,
      {
        totalAmount: number;
        statuses: Payment["status"][];
        methods: Payment["method"][];
        breakdown: Array<{ roundName: string; amount: number; roundOrder: number }>;
      }
    >();
    event.rounds.forEach((round) => {
      round.payments.forEach((payment) => {
        const meta = attendanceMeta.get(payment.attendanceId);
        if (!meta) return;
        const existing =
          summaries.get(meta.name) ??
          {
            totalAmount: 0,
            statuses: [],
            methods: [],
            breakdown: [],
          };
        existing.totalAmount += payment.amount;
        existing.statuses.push(payment.status);
        if (payment.method) {
          existing.methods.push(payment.method);
        }
        existing.breakdown.push({
          roundName: meta.roundName,
          amount: payment.amount,
          roundOrder: meta.roundOrder,
        });
        summaries.set(meta.name, existing);
      });
    });
    const result = new Map<
      string,
      {
        totalAmount: number;
        status: Payment["status"];
        method: Payment["method"];
        breakdown: Array<{ roundName: string; amount: number; roundOrder: number }>;
      }
    >();
    summaries.forEach((summary, name) => {
      const status = summary.statuses.includes("APPROVED")
        ? "APPROVED"
        : summary.statuses.includes("PENDING")
          ? "PENDING"
          : "UNSUBMITTED";
      result.set(name, {
        totalAmount: summary.totalAmount,
        status,
        method: summary.methods[0] ?? null,
        breakdown: [...summary.breakdown].sort(
          (a, b) => a.roundOrder - b.roundOrder
        ),
      });
    });
    return result;
  }, [event]);
  const topYesCount = useMemo(() => {
    if (!event) return 0;
    if (sortedVotes.length === 0 || sortedCandidates.length === 0) return 0;
    return Math.max(
      ...sortedCandidates.map((candidate) =>
        sortedVotes.reduce((count, vote) => {
          const response =
            vote.choices.find(
              (choice) => choice.candidateDateId === candidate.id
            )?.response ?? "NO";
          return count + (response === "YES" ? 1 : 0);
        }, 0)
      )
    );
  }, [event, sortedCandidates, sortedVotes]);

  function formatShortDateTime(value: string) {
    const date = new Date(value);
    return date.toLocaleString("ja-JP", {
      month: "numeric",
      day: "numeric",
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function beginEdit(vote: Vote) {
    setShowForm(true);
    setEditingVoteId(vote.id);
    setFormName(vote.name);
    setFormComment(vote.comment ?? "");
    const nextChoices: Record<string, VoteChoice["response"]> = {};
    vote.choices.forEach((choice) => {
      nextChoices[choice.candidateDateId] = choice.response;
    });
    setChoices((prev) => ({ ...prev, ...nextChoices }));
    requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function resetForm() {
    setEditingVoteId(null);
    setFormName("");
    setFormComment("");
    setShowForm(false);
  }

  async function submitVote(eventForm: React.FormEvent<HTMLFormElement>) {
    eventForm.preventDefault();
    if (!event) return;

    const payload = {
      name: formName,
      comment: formComment,
      choices: event.candidateDates.map((candidate) => ({
        candidateDateId: candidate.id,
        response: choices[candidate.id] ?? "MAYBE",
      })),
    };

    const endpoint = editingVoteId
      ? `/api/events/${publicId}/votes/${editingVoteId}`
      : `/api/events/${publicId}/votes`;
    const method = editingVoteId ? "PATCH" : "POST";
    const response = await fetch(endpoint, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      setError("投票の送信に失敗しました。");
      return;
    }

    resetForm();
    await loadEvent();
  }

  async function deleteVote(voteId: string) {
    const response = await fetch(`/api/events/${publicId}/votes/${voteId}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      setError("投票の削除に失敗しました。");
      return;
    }

    if (editingVoteId === voteId) {
      resetForm();
    }
    await loadEvent();
  }

  async function applyPayment(attendeeName: string) {
    if (!event) return;
    const method = paymentMethods[attendeeName];
    if (!method) {
      setError("支払方法を選択してください。");
      return;
    }
    setApplyingPaymentIds((prev) => ({ ...prev, [attendeeName]: true }));
    const response = await fetch(`/api/events/${publicId}/payments/apply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ attendeeName, method }),
    });
    if (!response.ok) {
      setError("支払申請に失敗しました。");
      setApplyingPaymentIds((prev) => ({ ...prev, [attendeeName]: false }));
      return;
    }
    await loadEvent(true);
    setApplyingPaymentIds((prev) => ({ ...prev, [attendeeName]: false }));
  }

  async function cancelPayment(attendeeName: string) {
    const ok = window.confirm("支払申請を取り消しますか？");
    if (!ok) return;
    setCancelingPaymentIds((prev) => ({ ...prev, [attendeeName]: true }));
    const response = await fetch(`/api/events/${publicId}/payments/cancel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ attendeeName }),
    });
    if (!response.ok) {
      setError("支払申請の取消に失敗しました。");
      setCancelingPaymentIds((prev) => ({ ...prev, [attendeeName]: false }));
      return;
    }
    await loadEvent(true);
    setCancelingPaymentIds((prev) => ({ ...prev, [attendeeName]: false }));
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

  const shopDetails = [
    event.shopSchedule ? `日程: ${event.shopSchedule}` : null,
    event.shopName ? `店名: ${event.shopName}` : null,
    event.shopAddress ? `住所: ${event.shopAddress}` : null,
    event.shopUrl ? `店舗リンク: ${event.shopUrl}` : null,
    event.courseName ? `コース: ${event.courseName}` : null,
    event.courseUrl ? `コースリンク: ${event.courseUrl}` : null,
    event.shopPrice ? `料金: ${event.shopPrice}` : null,
  ].filter(Boolean) as string[];
  const hasShopInfo = shopDetails.length > 0;

  return (
    <main className="min-h-screen bg-[#f6f1ea] px-4 py-12 text-[#1f1b16] sm:px-6 sm:py-16">
      <div className="mx-auto max-w-4xl space-y-8">
        <header className="rounded-3xl border border-[#e6d6c9] bg-white/80 p-6 shadow-[0_16px_36px_rgba(31,27,22,0.1)] sm:p-8">
          <p className="text-xs uppercase tracking-[0.3em] text-[#a1714f]">
            イベント
          </p>
          <h1 className="mt-3 text-2xl font-semibold sm:text-3xl">
            {event.name}
          </h1>
          <div className="mt-3 space-y-2 text-sm text-[#6b5a4b]">
            {formatAreaLabel(event.areaPrefCode, event.areaMunicipalityName) ? (
              <p>
                エリア:{" "}
                <span className="font-semibold text-[#4d3f34]">
                  {formatAreaLabel(
                    event.areaPrefCode,
                    event.areaMunicipalityName
                  )}
                </span>
              </p>
            ) : null}
            {event.memo ? <p>{event.memo}</p> : null}
          </div>
          {hasShopInfo ? (
            <div className="mt-4 rounded-2xl border border-[#eadbcf] bg-white/70 p-4 text-sm text-[#5e4c3d]">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold text-[#4d3f34]">予約情報</p>
                <button
                  type="button"
                  onClick={async () => {
                    await navigator.clipboard.writeText(shopDetails.join("\n"));
                    setShopCopied(true);
                    window.setTimeout(() => setShopCopied(false), 1500);
                  }}
                  className="rounded-full border border-[#1f1b16] px-3 py-1 text-xs font-semibold text-[#1f1b16] transition active:scale-95"
                >
                  {shopCopied ? "コピーしました" : "コピー"}
                </button>
              </div>
              <div className="mt-3 space-y-1">
                {event.shopSchedule ? (
                  <p>
                    <span className="font-semibold">日程:</span>{" "}
                    {formatShopScheduleDisplay(event.shopSchedule)}
                  </p>
                ) : null}
                {event.shopName ? (
                  <p>
                    <span className="font-semibold">店名:</span>{" "}
                    {event.shopName}
                  </p>
                ) : null}
                {event.shopAddress ? (
                  <p>
                    <span className="font-semibold">住所:</span>{" "}
                    {event.shopAddress}
                  </p>
                ) : null}
                {event.shopUrl ? (
                  <p>
                    <span className="font-semibold">店舗リンク:</span>{" "}
                    <a
                      href={event.shopUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="underline decoration-dotted underline-offset-2"
                    >
                      {event.shopUrl}
                    </a>
                  </p>
                ) : null}
                {event.courseName ? (
                  <p>
                    <span className="font-semibold">コース:</span>{" "}
                    {event.courseName}
                  </p>
                ) : null}
                {event.courseUrl ? (
                  <p>
                    <span className="font-semibold">コースリンク:</span>{" "}
                    <a
                      href={event.courseUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="underline decoration-dotted underline-offset-2"
                    >
                      {event.courseUrl}
                    </a>
                  </p>
                ) : null}
                {event.shopPrice ? (
                  <p>
                    <span className="font-semibold">料金:</span>{" "}
                    {event.shopPrice}
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}
          {event.votingLocked ? (
            <p className="mt-4 text-xs text-[#b45309]">
              投票は締切済みです。
            </p>
          ) : null}
          {event.isOwnerUser ? (
            <a
              className="mt-4 inline-flex rounded-full border border-[#1f1b16] px-4 py-2 text-xs font-semibold text-[#1f1b16]"
              href={`/e/${event.publicId}/admin`}
            >
              幹事ページへ
            </a>
          ) : null}
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
        </header>

        {event.scheduleStatus === "CONFIRMED" ? (
          <section className="rounded-3xl border border-[#e6d6c9] bg-white/80 p-6 sm:p-8">
            <h2 className="text-lg font-semibold">出席一覧</h2>
            {event.ownerPaypayId ? (
              <div className="mt-2 space-y-1 text-xs text-[#6b5a4b]">
                <p>
                  PayPay ID:{" "}
                  <span className="font-semibold text-[#4d3f34]">
                    {event.ownerPaypayId}
                  </span>
                </p>
                <p>PayPayで支払う方はこちらのIDに送金してください。</p>
              </div>
            ) : null}
            <div className="mt-4 space-y-4 text-sm">
              {event.rounds.length === 0 ? (
                <p className="text-[#6b5a4b]">
                  回がまだ追加されていません。
                </p>
              ) : (
                event.rounds.map((round) => (
                  <div key={round.id} className="space-y-2">
                    <h3 className="text-sm font-semibold text-[#4d3f34]">
                      {round.name}
                    </h3>
                    {round.attendances.length === 0 ? (
                      <p className="text-xs text-[#6b5a4b]">
                        出席者がまだ確定していません。
                      </p>
                    ) : (
                      round.attendances.map((attendance) => (
                        <div
                          key={attendance.id}
                          className="rounded-2xl border border-[#eadbcf] bg-white px-4 py-2"
                        >
                          <div className="flex items-center justify-between">
                            <span>{attendance.name}</span>
                            <span className="text-xs text-[#7a6453]">
                              {attendance.isActual ? "実出席" : "未確定"}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="mt-6 border-t border-[#eadbcf] pt-4">
              <h3 className="text-sm font-semibold text-[#4d3f34]">支払申請</h3>
              <div className="mt-3 space-y-2 text-xs">
                {attendeeGroups.length === 0 ? (
                  <p className="text-[#6b5a4b]">
                    支払対象の出席者がいません。
                  </p>
                ) : (
                  attendeeGroups
                    .filter((group) =>
                      group.attendances.some((attendance) => attendance.isActual)
                    )
                    .map((group) => {
                      const summary = paymentSummaries.get(group.name);
                      const actualAttendances = group.attendances.filter(
                        (attendance) => attendance.isActual
                      );
                      const canApply = actualAttendances.every(
                        (attendance) =>
                          attendance.roundStatus === "CONFIRMED"
                      );
                      return (
                        <div
                          key={group.name}
                          className="rounded-2xl border border-[#eadbcf] bg-white px-4 py-3"
                        >
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                            <span>{group.name}</span>
                            <span className="text-[11px] text-[#6b5a4b]">
                              {summary
                                ? `合計 ${summary.totalAmount}円 / ${formatPaymentStatus(summary.status)}`
                                : "会計が未確定です。"}
                            </span>
                          </div>
                          {summary ? (
                            <p className="mt-1 text-[11px] text-[#6b5a4b]">
                              {summary.breakdown
                                .map(
                                  (item) => `${item.roundName}: ${item.amount}円`
                                )
                                .join(" / ")}
                            </p>
                          ) : null}
                          {canApply && summary ? (
                            <div className="mt-3 flex flex-wrap items-center gap-3">
                              {summary.status === "UNSUBMITTED" ? (
                                <>
                                  <select
                                    value={paymentMethods[group.name] ?? ""}
                                    onChange={(event) =>
                                      setPaymentMethods((prev) => ({
                                        ...prev,
                                        [group.name]: event.target.value,
                                      }))
                                    }
                                    className="rounded-full border border-[#e2d6c9] px-3 py-1"
                                  >
                                    <option value="">支払方法</option>
                                    <option value="CASH">現金</option>
                                    <option value="PAYPAY">PayPay</option>
                                    <option value="TRANSFER">振込</option>
                                    <option value="OTHER">その他</option>
                                  </select>
                                  <button
                                    onClick={() => applyPayment(group.name)}
                                    disabled={!paymentMethods[group.name]}
                                    className="rounded-full bg-[#1f1b16] px-3 py-1 font-semibold text-white transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
                                  >
                                    {applyingPaymentIds[group.name]
                                      ? "申請中..."
                                      : "申請"}
                                  </button>
                                </>
                              ) : null}
                              {summary.status === "PENDING" ? (
                                <button
                                  onClick={() => cancelPayment(group.name)}
                                  disabled={cancelingPaymentIds[group.name]}
                                  className="rounded-full border border-[#1f1b16] px-3 py-1 font-semibold text-[#1f1b16] transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  {cancelingPaymentIds[group.name]
                                    ? "取消中..."
                                    : "申請取消"}
                                </button>
                              ) : null}
                            </div>
                          ) : (
                            <p className="mt-2 text-[11px] text-[#6b5a4b]">
                              {canApply
                                ? "会計の確定をお待ちください。"
                                : "未確定の回があるため申請できません。"}
                            </p>
                          )}
                        </div>
                      );
                    })
                )}
              </div>
            </div>
          </section>
        ) : null}

        <section className="rounded-3xl border border-[#e6d6c9] bg-white/80 p-6 sm:p-8">
          <h2 className="text-lg font-semibold">日程候補</h2>
          <p className="mt-2 text-xs text-[#6b5a4b]">
            名前をクリックすると投票を編集できます。
          </p>
          <div className="mt-4 overflow-x-auto">
            {sortedCandidates.length === 0 ? (
              <p className="text-sm text-[#6b5a4b]">
                候補日がまだ登録されていません。
              </p>
            ) : (
              <>
                <div className="block sm:hidden">
                  <table className="w-max table-fixed border-separate border-spacing-0 text-xs">
                    <colgroup>
                      <col className="w-[72px]" />
                      {sortedCandidates.map((candidate) => (
                        <col key={candidate.id} className="w-[72px]" />
                      ))}
                      <col className="w-[96px]" />
                    </colgroup>
                    <thead>
                      <tr className="text-[11px] text-[#6b5a4b]">
                        <th className="sticky left-0 z-10 w-[72px] bg-[#f6f1ea] px-2 py-2 text-left">
                          参加者
                        </th>
                        {sortedCandidates.map((candidate) => {
                          const header = formatDateHeaderParts(candidate.startsAt);
                          const responses = sortedVotes.map((vote) => {
                            return (
                              vote.choices.find(
                                (choice) =>
                                  choice.candidateDateId === candidate.id
                              )?.response ?? "NO"
                            );
                          });
                          const countYes = responses.filter(
                            (response) => response === "YES"
                          ).length;
                          const isTop = topYesCount > 0 && countYes === topYesCount;
                          return (
                            <th
                              key={candidate.id}
                              className={`px-2 py-2 text-center font-semibold ${
                                isTop ? "bg-[#eaf4ee] text-[#2f7f3b]" : "text-[#4d3f34]"
                              }`}
                            >
                              <div className="min-w-[72px] whitespace-nowrap">
                                <div>{header.date}</div>
                                <div className="text-[10px] text-[#8a7767]">
                                  {header.time}
                                </div>
                              </div>
                            </th>
                          );
                        })}
                        <th className="px-2 py-2 text-left font-semibold text-[#4d3f34]">
                          コメント
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedVotes.map((vote) => (
                        <tr key={vote.id} className="bg-white">
                          <th className="sticky left-0 z-10 w-[72px] border-b border-[#eadbcf] bg-[#fbf6f1] px-2 py-3 text-left font-semibold text-[#4d3f34]">
                            <button
                              onClick={() => beginEdit(vote)}
                              disabled={event.votingLocked}
                              className="break-words whitespace-normal underline decoration-dotted underline-offset-4 transition hover:text-[#5a4638] disabled:text-[#a78f7f]"
                            >
                              {vote.name}
                            </button>
                          </th>
                          {sortedCandidates.map((candidate) => {
                            const responses = sortedVotes.map((entry) => {
                              return (
                                entry.choices.find(
                                  (choice) =>
                                    choice.candidateDateId === candidate.id
                                )?.response ?? "NO"
                              );
                            });
                            const countYes = responses.filter(
                              (response) => response === "YES"
                            ).length;
                            const isTop = topYesCount > 0 && countYes === topYesCount;
                            const response =
                              vote.choices.find(
                                (choice) =>
                                  choice.candidateDateId === candidate.id
                              )?.response ?? "NO";
                            return (
                              <td
                                key={`${vote.id}-${candidate.id}`}
                                className={`border-b border-[#eadbcf] px-2 py-3 text-center ${
                                  response === "YES"
                                    ? "font-extrabold text-[#2f7f3b]"
                                    : "font-semibold text-[#1f1b16]"
                                } ${isTop ? "bg-[#eaf4ee]" : ""}`}
                              >
                                {responseLabels[response]}
                              </td>
                            );
                          })}
                          <td className="border-b border-[#eadbcf] px-2 py-3 text-left text-[11px] text-[#6b5a4b]">
                            {vote.comment ?? ""}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="hidden sm:block">
                  <table className="min-w-[640px] w-full border-separate border-spacing-0 text-sm">
                    <thead>
                      <tr className="text-xs text-[#6b5a4b]">
                        <th className="sticky left-0 z-10 bg-[#f6f1ea] px-3 py-2 text-left">
                          日程
                        </th>
                        <th className="px-3 py-2 text-center">◯</th>
                        <th className="px-3 py-2 text-center">△</th>
                        <th className="px-3 py-2 text-center">✕</th>
                        {sortedVotes.map((vote) => (
                          <th key={vote.id} className="px-3 py-2 text-center">
                            <button
                              onClick={() => beginEdit(vote)}
                              disabled={event.votingLocked}
                              className="font-semibold text-[#1f1b16] underline decoration-dotted underline-offset-4 transition hover:text-[#5a4638] disabled:text-[#a78f7f]"
                            >
                              {vote.name}
                            </button>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {sortedCandidates.map((candidate) => {
                        const responses = sortedVotes.map((vote) => {
                          return (
                            vote.choices.find(
                              (choice) =>
                                choice.candidateDateId === candidate.id
                            )?.response ?? "NO"
                          );
                        });
                        const countYes = responses.filter((r) => r === "YES").length;
                        const countMaybe = responses.filter((r) => r === "MAYBE").length;
                        const countNo = responses.filter((r) => r === "NO").length;
                        const isConfirmed =
                          event.scheduleStatus === "CONFIRMED" &&
                          event.confirmedCandidateDateId === candidate.id;
                        const isTop =
                          topYesCount > 0 && countYes === topYesCount;
                        return (
                          <tr
                            key={candidate.id}
                            className={
                              isConfirmed
                                ? "bg-[#e8f5ea]"
                                : isTop
                              ? "bg-[#eaf4ee]"
                                : "bg-white"
                            }
                          >
                            <td className="sticky left-0 z-10 border-b border-[#eadbcf] bg-[#fbf6f1] px-3 py-3 font-semibold text-[#4d3f34]">
                              <div className="flex items-center justify-between gap-2">
                                <span>{formatShortDateTime(candidate.startsAt)}</span>
                                {isConfirmed ? (
                                  <span className="rounded-full bg-[#5fa85a] px-2 py-0.5 text-[10px] text-white">
                                    確定
                                  </span>
                                ) : null}
                              </div>
                            </td>
                            <td className="border-b border-[#eadbcf] px-3 py-3 text-center">
                              {countYes}
                            </td>
                            <td className="border-b border-[#eadbcf] px-3 py-3 text-center">
                              {countMaybe}
                            </td>
                            <td className="border-b border-[#eadbcf] px-3 py-3 text-center">
                              {countNo}
                            </td>
                        {responses.map((response, index) => (
                          <td
                            key={`${candidate.id}-${index}`}
                            className={`border-b border-[#eadbcf] px-3 py-3 text-center text-sm ${
                              response === "YES"
                                ? "font-extrabold text-[#2f7f3b]"
                                : "font-semibold text-[#1f1b16]"
                            }`}
                          >
                            {responseLabels[response]}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                      <tr className="bg-white">
                        <th className="sticky left-0 z-10 border-b border-[#eadbcf] bg-[#fbf6f1] px-3 py-3 text-left font-semibold text-[#4d3f34]">
                          コメント
                        </th>
                        <td className="border-b border-[#eadbcf] px-3 py-3 text-center text-sm text-[#6b5a4b]">
                          -
                        </td>
                        <td className="border-b border-[#eadbcf] px-3 py-3 text-center text-sm text-[#6b5a4b]">
                          -
                        </td>
                        <td className="border-b border-[#eadbcf] px-3 py-3 text-center text-sm text-[#6b5a4b]">
                          -
                        </td>
                        {sortedVotes.map((vote) => (
                          <td
                            key={`comment-${vote.id}`}
                            className="border-b border-[#eadbcf] px-3 py-3 text-center text-xs text-[#6b5a4b]"
                          >
                            {vote.comment ?? ""}
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
          {sortedVotes.length === 0 ? (
            <p className="mt-3 text-xs text-[#6b5a4b]">
              まだ投票がありません。
            </p>
          ) : null}
        </section>

        <section
          ref={formRef}
          className="rounded-3xl border border-[#e6d6c9] bg-white/80 p-6 sm:p-8"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">投票する</h2>
          </div>
          <div className="mt-4 flex justify-center">
            <button
              type="button"
              onClick={() => setShowForm((prev) => !prev)}
              disabled={event.votingLocked}
              aria-label={showForm ? "投票フォームを閉じる" : "投票フォームを開く"}
              className="flex h-10 w-48 items-center justify-center gap-2 rounded-full border border-[#cdbfb2] bg-[#f5efe8] text-[#4e4237] shadow-sm transition hover:bg-[#efe5db] disabled:opacity-60"
            >
              <span className="text-xs font-semibold tracking-wide">
                {showForm ? "閉じる" : "投票する"}
              </span>
              <span className="text-base leading-none">
                {showForm ? "▴" : "▾"}
              </span>
            </button>
          </div>
          {showForm ? (
            <form onSubmit={submitVote} className="mt-4 space-y-4 text-sm">
            <div>
              <label className="text-xs font-medium">名前</label>
              <input
                value={formName}
                onChange={(event) => setFormName(event.target.value)}
                required
                disabled={event.votingLocked}
                className="mt-2 w-full rounded-xl border border-[#e2d6c9] bg-white px-4 py-3 text-sm outline-none transition focus:border-[#c08b65] disabled:bg-[#f2ebe4]"
              />
            </div>
            <div>
              <label className="text-xs font-medium">コメント（任意）</label>
              <textarea
                value={formComment}
                onChange={(event) => setFormComment(event.target.value)}
                rows={2}
                disabled={event.votingLocked}
                className="mt-2 w-full rounded-xl border border-[#e2d6c9] bg-white px-4 py-3 text-sm outline-none transition focus:border-[#c08b65] disabled:bg-[#f2ebe4]"
              />
            </div>
            <div className="space-y-3">
              {event.candidateDates.map((candidate) => (
                <div
                  key={candidate.id}
                  className="flex flex-col items-start gap-3 rounded-2xl border border-[#eadbcf] bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="text-xs">
                    {formatShortDateTime(candidate.startsAt)}
                  </div>
                  <div className="flex gap-2">
                    {(["YES", "MAYBE", "NO"] as const).map((value) => {
                      const selected = choices[candidate.id] === value;
                      const baseClasses =
                        "flex h-9 w-9 items-center justify-center rounded-full border text-xs font-semibold transition";
                        const styleMap: Record<typeof value, string> = {
                          YES: selected
                            ? "border-[#5fa85a] bg-[#5fa85a] text-white"
                            : "border-[#d9d9d9] bg-white text-[#c3c3c3]",
                          MAYBE: selected
                            ? "border-[#b9b06a] bg-[#b9b06a] text-white"
                            : "border-[#d9d9d9] bg-white text-[#c3c3c3]",
                          NO: selected
                            ? "border-[#d14c4c] bg-[#d14c4c] text-white"
                            : "border-[#d9d9d9] bg-white text-[#c3c3c3]",
                        };
                      return (
                        <label
                          key={value}
                          className={`${baseClasses} ${styleMap[value]}`}
                        >
                          <input
                            type="radio"
                            name={`choice-${candidate.id}`}
                            value={value}
                            checked={selected}
                            onChange={() =>
                              setChoices((prev) => ({
                                ...prev,
                                [candidate.id]: value,
                              }))
                            }
                            disabled={event.votingLocked}
                            className="sr-only"
                          />
                          {responseLabels[value]}
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            {error ? <p className="text-xs text-red-600">{error}</p> : null}
            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={event.votingLocked}
                className="rounded-full bg-[#1f1b16] px-6 py-2 text-xs font-semibold text-white transition hover:bg-[#3a312a] disabled:opacity-60"
              >
                {editingVoteId ? "更新する" : "投票を送信"}
              </button>
              {editingVoteId ? (
                <>
                  <button
                    type="button"
                    onClick={() => deleteVote(editingVoteId)}
                    className="rounded-full border border-[#a34c3d] px-6 py-2 text-xs font-semibold text-[#a34c3d]"
                  >
                    削除
                  </button>
                  <button
                    type="button"
                    onClick={resetForm}
                    className="rounded-full border border-[#1f1b16] px-6 py-2 text-xs font-semibold text-[#1f1b16]"
                  >
                    キャンセル
                  </button>
                </>
              ) : null}
            </div>
          </form>
          ) : null}
        </section>

      </div>
    </main>
  );
}
