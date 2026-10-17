// Danh sách icon/màu dùng chung cho Server Actions (kiểm tra đầu vào) và giao diện.
// File này không import React để có thể dùng ở cả server lẫn client.

export const HABIT_ICON_NAMES = [
  "Dumbbell",
  "BookOpen",
  "Droplets",
  "Moon",
  "Sun",
  "Code",
  "Brain",
  "Heart",
  "Utensils",
  "Music",
  "Bike",
  "Coffee",
  "Pencil",
  "Flame",
  "Target",
  "CheckCircle2",
] as const;

export type HabitIconName = (typeof HABIT_ICON_NAMES)[number];

export const DEFAULT_HABIT_ICON: HabitIconName = "CheckCircle2";

export const HABIT_COLORS = [
  { value: "#10b981", label: "Xanh ngọc" },
  { value: "#3b82f6", label: "Xanh dương" },
  { value: "#8b5cf6", label: "Tím" },
  { value: "#ec4899", label: "Hồng" },
  { value: "#f43f5e", label: "Đỏ" },
  { value: "#f97316", label: "Cam" },
  { value: "#f59e0b", label: "Vàng" },
  { value: "#06b6d4", label: "Xanh lơ" },
] as const;

export const DEFAULT_HABIT_COLOR = "#10b981";

export function isHabitIconName(value: unknown): value is HabitIconName {
  return typeof value === "string" && (HABIT_ICON_NAMES as readonly string[]).includes(value);
}

/** Nhãn thứ trong tuần theo getDay(): 0 = CN ... 6 = T7 */
export const WEEKDAY_SHORT = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
export const WEEKDAY_LONG = ["Chủ nhật", "Thứ hai", "Thứ ba", "Thứ tư", "Thứ năm", "Thứ sáu", "Thứ bảy"];

/** Thứ tự hiển thị kiểu Việt Nam: T2 → CN */
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

export function formatSchedule(frequencyType: string, targetDays: number[]): string {
  if (frequencyType !== "SPECIFIC_DAYS" || targetDays.length === 7) return "Hàng ngày";
  return WEEK_ORDER.filter((d) => targetDays.includes(d))
    .map((d) => WEEKDAY_SHORT[d])
    .join(", ");
}
