"use client";

import { useState } from "react";
import { differenceInCalendarDays, format, getDay, subDays } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { parseDateKey, toDateKey } from "@/lib/streak";
import { WEEKDAY_SHORT } from "@/lib/habit-options";
import type { DayProgress } from "@/lib/analytics";


interface DateStripProps {
  selectedDate: string;
  today: string;
  getDayProgress: (date: string) => DayProgress;
  onSelectDate: (date: string) => void;
}

const DAYS_PER_PAGE = 7;

function weekOffsetOf(date: string, today: string): number {
  const diff = differenceInCalendarDays(parseDateKey(today), parseDateKey(date));
  return Math.max(0, Math.floor(diff / DAYS_PER_PAGE));
}

export function DateStrip({ selectedDate, today, getDayProgress, onSelectDate }: DateStripProps) {
  const [weekOffset, setWeekOffset] = useState(() => weekOffsetOf(selectedDate, today));

  const end = subDays(parseDateKey(today), weekOffset * DAYS_PER_PAGE);
  const days = Array.from({ length: DAYS_PER_PAGE }, (_, i) => subDays(end, DAYS_PER_PAGE - 1 - i));
  const rangeLabel = `${format(days[0], "dd/MM")} – ${format(days[DAYS_PER_PAGE - 1], "dd/MM/yyyy")}`;

  return (
    <div className="rounded-2xl bg-card p-3 ring-1 ring-foreground/10 sm:p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setWeekOffset((w) => w + 1)}
          aria-label="Tuần trước"
        >
          <ChevronLeft />
          <span className="hidden sm:inline">Tuần trước</span>
        </Button>

        <div className="flex items-center gap-2 text-sm">
          <span className="font-medium tabular-nums text-muted-foreground">{rangeLabel}</span>
          {weekOffset > 0 && (
            <Button
              variant="outline"
              size="xs"
              onClick={() => {
                setWeekOffset(0);
                onSelectDate(today);
              }}
            >
              Tuần này
            </Button>
          )}
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setWeekOffset((w) => Math.max(0, w - 1))}
          disabled={weekOffset === 0}
          aria-label="Tuần sau"
        >
          <span className="hidden sm:inline">Tuần sau</span>
          <ChevronRight />
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-1 sm:gap-2">
        {days.map((day) => {
          const key = toDateKey(day);
          const isSelected = key === selectedDate;
          const isToday = key === today;
          const { completed, required } = getDayProgress(key);
          const isDone = required > 0 && completed >= required;
          const isPartial = completed > 0 && !isDone;

          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelectDate(key)}
              aria-pressed={isSelected}
              aria-label={`${WEEKDAY_SHORT[getDay(day)]} ${format(day, "dd/MM")}${
                isDone ? ", đã hoàn thành đủ" : ""
              }`}
              className={cn(
                "flex flex-col items-center gap-1 rounded-xl py-2 text-sm transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                isSelected
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "hover:bg-muted",
                !isSelected && isToday && "ring-1 ring-primary/40",
              )}
            >
              <span
                className={cn(
                  "text-[11px] font-medium uppercase",
                  isSelected ? "text-primary-foreground/80" : "text-muted-foreground",
                )}
              >
                {isToday ? (
                  <>
                    <span className="sm:hidden">Nay</span>
                    <span className="hidden sm:inline">Hôm nay</span>
                  </>
                ) : (
                  WEEKDAY_SHORT[getDay(day)]
                )}
              </span>
              <span className="text-base font-semibold tabular-nums">{format(day, "d")}</span>
              <span
                aria-hidden
                className={cn(
                  "size-1.5 rounded-full",
                  isDone && "bg-emerald-500",
                  isPartial && "bg-amber-400",
                  !isDone && !isPartial && "bg-transparent",
                )}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
