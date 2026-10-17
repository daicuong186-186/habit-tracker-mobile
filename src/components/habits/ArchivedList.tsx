"use client";

import { useOptimistic, useState, useTransition } from "react";
import Link from "next/link";
import { Archive, ArchiveRestore, CalendarDays, Check, Trash2, Trophy, X } from "lucide-react";
import { archiveHabit, deleteHabit, type ActionResult, type DashboardHabit } from "@/actions/habit-actions";
import { formatSchedule } from "@/lib/habit-options";
import { Button, buttonVariants } from "@/components/ui/button";
import { DeleteHabitDialog } from "./DeleteHabitDialog";
import { HabitIcon } from "./habit-icons";

export function ArchivedList({ habits: initialHabits }: { habits: DashboardHabit[] }) {
  const [habits, removeOptimistic] = useOptimistic(initialHabits, (list, id: string) =>
    list.filter((h) => h.id !== id),
  );
  const [, startTransition] = useTransition();
  const [deleting, setDeleting] = useState<DashboardHabit | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [restored, setRestored] = useState<string | null>(null);

  function run(id: string, action: () => Promise<ActionResult>, onSuccess?: () => void) {
    setError(null);
    setRestored(null);
    startTransition(async () => {
      removeOptimistic(id);
      const result = await action();
      if (!result.ok) setError(result.error);
      else onSuccess?.();
    });
  }

  return (
    <div className="flex flex-col gap-4">
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

      {restored && (
        <div
          role="status"
          className="flex items-center gap-2 rounded-xl bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-400"
        >
          <Check className="size-4 shrink-0" />
          <span className="min-w-0 flex-1">
            Đã khôi phục &ldquo;{restored}&rdquo; về danh sách hằng ngày.
          </span>
          <Link href="/" className="shrink-0 font-semibold underline-offset-4 hover:underline">
            Mở Dashboard
          </Link>
        </div>
      )}

      {habits.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed px-6 py-14 text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
            <Archive className="size-7" />
          </div>
          <div className="max-w-sm">
            <h2 className="text-lg font-semibold">Không có thói quen nào được lưu trữ</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Lưu trữ giúp tạm ẩn thói quen mà vẫn giữ nguyên lịch sử. Chọn &ldquo;Lưu trữ&rdquo; trong menu của
              thẻ thói quen để dùng.
            </p>
          </div>
          <Link href="/" className={buttonVariants({ variant: "outline", className: "mt-1" })}>
            Về trang hôm nay
          </Link>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {habits.map((habit) => {
            const totalCompleted = habit.logs.filter((l) => l.status === "COMPLETED").length;
            return (
              <li
                key={habit.id}
                className="flex flex-col gap-3 rounded-2xl bg-card p-4 ring-1 ring-foreground/10 sm:flex-row sm:items-center"
              >
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <div
                    className="flex size-10 shrink-0 items-center justify-center rounded-xl opacity-80"
                    style={{ backgroundColor: `${habit.color}1f`, color: habit.color }}
                    aria-hidden
                  >
                    <HabitIcon name={habit.icon} className="size-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="truncate font-semibold" title={habit.title}>
                      {habit.title}
                    </h3>
                    {habit.description && (
                      <p className="line-clamp-1 text-sm text-muted-foreground">{habit.description}</p>
                    )}
                    <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <CalendarDays className="size-3.5" />
                        {formatSchedule(habit.frequencyType, habit.targetDays)}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Trophy className="size-3.5" />
                        Kỷ lục {habit.stats.bestStreak} ngày
                      </span>
                      <span>{totalCompleted} lượt hoàn thành</span>
                    </div>
                  </div>
                </div>

                <div className="flex shrink-0 gap-2 sm:justify-end">
                  <Button
                    variant="outline"
                    className="flex-1 sm:flex-none"
                    onClick={() =>
                      run(habit.id, () => archiveHabit(habit.id, false), () => setRestored(habit.title))
                    }
                  >
                    <ArchiveRestore />
                    Khôi phục
                  </Button>
                  <Button variant="destructive" className="flex-1 sm:flex-none" onClick={() => setDeleting(habit)}>
                    <Trash2 />
                    Xóa
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <DeleteHabitDialog
        habit={deleting}
        suggestArchive={false}
        onCancel={() => setDeleting(null)}
        onConfirm={(id) => {
          setDeleting(null);
          run(id, () => deleteHabit(id));
        }}
      />
    </div>
  );
}
