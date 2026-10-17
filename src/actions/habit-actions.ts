"use server";

import { revalidatePath } from "next/cache";
import { connection } from "next/server";
import { isValid } from "date-fns";
import { prisma } from "@/lib/prisma";
import { isHabitIconName } from "@/lib/habit-options";
import {
  calculateHabitStats,
  parseDateKey,
  parseTargetDays,
  toDateKey,
  type FrequencyType,
  type HabitStats,
  type LogStatus,
} from "@/lib/streak";

// Các export kiểu (type) bị xóa khi biên dịch nên vẫn hợp lệ trong file "use server".

export type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

export interface HabitInput {
  title: string;
  description?: string | null;
  icon: string;
  color: string;
  frequencyType: FrequencyType;
  /** 0 = CN ... 6 = T7 */
  targetDays: number[];
}

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

const TITLE_MAX = 100;
const DESCRIPTION_MAX = 500;
const NOTE_MAX = 500;
const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;
const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;
const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

function isDateKey(value: unknown): value is string {
  if (typeof value !== "string" || !DATE_KEY.test(value)) return false;
  const date = parseDateKey(value);
  // Loại bỏ ngày không tồn tại như 2026-02-30 (parse sẽ không khớp lại chuỗi gốc)
  return isValid(date) && toDateKey(date) === value;
}

function isNonEmptyId(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= 64;
}

function errorMessage(error: unknown, fallback: string): string {
  console.error(error);
  return fallback;
}

type HabitData = {
  title: string;
  description: string | null;
  icon: string;
  color: string;
  frequencyType: FrequencyType;
  targetDays: string;
};

function validateHabitInput(input: unknown): { ok: true; data: HabitData } | { ok: false; error: string } {
  if (typeof input !== "object" || input === null) return { ok: false, error: "Dữ liệu không hợp lệ." };
  const raw = input as Record<string, unknown>;

  const title = typeof raw.title === "string" ? raw.title.trim() : "";
  if (!title) return { ok: false, error: "Tên thói quen không được để trống." };
  if (title.length > TITLE_MAX) return { ok: false, error: `Tên thói quen tối đa ${TITLE_MAX} ký tự.` };

  let description: string | null = null;
  if (raw.description !== undefined && raw.description !== null) {
    if (typeof raw.description !== "string") return { ok: false, error: "Mô tả không hợp lệ." };
    description = raw.description.trim() || null;
    if (description && description.length > DESCRIPTION_MAX) {
      return { ok: false, error: `Mô tả tối đa ${DESCRIPTION_MAX} ký tự.` };
    }
  }

  const icon = isHabitIconName(raw.icon) ? raw.icon : null;
  if (!icon) return { ok: false, error: "Icon không hợp lệ." };

  const color = typeof raw.color === "string" && HEX_COLOR.test(raw.color) ? raw.color.toLowerCase() : null;
  if (!color) return { ok: false, error: "Màu sắc phải là mã Hex dạng #RRGGBB." };

  const frequencyType = raw.frequencyType;
  if (frequencyType !== "DAILY" && frequencyType !== "SPECIFIC_DAYS") {
    return { ok: false, error: "Tần suất không hợp lệ." };
  }

  let days = ALL_DAYS;
  if (frequencyType === "SPECIFIC_DAYS") {
    if (!Array.isArray(raw.targetDays)) return { ok: false, error: "Danh sách thứ trong tuần không hợp lệ." };
    if (raw.targetDays.some((d) => !Number.isInteger(d) || d < 0 || d > 6)) {
      return { ok: false, error: "Thứ trong tuần phải nằm trong khoảng 0 (CN) đến 6 (T7)." };
    }
    days = parseTargetDays(raw.targetDays as number[]);
    if (days.length === 0) return { ok: false, error: "Hãy chọn ít nhất một ngày trong tuần." };
  }

  return {
    ok: true,
    data: { title, description, icon, color, frequencyType, targetDays: JSON.stringify(days) },
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

  const habits = await prisma.habit.findMany({
    where: { archived: false },
    orderBy: { createdAt: "asc" },
    include: { logs: { orderBy: { date: "asc" } } },
  });

  return {
    date,
    today,
    habits: habits.map((habit) => {
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
        stats: calculateHabitStats(
          { frequencyType, targetDays: habit.targetDays, createdAt: habit.createdAt },
          logs,
          now,
        ),
      };
    }),
  };
}

export async function createHabit(input: HabitInput): Promise<ActionResult<{ id: string }>> {
  const parsed = validateHabitInput(input);
  if (!parsed.ok) return parsed;

  try {
    const habit = await prisma.habit.create({ data: parsed.data, select: { id: true } });
    revalidatePath("/");
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
    revalidatePath("/");
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
    revalidatePath("/");
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
    revalidatePath("/");
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
  if (!isDateKey(date)) return { ok: false, error: "Ngày phải có định dạng YYYY-MM-DD." };
  if (date > toDateKey(new Date())) return { ok: false, error: "Không thể ghi nhận cho ngày trong tương lai." };
  if (status !== null && status !== "COMPLETED" && status !== "SKIPPED") {
    return { ok: false, error: "Trạng thái không hợp lệ." };
  }
  if (note !== undefined && typeof note !== "string") return { ok: false, error: "Ghi chú không hợp lệ." };
  const trimmedNote = note?.trim();
  if (trimmedNote && trimmedNote.length > NOTE_MAX) {
    return { ok: false, error: `Ghi chú tối đa ${NOTE_MAX} ký tự.` };
  }

  try {
    const habit = await prisma.habit.findUnique({ where: { id: habitId }, select: { id: true } });
    if (!habit) return { ok: false, error: "Không tìm thấy thói quen." };

    if (status === null) {
      await prisma.habitLog.deleteMany({ where: { habitId, date } });
    } else {
      // note === undefined: giữ nguyên ghi chú cũ; chuỗi rỗng: xóa ghi chú
      const noteValue = note === undefined ? undefined : trimmedNote || null;
      await prisma.habitLog.upsert({
        where: { habitId_date: { habitId, date } },
        create: { habitId, date, status, note: noteValue ?? null },
        update: { status, ...(noteValue !== undefined && { note: noteValue }) },
      });
    }

    revalidatePath("/");
    return { ok: true, data: undefined };
  } catch (error) {
    return { ok: false, error: errorMessage(error, "Không thể cập nhật trạng thái. Vui lòng thử lại.") };
  }
}
