"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { PREFECTURES } from "@/lib/area-options";

type CandidateInput = {
  startsAt: string;
};

function toIsoFromLocal(value: string) {
  const [datePart, timePart] = value.split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  const [hour, minute] = timePart.split(":").map(Number);
  return new Date(year, month - 1, day, hour || 0, minute || 0).toISOString();
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

export default function NewEventClient() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [areaPrefCode, setAreaPrefCode] = useState("");
  const [municipalityName, setMunicipalityName] = useState("");
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
  const [memo, setMemo] = useState("");
  const [candidates, setCandidates] = useState<CandidateInput[]>([]);
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());
  const [timeValue, setTimeValue] = useState("19:00");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [clientId, setClientId] = useState("");

  useEffect(() => {
    setClientId(getOrCreateClientId());
  }, []);

  useEffect(() => {
    if (!areaPrefCode) {
      setMunicipalityOptions([]);
      setMunicipalityOffset(0);
      setMunicipalityHasMore(false);
      return;
    }
    const cacheKey = `${areaPrefCode}::${municipalityQuery}`;
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
          `/api/municipalities?pref=${areaPrefCode}&q=${encodeURIComponent(
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
  }, [areaPrefCode, municipalityQuery, municipalityCache]);

  const filteredPrefectures = useMemo(() => {
    const query = prefectureQuery.trim();
    if (!query) return PREFECTURES;
    return PREFECTURES.filter((pref) => pref.name.includes(query));
  }, [prefectureQuery]);

  function selectPrefecture(prefCode: string, prefName: string) {
    setAreaPrefCode(prefCode);
    setPrefectureQuery(prefName);
    setPrefectureOpen(false);
    setMunicipalityName("");
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
        `/api/municipalities?pref=${areaPrefCode}&q=${encodeURIComponent(
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

  function formatDateTimeLocal(date: Date, time: string) {
    const [hours, minutes] = time.split(":").map((value) => Number(value));
    const withTime = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      hours || 0,
      minutes || 0
    );
    const pad = (value: number) => value.toString().padStart(2, "0");
    return `${withTime.getFullYear()}-${pad(withTime.getMonth() + 1)}-${pad(
      withTime.getDate()
    )}T${pad(withTime.getHours())}:${pad(withTime.getMinutes())}`;
  }

  function parseDateTimeLocal(value: string) {
    const [datePart, timePart] = value.split("T");
    const [year, month, day] = datePart.split("-").map(Number);
    const [hour, minute] = timePart.split(":").map(Number);
    return new Date(year, month - 1, day, hour, minute);
  }

  function addCandidateFromDate(date: Date) {
    const startsAt = formatDateTimeLocal(date, timeValue);
    setCandidates((prev) => {
      if (prev.some((candidate) => candidate.startsAt === startsAt)) {
        return prev;
      }
      return [...prev, { startsAt }];
    });
  }

  function removeCandidate(value: string) {
    setCandidates((prev) =>
      prev.filter((candidate) => candidate.startsAt !== value)
    );
  }

  function moveMonth(offset: number) {
    setCalendarMonth(
      (prev) => new Date(prev.getFullYear(), prev.getMonth() + offset, 1)
    );
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

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSaving(true);

    const validCandidates = candidates.filter(
      (candidate) => candidate.startsAt
    );

    if (validCandidates.length === 0) {
      setError("候補日を1つ以上入力してください。");
      setSaving(false);
      return;
    }

    const payload = {
      name,
      memo,
      areaPrefCode: areaPrefCode || null,
      areaMunicipalityName: municipalityName || null,
      ownerClientId: clientId,
      candidates: validCandidates.map((candidate) => ({
        startsAt: toIsoFromLocal(candidate.startsAt),
      })),
    };

    const response = await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setSaving(false);
    if (!response.ok) {
      setError("作成に失敗しました。入力内容を確認してください。");
      return;
    }

    const data = (await response.json()) as { publicId?: string };
    if (!data.publicId) {
      setError("作成後のURL取得に失敗しました。");
      return;
    }
    router.push(`/e/${data.publicId}`);
  }

  return (
    <main className="min-h-screen bg-[#f6f1ea] text-[#1f1b16]">
      <div className="mx-auto w-full max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
        <header className="mb-10">
          <p className="text-xs uppercase tracking-[0.3em] text-[#a1714f]">
            イベント準備
          </p>
          <h1 className="mt-3 text-2xl font-semibold sm:text-3xl">
            イベント作成
          </h1>
          <p className="mt-2 text-sm text-[#6b5a4b]">
            候補日を複数登録して、参加者にURLを共有します。
          </p>
        </header>

        <form
          onSubmit={handleSubmit}
          className="space-y-6 rounded-3xl border border-[#e6d6c9] bg-white/80 p-6 shadow-[0_18px_40px_rgba(31,27,22,0.12)] sm:p-8"
        >
          <div>
            <label className="text-sm font-medium">イベント名</label>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              className="mt-2 w-full rounded-xl border border-[#e2d6c9] bg-white px-4 py-3 text-sm outline-none transition focus:border-[#c08b65]"
            />
          </div>
          <div>
            <label className="text-sm font-medium">エリア（任意）</label>
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
                      onChange={(event) => {
                        setPrefectureQuery(event.target.value);
                        if (!prefectureOpen) {
                          setPrefectureOpen(true);
                        }
                      }}
                      onFocus={() => setPrefectureOpen(true)}
                      onBlur={() => {
                        window.setTimeout(() => setPrefectureOpen(false), 150);
                      }}
                      placeholder="都道府県を検索"
                      className="w-full rounded-xl border border-[#e2d6c9] bg-white px-3 py-3 text-sm shadow-sm outline-none transition focus:border-[#c08b65]"
                    />
                    {prefectureOpen ? (
                      <div className="absolute z-10 mt-2 w-full rounded-xl border border-[#eadbcf] bg-white p-2 text-xs shadow-lg">
                        {filteredPrefectures.length === 0 ? (
                          <p className="px-2 py-2 text-[#6b5a4b]">該当なし</p>
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
                    {areaPrefCode ? (
                      <p className="mt-2 text-[11px] text-[#6b5a4b]">
                        選択中:{" "}
                        {PREFECTURES.find((pref) => pref.code === areaPrefCode)
                          ?.name ?? ""}
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
                      onChange={(event) => {
                      setMunicipalityQuery(event.target.value);
                      setMunicipalityName("");
                      if (!municipalityOpen) {
                        setMunicipalityOpen(true);
                      }
                    }}
                      onFocus={() => setMunicipalityOpen(true)}
                      onBlur={() => {
                        window.setTimeout(() => setMunicipalityOpen(false), 150);
                      }}
                    placeholder={
                      areaPrefCode ? "市区町村を検索" : "都道府県を先に選択"
                    }
                      disabled={!areaPrefCode}
                      className="mt-2 w-full rounded-xl border border-[#e2d6c9] bg-white px-3 py-3 text-sm shadow-sm outline-none transition focus:border-[#c08b65] disabled:bg-[#f2ebe4]"
                    />
                  {municipalityOpen && areaPrefCode ? (
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
                                  setMunicipalityName(option.name);
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
                              {municipalityLoading ? "読み込み中..." : "さらに読み込み"}
                            </li>
                          ) : null}
                        </ul>
                      )}
                    </div>
                  ) : null}
                  {municipalityName ? (
                    <p className="mt-2 text-[11px] text-[#6b5a4b]">
                      選択中: {municipalityName}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">メモ（任意）</label>
            <textarea
              value={memo}
              onChange={(event) => setMemo(event.target.value)}
              rows={3}
              className="mt-2 w-full rounded-xl border border-[#e2d6c9] bg-white px-4 py-3 text-sm outline-none transition focus:border-[#c08b65]"
            />
          </div>

          <div className="space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-sm font-semibold">候補日</h2>
              <p className="text-xs text-[#6b5a4b]">
                カレンダーから日付を追加します
              </p>
            </div>
            <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
              <div className="rounded-2xl border border-[#eadbcf] bg-white p-4">
                <ul className="mt-4 space-y-2 text-sm">
                  {candidates.length === 0 ? (
                    <li className="text-[#8a7767]">
                      右のカレンダーから日付を選択してください。
                    </li>
                  ) : (
                    candidates
                      .slice()
                      .sort((a, b) => (a.startsAt < b.startsAt ? -1 : 1))
                      .map((candidate) => {
                        const date = parseDateTimeLocal(candidate.startsAt);
                        return (
                          <li
                            key={candidate.startsAt}
                            className="flex items-center justify-between rounded-xl border border-[#e8d7c8] bg-[#fbf6f1] px-3 py-2"
                          >
                            <span>
                              {date.toLocaleString("ja-JP", {
                                month: "numeric",
                                day: "numeric",
                                weekday: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                            <button
                              type="button"
                              onClick={() => removeCandidate(candidate.startsAt)}
                              className="text-xs text-[#a34c3d]"
                            >
                              削除
                            </button>
                          </li>
                        );
                      })
                  )}
                </ul>
              </div>
              <div className="rounded-2xl border border-[#eadbcf] bg-white p-4">
                <div className="flex items-center justify-between text-sm font-semibold">
                  <button
                    type="button"
                    onClick={() => moveMonth(-1)}
                    className="rounded-full px-2 py-1 text-[#6b5a4b] hover:bg-[#f3e8dd]"
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
                    className="rounded-full px-2 py-1 text-[#6b5a4b] hover:bg-[#f3e8dd]"
                  >
                    →
                  </button>
                </div>
                <div className="mt-3">
                  <label className="text-xs text-[#6b5a4b]">時間</label>
                  <input
                    type="time"
                    value={timeValue}
                    onChange={(event) => setTimeValue(event.target.value)}
                    className="mt-2 w-full rounded-xl border border-[#e2d6c9] px-3 py-2 text-sm"
                  />
                </div>
                <div className="mt-4 grid grid-cols-7 gap-2 text-center text-xs">
                  {displayWeekdays.map((label) => (
                    <div key={label} className="font-semibold text-[#6b5a4b]">
                      {label}
                    </div>
                  ))}
                  {monthMatrix.map((week, weekIndex) =>
                    week.map((day, dayIndex) => {
                      if (!day) {
                        return <div key={`empty-${weekIndex}-${dayIndex}`} />;
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
                          className="rounded-lg border border-[#e2d6c9] bg-[#f7efe7] py-2 text-sm font-semibold text-[#5a4638] hover:bg-[#eadbcf]"
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

          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-full bg-[#1f1b16] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#3a312a] disabled:opacity-60"
          >
            {saving ? "作成中..." : "イベントを作成"}
          </button>
        </form>
      </div>
    </main>
  );
}
