"use client";

import { useState, useTransition } from "react";
import { Check, Loader2 } from "lucide-react";
import { createHabit, updateHabit, type DashboardHabit, type HabitInput } from "@/actions/habit-actions";
import type { FrequencyType } from "@/lib/streak";
import {
  DEFAULT_HABIT_COLOR,
  DEFAULT_HABIT_ICON,
  HABIT_COLORS,
  HABIT_ICON_NAMES,
  WEEKDAY_LONG,
  WEEKDAY_SHORT,
  WEEK_ORDER,
  isHabitIconName,
  type HabitIconName,
} from "@/lib/habit-options";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { HABIT_ICONS } from "./habit-icons";

const TITLE_MAX = 100;
const DESCRIPTION_MAX = 500;

interface HabitFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Có giá trị = chế độ sửa; không có = tạo mới */
  habit?: DashboardHabit | null;
}

export function HabitFormDialog({ open, onOpenChange, habit }: HabitFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-lg">
        {/* Nội dung được unmount khi đóng nên state form tự reset mỗi lần mở */}
        <HabitForm habit={habit ?? null} onDone={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

function HabitForm({ habit, onDone }: { habit: DashboardHabit | null; onDone: () => void }) {
  const isEdit = habit !== null;
  const [title, setTitle] = useState(habit?.title ?? "");
  const [description, setDescription] = useState(habit?.description ?? "");
  const [icon, setIcon] = useState<HabitIconName>(
    habit && isHabitIconName(habit.icon) ? habit.icon : DEFAULT_HABIT_ICON,
  );
  const [color, setColor] = useState(habit?.color ?? DEFAULT_HABIT_COLOR);
  const [frequencyType, setFrequencyType] = useState<FrequencyType>(habit?.frequencyType ?? "DAILY");
  const [targetDays, setTargetDays] = useState<number[]>(
    habit?.frequencyType === "SPECIFIC_DAYS" ? habit.targetDays : [1, 2, 3, 4, 5],
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const PreviewIcon = HABIT_ICONS[icon];

  function toggleDay(day: number) {
    setTargetDays((days) => (days.includes(day) ? days.filter((d) => d !== day) : [...days, day].sort((a, b) => a - b)));
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!title.trim()) return setError("Tên thói quen không được để trống.");
    if (frequencyType === "SPECIFIC_DAYS" && targetDays.length === 0) {
      return setError("Hãy chọn ít nhất một ngày trong tuần.");
    }

    const input: HabitInput = {
      title,
      description,
      icon,
      color,
      frequencyType,
      targetDays: frequencyType === "DAILY" ? [0, 1, 2, 3, 4, 5, 6] : targetDays,
    };

    setError(null);
    startTransition(async () => {
      const result = isEdit ? await updateHabit(habit.id, input) : await createHabit(input);
      if (result.ok) onDone();
      else setError(result.error);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-5">
      <DialogHeader>
        <DialogTitle>{isEdit ? "Chỉnh sửa thói quen" : "Thêm thói quen mới"}</DialogTitle>
        <DialogDescription>
          {isEdit ? "Cập nhật thông tin thói quen của bạn." : "Bắt đầu một thói quen tốt từ hôm nay."}
        </DialogDescription>
      </DialogHeader>

      <div className="flex items-center gap-3 rounded-xl bg-muted/50 p-3">
        <div
          className="flex size-11 shrink-0 items-center justify-center rounded-xl"
          style={{ backgroundColor: `${color}1f`, color }}
        >
          <PreviewIcon className="size-5" />
        </div>
        <div className="min-w-0">
          <p className="truncate font-semibold">{title.trim() || "Tên thói quen"}</p>
          <p className="truncate text-xs text-muted-foreground">{description.trim() || "Xem trước"}</p>
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="habit-title">Tên thói quen *</Label>
        <Input
          id="habit-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ví dụ: Uống 2 lít nước"
          maxLength={TITLE_MAX}
          autoFocus
          required
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="habit-description">Mô tả</Label>
        <Textarea
          id="habit-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Ghi chú thêm về thói quen (không bắt buộc)"
          maxLength={DESCRIPTION_MAX}
          rows={2}
        />
      </div>

      <fieldset className="grid gap-2">
        <legend className="mb-2 text-sm font-medium">Biểu tượng</legend>
        <div className="grid grid-cols-8 gap-1.5">
          {HABIT_ICON_NAMES.map((name) => {
            const Icon = HABIT_ICONS[name];
            const selected = name === icon;
            return (
              <button
                key={name}
                type="button"
                onClick={() => setIcon(name)}
                aria-pressed={selected}
                aria-label={name}
                title={name}
                className={cn(
                  "flex aspect-square items-center justify-center rounded-lg border transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                  selected ? "border-transparent" : "border-border text-muted-foreground hover:bg-muted",
                )}
                style={selected ? { backgroundColor: `${color}1f`, color, borderColor: color } : undefined}
              >
                <Icon className="size-4.5" />
              </button>
            );
          })}
        </div>
      </fieldset>

      <fieldset className="grid gap-2">
        <legend className="mb-2 text-sm font-medium">Màu sắc</legend>
        <div className="flex flex-wrap gap-2.5">
          {HABIT_COLORS.map((c) => {
            const selected = c.value === color.toLowerCase();
            return (
              <button
                key={c.value}
                type="button"
                onClick={() => setColor(c.value)}
                aria-pressed={selected}
                aria-label={c.label}
                title={c.label}
                className={cn(
                  "flex size-8 items-center justify-center rounded-full text-white transition-transform outline-none focus-visible:ring-3 focus-visible:ring-ring/50 hover:scale-110",
                  selected && "ring-2 ring-foreground/70 ring-offset-2 ring-offset-background",
                )}
                style={{ backgroundColor: c.value }}
              >
                {selected && <Check className="size-4" strokeWidth={3} />}
              </button>
            );
          })}
        </div>
      </fieldset>

      <fieldset className="grid gap-2">
        <legend className="mb-2 text-sm font-medium">Tần suất</legend>
        <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
          {(
            [
              ["DAILY", "Hàng ngày"],
              ["SPECIFIC_DAYS", "Chọn ngày trong tuần"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setFrequencyType(value)}
              aria-pressed={frequencyType === value}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                frequencyType === value
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {frequencyType === "SPECIFIC_DAYS" && (
          <div className="mt-1 grid grid-cols-7 gap-1.5">
            {WEEK_ORDER.map((day) => {
              const selected = targetDays.includes(day);
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggleDay(day)}
                  aria-pressed={selected}
                  aria-label={WEEKDAY_LONG[day]}
                  className={cn(
                    "rounded-lg border py-2 text-sm font-semibold transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                    selected ? "border-transparent text-white" : "border-border text-muted-foreground hover:bg-muted",
                  )}
                  style={selected ? { backgroundColor: color } : undefined}
                >
                  {WEEKDAY_SHORT[day]}
                </button>
              );
            })}
          </div>
        )}
      </fieldset>

      {error && (
        <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone} disabled={isPending}>
          Hủy
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 className="animate-spin" />}
          {isEdit ? "Lưu thay đổi" : "Tạo thói quen"}
        </Button>
      </DialogFooter>
    </form>
  );
}
