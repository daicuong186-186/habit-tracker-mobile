import { createElement } from "react";
import {
  Bike,
  BookOpen,
  Brain,
  CheckCircle2,
  Code,
  Coffee,
  Droplets,
  Dumbbell,
  Flame,
  Heart,
  Moon,
  Music,
  Pencil,
  Sun,
  Target,
  Utensils,
  type LucideIcon,
  type LucideProps,
} from "lucide-react";
import { DEFAULT_HABIT_ICON, isHabitIconName, type HabitIconName } from "@/lib/habit-options";

export const HABIT_ICONS: Record<HabitIconName, LucideIcon> = {
  Dumbbell,
  BookOpen,
  Droplets,
  Moon,
  Sun,
  Code,
  Brain,
  Heart,
  Utensils,
  Music,
  Bike,
  Coffee,
  Pencil,
  Flame,
  Target,
  CheckCircle2,
};

/** Trả về component icon theo tên lưu trong DB; tên lạ sẽ dùng icon mặc định. */
export function getHabitIcon(name: string): LucideIcon {
  return HABIT_ICONS[isHabitIconName(name) ? name : DEFAULT_HABIT_ICON];
}

/** Render icon thói quen theo tên lưu trong DB. */
export function HabitIcon({ name, ...props }: { name: string } & LucideProps) {
  return createElement(getHabitIcon(name), props);
}
