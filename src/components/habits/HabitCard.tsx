"use client";

import { useState } from "react";
import {
  Archive,
  CalendarDays,
  Check,
  CirclePause,
  Ellipsis,
  Flame,
  Pencil,
  StickyNote,
  Trash2,
  Trophy,
  Undo2,
} from "lucide-react";
import type { DashboardHabit, DashboardLog } from "@/actions/habit-actions";
import type { LogStatus } from "@/lib/streak";
import { formatSchedule } from "@/lib/habit-options";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { HabitIcon } from "./habit-icons";

const NOTE_MAX = 500;

interface HabitCardProps {
  habit: DashboardHabit;
  /** Log của ngày đang chọn (nếu có) */
  log?: DashboardLog;
  /** Thói quen không cần làm trong ngày đang chọn */
  offDay?: boolean;
  onSetStatus: (status: LogStatus | null, note?: string) => void;
  onEdit: () => void;
  onArchive: () => void;
  onDelete: () => void;
}

export function HabitCard({ habit, log, offDay = false, onSetStatus, onEdit, onArchive, onDelete }: HabitCardProps) {
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteDraft, setNoteDraft] = useState("");

  const status = log?.status ?? null;
  const isCompleted = status === "COMPLETED";
  const isSkipped = status === "SKIPPED";
  const { currentStreak, bestStreak, completionRate } = habit.stats;

  function handleCheck() {
    // Bấm 1 chạm: chưa làm/nghỉ → hoàn thành; đã hoàn thành → bỏ đánh dấu
    onSetStatus(isCompleted ? null : "COMPLETED");
  }

  function openNoteDialog() {
    setNoteDraft(log?.note ?? "");
    setNoteOpen(true);
  }

  function saveNote() {
    // Ghi chú gắn với log của ngày; nếu chưa có trạng thái thì lưu kèm "hoàn thành"
    onSetStatus(status ?? "COMPLETED", noteDraft);
    setNoteOpen(false);
  }

  return (
    <div
      className={cn(
        "group relative flex items-start gap-3 overflow-hidden rounded-2xl bg-card p-4 ring-1 ring-foreground/10 transition-all sm:gap-4",
        isSkipped && "bg-muted/40",
        offDay && !status && "opacity-75",
      )}
      // Dải màu bên trái theo màu thói quen; nền ánh màu khi đã hoàn thành
      style={{
        boxShadow: `inset 4px 0 0 ${habit.color}`,
        ...(isCompleted && { backgroundImage: `linear-gradient(${habit.color}12, ${habit.color}12)` }),
      }}
    >
      <div
        className="flex size-11 shrink-0 items-center justify-center rounded-xl"
        style={{ backgroundColor: `${habit.color}1f`, color: habit.color }}
        aria-hidden
      >
        <HabitIcon name={habit.icon} className="size-5" />
      </div>

      <div className="min-w-0 flex-1">
        <h3
          className={cn(
            "truncate text-base font-semibold",
            isCompleted && "text-muted-foreground line-through decoration-2",
          )}
          style={isCompleted ? { textDecorationColor: `${habit.color}99` } : undefined}
          title={habit.title}
        >
          {habit.title}
        </h3>

        {habit.description && (
          <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">{habit.description}</p>
        )}

        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted-foreground">
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold",
              currentStreak > 0
                ? "bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300"
                : "bg-muted text-muted-foreground",
            )}
            title="Chuỗi hiện tại"
          >
            <Flame className={cn("size-3.5", currentStreak > 0 && "fill-orange-400 text-orange-500")} />
            {currentStreak} ngày
          </span>
          <span className="inline-flex items-center gap-1" title="Chuỗi dài nhất">
            <Trophy className="size-3.5" />
            Kỷ lục {bestStreak}
          </span>
          <span className="tabular-nums" title="Tỷ lệ hoàn thành 30 ngày gần nhất">
            {completionRate}% / 30 ngày
          </span>
          <span className="inline-flex items-center gap-1">
            <CalendarDays className="size-3.5" />
            {formatSchedule(habit.frequencyType, habit.targetDays)}
          </span>
        </div>

        {(isSkipped || log?.note) && (
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
            {isSkipped && (
              <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2 py-0.5 font-medium text-sky-700 dark:bg-sky-950/60 dark:text-sky-300">
                <CirclePause className="size-3.5" />
                Nghỉ có phép
              </span>
            )}
            {log?.note && (
              <button
                type="button"
                onClick={openNoteDialog}
                className="inline-flex min-w-0 max-w-full items-center gap-1 text-left text-muted-foreground italic hover:text-foreground"
              >
                <StickyNote className="size-3.5 shrink-0" />
                <span className="truncate">{log.note}</span>
              </button>
            )}
          </div>
        )}
      </div>

      <div className="flex shrink-0 flex-col items-center gap-1">
        <button
          type="button"
          onClick={handleCheck}
          aria-pressed={isCompleted}
          aria-label={isCompleted ? `Bỏ đánh dấu hoàn thành "${habit.title}"` : `Đánh dấu hoàn thành "${habit.title}"`}
          className={cn(
            "flex size-12 items-center justify-center rounded-full border-2 transition-all outline-none focus-visible:ring-3 focus-visible:ring-ring/50 active:scale-90",
            isCompleted ? "text-white shadow-md" : "bg-background hover:scale-105",
          )}
          style={
            isCompleted
              ? { backgroundColor: habit.color, borderColor: habit.color }
              : { borderColor: isSkipped ? "var(--border)" : `${habit.color}80`, color: habit.color }
          }
        >
          {isSkipped ? (
            <CirclePause className="size-5 text-muted-foreground" />
          ) : (
            <Check className={cn("size-6 transition-opacity", !isCompleted && "opacity-25")} strokeWidth={3} />
          )}
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger
            render={<Button variant="ghost" size="icon-sm" aria-label={`Tùy chọn cho "${habit.title}"`} />}
          >
            <Ellipsis />
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {isSkipped ? (
              <DropdownMenuItem onClick={() => onSetStatus(null)}>
                <Undo2 />
                Bỏ nghỉ có phép
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onClick={() => onSetStatus("SKIPPED")}>
                <CirclePause />
                Nghỉ có phép
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={openNoteDialog}>
              <StickyNote />
              {log?.note ? "Sửa ghi chú" : "Thêm ghi chú"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onEdit}>
              <Pencil />
              Chỉnh sửa
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onArchive}>
              <Archive />
              Lưu trữ
            </DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onClick={onDelete}>
              <Trash2 />
              Xóa
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Dialog open={noteOpen} onOpenChange={setNoteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Ghi chú trong ngày</DialogTitle>
            <DialogDescription>
              {habit.title}
              {!status && " — lưu ghi chú sẽ đồng thời đánh dấu hoàn thành."}
            </DialogDescription>
          </DialogHeader>
          <form
            className="grid gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              saveNote();
            }}
          >
            <Textarea
              value={noteDraft}
              onChange={(e) => setNoteDraft(e.target.value)}
              placeholder="Hôm nay bạn thế nào? (vd: chạy 5km, đọc 20 trang...)"
              maxLength={NOTE_MAX}
              rows={3}
              autoFocus
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setNoteOpen(false)}>
                Hủy
              </Button>
              <Button type="submit">Lưu ghi chú</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
