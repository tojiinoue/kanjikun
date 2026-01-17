"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { formatAreaLabel, PREFECTURES } from "@/lib/area-options";

type CandidateDate = {
  id: string;
  startsAt: string;
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

type PaymentSummary = {
  name: string;
  totalAmount: number;
  status: Payment["status"];
  method: Payment["method"];
  breakdown: Array<{ roundName: string; amount: number; roundOrder: number }>;
  paymentId: string;
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
  totalAmount?: number | null;
  perPersonAmount?: number | null;
  candidateDates: CandidateDate[];
  votes: { id: string }[];
  rounds: EventRound[];
};

type Props = {
  publicId: string;
};

function toIsoFromLocal(value: string) {
  const [datePart, timePart] = value.split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  const [hour, minute] = timePart.split(":").map(Number);
  return new Date(year, month - 1, day, hour || 0, minute || 0).toISOString();
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
  const router = useRouter();
  const [event, setEvent] = useState<EventResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clientId, setClientId] = useState("");
  const [selectedCandidateId, setSelectedCandidateId] = useState("");
  const [selectedRoundId, setSelectedRoundId] = useState("");
  const [newAttendanceName, setNewAttendanceName] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [adjustments, setAdjustments] = useState<Record<string, string>>({});
  const [isEditingEvent, setIsEditingEvent] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [draftMemo, setDraftMemo] = useState("");
  const [draftShopSchedule, setDraftShopSchedule] = useState("");
  const [draftShopName, setDraftShopName] = useState("");
  const [draftShopUrl, setDraftShopUrl] = useState("");
  const [draftCourseName, setDraftCourseName] = useState("");
  const [draftCourseUrl, setDraftCourseUrl] = useState("");
  const [draftShopAddress, setDraftShopAddress] = useState("");
  const [draftShopPrice, setDraftShopPrice] = useState("");
  const [draftAreaPrefCode, setDraftAreaPrefCode] = useState("");
  const [draftMunicipalityName, setDraftMunicipalityName] = useState("");
  const [municipalityQuery, setMunicipalityQuery] = useState("");
  const [municipalityOptions, setMunicipalityOptions] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [municipalityLoading, setMunicipalityLoading] = useState(false);
  const [municipalityOpen, setMunicipalityOpen] = useState(false);
  const [municipalityOffset, setMunicipalityOffset] = useState(0);
  const [municipalityHasMore, setMunicipalityHasMore] = useState(false);
  const municipalityCache = useMemo(
    () =>
      new Map<
        string,
        { items: Array<{ id: string; name: string }>; nextOffset: number | null }
      >(),
    []
  );
  const [prefectureQuery, setPrefectureQuery] = useState("");
  const [prefectureOpen, setPrefectureOpen] = useState(false);
  const [eventEditError, setEventEditError] = useState<string | null>(null);
  const [candidateDrafts, setCandidateDrafts] = useState<
    Array<{ id?: string; startsAt: string }>
  >([]);
  const [candidateError, setCandidateError] = useState<string | null>(null);
  const [savingCandidates, setSavingCandidates] = useState(false);
  const [accountingError, setAccountingError] = useState<string | null>(null);
  const [accountingSaving, setAccountingSaving] = useState(false);
  const [bulkInput, setBulkInput] = useState("");
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());
  const [timeValue, setTimeValue] = useState("19:00");
  const [showCandidateEditor, setShowCandidateEditor] = useState(false);
  const [copied, setCopied] = useState(false);
  const [shopCopied, setShopCopied] = useState(false);
  const [scheduleQuery, setScheduleQuery] = useState("");
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [approvingPaymentIds, setApprovingPaymentIds] = useState<
    Record<string, boolean>
  >({});
  const [rejectingPaymentIds, setRejectingPaymentIds] = useState<
    Record<string, boolean>
  >({});
  const [unapprovingPaymentIds, setUnapprovingPaymentIds] = useState<
    Record<string, boolean>
  >({});
  const [deletingEvent, setDeletingEvent] = useState(false);
  const [addingRound, setAddingRound] = useState(false);
  const [deletingRoundIds, setDeletingRoundIds] = useState<
    Record<string, boolean>
  >({});
  const [updatingAttendanceIds, setUpdatingAttendanceIds] = useState<
    Record<string, boolean>
  >({});

  useEffect(() => {
    setClientId(getOrCreateClientId());
  }, []);

  function formatDateTimeLocal(value: string) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return "";
    }
    const pad = (num: number) => num.toString().padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
      date.getDate()
    )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  function formatCandidateLabel(candidate: CandidateDate) {
    const date = new Date(candidate.startsAt);
    return date.toLocaleString("ja-JP", {
      month: "numeric",
      day: "numeric",
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
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
    if (
      !selectedRoundId ||
      !data.rounds.some((round) => round.id === selectedRoundId)
    ) {
      setSelectedRoundId(data.rounds[0]?.id ?? "");
    }
    if (!isEditingEvent) {
      setDraftName(data.name);
      setDraftMemo(data.memo ?? "");
      setDraftShopSchedule(
        data.shopSchedule ? formatDateTimeLocal(data.shopSchedule) : ""
      );
      setDraftShopName(data.shopName ?? "");
      setDraftShopUrl(data.shopUrl ?? "");
      setDraftCourseName(data.courseName ?? "");
      setDraftCourseUrl(data.courseUrl ?? "");
      setDraftShopAddress(data.shopAddress ?? "");
      setDraftShopPrice(data.shopPrice ?? "");
      setDraftAreaPrefCode(data.areaPrefCode ?? "");
      setDraftMunicipalityName(data.areaMunicipalityName ?? "");
      setMunicipalityQuery(data.areaMunicipalityName ?? "");
      setPrefectureQuery(
        PREFECTURES.find((pref) => pref.code === data.areaPrefCode)?.name ?? ""
      );
    }
    setSelectedCandidateId(data.confirmedCandidateDateId ?? "");
    if (data.confirmedCandidateDateId) {
      const matched = data.candidateDates.find(
        (candidate) => candidate.id === data.confirmedCandidateDateId
      );
      setScheduleQuery(matched ? formatCandidateLabel(matched) : "");
    } else {
      setScheduleQuery("");
    }
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

  const selectedRound = useMemo(
    () => event?.rounds.find((round) => round.id === selectedRoundId) ?? null,
    [event, selectedRoundId]
  );
  const actualAttendances = useMemo(
    () =>
      (selectedRound?.attendances ?? []).filter(
        (attendance) => attendance.isActual
      ),
    [selectedRound]
  );
  const paymentSummaries: PaymentSummary[] = useMemo(() => {
    if (!event) return [];
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
        name: string;
        totalAmount: number;
        statuses: Payment["status"][];
        methods: Payment["method"][];
        breakdown: Array<{ roundName: string; amount: number; roundOrder: number }>;
        paymentIds: string[];
      }
    >();

    event.rounds.forEach((round) => {
      round.payments.forEach((payment) => {
        const meta = attendanceMeta.get(payment.attendanceId);
        if (!meta) return;
        const existing =
          summaries.get(meta.name) ??
          {
            name: meta.name,
            totalAmount: 0,
            statuses: [],
            methods: [],
            breakdown: [],
            paymentIds: [],
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
        existing.paymentIds.push(payment.id);
        summaries.set(meta.name, existing);
      });
    });

    return Array.from(summaries.values()).map((summary) => {
      const status: Payment["status"] = summary.statuses.includes("APPROVED")
        ? "APPROVED"
        : summary.statuses.includes("PENDING")
          ? "PENDING"
          : "UNSUBMITTED";
      const method: Payment["method"] = summary.methods[0] ?? null;
      const breakdown = [...summary.breakdown].sort(
        (a, b) => a.roundOrder - b.roundOrder
      );
      return {
        name: summary.name,
        totalAmount: summary.totalAmount,
        status,
        method,
        breakdown,
        paymentId: summary.paymentIds[0],
      };
    });
  }, [event]);

  useEffect(() => {
    if (!publicId) {
      setError("イベントIDが取得できませんでした。");
      setLoading(false);
      return;
    }
    void loadEvent();
  }, [publicId]);

  useEffect(() => {
    if (!selectedRound) {
      setTotalAmount("");
      setAdjustments({});
      return;
    }
    setTotalAmount(
      typeof selectedRound.totalAmount === "number"
        ? String(selectedRound.totalAmount)
        : ""
    );
    setAdjustments({});
  }, [selectedRound?.id]);

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
        shopSchedule: draftShopSchedule
          ? toIsoFromLocal(draftShopSchedule)
          : null,
        shopName: draftShopName,
        shopUrl: draftShopUrl,
        courseName: draftCourseName,
        courseUrl: draftCourseUrl,
        shopAddress: draftShopAddress,
        shopPrice: draftShopPrice,
        areaPrefCode: draftAreaPrefCode || null,
        areaMunicipalityName: draftMunicipalityName || null,
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

  async function addRound() {
    if (addingRound) return;
    setAddingRound(true);
    const response = await fetch(`/api/events/${publicId}/rounds`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ownerClientId: clientId }),
    });
    if (!response.ok) {
      setError("回の追加に失敗しました。");
      setAddingRound(false);
      return;
    }
    const payload = (await response.json()) as { round?: { id: string } };
    await loadEvent(true);
    if (payload.round?.id) {
      setSelectedRoundId(payload.round.id);
    }
    setAddingRound(false);
  }

  async function deleteRound(roundId: string) {
    if (deletingRoundIds[roundId]) {
      return;
    }
    const ok = window.confirm(
      "この回を削除しますか？出席と支払の情報も削除され、回の番号が詰め直されます。"
    );
    if (!ok) return;
    setDeletingRoundIds((prev) => ({ ...prev, [roundId]: true }));
    const response = await fetch(`/api/events/${publicId}/rounds/${roundId}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ownerClientId: clientId }),
    });
    if (!response.ok) {
      setError("回の削除に失敗しました。");
      setDeletingRoundIds((prev) => ({ ...prev, [roundId]: false }));
      return;
    }
    await loadEvent(true);
    setDeletingRoundIds((prev) => ({ ...prev, [roundId]: false }));
  }

  function cancelEventEdit() {
    if (!event) {
      setIsEditingEvent(false);
      return;
    }
    setDraftName(event.name);
    setDraftMemo(event.memo ?? "");
    setDraftShopSchedule(
      event.shopSchedule ? formatDateTimeLocal(event.shopSchedule) : ""
    );
    setDraftShopName(event.shopName ?? "");
    setDraftShopUrl(event.shopUrl ?? "");
    setDraftCourseName(event.courseName ?? "");
    setDraftCourseUrl(event.courseUrl ?? "");
    setDraftShopAddress(event.shopAddress ?? "");
    setDraftShopPrice(event.shopPrice ?? "");
    setDraftAreaPrefCode(event.areaPrefCode ?? "");
    setDraftMunicipalityName(event.areaMunicipalityName ?? "");
    setMunicipalityQuery(event.areaMunicipalityName ?? "");
    setPrefectureQuery(
      PREFECTURES.find((pref) => pref.code === event.areaPrefCode)?.name ?? ""
    );
    setMunicipalityOffset(0);
    setMunicipalityHasMore(false);
    setEventEditError(null);
    setIsEditingEvent(false);
  }

  useEffect(() => {
    if (!draftAreaPrefCode) {
      setMunicipalityOptions([]);
      setMunicipalityOffset(0);
      setMunicipalityHasMore(false);
      return;
    }
    const cacheKey = `${draftAreaPrefCode}::${municipalityQuery}`;
    if (municipalityCache.has(cacheKey)) {
      const cached = municipalityCache.get(cacheKey);
      setMunicipalityOptions(cached?.items ?? []);
      setMunicipalityOffset(cached?.nextOffset ?? 0);
      setMunicipalityHasMore(cached?.nextOffset !== null);
      return;
    }
    setMunicipalityLoading(true);
    const handle = window.setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/municipalities?pref=${draftAreaPrefCode}&q=${encodeURIComponent(
            municipalityQuery
          )}&limit=30&offset=0`
        );
        if (!response.ok) {
          setMunicipalityOptions([]);
          setMunicipalityOffset(0);
          setMunicipalityHasMore(false);
          return;
        }
        const data = (await response.json()) as {
          municipalities: Array<{ id: string; name: string }>;
          nextOffset: number | null;
        };
        municipalityCache.set(cacheKey, {
          items: data.municipalities,
          nextOffset: data.nextOffset,
        });
        setMunicipalityOptions(data.municipalities);
        setMunicipalityOffset(data.nextOffset ?? 0);
        setMunicipalityHasMore(data.nextOffset !== null);
      } finally {
        setMunicipalityLoading(false);
      }
    }, 300);
    return () => window.clearTimeout(handle);
  }, [draftAreaPrefCode, municipalityQuery, municipalityCache]);

  const filteredPrefectures = useMemo(() => {
    const query = prefectureQuery.trim();
    if (!query) return PREFECTURES;
    return PREFECTURES.filter((pref) => pref.name.includes(query));
  }, [prefectureQuery]);

  function selectPrefecture(prefCode: string, prefName: string) {
    setDraftAreaPrefCode(prefCode);
    setPrefectureQuery(prefName);
    setPrefectureOpen(false);
    setDraftMunicipalityName("");
    setMunicipalityQuery("");
    setMunicipalityOptions([]);
    setMunicipalityOffset(0);
    setMunicipalityHasMore(false);
    setMunicipalityOpen(true);
  }

  async function loadMoreMunicipalities() {
    if (municipalityLoading || !municipalityHasMore) return;
    setMunicipalityLoading(true);
    try {
      const response = await fetch(
        `/api/municipalities?pref=${draftAreaPrefCode}&q=${encodeURIComponent(
          municipalityQuery
        )}&limit=30&offset=${municipalityOffset}`
      );
      if (!response.ok) {
        setMunicipalityHasMore(false);
        return;
      }
      const data = (await response.json()) as {
        municipalities: Array<{ id: string; name: string }>;
        nextOffset: number | null;
      };
      setMunicipalityOptions((prev) => [...prev, ...data.municipalities]);
      setMunicipalityOffset(data.nextOffset ?? municipalityOffset);
      setMunicipalityHasMore(data.nextOffset !== null);
    } finally {
      setMunicipalityLoading(false);
    }
  }

  function handleMunicipalityScroll(
    event: React.UIEvent<HTMLUListElement>
  ) {
    const { scrollTop, clientHeight, scrollHeight } = event.currentTarget;
    if (scrollHeight - scrollTop - clientHeight < 24) {
      void loadMoreMunicipalities();
    }
  }

  const scheduleConfirmed = event?.scheduleStatus === "CONFIRMED";
  const accountingConfirmed = selectedRound?.accountingStatus === "CONFIRMED";
  const shopDetails = event
    ? [
        event.shopSchedule ? `日程: ${formatShopScheduleDisplay(event.shopSchedule)}` : null,
        event.shopName ? `店名: ${event.shopName}` : null,
        event.shopAddress ? `住所: ${event.shopAddress}` : null,
        event.shopUrl ? `店舗リンク: ${event.shopUrl}` : null,
        event.courseName ? `コース: ${event.courseName}` : null,
        event.courseUrl ? `コースリンク: ${event.courseUrl}` : null,
        event.shopPrice ? `料金: ${event.shopPrice}` : null,
      ].filter(Boolean)
    : [];
  const filteredScheduleCandidates = useMemo(() => {
    if (!event) return [];
    const query = scheduleQuery.trim();
    if (!query) return event.candidateDates;
    return event.candidateDates.filter((candidate) =>
      formatCandidateLabel(candidate).includes(query)
    );
  }, [event, scheduleQuery]);

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
    if (savingCandidates) return;
    setCandidateError(null);
    setSavingCandidates(true);
    const candidates = candidateDrafts.filter((candidate) => candidate.startsAt);
    if (candidates.length === 0) {
      setCandidateError("候補日を1つ以上入力してください。");
      setSavingCandidates(false);
      return;
    }
    const response = await fetch(`/api/events/${publicId}/candidates`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        candidates: candidates.map((candidate) => ({
          id: candidate.id,
          startsAt: toIsoFromLocal(candidate.startsAt),
        })),
        ownerClientId: clientId,
      }),
    });
    if (!response.ok) {
      let message = "候補日の保存に失敗しました。";
      try {
        const payload = (await response.json()) as { error?: string };
        if (payload.error === "Forbidden") {
          message = "権限がないため候補日を保存できません。";
        } else if (payload.error === "Schedule locked") {
          message = "日程確定後は候補日を編集できません。";
        } else if (payload.error === "Invalid input") {
          message = "候補日を1つ以上入力してください。";
        }
      } catch {
        // JSONでない場合は既定メッセージ
      }
      setCandidateError(message);
      setSavingCandidates(false);
      return;
    }
    setSavingCandidates(false);
    setShowCandidateEditor(false);
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
    setShowCandidateEditor(false);
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
    if (updatingAttendanceIds[attendanceId]) {
      return;
    }
    const previous = event;
    if (event) {
      setEvent({
        ...event,
        rounds: event.rounds.map((round) => ({
          ...round,
          attendances: round.attendances.map((attendance) =>
            attendance.id === attendanceId
              ? { ...attendance, isActual }
              : attendance
          ),
        })),
      });
    }
    setUpdatingAttendanceIds((prev) => ({ ...prev, [attendanceId]: true }));
    const response = await fetch(`/api/events/${publicId}/attendance`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        updates: [{ id: attendanceId, isActual }],
        roundId: selectedRoundId,
        ownerClientId: clientId,
      }),
    });
    if (!response.ok) {
      setError("出席の更新に失敗しました。");
      if (previous) {
        setEvent(previous);
      }
      setUpdatingAttendanceIds((prev) => ({ ...prev, [attendanceId]: false }));
      return;
    }
    await loadEvent(true);
    setUpdatingAttendanceIds((prev) => ({ ...prev, [attendanceId]: false }));
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
        roundId: selectedRoundId,
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
    if (!selectedRoundId) {
      return;
    }
    if (accountingSaving) {
      return;
    }
    const amount = Number(totalAmount);
    if (!amount) return;
    setAccountingError(null);
    setAccountingSaving(true);
    const response = await fetch(`/api/events/${publicId}/accounting`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        totalAmount: amount,
        adjustments: Object.entries(adjustments).map(([attendanceId, value]) => ({
          attendanceId,
          amount: Number(value),
        })),
        roundId: selectedRoundId,
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
      setAccountingSaving(false);
      return;
    }
    setAccountingError(null);
    await loadEvent(true);
    setAccountingSaving(false);
  }

  async function cancelAccounting() {
    if (!selectedRoundId) {
      return;
    }
    const ok = window.confirm(
      "会計確定を取り消すと支払情報がリセットされます。続行しますか？"
    );
    if (!ok) return;
    if (accountingSaving) {
      return;
    }
    setAccountingSaving(true);
    const response = await fetch(`/api/events/${publicId}/accounting`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ownerClientId: clientId, roundId: selectedRoundId }),
    });
    if (!response.ok) {
      setError("会計の取り消しに失敗しました。");
      setAccountingSaving(false);
      return;
    }
    await loadEvent(true);
    setAccountingSaving(false);
  }

  async function approvePayment(paymentId: string) {
    setApprovingPaymentIds((prev) => ({ ...prev, [paymentId]: true }));
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
      setApprovingPaymentIds((prev) => ({ ...prev, [paymentId]: false }));
      return;
    }
    await loadEvent(true);
    setApprovingPaymentIds((prev) => ({ ...prev, [paymentId]: false }));
  }

  async function rejectPayment(paymentId: string) {
    setRejectingPaymentIds((prev) => ({ ...prev, [paymentId]: true }));
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
      setRejectingPaymentIds((prev) => ({ ...prev, [paymentId]: false }));
      return;
    }
    await loadEvent(true);
    setRejectingPaymentIds((prev) => ({ ...prev, [paymentId]: false }));
  }

  async function unapprovePayment(paymentId: string) {
    const ok = window.confirm("承認を取り消しますか？");
    if (!ok) return;
    setUnapprovingPaymentIds((prev) => ({ ...prev, [paymentId]: true }));
    const response = await fetch(
      `/api/events/${publicId}/payments/${paymentId}/unapprove`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ownerClientId: clientId }),
      }
    );
    if (!response.ok) {
      setError("承認の取り消しに失敗しました。");
      setUnapprovingPaymentIds((prev) => ({ ...prev, [paymentId]: false }));
      return;
    }
    await loadEvent(true);
    setUnapprovingPaymentIds((prev) => ({ ...prev, [paymentId]: false }));
  }

  async function deleteEvent() {
    const ok = window.confirm(
      "イベントを削除しますか？関連データもすべて削除されます。"
    );
    if (!ok) return;

    setDeletingEvent(true);
    const response = await fetch(`/api/events/${publicId}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      setError("イベントの削除に失敗しました。");
      setDeletingEvent(false);
      return;
    }
    router.replace("/mypage");
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
                  エリア（任意）
                </label>
                <div className="mt-3 rounded-2xl border border-[#eadbcf] bg-white/80 p-4">
                  <p className="text-xs text-[#6b5a4b]">
                    都道府県を選択すると市区町村の検索ができます。
                  </p>
                  <div className="mt-3 grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="text-xs font-semibold text-[#6b5a4b]">
                        都道府県
                      </label>
                      <div className="relative mt-2">
                        <input
                          value={prefectureQuery}
                          onChange={(eventInput) => {
                            setPrefectureQuery(eventInput.target.value);
                            if (!prefectureOpen) {
                              setPrefectureOpen(true);
                            }
                          }}
                          onFocus={() => setPrefectureOpen(true)}
                          onBlur={() => {
                            window.setTimeout(() => setPrefectureOpen(false), 150);
                          }}
                          placeholder="都道府県を検索"
                          className="w-full rounded-xl border border-[#e2d6c9] bg-white px-3 py-2 text-sm shadow-sm"
                        />
                        {prefectureOpen ? (
                          <div className="absolute z-10 mt-2 w-full rounded-xl border border-[#eadbcf] bg-white p-2 text-xs shadow-lg">
                            {filteredPrefectures.length === 0 ? (
                              <p className="px-2 py-2 text-[#6b5a4b]">
                                該当なし
                              </p>
                            ) : (
                              <ul className="max-h-48 overflow-y-auto">
                                {filteredPrefectures.map((prefecture) => (
                                  <li key={prefecture.code}>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        selectPrefecture(
                                          prefecture.code,
                                          prefecture.name
                                        )
                                      }
                                      className="w-full rounded-lg px-2 py-2 text-left text-[#4d3f34] hover:bg-[#f3e8dd]"
                                    >
                                      {prefecture.name}
                                    </button>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        ) : null}
                        {draftAreaPrefCode ? (
                          <p className="mt-2 text-[11px] text-[#6b5a4b]">
                            選択中:{" "}
                            {PREFECTURES.find(
                              (pref) => pref.code === draftAreaPrefCode
                            )?.name ?? ""}
                          </p>
                        ) : null}
                      </div>
                    </div>
                    <div className="relative">
                      <label className="text-xs font-semibold text-[#6b5a4b]">
                        市区町村
                      </label>
                      <input
                        value={municipalityQuery}
                        onChange={(eventInput) => {
                          setMunicipalityQuery(eventInput.target.value);
                          setDraftMunicipalityName("");
                          if (!municipalityOpen) {
                            setMunicipalityOpen(true);
                          }
                        }}
                        onFocus={() => setMunicipalityOpen(true)}
                        onBlur={() => {
                          window.setTimeout(() => setMunicipalityOpen(false), 150);
                        }}
                        placeholder={
                          draftAreaPrefCode
                            ? "市区町村を検索"
                            : "都道府県を先に選択"
                        }
                        disabled={!draftAreaPrefCode}
                        className="mt-2 w-full rounded-xl border border-[#e2d6c9] bg-white px-3 py-2 text-sm shadow-sm disabled:bg-[#f2ebe4]"
                      />
                      {municipalityOpen && draftAreaPrefCode ? (
                        <div className="absolute z-10 mt-2 w-full rounded-xl border border-[#eadbcf] bg-white p-2 text-xs shadow-lg">
                        {municipalityOptions.length === 0 ? (
                          <p className="px-2 py-2 text-[#6b5a4b]">
                            {municipalityLoading ? "読み込み中..." : "該当なし"}
                          </p>
                        ) : (
                          <ul
                            className="max-h-48 overflow-y-auto"
                            onScroll={handleMunicipalityScroll}
                          >
                            {municipalityOptions.map((option) => (
                              <li key={option.id}>
                                <button
                                  type="button"
                                  onClick={() => {
                                      setDraftMunicipalityName(option.name);
                                      setMunicipalityQuery(option.name);
                                      setMunicipalityOpen(false);
                                    }}
                                  className="w-full rounded-lg px-2 py-2 text-left text-[#4d3f34] hover:bg-[#f3e8dd]"
                                >
                                  {option.name}
                                </button>
                              </li>
                            ))}
                            {municipalityHasMore || municipalityLoading ? (
                              <li className="px-2 py-2 text-center text-[11px] text-[#6b5a4b]">
                                {municipalityLoading
                                  ? "読み込み中..."
                                  : "さらに読み込み"}
                              </li>
                            ) : null}
                          </ul>
                        )}
                      </div>
                    ) : null}
                      {draftMunicipalityName ? (
                        <p className="mt-2 text-[11px] text-[#6b5a4b]">
                          選択中: {draftMunicipalityName}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </div>
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
              <div className="space-y-4 rounded-2xl border border-[#eadbcf] bg-white/80 p-4 text-sm">
                <p className="text-xs font-semibold text-[#6b5a4b]">
                  予約情報（任意）
                </p>
                <div>
                  <label className="text-xs font-semibold text-[#6b5a4b]">
                    日程
                  </label>
                  <input
                    type="datetime-local"
                    value={draftShopSchedule}
                    onChange={(eventInput) =>
                      setDraftShopSchedule(eventInput.target.value)
                    }
                    maxLength={80}
                    className="mt-2 w-full rounded-xl border border-[#e2d6c9] bg-white px-4 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#6b5a4b]">
                    店名
                  </label>
                  <input
                    value={draftShopName}
                    onChange={(eventInput) =>
                      setDraftShopName(eventInput.target.value)
                    }
                    placeholder="店名を入力"
                    maxLength={80}
                    className="mt-2 w-full rounded-xl border border-[#e2d6c9] bg-white px-4 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#6b5a4b]">
                    住所
                  </label>
                  <input
                    value={draftShopAddress}
                    onChange={(eventInput) =>
                      setDraftShopAddress(eventInput.target.value)
                    }
                    placeholder="住所を入力"
                    maxLength={120}
                    className="mt-2 w-full rounded-xl border border-[#e2d6c9] bg-white px-4 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#6b5a4b]">
                    店舗リンク
                  </label>
                  <input
                    value={draftShopUrl}
                    onChange={(eventInput) =>
                      setDraftShopUrl(eventInput.target.value)
                    }
                    placeholder="https://..."
                    maxLength={200}
                    className="mt-2 w-full rounded-xl border border-[#e2d6c9] bg-white px-4 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#6b5a4b]">
                    コース
                  </label>
                  <input
                    value={draftCourseName}
                    onChange={(eventInput) =>
                      setDraftCourseName(eventInput.target.value)
                    }
                    placeholder="コース名を入力"
                    maxLength={80}
                    className="mt-2 w-full rounded-xl border border-[#e2d6c9] bg-white px-4 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#6b5a4b]">
                    コースリンク
                  </label>
                  <input
                    value={draftCourseUrl}
                    onChange={(eventInput) =>
                      setDraftCourseUrl(eventInput.target.value)
                    }
                    placeholder="https://..."
                    maxLength={200}
                    className="mt-2 w-full rounded-xl border border-[#e2d6c9] bg-white px-4 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#6b5a4b]">
                    料金
                  </label>
                  <input
                    value={draftShopPrice}
                    onChange={(eventInput) =>
                      setDraftShopPrice(eventInput.target.value)
                    }
                    placeholder="例: 5,000円"
                    maxLength={40}
                    className="mt-2 w-full rounded-xl border border-[#e2d6c9] bg-white px-4 py-2 text-sm"
                  />
                </div>
              </div>
              {eventEditError ? (
                <p className="text-xs text-red-600">{eventEditError}</p>
              ) : null}
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={saveEventDetails}
                  className="rounded-full bg-[#1f1b16] px-4 py-2 text-xs font-semibold text-white transition active:scale-95"
                >
                  変更を保存
                </button>
                <button
                  type="button"
                  onClick={cancelEventEdit}
                  className="rounded-full border border-[#1f1b16] px-4 py-2 text-xs font-semibold text-[#1f1b16] transition active:scale-95"
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
              <div className="mt-2 space-y-2 text-sm text-[#6b5a4b]">
                {formatAreaLabel(
                  event.areaPrefCode,
                  event.areaMunicipalityName
                ) ? (
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
              {(event.shopSchedule ||
                event.shopName ||
                event.shopAddress ||
                event.shopUrl ||
                event.courseName ||
                event.courseUrl ||
                event.shopPrice) ? (
                <div className="mt-4 rounded-2xl border border-[#eadbcf] bg-white/70 p-4 text-sm text-[#5e4c3d]">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold text-[#4d3f34]">予約情報</p>
                    <button
                      type="button"
                      onClick={async () => {
                        await navigator.clipboard.writeText(
                          shopDetails.join("\n")
                        );
                        setShopCopied(true);
                        window.setTimeout(() => setShopCopied(false), 1500);
                      }}
                      className="rounded-full border border-[#1f1b16] px-3 py-1 text-xs font-semibold text-[#1f1b16] transition active:scale-95"
                    >
                      {shopCopied ? "コピーしました" : "コピー"}
                    </button>
                  </div>
                  <div className="mt-2 space-y-1">
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
                <button
                  type="button"
                  onClick={deleteEvent}
                  disabled={deletingEvent}
                  className="inline-flex rounded-full border border-[#a34c3d] px-4 py-2 text-xs font-semibold text-[#a34c3d] transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {deletingEvent ? "削除中..." : "イベントを削除"}
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
                className="rounded-full border border-[#1f1b16] px-4 py-2 text-xs font-semibold text-[#1f1b16] transition active:scale-95"
              >
                締切を解除
              </button>
            ) : (
              <button
                onClick={() => toggleVotingLock(true)}
                className="rounded-full bg-[#1f1b16] px-4 py-2 text-xs font-semibold text-white transition active:scale-95"
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
                  disabled={scheduleConfirmed || savingCandidates}
                  className="rounded-full bg-[#1f1b16] px-4 py-2 text-xs font-semibold text-white transition active:scale-95 disabled:opacity-40"
                >
                  {savingCandidates ? "保存中..." : "候補日を保存"}
                </button>
                <button
                  type="button"
                  onClick={cancelCandidateEdits}
                  disabled={scheduleConfirmed}
                  className="rounded-full border border-[#1f1b16] px-4 py-2 text-xs font-semibold text-[#1f1b16] transition active:scale-95 disabled:opacity-40"
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
            <div className="relative">
              <input
                value={scheduleQuery}
                onChange={(eventInput) => {
                  setScheduleQuery(eventInput.target.value);
                  if (!scheduleOpen) {
                    setScheduleOpen(true);
                  }
                }}
                onFocus={() => setScheduleOpen(true)}
                onBlur={() => {
                  window.setTimeout(() => setScheduleOpen(false), 150);
                }}
                placeholder="候補日を検索"
                disabled={scheduleConfirmed}
                className="w-full rounded-xl border border-[#e2d6c9] px-4 py-3 text-sm shadow-sm disabled:bg-[#f2ebe4]"
              />
              {scheduleOpen && !scheduleConfirmed ? (
                <div className="absolute z-10 mt-2 w-full rounded-xl border border-[#eadbcf] bg-white p-2 text-xs shadow-lg">
                  {filteredScheduleCandidates.length === 0 ? (
                    <p className="px-2 py-2 text-[#6b5a4b]">該当なし</p>
                  ) : (
                    <ul className="max-h-48 overflow-y-auto">
                      {filteredScheduleCandidates.map((candidate) => (
                        <li key={candidate.id}>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedCandidateId(candidate.id);
                              setScheduleQuery(formatCandidateLabel(candidate));
                              setScheduleOpen(false);
                            }}
                            className="w-full rounded-lg px-2 py-2 text-left text-[#4d3f34] hover:bg-[#f3e8dd]"
                          >
                            {formatCandidateLabel(candidate)}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : null}
            </div>
            {scheduleConfirmed ? (
              <button
                onClick={cancelSchedule}
                className="rounded-full border border-[#1f1b16] px-4 py-2 text-xs font-semibold text-[#1f1b16] transition active:scale-95"
              >
                日程確定を取り消す
              </button>
            ) : (
              <button
                onClick={confirmSchedule}
                disabled={!selectedCandidateId}
                className="rounded-full bg-[#1f1b16] px-4 py-2 text-xs font-semibold text-white transition active:scale-95 disabled:opacity-60"
              >
                日程を確定する
              </button>
            )}
          </div>
        </section>

        {scheduleConfirmed ? (
          <>
            <section className="rounded-3xl border border-[#e6d6c9] bg-white/80 p-6 sm:p-8">
              <h2 className="text-lg font-semibold">回の管理</h2>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                {(event.rounds ?? []).map((round) => (
                  <button
                    key={round.id}
                    type="button"
                    onClick={() => setSelectedRoundId(round.id)}
                    className={`rounded-full border px-4 py-2 text-xs font-semibold transition active:scale-95 ${
                      round.id === selectedRoundId
                        ? "border-[#1f1b16] bg-[#1f1b16] text-white"
                        : "border-[#1f1b16] text-[#1f1b16] hover:bg-[#f3e8dd]"
                    }`}
                  >
                    {round.name}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={addRound}
                  disabled={addingRound}
                  className="rounded-full border border-[#1f1b16] px-4 py-2 text-xs font-semibold text-[#1f1b16] transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {addingRound ? "追加中..." : "回を追加"}
                </button>
              </div>
            </section>

            <section className="rounded-3xl border border-[#e6d6c9] bg-white/80 p-6 sm:p-8">
              <h2 className="text-lg font-semibold">
                出席管理{selectedRound ? `（${selectedRound.name}）` : ""}
              </h2>
              {selectedRound && selectedRound.order > 1 ? (
                <button
                  type="button"
                  onClick={() => deleteRound(selectedRound.id)}
                  disabled={deletingRoundIds[selectedRound.id]}
                  className="mt-3 rounded-full border border-[#d9c6b8] px-4 py-2 text-xs font-semibold text-[#7a6453] transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {deletingRoundIds[selectedRound.id]
                    ? "削除中..."
                    : `${selectedRound.name}を削除`}
                </button>
              ) : null}
              {accountingConfirmed ? (
                <p className="mt-2 text-xs text-[#6b5a4b]">
                  会計確定後は出席の変更ができません。
                </p>
              ) : null}
              <div className="mt-4 space-y-3 text-sm">
                {!selectedRound ? (
                  <p className="text-[#6b5a4b]">
                    回が選択されていません。
                  </p>
                ) : selectedRound.attendances.length === 0 ? (
                  <p className="text-[#6b5a4b]">
                    出席者がまだ生成されていません。
                  </p>
                ) : (
                  selectedRound.attendances.map((attendance) => (
                    <label
                      key={attendance.id}
                      className="flex items-center justify-between rounded-2xl border border-[#eadbcf] bg-white px-4 py-3"
                    >
                      <div className="flex flex-col">
                        <span>{attendance.name}</span>
                        {updatingAttendanceIds[attendance.id] ? (
                          <span className="text-xs text-[#a1714f]">
                            更新中...
                          </span>
                        ) : null}
                      </div>
                      <input
                        type="checkbox"
                        checked={attendance.isActual}
                        disabled={
                          accountingConfirmed || updatingAttendanceIds[attendance.id]
                        }
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
                  disabled={accountingConfirmed}
                  className="flex-1 rounded-xl border border-[#e2d6c9] px-4 py-2 text-sm disabled:bg-[#f2ebe4]"
                />
                <button
                  onClick={addAttendance}
                  disabled={
                    !newAttendanceName.trim() ||
                    !selectedRoundId ||
                    accountingConfirmed
                  }
                  className="rounded-full border border-[#1f1b16] px-4 py-2 text-xs font-semibold text-[#1f1b16] transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  追加
                </button>
              </div>
            </section>

            <section className="rounded-3xl border border-[#e6d6c9] bg-white/80 p-6 sm:p-8">
              <h2 className="text-lg font-semibold">
                会計確定{selectedRound ? `（${selectedRound.name}）` : ""}
              </h2>
              <p className="mt-2 text-sm text-[#6b5a4b]">
                {accountingConfirmed
                  ? "確定済み"
                  : "未確定"}
              </p>
              <div className="mt-4 space-y-3 text-sm">
                <input
                  value={totalAmount}
                  onChange={(event) => setTotalAmount(event.target.value)}
                  placeholder="合計金額"
                  disabled={!selectedRound || accountingConfirmed}
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
                        disabled={!selectedRound || accountingConfirmed}
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
                    disabled={accountingSaving}
                    className="rounded-full border border-[#1f1b16] px-4 py-2 text-xs font-semibold text-[#1f1b16]"
                  >
                    {accountingSaving ? "取り消し中..." : "会計確定を取り消す"}
                  </button>
                ) : (
                  <button
                    onClick={confirmAccounting}
                    disabled={
                      actualAttendances.length === 0 ||
                      !selectedRound ||
                      accountingSaving
                    }
                    className="rounded-full bg-[#1f1b16] px-4 py-2 text-xs font-semibold text-white disabled:opacity-60"
                  >
                    {accountingSaving ? "会計確定中..." : "会計を確定する"}
                  </button>
                )}
              </div>
            </section>

            <section className="rounded-3xl border border-[#e6d6c9] bg-white/80 p-6 sm:p-8">
              <h2 className="text-lg font-semibold">支払管理</h2>
              <div className="mt-4 space-y-2 text-sm">
                {paymentSummaries.length === 0 ? (
                  <p className="text-[#6b5a4b]">支払情報がまだありません。</p>
                ) : (
                  paymentSummaries.map((payment) => (
                    <div
                      key={payment.paymentId}
                      className={`flex flex-col items-start gap-3 rounded-2xl border border-[#eadbcf] px-4 py-2 sm:flex-row sm:items-center sm:justify-between ${
                        payment.status === "PENDING"
                          ? "bg-[#fff4e9]"
                          : "bg-white"
                      }`}
                    >
                      <span className="font-semibold text-[#1f1b16]">
                        {payment.name}
                      </span>
                      <span>合計: {payment.totalAmount}円</span>
                      <span className="text-xs text-[#6b5a4b]">
                        {formatPaymentMethod(payment.method)} /{" "}
                        {formatPaymentStatus(payment.status)}
                      </span>
                      <span className="text-xs text-[#6b5a4b]">
                        {payment.breakdown
                          .map((item) => `${item.roundName}: ${item.amount}円`)
                          .join(" / ")}
                      </span>
                      {payment.status === "PENDING" ? (
                        <div className="flex gap-2">
                          <button
                            onClick={() => approvePayment(payment.paymentId)}
                            disabled={approvingPaymentIds[payment.paymentId]}
                            className="rounded-full bg-[#1f1b16] px-3 py-1 text-xs font-semibold text-white transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {approvingPaymentIds[payment.paymentId]
                              ? "承認中..."
                              : "承認"}
                          </button>
                          <button
                            onClick={() => rejectPayment(payment.paymentId)}
                            disabled={rejectingPaymentIds[payment.paymentId]}
                            className="rounded-full border border-[#1f1b16] px-3 py-1 text-xs font-semibold text-[#1f1b16] transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {rejectingPaymentIds[payment.paymentId]
                              ? "差し戻し中..."
                              : "差し戻し"}
                          </button>
                        </div>
                      ) : payment.status === "APPROVED" ? (
                        <button
                          onClick={() => unapprovePayment(payment.paymentId)}
                          disabled={unapprovingPaymentIds[payment.paymentId]}
                          className="rounded-full border border-[#1f1b16] px-3 py-1 text-xs font-semibold text-[#1f1b16] transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {unapprovingPaymentIds[payment.paymentId]
                            ? "取り消し中..."
                            : "承認を取り消す"}
                        </button>
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
