"use client";

import { useOptimistic, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { getDay } from "date-fns";
import { ChevronDown, ListChecks, Plus, Sparkles, X } from "lucide-react";
import {
  archiveHabit,
  deleteHabit,
  toggleHabitStatus,
  type ActionResult,
  type DashboardData,
  type DashboardHabit,
} from "@/actions/habit-actions";
import { calculateHabitStats, isTargetDay, parseDateKey, type LogStatus } from "@/lib/streak";
import { WEEKDAY_LONG } from "@/lib/habit-options";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DailyProgress } from "./DailyProgress";
import { DateStrip, type DayProgress } from "./DateStrip";
import { HabitCard } from "./HabitCard";
import { HabitFormDialog } from "./HabitFormDialog";

type OptimisticAction =
  | { type: "status"; habitId: string; date: string; status: LogStatus | null; note?: string }
  | { type: "remove"; habitId: string };

function applyAction(habits: DashboardHabit[], action: OptimisticAction): DashboardHabit[] {
  if (action.type === "remove") return habits.filter((h) => h.id !== action.habitId);

  return habits.map((habit) => {
    if (habit.id !== action.habitId) return habit;
    const existing = habit.logs.find((l) => l.date === action.date);
    const others = habit.logs.filter((l) => l.date !== action.date);
    const logs =
      action.status === null
        ? others
        : [
            ...others,
            {
              date: action.date,
              status: action.status,
              note: action.note === undefined ? (existing?.note ?? null) : action.note.trim() || null,
            },
          ];
    // Tính lại streak ngay trên client để huy hiệu cập nhật tức thì
    const stats = calculateHabitStats(
      { frequencyType: habit.frequencyType, targetDays: habit.targetDays, createdAt: parseDateKey(habit.createdDate) },
      logs,
    );
    return { ...habit, logs, stats };
  });
}

/** Thói quen có cần làm trong ngày `date` không (đã được tạo và đúng lịch) */
function isDueOn(habit: DashboardHabit, date: string): boolean {
  return habit.createdDate <= date && isTargetDay(habit, parseDateKey(date));
}

function computeDayProgress(habits: DashboardHabit[], date: string): DayProgress & { skipped: number } {
  let completed = 0;
  let required = 0;
  let skipped = 0;
  for (const habit of habits) {
    if (!isDueOn(habit, date)) continue;
    const status = habit.logs.find((l) => l.date === date)?.status;
    if (status === "SKIPPED") {
      skipped++;
      continue;
    }
    required++;
    if (status === "COMPLETED") completed++;
  }
  return { completed, required, skipped };
}

function formatLongDate(date: string): string {
  const d = parseDateKey(date);
  const [y, m, day] = date.split("-");
  return `${WEEKDAY_LONG[getDay(d)]}, ${day}/${m}/${y}`;
}

export function Dashboard({ data }: { data: DashboardData }) {
  const router = useRouter();
  const { today } = data;
  const [habits, applyOptimistic] = useOptimistic(data.habits, applyAction);
  const [date, setOptimisticDate] = useOptimistic(data.date);
  const [, startTransition] = useTransition();

  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<DashboardHabit | null>(null);
  const [deleting, setDeleting] = useState<DashboardHabit | null>(null);

  const isToday = date === today;
  const dueHabits = habits.filter((h) => isDueOn(h, date));
  const otherHabits = habits.filter((h) => !isDueOn(h, date));
  const progress = computeDayProgress(habits, date);

  function runAction(optimistic: OptimisticAction, action: () => Promise<ActionResult<unknown>>) {
    setError(null);
    startTransition(async () => {
      applyOptimistic(optimistic);
      const result = await action();
      // Khi thất bại, useOptimistic tự hoàn tác về dữ liệu server sau khi transition kết thúc
      if (!result.ok) setError(result.error);
    });
  }

  function selectDate(next: string) {
    startTransition(() => {
      setOptimisticDate(next);
      router.push(next === today ? "/" : `/?date=${next}`, { scroll: false });
    });
  }

  function setStatus(habitId: string, status: LogStatus | null, note?: string) {
    runAction({ type: "status", habitId, date, status, note }, () => toggleHabitStatus(habitId, date, status, note));
  }

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function renderCard(habit: DashboardHabit, offDay: boolean) {
    return (
      <li key={habit.id}>
        <HabitCard
          habit={habit}
          log={habit.logs.find((l) => l.date === date)}
          offDay={offDay}
          onSetStatus={(status, note) => setStatus(habit.id, status, note)}
          onEdit={() => {
            setEditing(habit);
            setFormOpen(true);
          }}
          onArchive={() =>
            runAction({ type: "remove", habitId: habit.id }, () => archiveHabit(habit.id, true))
          }
          onDelete={() => setDeleting(habit)}
        />
      </li>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-muted-foreground">{formatLongDate(today)}</p>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Thói quen hằng ngày</h1>
        </div>
        {habits.length > 0 && (
          <Button onClick={openCreate} size="lg" className="shrink-0">
            <Plus />
            <span className="hidden sm:inline">Thêm thói quen</span>
            <span className="sm:hidden">Thêm</span>
          </Button>
        )}
      </header>

      {error && (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          <span>{error}</span>
          <button type="button" onClick={() => setError(null)} aria-label="Đóng thông báo">
            <X className="size-4" />
          </button>
        </div>
      )}

      {habits.length === 0 ? (
        <EmptyState onCreate={openCreate} />
      ) : (
        <>
          <DateStrip
            selectedDate={date}
            today={today}
            getDayProgress={(d) => computeDayProgress(habits, d)}
            onSelectDate={selectDate}
          />

          <DailyProgress
            date={date}
            completed={progress.completed}
            required={progress.required}
            skipped={progress.skipped}
          />

          <section className="flex flex-col gap-3">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <ListChecks className="size-5 text-muted-foreground" />
              {isToday ? "Thói quen cần làm hôm nay" : `Thói quen cần làm • ${formatLongDate(date)}`}
              <span className="text-sm font-normal text-muted-foreground">({dueHabits.length})</span>
            </h2>
            {dueHabits.length > 0 ? (
              <ul className="flex flex-col gap-3">{dueHabits.map((h) => renderCard(h, false))}</ul>
            ) : (
              <p className="rounded-2xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
                Không có thói quen nào theo lịch trong ngày này. Nghỉ ngơi thôi! 🌿
              </p>
            )}
          </section>

          {otherHabits.length > 0 && (
            <details className="group rounded-2xl bg-muted/40 ring-1 ring-foreground/5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 text-sm font-medium text-muted-foreground select-none [&::-webkit-details-marker]:hidden">
                <span>Thói quen ngày khác ({otherHabits.length})</span>
                <ChevronDown className="size-4 transition-transform group-open:rotate-180" />
              </summary>
              <ul className="flex flex-col gap-3 px-3 pb-3">{otherHabits.map((h) => renderCard(h, true))}</ul>
            </details>
          )}
        </>
      )}

      <HabitFormDialog open={formOpen} onOpenChange={setFormOpen} habit={editing} />

      <Dialog open={deleting !== null} onOpenChange={(open) => !open && setDeleting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xóa thói quen?</DialogTitle>
            <DialogDescription>
              Thói quen &ldquo;{deleting?.title}&rdquo; cùng toàn bộ lịch sử check-in sẽ bị xóa vĩnh viễn. Nếu chỉ
              muốn tạm ẩn, hãy chọn &ldquo;Lưu trữ&rdquo;.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)}>
              Hủy
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (!deleting) return;
                const id = deleting.id;
                setDeleting(null);
                runAction({ type: "remove", habitId: id }, () => deleteHabit(id));
              }}
            >
              Xóa vĩnh viễn
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-3xl border border-dashed px-6 py-16 text-center">
      <div className="relative">
        <div className="flex size-20 items-center justify-center rounded-3xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
          <ListChecks className="size-10" />
        </div>
        <Sparkles className="absolute -top-2 -right-3 size-6 text-amber-400" />
      </div>
      <div className="max-w-sm">
        <h2 className="text-xl font-semibold">Chưa có thói quen nào</h2>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Những thay đổi lớn bắt đầu từ thói quen nhỏ. Hãy tạo thói quen đầu tiên và giữ chuỗi ngày liên tiếp của bạn!
        </p>
      </div>
      <Button size="lg" onClick={onCreate} className="mt-2">
        <Plus />
        Tạo thói quen đầu tiên
      </Button>
    </div>
  );
}
