"use client";

import { useEffect, useRef } from "react";
import { PartyPopper } from "lucide-react";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";

interface DailyProgressProps {
  /** Ngày đang chọn "YYYY-MM-DD" — đổi ngày sẽ không kích hoạt pháo giấy */
  date: string;
  completed: number;
  /** Số thói quen cần làm trong ngày (không tính SKIPPED) */
  required: number;
  skipped?: number;
}

async function fireConfetti() {
  const confetti = (await import("canvas-confetti")).default;
  const defaults = { disableForReducedMotion: true, zIndex: 60, spread: 70, startVelocity: 45 };
  confetti({ ...defaults, particleCount: 80, angle: 60, origin: { x: 0, y: 0.7 } });
  confetti({ ...defaults, particleCount: 80, angle: 120, origin: { x: 1, y: 0.7 } });
  setTimeout(() => confetti({ ...defaults, particleCount: 120, spread: 100, origin: { y: 0.6 } }), 250);
}

export function DailyProgress({ date, completed, required, skipped = 0 }: DailyProgressProps) {
  const percent = required === 0 ? 0 : Math.min(100, Math.round((completed / required) * 100));
  const isComplete = required > 0 && completed >= required;

  // Chỉ bắn pháo giấy khi người dùng vừa chuyển từ <100% lên 100% trong cùng một ngày,
  // không bắn khi tải trang hoặc khi chuyển sang một ngày đã hoàn thành sẵn.
  const previous = useRef({ date, isComplete });
  useEffect(() => {
    const prev = previous.current;
    if (prev.date === date && !prev.isComplete && isComplete) void fireConfetti();
    previous.current = { date, isComplete };
  }, [date, isComplete]);

  return (
    <div
      className={cn(
        "rounded-2xl bg-card p-4 ring-1 ring-foreground/10 transition-colors",
        isComplete && "bg-emerald-50 ring-emerald-500/30 dark:bg-emerald-950/30",
      )}
    >
      <div className="mb-3 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-muted-foreground">Tiến độ trong ngày</p>
          <p className="mt-0.5 text-sm sm:text-base" aria-live="polite">
            {required === 0 ? (
              <span className="text-muted-foreground">Không có thói quen cần làm</span>
            ) : isComplete ? (
              <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-700 dark:text-emerald-400">
                <PartyPopper className="size-4" />
                Tuyệt vời! Đã hoàn thành tất cả {required} thói quen
              </span>
            ) : (
              <>
                Đã hoàn thành{" "}
                <span className="font-semibold tabular-nums">
                  {completed}/{required}
                </span>{" "}
                thói quen
              </>
            )}
            {skipped > 0 && (
              <span className="ml-1 text-xs text-muted-foreground">• {skipped} nghỉ có phép</span>
            )}
          </p>
        </div>
        <span
          className={cn(
            "shrink-0 text-2xl font-bold tabular-nums",
            isComplete && "text-emerald-600 dark:text-emerald-400",
          )}
        >
          {percent}%
        </span>
      </div>

      <Progress
        value={percent}
        aria-label="Tiến độ hoàn thành trong ngày"
        className="[&_[data-slot=progress-track]]:h-2.5"
      />
    </div>
  );
}
