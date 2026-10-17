// FILE TỰ ĐỘNG SINH từ src/lib — sửa ở bản gốc rồi chạy `npm run sync:mobile`.
import { getDay, subDays } from "date-fns";
import { isTargetDay, parseDateKey, toDateKey, type StreakHabit, type StreakLog } from "./streak";

export const HEATMAP_DAYS = 365;

export interface AnalyticsHabit extends StreakHabit {
  /** Ngày tạo "YYYY-MM-DD" — các ngày trước đó không được tính */
  createdDate: string;
  logs: StreakLog[];
}

export interface DayProgress {
  completed: number;
  /** Số thói quen cần làm trong ngày (không tính SKIPPED) */
  required: number;
  skipped: number;
}

export interface DayCell extends DayProgress {
  date: string;
  /** 0–1, hoặc null khi không có thói quen nào cần làm (kể cả khi tất cả đều SKIPPED) */
  rate: number | null;
}

export interface WeekdayRate {
  /** 0 = CN ... 6 = T7 */
  weekday: number;
  completed: number;
  required: number;
  /** 0–100, hoặc null khi chưa có dữ liệu */
  rate: number | null;
}

/** Thói quen có cần làm trong ngày `date` không (đã được tạo và đúng lịch). */
export function isDueOn(habit: AnalyticsHabit, date: string): boolean {
  return habit.createdDate <= date && isTargetDay(habit, parseDateKey(date));
}

function countDay(
  habits: AnalyticsHabit[],
  date: string,
  statusOf: (habit: AnalyticsHabit, index: number) => string | undefined,
): DayProgress {
  let completed = 0;
  let required = 0;
  let skipped = 0;
  habits.forEach((habit, index) => {
    if (!isDueOn(habit, date)) return;
    const status = statusOf(habit, index);
    if (status === "SKIPPED") {
      skipped++;
      return;
    }
    required++;
    if (status === "COMPLETED") completed++;
  });
  return { completed, required, skipped };
}

/** Tiến độ của một ngày trên tập thói quen: SKIPPED không tính vào mẫu số. */
export function getDayProgress(habits: AnalyticsHabit[], date: string): DayProgress {
  return countDay(habits, date, (habit) => habit.logs.find((l) => l.date === date)?.status);
}

/** Chuỗi `days` ngày kết thúc ở `today` (cũ → mới), mỗi ngày kèm tiến độ tổng hợp. */
export function buildDailySeries(habits: AnalyticsHabit[], today: string, days: number = HEATMAP_DAYS): DayCell[] {
  // Index log theo ngày để không phải duyệt mảng log cho từng ô
  const statusMaps = habits.map((habit) => new Map(habit.logs.map((l) => [l.date, l.status])));
  const end = parseDateKey(today);

  return Array.from({ length: days }, (_, i) => {
    const date = toDateKey(subDays(end, days - 1 - i));
    const progress = countDay(habits, date, (_habit, index) => statusMaps[index].get(date));
    return { date, ...progress, rate: progress.required === 0 ? null : progress.completed / progress.required };
  });
}

/** Mức màu heatmap: -1 = không có gì cần làm, 0 = chưa làm, 1–4 = tăng dần đến 100%. */
export function heatLevel(rate: number | null): -1 | 0 | 1 | 2 | 3 | 4 {
  if (rate === null) return -1;
  if (rate <= 0) return 0;
  if (rate >= 1) return 4;
  if (rate < 1 / 3) return 1;
  if (rate < 2 / 3) return 2;
  return 3;
}

/**
 * Tỷ lệ hoàn thành theo thứ trong tuần, trả về theo thứ tự T2 → CN.
 * Ngày hôm nay bị loại vì chưa kết thúc (tránh kéo tỷ lệ xuống khi chưa kịp làm).
 */
export function calculateWeekdayRates(cells: DayCell[], today: string): WeekdayRate[] {
  const totals = Array.from({ length: 7 }, () => ({ completed: 0, required: 0 }));
  for (const cell of cells) {
    if (cell.date >= today) continue;
    const weekday = getDay(parseDateKey(cell.date));
    totals[weekday].completed += cell.completed;
    totals[weekday].required += cell.required;
  }
  return [1, 2, 3, 4, 5, 6, 0].map((weekday) => {
    const { completed, required } = totals[weekday];
    return { weekday, completed, required, rate: required === 0 ? null : Math.round((completed / required) * 100) };
  });
}

export interface AnalyticsSummary {
  totalCompleted: number;
  /** 0–100, không tính hôm nay; null khi chưa có dữ liệu */
  overallRate: number | null;
  /** Số ngày hoàn thành 100% các thói quen cần làm */
  perfectDays: number;
  /** Số ngày có ít nhất một lần COMPLETED */
  activeDays: number;
}

export function summarizeSeries(cells: DayCell[], today: string): AnalyticsSummary {
  let totalCompleted = 0;
  let completed = 0;
  let required = 0;
  let perfectDays = 0;
  let activeDays = 0;
  for (const cell of cells) {
    totalCompleted += cell.completed;
    if (cell.completed > 0) activeDays++;
    if (cell.rate === 1) perfectDays++;
    if (cell.date < today) {
      completed += cell.completed;
      required += cell.required;
    }
  }
  return {
    totalCompleted,
    overallRate: required === 0 ? null : Math.round((completed / required) * 100),
    perfectDays,
    activeDays,
  };
}
