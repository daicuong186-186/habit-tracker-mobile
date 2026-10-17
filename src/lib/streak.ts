import { addDays, differenceInCalendarDays, format, getDay, isValid, parse, startOfDay, subDays } from "date-fns";

export type FrequencyType = "DAILY" | "SPECIFIC_DAYS";
export type LogStatus = "COMPLETED" | "SKIPPED";

export interface StreakHabit {
  frequencyType: FrequencyType | string;
  /** JSON string (vd: "[1,3,5]") hoặc mảng số, 0 = CN ... 6 = T7 */
  targetDays: string | number[];
  /** Nếu có, các ngày trước ngày tạo không được tính vào mẫu số Completion Rate */
  createdAt?: Date | string;
}

export interface StreakLog {
  date: string; // "YYYY-MM-DD"
  status: LogStatus | string;
}

export const DATE_FORMAT = "yyyy-MM-dd";
export const COMPLETION_WINDOW_DAYS = 30;

const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

/** Chuẩn hóa Date về chuỗi "YYYY-MM-DD" theo giờ local. */
export function toDateKey(date: Date): string {
  return format(date, DATE_FORMAT);
}

/** Parse chuỗi "YYYY-MM-DD" thành Date (00:00 giờ local). */
export function parseDateKey(key: string): Date {
  return parse(key, DATE_FORMAT, new Date());
}

/** Đọc targetDays an toàn; giá trị lỗi/không hợp lệ sẽ bị loại bỏ. */
export function parseTargetDays(raw: string | number[]): number[] {
  let value: unknown = raw;
  if (typeof raw === "string") {
    try {
      value = JSON.parse(raw);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(value)) return [];
  const days = value.filter((d): d is number => Number.isInteger(d) && d >= 0 && d <= 6);
  return Array.from(new Set(days)).sort((a, b) => a - b);
}

function getActiveDays(habit: StreakHabit): number[] {
  return habit.frequencyType === "SPECIFIC_DAYS" ? parseTargetDays(habit.targetDays) : ALL_DAYS;
}

/** Ngày `date` có phải ngày cần thực hiện thói quen hay không. */
export function isTargetDay(habit: StreakHabit, date: Date): boolean {
  return getActiveDays(habit).includes(getDay(date));
}

function buildStatusMap(logs: StreakLog[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const log of logs) {
    if (isValid(parseDateKey(log.date))) map.set(log.date, log.status);
  }
  return map;
}

function earliestLogDate(statusMap: Map<string, string>): Date | null {
  let earliest: string | null = null;
  for (const key of statusMap.keys()) {
    if (earliest === null || key < earliest) earliest = key;
  }
  return earliest === null ? null : parseDateKey(earliest);
}

/**
 * Chuỗi hiện tại: đếm ngược từ hôm nay (nếu hôm nay chưa COMPLETED thì bắt đầu từ hôm qua).
 * - Ngày không thuộc targetDays (SPECIFIC_DAYS) được bỏ qua.
 * - SKIPPED không cộng điểm nhưng giữ chuỗi.
 * - Ngày cần thực hiện mà không có log COMPLETED/SKIPPED làm đứt chuỗi.
 */
export function calculateCurrentStreak(
  habit: StreakHabit,
  logs: StreakLog[],
  today: Date = new Date(),
): number {
  if (getActiveDays(habit).length === 0) return 0;

  const statusMap = buildStatusMap(logs);
  const earliest = earliestLogDate(statusMap);
  if (!earliest) return 0;

  const todayStart = startOfDay(today);
  let cursor = statusMap.get(toDateKey(todayStart)) === "COMPLETED" ? todayStart : subDays(todayStart, 1);
  let streak = 0;

  while (differenceInCalendarDays(cursor, earliest) >= 0) {
    if (isTargetDay(habit, cursor)) {
      const status = statusMap.get(toDateKey(cursor));
      if (status === "COMPLETED") streak++;
      else if (status !== "SKIPPED") break;
    }
    cursor = subDays(cursor, 1);
  }

  return streak;
}

/**
 * Chuỗi COMPLETED dài nhất trong lịch sử, áp dụng cùng quy tắc với Current Streak
 * (bỏ qua ngày không thuộc targetDays, SKIPPED giữ chuỗi nhưng không cộng điểm).
 */
export function calculateBestStreak(habit: StreakHabit, logs: StreakLog[]): number {
  if (getActiveDays(habit).length === 0) return 0;

  const statusMap = buildStatusMap(logs);
  const keys = Array.from(statusMap.keys()).sort();
  if (keys.length === 0) return 0;

  const last = parseDateKey(keys[keys.length - 1]);
  let cursor = parseDateKey(keys[0]);
  let best = 0;
  let current = 0;

  while (differenceInCalendarDays(last, cursor) >= 0) {
    if (isTargetDay(habit, cursor)) {
      const status = statusMap.get(toDateKey(cursor));
      if (status === "COMPLETED") {
        current++;
        if (current > best) best = current;
      } else if (status !== "SKIPPED") {
        current = 0;
      }
    }
    cursor = addDays(cursor, 1);
  }

  return best;
}

/**
 * Tỷ lệ hoàn thành (%) trong `windowDays` ngày gần nhất (tính cả hôm nay).
 * - Mẫu số: số ngày cần thực hiện, trừ các ngày SKIPPED.
 * - Hôm nay chỉ được tính vào mẫu số khi đã COMPLETED (ngày chưa kết thúc).
 * - Nếu có `habit.createdAt`, các ngày trước ngày tạo không được tính.
 * Trả về số nguyên 0–100.
 */
export function calculateCompletionRate(
  habit: StreakHabit,
  logs: StreakLog[],
  today: Date = new Date(),
  windowDays: number = COMPLETION_WINDOW_DAYS,
): number {
  const statusMap = buildStatusMap(logs);
  const todayStart = startOfDay(today);
  const createdAt = habit.createdAt ? startOfDay(new Date(habit.createdAt)) : null;

  let completed = 0;
  let required = 0;

  for (let offset = 0; offset < windowDays; offset++) {
    const day = subDays(todayStart, offset);
    if (createdAt && differenceInCalendarDays(day, createdAt) < 0) break;
    if (!isTargetDay(habit, day)) continue;

    const status = statusMap.get(toDateKey(day));
    if (status === "SKIPPED") continue;
    if (status === "COMPLETED") {
      completed++;
      required++;
    } else if (offset > 0) {
      required++;
    }
  }

  return required === 0 ? 0 : Math.round((completed / required) * 100);
}

export interface HabitStats {
  currentStreak: number;
  bestStreak: number;
  completionRate: number;
}

export function calculateHabitStats(
  habit: StreakHabit,
  logs: StreakLog[],
  today: Date = new Date(),
): HabitStats {
  return {
    currentStreak: calculateCurrentStreak(habit, logs, today),
    bestStreak: calculateBestStreak(habit, logs),
    completionRate: calculateCompletionRate(habit, logs, today),
  };
}
