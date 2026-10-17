// FILE TỰ ĐỘNG SINH từ src/lib — sửa ở bản gốc rồi chạy `npm run sync:mobile`.
// Kiểm tra dữ liệu đầu vào dùng chung cho Server Actions (web) và tầng SQLite (mobile).
// Chỉ phụ thuộc date-fns + các module thuần khác trong src/lib, không import Prisma/Next.

import { isValid } from "date-fns";
import { isHabitIconName } from "./habit-options";
import { parseDateKey, parseTargetDays, toDateKey, type FrequencyType, type LogStatus } from "./streak";

export type ValidationResult<T> = { ok: true; data: T } | { ok: false; error: string };

export interface HabitInput {
  title: string;
  description?: string | null;
  icon: string;
  color: string;
  frequencyType: FrequencyType;
  /** 0 = CN ... 6 = T7 */
  targetDays: number[];
}

/** Dữ liệu đã chuẩn hóa, sẵn sàng ghi vào bảng Habit (targetDays là chuỗi JSON). */
export interface HabitData {
  title: string;
  description: string | null;
  icon: string;
  color: string;
  frequencyType: FrequencyType;
  targetDays: string;
}

export interface StatusData {
  status: LogStatus | null;
  /** undefined = giữ nguyên ghi chú cũ; null = xóa ghi chú */
  note: string | null | undefined;
}

export const TITLE_MAX = 100;
export const DESCRIPTION_MAX = 500;
export const NOTE_MAX = 500;

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;
const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;
const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

export function isDateKey(value: unknown): value is string {
  if (typeof value !== "string" || !DATE_KEY.test(value)) return false;
  const date = parseDateKey(value);
  // Loại bỏ ngày không tồn tại như 2026-02-30 (parse sẽ không khớp lại chuỗi gốc)
  return isValid(date) && toDateKey(date) === value;
}

export function isNonEmptyId(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= 64;
}

export function validateHabitInput(input: unknown): ValidationResult<HabitData> {
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
 * Kiểm tra thao tác đặt trạng thái của một ngày.
 * `today` là ngày hiện tại "YYYY-MM-DD" theo giờ local — không cho ghi nhận ngày tương lai.
 */
export function validateStatusInput(
  date: unknown,
  status: unknown,
  note: unknown,
  today: string,
): ValidationResult<StatusData> {
  if (!isDateKey(date)) return { ok: false, error: "Ngày phải có định dạng YYYY-MM-DD." };
  if (date > today) return { ok: false, error: "Không thể ghi nhận cho ngày trong tương lai." };
  if (status !== null && status !== "COMPLETED" && status !== "SKIPPED") {
    return { ok: false, error: "Trạng thái không hợp lệ." };
  }
  if (note !== undefined && typeof note !== "string") return { ok: false, error: "Ghi chú không hợp lệ." };
  const trimmed = note?.trim();
  if (trimmed && trimmed.length > NOTE_MAX) return { ok: false, error: `Ghi chú tối đa ${NOTE_MAX} ký tự.` };

  return { ok: true, data: { status, note: note === undefined ? undefined : trimmed || null } };
}
