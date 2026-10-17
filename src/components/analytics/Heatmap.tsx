"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { getDay, getMonth } from "date-fns";
import { heatLevel, type DayCell } from "@/lib/analytics";
import { parseDateKey } from "@/lib/streak";
import { WEEKDAY_LONG } from "@/lib/habit-options";
import { cn } from "@/lib/utils";

interface HeatmapProps {
  cells: DayCell[];
  today: string;
  /** Màu chủ đạo (hex). Các mức đậm nhạt là độ phủ của cùng một màu → thang tuần tự một sắc độ */
  color: string;
  /** "single": đang xem một thói quen — mỗi ô chỉ là hoàn thành/chưa */
  mode: "all" | "single";
}

const CELL = 12;
const GAP = 3;
const LEVEL_ALPHA = ["", "4d", "80", "bf", "ff"]; // 30%, 50%, 75%, 100%
// Hàng trong lưới: T2 → CN
const ROW_LABELS = ["T2", "", "T4", "", "T6", "", ""];

function formatDate(date: string): string {
  const [y, m, d] = date.split("-");
  return `${WEEKDAY_LONG[getDay(parseDateKey(date))]}, ${d}/${m}/${y}`;
}

function describeCell(cell: DayCell, mode: HeatmapProps["mode"]): string {
  if (cell.required === 0) return cell.skipped > 0 ? "Nghỉ có phép" : "Không có thói quen cần làm";
  if (mode === "single") return cell.completed > 0 ? "Đã hoàn thành" : "Chưa hoàn thành";
  const percent = Math.round((cell.rate ?? 0) * 100);
  const skipped = cell.skipped > 0 ? ` • ${cell.skipped} nghỉ có phép` : "";
  return `${cell.completed}/${cell.required} thói quen • ${percent}%${skipped}`;
}

function stripes(color: string) {
  return `repeating-linear-gradient(135deg, ${color}73 0 2px, transparent 2px 4px)`;
}

export function Heatmap({ cells, today, color, mode }: HeatmapProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<{ cell: DayCell; left: number; top: number } | null>(null);

  // Mặc định cuộn về cuối để thấy các tuần gần nhất (quan trọng trên mobile)
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, []);

  // Đệm đầu/cuối để mỗi cột là một tuần bắt đầu từ Thứ 2
  const leading = cells.length > 0 ? (getDay(parseDateKey(cells[0].date)) + 6) % 7 : 0;
  const slots: (DayCell | null)[] = [...Array<null>(leading).fill(null), ...cells];
  while (slots.length % 7 !== 0) slots.push(null);
  const weeks = Array.from({ length: slots.length / 7 }, (_, i) => slots.slice(i * 7, i * 7 + 7));

  // Nhãn tháng đặt ở cột chứa ngày 1 của tháng đó
  const monthLabels = weeks.map((week) => {
    const firstOfMonth = week.find((c) => c && c.date.endsWith("-01"));
    return firstOfMonth ? `Th${getMonth(parseDateKey(firstOfMonth.date)) + 1}` : "";
  });
  // Cột đầu tiên mang nhãn tháng hiện tại nếu đủ chỗ trước nhãn kế tiếp (tránh chồng chữ)
  const nextLabel = monthLabels.findIndex((label) => label !== "");
  if (weeks.length > 0 && (nextLabel === -1 || nextLabel >= 3)) {
    const first = weeks[0].find((c) => c !== null);
    if (first) monthLabels[0] = `Th${getMonth(parseDateKey(first.date)) + 1}`;
  }

  function cellStyle(cell: DayCell): React.CSSProperties | undefined {
    const level = heatLevel(cell.rate);
    if (level === -1) return cell.skipped > 0 ? { backgroundImage: stripes(color) } : undefined;
    if (level === 0) return undefined;
    return { backgroundColor: `${color}${LEVEL_ALPHA[mode === "single" ? 4 : level]}` };
  }

  const activeDays = cells.filter((c) => c.completed > 0).length;

  return (
    <div ref={rootRef} className="relative">
      <div ref={scrollRef} className="overflow-x-auto pb-2" onMouseLeave={() => setHover(null)}>
        <div className="inline-flex gap-2 pr-1">
          {/* Cột nhãn thứ dính bên trái khi cuộn ngang */}
          <div
            className="sticky left-0 z-[1] grid shrink-0 bg-card pr-1 text-[10px] leading-none text-muted-foreground"
            style={{ gridTemplateRows: `14px repeat(7, ${CELL}px)`, rowGap: GAP }}
            aria-hidden
          >
            <span />
            {ROW_LABELS.map((label, i) => (
              <span key={i} className="flex items-center">
                {label}
              </span>
            ))}
          </div>

          <div>
            <div
              className="grid text-[10px] leading-none text-muted-foreground"
              style={{ gridTemplateColumns: `repeat(${weeks.length}, ${CELL}px)`, columnGap: GAP, height: 14 + GAP }}
              aria-hidden
            >
              {monthLabels.map((label, i) => (
                <span key={i} className="whitespace-nowrap">
                  {label}
                </span>
              ))}
            </div>

            <div
              role="img"
              aria-label={`Bản đồ nhiệt ${cells.length} ngày gần nhất: có hoạt động trong ${activeDays} ngày`}
              className="grid grid-flow-col"
              style={{
                gridTemplateRows: `repeat(7, ${CELL}px)`,
                gridAutoColumns: `${CELL}px`,
                gap: GAP,
              }}
            >
              {slots.map((cell, i) =>
                cell ? (
                  <div
                    key={cell.date}
                    className={cn(
                      "rounded-[3px]",
                      heatLevel(cell.rate) === 0 && "bg-muted",
                      heatLevel(cell.rate) === -1 && cell.skipped === 0 && "ring-1 ring-foreground/5 ring-inset",
                      cell.date === today && "outline-2 outline-offset-1 outline-foreground/60",
                    )}
                    style={cellStyle(cell)}
                    onMouseEnter={(e) => {
                      const box = e.currentTarget.getBoundingClientRect();
                      const parent = rootRef.current?.getBoundingClientRect();
                      if (!parent) return;
                      setHover({ cell, left: box.left - parent.left + CELL / 2, top: box.top - parent.top });
                    }}
                  />
                ) : (
                  <div key={`pad-${i}`} aria-hidden />
                ),
              )}
            </div>
          </div>
        </div>
      </div>

      {hover && (
        <div
          role="tooltip"
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-lg bg-popover px-2.5 py-1.5 text-xs whitespace-nowrap text-popover-foreground shadow-md ring-1 ring-foreground/10"
          style={{ left: hover.left, top: hover.top - 6 }}
        >
          <p className="font-medium">{formatDate(hover.cell.date)}</p>
          <p className="text-muted-foreground">{describeCell(hover.cell, mode)}</p>
        </div>
      )}

      <div className="mt-2 flex flex-wrap items-center justify-end gap-x-4 gap-y-2 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-3 rounded-[3px] ring-1 ring-foreground/10 ring-inset" />
          Không cần làm
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-3 rounded-[3px]" style={{ backgroundImage: stripes(color) }} />
          Nghỉ có phép
        </span>
        {mode === "all" ? (
          <span className="inline-flex items-center gap-1">
            Ít
            <span className="size-3 rounded-[3px] bg-muted" />
            {LEVEL_ALPHA.slice(1).map((alpha) => (
              <span key={alpha} className="size-3 rounded-[3px]" style={{ backgroundColor: `${color}${alpha}` }} />
            ))}
            Nhiều
          </span>
        ) : (
          <>
            <span className="inline-flex items-center gap-1.5">
              <span className="size-3 rounded-[3px] bg-muted" />
              Chưa làm
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="size-3 rounded-[3px]" style={{ backgroundColor: color }} />
              Hoàn thành
            </span>
          </>
        )}
      </div>
    </div>
  );
}
