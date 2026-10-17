"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { BarChart3, Flame, Plus, Trophy } from "lucide-react";
import type { DashboardHabit } from "@/actions/habit-actions";
import {
  HEATMAP_DAYS,
  buildDailySeries,
  calculateWeekdayRates,
  summarizeSeries,
  type WeekdayRate,
} from "@/lib/analytics";
import { DEFAULT_HABIT_COLOR, WEEKDAY_LONG } from "@/lib/habit-options";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { HabitIcon } from "@/components/habits/habit-icons";
import { Heatmap } from "./Heatmap";
import { WeekdayChart } from "./WeekdayChart";

interface AnalyticsViewProps {
  habits: DashboardHabit[];
  today: string;
}

const ALL = "all";

function describeWeekdays(rates: WeekdayRate[]): string | null {
  const known = rates.filter((r): r is WeekdayRate & { rate: number } => r.rate !== null);
  if (known.length < 2) return null;
  const best = known.reduce((a, b) => (b.rate > a.rate ? b : a));
  const worst = known.reduce((a, b) => (b.rate < a.rate ? b : a));
  if (best.rate === worst.rate) return `Bạn duy trì đều đặn ${best.rate}% ở mọi ngày trong tuần.`;
  return `Bạn làm tốt nhất vào ${WEEKDAY_LONG[best.weekday]} (${best.rate}%) và cần cố gắng hơn vào ${WEEKDAY_LONG[worst.weekday]} (${worst.rate}%).`;
}

export function AnalyticsView({ habits, today }: AnalyticsViewProps) {
  const [selectedId, setSelectedId] = useState<string>(ALL);
  const selected = habits.find((h) => h.id === selectedId) ?? null;
  const scope = useMemo(() => (selected ? [selected] : habits), [selected, habits]);
  const color = selected?.color ?? DEFAULT_HABIT_COLOR;

  const cells = useMemo(() => buildDailySeries(scope, today, HEATMAP_DAYS), [scope, today]);
  const weekdayRates = useMemo(() => calculateWeekdayRates(cells, today), [cells, today]);
  const summary = useMemo(() => summarizeSeries(cells, today), [cells, today]);
  const insight = describeWeekdays(weekdayRates);

  // Chuỗi hiện tại nổi bật nhất trong phạm vi đang xem
  const topStreak = scope.reduce<DashboardHabit | null>(
    (best, h) => (!best || h.stats.currentStreak > best.stats.currentStreak ? h : best),
    null,
  );

  if (habits.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-3xl border border-dashed px-6 py-16 text-center">
        <div className="flex size-16 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
          <BarChart3 className="size-8" />
        </div>
        <div className="max-w-sm">
          <h2 className="text-xl font-semibold">Chưa có dữ liệu thống kê</h2>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Tạo thói quen và check-in mỗi ngày để xem bản đồ nhiệt và xu hướng của bạn.
          </p>
        </div>
        <Link href="/" className={buttonVariants({ size: "lg" })}>
          <Plus />
          Tạo thói quen đầu tiên
        </Link>
      </div>
    );
  }

  const tiles = [
    { label: "Lượt hoàn thành", value: summary.totalCompleted.toLocaleString("vi-VN"), hint: `${HEATMAP_DAYS} ngày qua` },
    {
      label: "Tỷ lệ hoàn thành",
      value: summary.overallRate === null ? "—" : `${summary.overallRate}%`,
      hint: "Không tính ngày nghỉ có phép",
    },
    { label: "Ngày hoàn hảo", value: summary.perfectDays.toLocaleString("vi-VN"), hint: "Đạt 100% thói quen" },
    selected
      ? { label: "Kỷ lục chuỗi", value: `${selected.stats.bestStreak} ngày`, hint: `Hiện tại: ${selected.stats.currentStreak} ngày` }
      : {
          label: "Chuỗi dài nhất hiện tại",
          value: `${topStreak?.stats.currentStreak ?? 0} ngày`,
          hint: topStreak && topStreak.stats.currentStreak > 0 ? topStreak.title : "Bắt đầu chuỗi mới hôm nay!",
        },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="-mx-4 overflow-x-auto px-4">
        <div className="flex w-max gap-2" role="group" aria-label="Lọc theo thói quen">
          <FilterChip active={selected === null} onClick={() => setSelectedId(ALL)}>
            Tất cả thói quen
          </FilterChip>
          {habits.map((h) => (
            <FilterChip key={h.id} active={h.id === selectedId} onClick={() => setSelectedId(h.id)}>
              <span className="size-2 rounded-full" style={{ backgroundColor: h.color }} aria-hidden />
              {h.title}
            </FilterChip>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map((tile) => (
          <div key={tile.label} className="rounded-2xl bg-card p-4 ring-1 ring-foreground/10">
            <p className="text-xs font-medium text-muted-foreground">{tile.label}</p>
            <p className="mt-1 text-2xl font-bold tabular-nums">{tile.value}</p>
            <p className="mt-0.5 truncate text-xs text-muted-foreground" title={tile.hint}>
              {tile.hint}
            </p>
          </div>
        ))}
      </div>

      <section className="rounded-2xl bg-card p-4 ring-1 ring-foreground/10 sm:p-5">
        <h2 className="font-semibold">Bản đồ nhiệt {HEATMAP_DAYS} ngày</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          {selected ? `Lịch sử check-in của "${selected.title}".` : "Mỗi ô là tỷ lệ hoàn thành các thói quen cần làm trong ngày."}
        </p>
        {/* key: cuộn lại về cuối khi đổi bộ lọc */}
        <Heatmap key={selectedId} cells={cells} today={today} color={color} mode={selected ? "single" : "all"} />
      </section>

      <section className="rounded-2xl bg-card p-4 ring-1 ring-foreground/10 sm:p-5">
        <h2 className="font-semibold">Tỷ lệ hoàn thành theo thứ</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          {insight ?? "Cần thêm dữ liệu để so sánh các ngày trong tuần."}
        </p>
        <WeekdayChart rates={weekdayRates} color={color} />
      </section>

      {!selected && (
        <section className="rounded-2xl bg-card p-4 ring-1 ring-foreground/10 sm:p-5">
          <h2 className="mb-3 font-semibold">Theo từng thói quen</h2>
          <ul className="divide-y">
            {habits.map((h) => (
              <li key={h.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(h.id)}
                  className="flex w-full items-center gap-3 rounded-lg px-1 py-2.5 text-left transition-colors hover:bg-muted/60"
                >
                  <span
                    className="flex size-8 shrink-0 items-center justify-center rounded-lg"
                    style={{ backgroundColor: `${h.color}1f`, color: h.color }}
                  >
                    <HabitIcon name={h.icon} className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">{h.title}</span>
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground" title="Chuỗi hiện tại">
                    <Flame className={cn("size-3.5", h.stats.currentStreak > 0 && "text-orange-500")} />
                    {h.stats.currentStreak}
                  </span>
                  <span className="hidden items-center gap-1 text-xs text-muted-foreground sm:inline-flex" title="Kỷ lục">
                    <Trophy className="size-3.5" />
                    {h.stats.bestStreak}
                  </span>
                  <span className="w-20 text-right text-xs tabular-nums" title="Tỷ lệ hoàn thành 30 ngày">
                    <span className="font-semibold">{h.stats.completionRate}%</span>
                    <span className="text-muted-foreground"> / 30n</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex max-w-56 items-center gap-1.5 truncate rounded-full border px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
        active ? "border-transparent bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
