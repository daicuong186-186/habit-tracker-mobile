import { createElement } from 'react';
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
} from 'lucide-react-native';

import { DEFAULT_HABIT_ICON, isHabitIconName, type HabitIconName } from '@/shared/habit-options';

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

/** Render icon thói quen theo tên lưu trong DB; tên lạ dùng icon mặc định. */
export function HabitIcon({ name, ...props }: { name: string } & LucideProps) {
  return createElement(HABIT_ICONS[isHabitIconName(name) ? name : DEFAULT_HABIT_ICON], props);
}

/** Nền nhạt cùng màu thói quen (hex + alpha). */
export function tint(color: string, alpha: string = '1f'): string {
  return `${color}${alpha}`;
}
