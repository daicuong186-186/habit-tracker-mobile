"use server";

import { revalidatePath } from "next/cache";
import { connection } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  calculateHabitStats,
  parseTargetDays,
  toDateKey,
  type FrequencyType,
  type HabitStats,
  type LogStatus,
} from "@/lib/streak";
import {
  isDateKey,
  isNonEmptyId,
  validateHabitInput,
  validateStatusInput,
  type HabitInput,
} from "@/lib/habit-validation";

// Các export kiểu (type) bị xóa khi biên dịch nên vẫn hợp lệ trong file "use server".

export type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

export type { HabitInput };

export interface DashboardLog {
  date: string;
  status: LogStatus;
  note: string | null;
}

export interface DashboardHabit {
  id: string;
  title: string;
  description: string | null;
  icon: string;
  color: string;
  frequencyType: FrequencyType;
  targetDays: number[];
  /** Ngày tạo dạng "YYYY-MM-DD" (giờ local) */
  createdDate: string;
  logs: DashboardLog[];
  stats: HabitStats;
}

export interface DashboardData {
  date: string;
  today: string;
  habits: DashboardHabit[];
}

const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

function errorMessage(error: unknown, fallback: string): string {
  console.error(error);
  return fallback;
}

/** Làm mới mọi trang dưới "/" (Dashboard, Thống kê, Lưu trữ) vì đều dùng chung dữ liệu thói quen. */
function revalidateAll() {
  revalidatePath("/", "layout");
}

type HabitWithLogs = Awaited<ReturnType<typeof findHabits>>[number];

function findHabits(archived: boolean) {
  return prisma.habit.findMany({
    where: { archived },
    orderBy: { createdAt: "asc" },
    include: { logs: { orderBy: { date: "asc" } } },
  });
}

function toDashboardHabit(habit: HabitWithLogs, now: Date): DashboardHabit {
  const frequencyType: FrequencyType = habit.frequencyType === "SPECIFIC_DAYS" ? "SPECIFIC_DAYS" : "DAILY";
  const logs: DashboardLog[] = habit.logs
    .filter((log) => log.status === "COMPLETED" || log.status === "SKIPPED")
    .map((log) => ({ date: log.date, status: log.status as LogStatus, note: log.note }));

  return {
    id: habit.id,
    title: habit.title,
    description: habit.description,
    icon: habit.icon,
    color: habit.color,
    frequencyType,
    targetDays: frequencyType === "DAILY" ? ALL_DAYS : parseTargetDays(habit.targetDays),
    createdDate: toDateKey(habit.createdAt),
    logs,
    stats: calculateHabitStats({ frequencyType, targetDays: habit.targetDays, createdAt: habit.createdAt }, logs, now),
  };
}

/**
 * Lấy dữ liệu Dashboard: các thói quen chưa lưu trữ, kèm toàn bộ log và thống kê
 * (streak/completion rate được tính theo ngày hôm nay, không phụ thuộc ngày đang chọn).
 */
export async function getDashboardData(dateStr: string): Promise<DashboardData> {
  // cacheComponents: báo cho Next biết "hôm nay" phải tính theo từng request, không prerender
  await connection();
  const now = new Date();
  const today = toDateKey(now);
  const date = isDateKey(dateStr) && dateStr <= today ? dateStr : today;

  const habits = await findHabits(false);
  return { date, today, habits: habits.map((habit) => toDashboardHabit(habit, now)) };
}

/** Danh sách thói quen đã lưu trữ (kèm lịch sử để hiển thị tổng kết). */
export async function getArchivedHabits(): Promise<DashboardHabit[]> {
  await connection();
  const now = new Date();
  const habits = await findHabits(true);
  return habits.map((habit) => toDashboardHabit(habit, now));
}

export async function createHabit(input: HabitInput): Promise<ActionResult<{ id: string }>> {
  const parsed = validateHabitInput(input);
  if (!parsed.ok) return parsed;

  try {
    const habit = await prisma.habit.create({ data: parsed.data, select: { id: true } });
    revalidateAll();
    return { ok: true, data: habit };
  } catch (error) {
    return { ok: false, error: errorMessage(error, "Không thể tạo thói quen. Vui lòng thử lại.") };
  }
}

export async function updateHabit(id: string, input: HabitInput): Promise<ActionResult> {
  if (!isNonEmptyId(id)) return { ok: false, error: "Mã thói quen không hợp lệ." };
  const parsed = validateHabitInput(input);
  if (!parsed.ok) return parsed;

  try {
    const { count } = await prisma.habit.updateMany({ where: { id }, data: parsed.data });
    if (count === 0) return { ok: false, error: "Không tìm thấy thói quen." };
    revalidateAll();
    return { ok: true, data: undefined };
  } catch (error) {
    return { ok: false, error: errorMessage(error, "Không thể cập nhật thói quen. Vui lòng thử lại.") };
  }
}

export async function deleteHabit(id: string): Promise<ActionResult> {
  if (!isNonEmptyId(id)) return { ok: false, error: "Mã thói quen không hợp lệ." };

  try {
    // HabitLog bị xóa theo nhờ onDelete: Cascade
    const { count } = await prisma.habit.deleteMany({ where: { id } });
    if (count === 0) return { ok: false, error: "Không tìm thấy thói quen." };
    revalidateAll();
    return { ok: true, data: undefined };
  } catch (error) {
    return { ok: false, error: errorMessage(error, "Không thể xóa thói quen. Vui lòng thử lại.") };
  }
}

export async function archiveHabit(id: string, archived: boolean = true): Promise<ActionResult> {
  if (!isNonEmptyId(id)) return { ok: false, error: "Mã thói quen không hợp lệ." };
  if (typeof archived !== "boolean") return { ok: false, error: "Trạng thái lưu trữ không hợp lệ." };

  try {
    const { count } = await prisma.habit.updateMany({ where: { id }, data: { archived } });
    if (count === 0) return { ok: false, error: "Không tìm thấy thói quen." };
    revalidateAll();
    return { ok: true, data: undefined };
  } catch (error) {
    return { ok: false, error: errorMessage(error, "Không thể lưu trữ thói quen. Vui lòng thử lại.") };
  }
}

/**
 * Đặt trạng thái của thói quen trong một ngày.
 * - status = null: xóa log của ngày đó.
 * - COMPLETED / SKIPPED: upsert log (kèm note nếu có).
 */
export async function toggleHabitStatus(
  habitId: string,
  date: string,
  status: LogStatus | null,
  note?: string,
): Promise<ActionResult> {
  if (!isNonEmptyId(habitId)) return { ok: false, error: "Mã thói quen không hợp lệ." };
  const parsed = validateStatusInput(date, status, note, toDateKey(new Date()));
  if (!parsed.ok) return parsed;

  try {
    const habit = await prisma.habit.findUnique({ where: { id: habitId }, select: { id: true } });
    if (!habit) return { ok: false, error: "Không tìm thấy thói quen." };

    const { status: nextStatus, note: noteValue } = parsed.data;
    if (nextStatus === null) {
      await prisma.habitLog.deleteMany({ where: { habitId, date } });
    } else {
      // noteValue === undefined: giữ nguyên ghi chú cũ; null: xóa ghi chú
      await prisma.habitLog.upsert({
        where: { habitId_date: { habitId, date } },
        create: { habitId, date, status: nextStatus, note: noteValue ?? null },
        update: { status: nextStatus, ...(noteValue !== undefined && { note: noteValue }) },
      });
    }

    revalidateAll();
    return { ok: true, data: undefined };
  } catch (error) {
    return { ok: false, error: errorMessage(error, "Không thể cập nhật trạng thái. Vui lòng thử lại.") };
  }
}
